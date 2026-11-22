<?php
declare(strict_types=1);
require __DIR__ . '/_layout.php';
$u = exigir_login();
$pdo = db();

function preco_post(string $k, bool $obrig): ?string
{
    $v = trim(str_replace(['R$', ' '], '', (string)($_POST[$k] ?? '')));
    if ($v === '') return $obrig ? '' : null;
    $v = str_contains($v, ',') ? str_replace(['.', ','], ['', '.'], $v) : $v;
    return (is_numeric($v) && (float)$v >= 0 && (float)$v < 1000000) ? number_format((float)$v, 2, '.', '') : '';
}
function data_post(string $k): ?string
{
    $v = (string)($_POST[$k] ?? '');
    if ($v === '') return null;
    $d = DateTime::createFromFormat('!Y-m-d', $v);
    return ($d && $d->format('Y-m-d') === $v) ? $v : null;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    exigir_post_csrf();
    $acao = (string)($_POST['acao'] ?? '');
    $id = (int)($_POST['id'] ?? 0);
    if ($acao === 'excluir') {
        $pdo->prepare('DELETE FROM ofertas WHERE id = ?')->execute([$id]);
        aviso_flash('Oferta excluída.');
    } elseif ($acao === 'salvar') {
        $emp = (string)($_POST['empresa'] ?? '');
        $prod = mb_substr(trim((string)($_POST['produto'] ?? '')), 0, 200);
        $desc = mb_substr(trim((string)($_POST['descricao'] ?? '')), 0, 500);
        $preco = preco_post('preco', true);
        $promo = preco_post('preco_promocional', false);
        $ok = $prod !== '' && $preco !== '' && $promo !== '' && (int)$pdo->query('SELECT COUNT(*) FROM empresas WHERE slug = ' . $pdo->quote($emp))->fetchColumn() === 1;
        if (!$ok) {
            aviso_flash('Confira empresa, produto e preços (use números, ex.: 49,90).', 'danger');
        } else {
            $p = [$emp, $prod, $desc, $preco, $promo, data_post('data_inicio'), data_post('data_fim'), !empty($_POST['ativo']) ? 1 : 0];
            if ($id) $pdo->prepare('UPDATE ofertas SET empresa_slug=?, produto=?, descricao=?, preco=?, preco_promocional=?, data_inicio=?, data_fim=?, ativo=? WHERE id=?')->execute([...$p, $id]);
            else $pdo->prepare('INSERT INTO ofertas (empresa_slug, produto, descricao, preco, preco_promocional, data_inicio, data_fim, ativo) VALUES (?,?,?,?,?,?,?,?)')->execute($p);
            aviso_flash('Oferta salva.');
        }
    }
    voltar('ofertas.php');
}

$empresas = $pdo->query('SELECT slug, nome FROM empresas WHERE ativa = 1 ORDER BY nome')->fetchAll();
$edit = null;
if (!empty($_GET['editar'])) {
    $st = $pdo->prepare('SELECT * FROM ofertas WHERE id = ?');
    $st->execute([(int)$_GET['editar']]);
    $edit = $st->fetch() ?: null;
}
$linhas = $pdo->query('SELECT o.*, e.nome AS empresa_nome FROM ofertas o JOIN empresas e ON e.slug = o.empresa_slug ORDER BY o.produto, COALESCE(o.preco_promocional, o.preco)')->fetchAll();
$v = fn(string $k, $pad = '') => e($edit[$k] ?? $pad);

admin_topo('Ofertas do comparador', $u);
aviso_flash();
?>
<form method="post" class="panel mb-4"><?= csrf_campo() ?><input type="hidden" name="acao" value="salvar"><input type="hidden" name="id" value="<?= (int)($edit['id'] ?? 0) ?>">
<h2 class="h5"><?= $edit ? 'Editar oferta #' . (int)$edit['id'] : 'Nova oferta' ?></h2>
<div class="row g-3">
<div class="col-md-4"><label class="form-label" for="empresa">Empresa</label><select class="form-select" id="empresa" name="empresa" required><?php foreach ($empresas as $em): ?><option value="<?= e($em['slug']) ?>"<?= ($edit['empresa_slug'] ?? '') === $em['slug'] ? ' selected' : '' ?>><?= e($em['nome']) ?></option><?php endforeach; ?></select></div>
<div class="col-md-4"><label class="form-label" for="produto">Produto/serviço (mesmo nome = compara)</label><input class="form-control" id="produto" name="produto" maxlength="200" value="<?= $v('produto') ?>" required></div>
<div class="col-md-2"><label class="form-label" for="preco">Preço (R$)</label><input class="form-control" id="preco" name="preco" inputmode="decimal" value="<?= $edit ? e(number_format((float)$edit['preco'], 2, ',', '')) : '' ?>" required></div>
<div class="col-md-2"><label class="form-label" for="promo">Promocional</label><input class="form-control" id="promo" name="preco_promocional" inputmode="decimal" value="<?= ($edit && $edit['preco_promocional'] !== null) ? e(number_format((float)$edit['preco_promocional'], 2, ',', '')) : '' ?>"></div>
<div class="col-12"><label class="form-label" for="desc">Descrição</label><input class="form-control" id="desc" name="descricao" maxlength="500" value="<?= $v('descricao') ?>"></div>
<div class="col-md-3"><label class="form-label" for="ini">Início</label><input class="form-control" type="date" id="ini" name="data_inicio" value="<?= $v('data_inicio') ?>"></div>
<div class="col-md-3"><label class="form-label" for="fim">Fim</label><input class="form-control" type="date" id="fim" name="data_fim" value="<?= $v('data_fim') ?>"></div>
<div class="col-md-3 d-flex align-items-end"><div class="form-check"><input class="form-check-input" type="checkbox" id="ativo" name="ativo" value="1"<?= (!$edit || $edit['ativo']) ? ' checked' : '' ?>><label class="form-check-label" for="ativo">Ativa</label></div></div>
</div><p class="mt-3 mb-0"><button class="btn btn-primary" type="submit">Salvar</button> <?php if ($edit): ?><a class="btn btn-outline-secondary" href="/admin/ofertas.php">Cancelar</a><?php endif; ?></p></form>

<div class="table-responsive"><table class="table table-sm align-middle bg-white"><thead><tr><th>Produto</th><th>Empresa</th><th class="text-end">Preço</th><th>Vigência</th><th></th></tr></thead><tbody>
<?php foreach ($linhas as $o): ?><tr><td><?= e($o['produto']) ?><?= $o['ativo'] ? '' : ' <span class="badge text-bg-secondary">inativa</span>' ?></td><td><?= e($o['empresa_nome']) ?></td>
<td class="text-end text-nowrap"><?= $o['preco_promocional'] !== null ? '<s class="text-secondary small">' . brl_php((float)$o['preco']) . '</s> <strong>' . brl_php((float)$o['preco_promocional']) . '</strong>' : '<strong>' . brl_php((float)$o['preco']) . '</strong>' ?></td>
<td class="text-nowrap small"><?= $o['data_inicio'] ? e(date('d/m/y', strtotime($o['data_inicio']))) : '—' ?> a <?= $o['data_fim'] ? e(date('d/m/y', strtotime($o['data_fim']))) : '—' ?></td>
<td class="text-nowrap"><a class="btn btn-sm btn-outline-primary" href="?editar=<?= (int)$o['id'] ?>">Editar</a>
<form method="post" class="d-inline" data-confirm="Excluir esta oferta?"><?= csrf_campo() ?><input type="hidden" name="id" value="<?= (int)$o['id'] ?>"><button class="btn btn-sm btn-outline-danger" name="acao" value="excluir">Excluir</button></form></td></tr>
<?php endforeach; ?></tbody></table></div>
<?php admin_rodape();
