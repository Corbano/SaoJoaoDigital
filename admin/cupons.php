<?php
declare(strict_types=1);
require __DIR__ . '/_layout.php';
$u = exigir_login();
$pdo = db();

function data_cupom(string $k): ?string
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
        $pdo->prepare('DELETE FROM cupons WHERE id = ?')->execute([$id]);
        aviso_flash('Cupom excluído.');
    } elseif ($acao === 'salvar') {
        $emp = (string)($_POST['empresa'] ?? '');
        $tit = mb_substr(trim((string)($_POST['titulo'] ?? '')), 0, 160);
        $desc = mb_substr(trim((string)($_POST['descricao'] ?? '')), 0, 500);
        $cod = strtoupper(preg_replace('/[^A-Za-z0-9_-]/', '', (string)($_POST['codigo'] ?? '')));
        $cod = substr($cod, 0, 40);
        $tipo = in_array($_POST['tipo'] ?? '', ['percentual', 'valor', 'brinde'], true) ? $_POST['tipo'] : 'percentual';
        $valor = (float)str_replace(',', '.', (string)($_POST['valor'] ?? '0'));
        $cond = mb_substr(trim((string)($_POST['condicoes'] ?? '')), 0, 300);
        $ini = data_cupom('data_inicio');
        $fim = data_cupom('data_fim');
        $existe = $pdo->prepare('SELECT COUNT(*) FROM empresas WHERE slug = ?');
        $existe->execute([$emp]);
        if ($tit === '' || $cod === '' || $valor < 0 || $valor > 100000 || (int)$existe->fetchColumn() !== 1 || ($ini && $fim && $fim < $ini)) {
            aviso_flash('Confira empresa, título, código (letras e números), valor e as datas.', 'danger');
        } else {
            $p = [$emp, $tit, $desc, $cod, $tipo, $valor, !empty($_POST['semana']) ? 1 : 0, $cond, $ini, $fim, !empty($_POST['ativo']) ? 1 : 0];
            if ($id) $pdo->prepare('UPDATE cupons SET empresa_slug=?, titulo=?, descricao=?, codigo=?, tipo=?, valor=?, semana=?, condicoes=?, data_inicio=?, data_fim=?, ativo=? WHERE id=?')->execute([...$p, $id]);
            else $pdo->prepare('INSERT INTO cupons (empresa_slug, titulo, descricao, codigo, tipo, valor, semana, condicoes, data_inicio, data_fim, ativo) VALUES (?,?,?,?,?,?,?,?,?,?,?)')->execute($p);
            aviso_flash('Cupom salvo.');
        }
    }
    voltar('cupons.php');
}

$empresas = $pdo->query('SELECT slug, nome FROM empresas WHERE ativa = 1 ORDER BY nome')->fetchAll();
$edit = null;
if (!empty($_GET['editar'])) {
    $st = $pdo->prepare('SELECT * FROM cupons WHERE id = ?');
    $st->execute([(int)$_GET['editar']]);
    $edit = $st->fetch() ?: null;
}
$linhas = $pdo->query('SELECT c.*, e.nome AS empresa_nome FROM cupons c JOIN empresas e ON e.slug = c.empresa_slug ORDER BY c.data_fim DESC, c.id DESC')->fetchAll();
$v = fn(string $k, $pad = '') => e($edit[$k] ?? $pad);

admin_topo('Cupons e ofertas da semana', $u);
aviso_flash();
?>
<form method="post" class="panel mb-4"><?= csrf_campo() ?><input type="hidden" name="acao" value="salvar"><input type="hidden" name="id" value="<?= (int)($edit['id'] ?? 0) ?>">
<h2 class="h5"><?= $edit ? 'Editar cupom #' . (int)$edit['id'] : 'Novo cupom' ?></h2>
<div class="row g-3">
<div class="col-md-4"><label class="form-label" for="empresa">Empresa</label><select class="form-select" id="empresa" name="empresa" required><?php foreach ($empresas as $em): ?><option value="<?= e($em['slug']) ?>"<?= ($edit['empresa_slug'] ?? '') === $em['slug'] ? ' selected' : '' ?>><?= e($em['nome']) ?></option><?php endforeach; ?></select></div>
<div class="col-md-5"><label class="form-label" for="titulo">Título</label><input class="form-control" id="titulo" name="titulo" maxlength="160" value="<?= $v('titulo') ?>" required></div>
<div class="col-md-3"><label class="form-label" for="codigo">Código</label><input class="form-control" id="codigo" name="codigo" maxlength="40" value="<?= $v('codigo') ?>" required></div>
<div class="col-12"><label class="form-label" for="desc">Descrição</label><input class="form-control" id="desc" name="descricao" maxlength="500" value="<?= $v('descricao') ?>"></div>
<div class="col-md-3"><label class="form-label" for="tipo">Tipo</label><select class="form-select" id="tipo" name="tipo"><?php foreach (['percentual' => 'Percentual (%)', 'valor' => 'Valor em R$', 'brinde' => 'Brinde'] as $k => $n): ?><option value="<?= $k ?>"<?= ($edit['tipo'] ?? 'percentual') === $k ? ' selected' : '' ?>><?= $n ?></option><?php endforeach; ?></select></div>
<div class="col-md-3"><label class="form-label" for="valor">Valor (0 para brinde)</label><input class="form-control" id="valor" name="valor" inputmode="decimal" value="<?= $edit ? e(rtrim(rtrim(number_format((float)$edit['valor'], 2, ',', ''), '0'), ',')) : '0' ?>"></div>
<div class="col-md-3"><label class="form-label" for="ini">Início</label><input class="form-control" type="date" id="ini" name="data_inicio" value="<?= $v('data_inicio') ?>"></div>
<div class="col-md-3"><label class="form-label" for="fim">Fim</label><input class="form-control" type="date" id="fim" name="data_fim" value="<?= $v('data_fim') ?>"></div>
<div class="col-12"><label class="form-label" for="cond">Condições</label><input class="form-control" id="cond" name="condicoes" maxlength="300" value="<?= $v('condicoes') ?>"></div>
<div class="col-md-3"><div class="form-check"><input class="form-check-input" type="checkbox" id="semana" name="semana" value="1"<?= !empty($edit['semana']) ? ' checked' : '' ?>><label class="form-check-label" for="semana">Oferta da semana (destaque na home)</label></div></div>
<div class="col-md-3"><div class="form-check"><input class="form-check-input" type="checkbox" id="ativo" name="ativo" value="1"<?= (!$edit || $edit['ativo']) ? ' checked' : '' ?>><label class="form-check-label" for="ativo">Ativo</label></div></div>
</div><p class="mt-3 mb-0"><button class="btn btn-primary" type="submit">Salvar</button> <?php if ($edit): ?><a class="btn btn-outline-secondary" href="/admin/cupons.php">Cancelar</a><?php endif; ?></p></form>

<div class="table-responsive"><table class="table table-sm align-middle bg-white"><thead><tr><th>Cupom</th><th>Empresa</th><th>Código</th><th>Vigência</th><th></th></tr></thead><tbody>
<?php foreach ($linhas as $c): ?><tr><td><?= e($c['titulo']) ?><?= $c['semana'] ? ' <span class="badge text-bg-warning">semana</span>' : '' ?><?= $c['ativo'] ? '' : ' <span class="badge text-bg-secondary">inativo</span>' ?></td><td><?= e($c['empresa_nome']) ?></td><td><code><?= e($c['codigo']) ?></code></td>
<td class="text-nowrap small"><?= $c['data_inicio'] ? e(date('d/m/y', strtotime($c['data_inicio']))) : '—' ?> a <?= $c['data_fim'] ? e(date('d/m/y', strtotime($c['data_fim']))) : '—' ?></td>
<td class="text-nowrap"><a class="btn btn-sm btn-outline-primary" href="?editar=<?= (int)$c['id'] ?>">Editar</a>
<form method="post" class="d-inline" data-confirm="Excluir este cupom?"><?= csrf_campo() ?><input type="hidden" name="id" value="<?= (int)$c['id'] ?>"><button class="btn btn-sm btn-outline-danger" name="acao" value="excluir">Excluir</button></form></td></tr>
<?php endforeach; ?></tbody></table></div>
<?php admin_rodape();
