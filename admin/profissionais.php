<?php
declare(strict_types=1);
require __DIR__ . '/_layout.php';
$u = exigir_login();
$pdo = db();
const TIPOS_S = ['nutricionista' => 'Nutricionista', 'personal' => 'Personal trainer', 'academia' => 'Academia', 'psicologo' => 'Psicólogo', 'psiquiatra' => 'Psiquiatra'];

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    exigir_post_csrf();
    $acao = (string)($_POST['acao'] ?? '');
    $id = (int)($_POST['id'] ?? 0);
    if ($acao === 'excluir') {
        $pdo->prepare('DELETE FROM profissionais_saude WHERE id = ?')->execute([$id]);
        aviso_flash('Profissional excluído.');
    } elseif ($acao === 'ativar') {
        $pdo->prepare('UPDATE profissionais_saude SET ativo = 1 - ativo WHERE id = ?')->execute([$id]);
        aviso_flash('Situação alterada.');
    } elseif ($acao === 'salvar') {
        $tipo = array_key_exists($_POST['tipo'] ?? '', TIPOS_S) ? $_POST['tipo'] : '';
        $nome = mb_substr(trim((string)($_POST['nome'] ?? '')), 0, 160);
        $esp = mb_substr(trim((string)($_POST['especialidade'] ?? '')), 0, 160);
        $end = mb_substr(trim((string)($_POST['endereco'] ?? '')), 0, 200);
        $ig = mb_substr(preg_replace('/[^A-Za-z0-9._@]/', '', (string)($_POST['instagram'] ?? '')), 0, 80);
        $maps = trim((string)($_POST['maps_url'] ?? ''));
        $wa = preg_replace('/\D/', '', (string)($_POST['whatsapp'] ?? ''));
        if (strlen($wa) === 10 || strlen($wa) === 11) $wa = '55' . $wa;
        if ($maps !== '' && !preg_match('#^https://#i', $maps)) $maps = '';
        $maps = mb_substr($maps, 0, 300);
        $ativo = !empty($_POST['ativo']) ? 1 : 0;
        if ($tipo === '' || $nome === '' || strlen($wa) < 12 || strlen($wa) > 13) {
            aviso_flash('Informe tipo, nome e um WhatsApp válido com DDD.', 'danger');
        } elseif ($id) {
            $pdo->prepare('UPDATE profissionais_saude SET tipo=?, nome=?, especialidade=?, endereco=?, whatsapp=?, instagram=?, maps_url=?, ativo=? WHERE id=?')->execute([$tipo, $nome, $esp, $end, $wa, $ig, $maps, $ativo, $id]);
            aviso_flash('Profissional salvo.');
        } else {
            $base = slug_de($nome);
            $slug = $base;
            for ($i = 2; $i < 50; $i++) {
                $ex = $pdo->prepare('SELECT COUNT(*) FROM profissionais_saude WHERE slug = ?');
                $ex->execute([$slug]);
                if (!(int)$ex->fetchColumn()) break;
                $slug = $base . '-' . $i;
            }
            $pdo->prepare('INSERT INTO profissionais_saude (tipo, slug, nome, especialidade, endereco, whatsapp, instagram, maps_url, ativo, demo) VALUES (?,?,?,?,?,?,?,?,?,0)')->execute([$tipo, $slug, $nome, $esp, $end, $wa, $ig, $maps, $ativo]);
            aviso_flash('Profissional cadastrado.');
        }
    }
    voltar('profissionais.php');
}

$edit = null;
if (!empty($_GET['editar'])) {
    $st = $pdo->prepare('SELECT * FROM profissionais_saude WHERE id = ?');
    $st->execute([(int)$_GET['editar']]);
    $edit = $st->fetch() ?: null;
}
$linhas = $pdo->query('SELECT * FROM profissionais_saude ORDER BY tipo, nome')->fetchAll();
$v = fn(string $k) => e($edit[$k] ?? '');
admin_topo('Profissionais de saúde', $u);
aviso_flash();
?>
<form method="post" class="panel mb-4"><?= csrf_campo() ?><input type="hidden" name="acao" value="salvar"><input type="hidden" name="id" value="<?= (int)($edit['id'] ?? 0) ?>">
<h2 class="h5"><?= $edit ? 'Editar profissional' : 'Novo profissional' ?></h2>
<div class="row g-3">
<div class="col-md-3"><label class="form-label" for="tipo">Tipo</label><select class="form-select" id="tipo" name="tipo" required><?php foreach (TIPOS_S as $k => $n): ?><option value="<?= $k ?>"<?= ($edit['tipo'] ?? '') === $k ? ' selected' : '' ?>><?= e($n) ?></option><?php endforeach; ?></select></div>
<div class="col-md-5"><label class="form-label" for="nome">Nome</label><input class="form-control" id="nome" name="nome" maxlength="160" required value="<?= $v('nome') ?>"></div>
<div class="col-md-4"><label class="form-label" for="whatsapp">WhatsApp com DDD</label><input class="form-control" id="whatsapp" name="whatsapp" inputmode="numeric" required value="<?= $v('whatsapp') ?>"></div>
<div class="col-md-6"><label class="form-label" for="esp">Especialidade</label><input class="form-control" id="esp" name="especialidade" maxlength="160" value="<?= $v('especialidade') ?>"></div>
<div class="col-md-6"><label class="form-label" for="end">Endereço</label><input class="form-control" id="end" name="endereco" maxlength="200" value="<?= $v('endereco') ?>"></div>
<div class="col-md-4"><label class="form-label" for="ig">Instagram</label><input class="form-control" id="ig" name="instagram" maxlength="80" placeholder="@perfil" value="<?= $v('instagram') ?>"></div>
<div class="col-md-8"><label class="form-label" for="maps">Link do Google Maps (https)</label><input class="form-control" id="maps" name="maps_url" maxlength="300" value="<?= $v('maps_url') ?>"></div>
<div class="col-12"><div class="form-check"><input class="form-check-input" type="checkbox" id="ativo" name="ativo" value="1"<?= (!$edit || $edit['ativo']) ? ' checked' : '' ?>><label class="form-check-label" for="ativo">Ativo (aparece no site)</label></div></div>
</div><p class="mt-3 mb-0"><button class="btn btn-primary" type="submit">Salvar</button> <?php if ($edit): ?><a class="btn btn-outline-secondary" href="/admin/profissionais.php">Cancelar</a><?php endif; ?></p></form>
<div class="table-responsive"><table class="table table-sm align-middle bg-white"><thead><tr><th>Nome</th><th>Tipo</th><th>Especialidade</th><th>WhatsApp</th><th></th></tr></thead><tbody>
<?php foreach ($linhas as $p): ?><tr><td><?= e($p['nome']) ?><?= $p['demo'] ? ' <span class="badge text-bg-secondary">demo</span>' : '' ?><?= $p['ativo'] ? '' : ' <span class="badge text-bg-secondary">inativo</span>' ?></td><td><?= e(TIPOS_S[$p['tipo']]) ?></td><td><?= e($p['especialidade']) ?></td><td><?= e($p['whatsapp']) ?></td>
<td class="text-nowrap"><a class="btn btn-sm btn-outline-primary" href="?editar=<?= (int)$p['id'] ?>">Editar</a>
<form method="post" class="d-inline"><?= csrf_campo() ?><input type="hidden" name="id" value="<?= (int)$p['id'] ?>"><button class="btn btn-sm btn-outline-secondary" name="acao" value="ativar"><?= $p['ativo'] ? 'Desativar' : 'Ativar' ?></button></form>
<form method="post" class="d-inline" data-confirm="Excluir este profissional?"><?= csrf_campo() ?><input type="hidden" name="id" value="<?= (int)$p['id'] ?>"><button class="btn btn-sm btn-outline-danger" name="acao" value="excluir">Excluir</button></form></td></tr>
<?php endforeach; ?></tbody></table></div>
<?php admin_rodape();
