<?php
declare(strict_types=1);
require __DIR__ . '/_layout.php';
$u = exigir_login();

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    exigir_post_csrf();
    $id = (int)($_POST['id'] ?? 0);
    $acao = (string)($_POST['acao'] ?? '');
    if ($acao === 'excluir') {
        db()->prepare('DELETE FROM agendamentos WHERE id = ?')->execute([$id]);
        aviso_flash('Agendamento excluído (dados pessoais removidos).');
    } elseif (in_array($acao, ['confirmado', 'cancelado', 'pendente'], true)) {
        db()->prepare('UPDATE agendamentos SET status = ? WHERE id = ?')->execute([$acao, $id]);
        aviso_flash('Status atualizado.');
    }
    voltar('agendamentos.php' . (isset($_GET['status']) ? '?status=' . urlencode((string)$_GET['status']) : ''));
}

$status = in_array($_GET['status'] ?? '', ['pendente', 'confirmado', 'cancelado'], true) ? $_GET['status'] : '';
$sql = 'SELECT a.*, e.nome AS empresa_nome, e.whatsapp AS empresa_wa FROM agendamentos a JOIN empresas e ON e.slug = a.empresa_slug'
     . ($status ? ' WHERE a.status = ?' : '') . ' ORDER BY a.data DESC, a.horario DESC LIMIT 200';
$st = db()->prepare($sql);
$st->execute($status ? [$status] : []);
$linhas = $st->fetchAll();

admin_topo('Agendamentos', $u);
aviso_flash();
?>
<p>Filtro: <?php foreach (['' => 'Todos', 'pendente' => 'Pendentes', 'confirmado' => 'Confirmados', 'cancelado' => 'Cancelados'] as $k => $t): ?>
<a class="btn btn-sm btn-<?= $status === $k ? 'primary' : 'outline-secondary' ?>" href="?status=<?= e($k) ?>"><?= e($t) ?></a> <?php endforeach; ?></p>
<div class="table-responsive"><table class="table table-sm align-middle bg-white">
<thead><tr><th>#</th><th>Quando</th><th>Empresa / serviço</th><th>Cliente</th><th>Status</th><th>Ações</th></tr></thead><tbody>
<?php foreach ($linhas as $a): ?>
<tr><td><?= (int)$a['id'] ?></td>
<td class="text-nowrap"><?= e(date('d/m/Y', strtotime($a['data']))) ?> <?= e($a['horario']) ?></td>
<td><?= e($a['empresa_nome']) ?><br><small class="text-secondary"><?= e($a['servico']) ?> (<?= (int)$a['duracao_min'] ?> min)</small></td>
<td><?= e($a['cliente_nome']) ?><br><small><a href="https://wa.me/55<?= e($a['cliente_whatsapp']) ?>?text=<?= rawurlencode("Olá, {$a['cliente_nome']}! Confirmando seu horário em {$a['empresa_nome']}: " . date('d/m/Y', strtotime($a['data'])) . " às {$a['horario']} ({$a['servico']}).") ?>" target="_blank" rel="noopener">WhatsApp</a></small>
<?php if ($a['observacoes']): ?><br><small class="text-secondary"><?= e($a['observacoes']) ?></small><?php endif; ?></td>
<td><?= badge_status($a['status']) ?></td>
<td class="text-nowrap"><form method="post" class="d-inline"><?= csrf_campo() ?><input type="hidden" name="id" value="<?= (int)$a['id'] ?>">
<?php if ($a['status'] !== 'confirmado'): ?><button class="btn btn-sm btn-success" name="acao" value="confirmado">Confirmar</button><?php endif; ?>
<?php if ($a['status'] !== 'cancelado'): ?><button class="btn btn-sm btn-outline-secondary" name="acao" value="cancelado">Cancelar</button><?php endif; ?>
</form>
<form method="post" class="d-inline" data-confirm="Excluir definitivamente este agendamento?"><?= csrf_campo() ?><input type="hidden" name="id" value="<?= (int)$a['id'] ?>"><button class="btn btn-sm btn-outline-danger" name="acao" value="excluir">Excluir</button></form></td></tr>
<?php endforeach; if (!$linhas): ?><tr><td colspan="6" class="text-center text-secondary">Nenhum agendamento.</td></tr><?php endif; ?>
</tbody></table></div>
<?php admin_rodape();
