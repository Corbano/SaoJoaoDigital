<?php
declare(strict_types=1);
require __DIR__ . '/_layout.php';
$u = exigir_login();
$cats = categorias_json();
$pdo = db();

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    exigir_post_csrf();
    $slug = (string)($_POST['slug'] ?? '');
    $st = $pdo->prepare('SELECT dados FROM empresas WHERE slug = ?');
    $st->execute([$slug]);
    $json = $st->fetchColumn();
    if ($json !== false && ($_POST['acao'] ?? '') === 'salvar') {
        $d = json_decode($json, true);
        $max = fn(string $k, int $n) => mb_substr(trim((string)($_POST[$k] ?? '')), 0, $n);
        $d['nome'] = $max('nome', 200) ?: $d['nome'];
        $d['resumo'] = $max('resumo', 300);
        $d['descricao'] = $max('descricao', 3000);
        $d['telefone'] = $max('telefone', 20);
        $wa = preg_replace('/\D/', '', (string)($_POST['whatsapp'] ?? ''));
        $d['whatsapp'] = substr($wa, 0, 20);
        $d['plano'] = ($_POST['plano'] ?? '') === 'premium' ? 'premium' : 'gratuito';
        $d['ia'] = !empty($_POST['ia']);
        $d['destaque'] = !empty($_POST['destaque']);
        $cat = (string)($_POST['categoria'] ?? '');
        if (isset($cats[$cat])) $d['categoria'] = $cat;
        $d['atualizado'] = date('Y-m-d');
        $pdo->prepare('UPDATE empresas SET nome=?, categoria=?, plano=?, whatsapp=?, ativa=?, dados=? WHERE slug=?')
            ->execute([$d['nome'], $d['categoria'], $d['plano'], $d['whatsapp'], !empty($_POST['ativa']) ? 1 : 0, json_encode($d, JSON_UNESCAPED_UNICODE), $slug]);
        aviso_flash('Empresa salva.');
    }
    voltar('empresas.php');
}

$edit = null;
if (!empty($_GET['editar'])) {
    $st = $pdo->prepare('SELECT * FROM empresas WHERE slug = ?');
    $st->execute([(string)$_GET['editar']]);
    $edit = $st->fetch() ?: null;
    if ($edit) $edit['d'] = json_decode($edit['dados'], true);
}
$linhas = $pdo->query('SELECT slug, nome, categoria, plano, ativa FROM empresas ORDER BY nome')->fetchAll();

admin_topo('Empresas', $u);
aviso_flash();
if ($edit): $d = $edit['d']; ?>
<form method="post" class="panel"><?= csrf_campo() ?><input type="hidden" name="acao" value="salvar"><input type="hidden" name="slug" value="<?= e($edit['slug']) ?>">
<h2 class="h5">Editar: <?= e($edit['nome']) ?> <small class="text-secondary">(/empresas/<?= e($edit['slug']) ?>/)</small></h2>
<div class="row g-3">
<div class="col-md-8"><label class="form-label" for="nome">Nome</label><input class="form-control" id="nome" name="nome" value="<?= e($d['nome']) ?>" maxlength="200" required></div>
<div class="col-md-4"><label class="form-label" for="categoria">Categoria</label><select class="form-select" id="categoria" name="categoria"><?php foreach ($cats as $s => $c): ?><option value="<?= e($s) ?>"<?= $d['categoria'] === $s ? ' selected' : '' ?>><?= e($c['nome']) ?></option><?php endforeach; ?></select></div>
<div class="col-12"><label class="form-label" for="resumo">Resumo (até 300)</label><input class="form-control" id="resumo" name="resumo" value="<?= e($d['resumo']) ?>" maxlength="300"></div>
<div class="col-12"><label class="form-label" for="descricao">Descrição</label><textarea class="form-control" id="descricao" name="descricao" rows="4" maxlength="3000"><?= e($d['descricao']) ?></textarea></div>
<div class="col-md-4"><label class="form-label" for="telefone">Telefone</label><input class="form-control" id="telefone" name="telefone" value="<?= e($d['telefone']) ?>" maxlength="20"></div>
<div class="col-md-4"><label class="form-label" for="whatsapp">WhatsApp (com 55)</label><input class="form-control" id="whatsapp" name="whatsapp" value="<?= e($d['whatsapp']) ?>" maxlength="20"></div>
<div class="col-md-4"><label class="form-label" for="plano">Plano</label><select class="form-select" id="plano" name="plano"><option value="gratuito"<?= $edit['plano'] === 'gratuito' ? ' selected' : '' ?>>Gratuito</option><option value="premium"<?= $edit['plano'] === 'premium' ? ' selected' : '' ?>>Premium</option></select></div>
<div class="col-12 d-flex gap-4">
<div class="form-check"><input class="form-check-input" type="checkbox" id="ia" name="ia" value="1"<?= !empty($d['ia']) ? ' checked' : '' ?>><label class="form-check-label" for="ia">Assistente de IA</label></div>
<div class="form-check"><input class="form-check-input" type="checkbox" id="destaque" name="destaque" value="1"<?= !empty($d['destaque']) ? ' checked' : '' ?>><label class="form-check-label" for="destaque">Destaque na home</label></div>
<div class="form-check"><input class="form-check-input" type="checkbox" id="ativa" name="ativa" value="1"<?= $edit['ativa'] ? ' checked' : '' ?>><label class="form-check-label" for="ativa">Ativa (publicada)</label></div></div>
</div><p class="mt-3 mb-0"><button class="btn btn-primary" type="submit">Salvar</button> <a class="btn btn-outline-secondary" href="/admin/empresas.php">Voltar</a></p></form>
<?php else: ?>
<div class="table-responsive"><table class="table table-sm align-middle bg-white"><thead><tr><th>Empresa</th><th>Categoria</th><th>Plano</th><th>Situação</th><th></th></tr></thead><tbody>
<?php foreach ($linhas as $r): ?><tr><td><?= e($r['nome']) ?><br><small class="text-secondary"><?= e($r['slug']) ?></small></td><td><?= e($cats[$r['categoria']]['nome'] ?? $r['categoria']) ?></td>
<td><?= e($r['plano']) ?></td><td><?= $r['ativa'] ? '<span class="badge text-bg-success">ativa</span>' : '<span class="badge text-bg-secondary">oculta</span>' ?></td>
<td><a class="btn btn-sm btn-outline-primary" href="?editar=<?= e(rawurlencode($r['slug'])) ?>">Editar</a></td></tr><?php endforeach; ?>
</tbody></table></div>
<?php endif; admin_rodape();
