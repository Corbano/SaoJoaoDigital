<?php
declare(strict_types=1);
require __DIR__ . '/_layout.php';
$u = exigir_login();
$pdo = db();
const TIPOS_P = ['imobiliaria' => 'Imobiliária (Imóveis)', 'garagem' => 'Garagem / loja (Veículos)'];

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    exigir_post_csrf();
    $acao = (string)($_POST['acao'] ?? '');
    $id = (int)($_POST['id'] ?? 0);
    if ($acao === 'excluir') {
        $pdo->prepare('DELETE FROM parceiros WHERE id = ?')->execute([$id]);
        aviso_flash('Parceiro excluído.');
    } elseif ($acao === 'ativar') {
        $pdo->prepare('UPDATE parceiros SET ativo = 1 - ativo WHERE id = ?')->execute([$id]);
        aviso_flash('Situação alterada.');
    } elseif ($acao === 'salvar') {
        $tipo = array_key_exists($_POST['tipo'] ?? '', TIPOS_P) ? $_POST['tipo'] : '';
        $nome = mb_substr(trim((string)($_POST['nome'] ?? '')), 0, 160);
        $wa = preg_replace('/\D/', '', (string)($_POST['whatsapp'] ?? ''));
        if (strlen($wa) === 10 || strlen($wa) === 11) $wa = '55' . $wa;
        if ($tipo === '' || $nome === '' || strlen($wa) < 12 || strlen($wa) > 13) {
            aviso_flash('Informe tipo, nome e um WhatsApp válido com DDD.', 'danger');
        } elseif ($id) {
            $pdo->prepare('UPDATE parceiros SET tipo=?, nome=?, whatsapp=?, ativo=? WHERE id=?')->execute([$tipo, $nome, $wa, !empty($_POST['ativo']) ? 1 : 0, $id]);
            aviso_flash('Parceiro salvo.');
        } else {
            $base = slug_de($nome);
            $slug = $base;
            for ($i = 2; $i < 50; $i++) {
                $ex = $pdo->prepare('SELECT COUNT(*) FROM parceiros WHERE tipo = ? AND slug = ?');
                $ex->execute([$tipo, $slug]);
                if (!(int)$ex->fetchColumn()) break;
                $slug = $base . '-' . $i;
            }
            $pdo->prepare('INSERT INTO parceiros (tipo, slug, nome, whatsapp, ativo, demo) VALUES (?,?,?,?,?,0)')->execute([$tipo, $slug, $nome, $wa, !empty($_POST['ativo']) ? 1 : 0]);
            aviso_flash('Parceiro cadastrado.');
        }
    }
    voltar('parceiros.php');
}

$edit = null;
if (!empty($_GET['editar'])) {
    $st = $pdo->prepare('SELECT * FROM parceiros WHERE id = ?');
    $st->execute([(int)$_GET['editar']]);
    $edit = $st->fetch() ?: null;
}
$linhas = $pdo->query('SELECT * FROM parceiros ORDER BY tipo, nome')->fetchAll();
admin_topo('Parceiros: imobiliárias e garagens', $u);
aviso_flash();
?>
<form method="post" class="panel mb-4"><?= csrf_campo() ?><input type="hidden" name="acao" value="salvar"><input type="hidden" name="id" value="<?= (int)($edit['id'] ?? 0) ?>">
<h2 class="h5"><?= $edit ? 'Editar parceiro' : 'Novo parceiro' ?></h2>
<div class="row g-3">
<div class="col-md-4"><label class="form-label" for="tipo">Sistema</label><select class="form-select" id="tipo" name="tipo" required><?php foreach (TIPOS_P as $k => $n): ?><option value="<?= $k ?>"<?= ($edit['tipo'] ?? '') === $k ? ' selected' : '' ?>><?= e($n) ?></option><?php endforeach; ?></select></div>
<div class="col-md-4"><label class="form-label" for="nome">Nome</label><input class="form-control" id="nome" name="nome" maxlength="160" required value="<?= e($edit['nome'] ?? '') ?>"></div>
<div class="col-md-4"><label class="form-label" for="whatsapp">WhatsApp com DDD</label><input class="form-control" id="whatsapp" name="whatsapp" inputmode="numeric" required value="<?= e($edit['whatsapp'] ?? '') ?>"></div>
<div class="col-12"><div class="form-check"><input class="form-check-input" type="checkbox" id="ativo" name="ativo" value="1"<?= (!$edit || $edit['ativo']) ? ' checked' : '' ?>><label class="form-check-label" for="ativo">Ativo (aparece no site)</label></div></div>
</div><p class="mt-3 mb-0"><button class="btn btn-primary" type="submit">Salvar</button> <?php if ($edit): ?><a class="btn btn-outline-secondary" href="/admin/parceiros.php">Cancelar</a><?php endif; ?></p></form>
<div class="table-responsive"><table class="table table-sm align-middle bg-white"><thead><tr><th>Nome</th><th>Sistema</th><th>WhatsApp</th><th></th></tr></thead><tbody>
<?php foreach ($linhas as $p): ?><tr><td><?= e($p['nome']) ?><?= $p['demo'] ? ' <span class="badge text-bg-secondary">demo</span>' : '' ?><?= $p['ativo'] ? '' : ' <span class="badge text-bg-secondary">inativo</span>' ?></td><td><?= e(TIPOS_P[$p['tipo']]) ?></td><td><?= e($p['whatsapp']) ?></td>
<td class="text-nowrap"><a class="btn btn-sm btn-outline-primary" href="?editar=<?= (int)$p['id'] ?>">Editar</a>
<form method="post" class="d-inline"><?= csrf_campo() ?><input type="hidden" name="id" value="<?= (int)$p['id'] ?>"><button class="btn btn-sm btn-outline-secondary" name="acao" value="ativar"><?= $p['ativo'] ? 'Desativar' : 'Ativar' ?></button></form>
<form method="post" class="d-inline" data-confirm="Excluir este parceiro?"><?= csrf_campo() ?><input type="hidden" name="id" value="<?= (int)$p['id'] ?>"><button class="btn btn-sm btn-outline-danger" name="acao" value="excluir">Excluir</button></form></td></tr>
<?php endforeach; ?></tbody></table></div>
<?php admin_rodape();
