<?php
declare(strict_types=1);
require __DIR__ . '/_layout.php';
$u = exigir_login();

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    exigir_post_csrf();
    $id = (int)($_POST['id'] ?? 0);
    $acao = (string)($_POST['acao'] ?? '');
    if ($acao === 'excluir') {
        db()->prepare('DELETE FROM pedidos WHERE id = ?')->execute([$id]);
        aviso_flash('Pedido excluído.');
    } elseif (in_array($acao, ['novo', 'em_preparo', 'entregue', 'cancelado'], true)) {
        db()->prepare('UPDATE pedidos SET status = ? WHERE id = ?')->execute([$acao, $id]);
        aviso_flash('Status atualizado.');
    }
    voltar('pedidos.php');
}

$status = in_array($_GET['status'] ?? '', ['novo', 'em_preparo', 'entregue', 'cancelado'], true) ? $_GET['status'] : '';
$st = db()->prepare('SELECT p.*, e.nome AS empresa_nome FROM pedidos p JOIN empresas e ON e.slug = p.empresa_slug' . ($status ? ' WHERE p.status = ?' : '') . ' ORDER BY p.id DESC LIMIT 200');
$st->execute($status ? [$status] : []);
$linhas = $st->fetchAll();

admin_topo('Pedidos do cardápio', $u);
aviso_flash();
?>
<p>Filtro: <?php foreach (['' => 'Todos', 'novo' => 'Novos', 'em_preparo' => 'Em preparo', 'entregue' => 'Entregues', 'cancelado' => 'Cancelados'] as $k => $t): ?>
<a class="btn btn-sm btn-<?= $status === $k ? 'primary' : 'outline-secondary' ?>" href="?status=<?= e($k) ?>"><?= e($t) ?></a> <?php endforeach; ?></p>
<div class="table-responsive"><table class="table table-sm align-middle bg-white">
<thead><tr><th>#</th><th>Quando</th><th>Empresa</th><th>Itens</th><th>Total</th><th>Cliente</th><th>Status</th><th>Ações</th></tr></thead><tbody>
<?php foreach ($linhas as $p): $itens = json_decode($p['itens'], true) ?: []; ?>
<tr><td><?= (int)$p['id'] ?></td><td class="text-nowrap"><?= e(date('d/m H:i', strtotime($p['criado_em']))) ?></td><td><?= e($p['empresa_nome']) ?></td>
<td><?php foreach ($itens as $i): ?><?= (int)$i['qtd'] ?>× <?= e($i['nome']) ?><br><?php endforeach; ?></td>
<td class="text-nowrap"><?= brl_php((float)$p['total']) ?></td>
<td><?= e($p['cliente_nome']) ?><br><small class="text-secondary"><?= e($p['tipo_entrega']) ?><?= $p['endereco'] ? ' — ' . e($p['endereco']) : '' ?><?= $p['pagamento'] ? ' · ' . e($p['pagamento']) : '' ?></small><?= $p['observacoes'] ? '<br><small>' . e($p['observacoes']) . '</small>' : '' ?></td>
<td><?= badge_status($p['status']) ?></td>
<td class="text-nowrap"><form method="post" class="d-inline"><?= csrf_campo() ?><input type="hidden" name="id" value="<?= (int)$p['id'] ?>">
<select name="acao" class="form-select form-select-sm d-inline w-auto"><?php foreach (['novo', 'em_preparo', 'entregue', 'cancelado'] as $s): ?><option value="<?= $s ?>"<?= $p['status'] === $s ? ' selected' : '' ?>><?= e(str_replace('_', ' ', $s)) ?></option><?php endforeach; ?></select>
<button class="btn btn-sm btn-primary" type="submit">Salvar</button></form>
<form method="post" class="d-inline" data-confirm="Excluir este pedido?"><?= csrf_campo() ?><input type="hidden" name="id" value="<?= (int)$p['id'] ?>"><button class="btn btn-sm btn-outline-danger" name="acao" value="excluir">Excluir</button></form></td></tr>
<?php endforeach; if (!$linhas): ?><tr><td colspan="8" class="text-center text-secondary">Nenhum pedido.</td></tr><?php endif; ?>
</tbody></table></div>
<?php admin_rodape();
