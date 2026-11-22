<?php
declare(strict_types=1);
require __DIR__ . '/_layout.php';
$u = exigir_login();
$q = fn(string $sql) => (int)db()->query($sql)->fetchColumn();
$cards = [
    ['Agendamentos pendentes', $q("SELECT COUNT(*) FROM agendamentos WHERE status='pendente' AND data >= CURDATE()"), 'agendamentos.php?status=pendente', 'warning'],
    ['Pedidos novos', $q("SELECT COUNT(*) FROM pedidos WHERE status='novo'"), 'pedidos.php?status=novo', 'warning'],
    ['Cadastros para analisar', $q("SELECT COUNT(*) FROM cadastros_pendentes WHERE status='pendente'"), 'cadastros.php', 'danger'],
    ['Empresas ativas', $q('SELECT COUNT(*) FROM empresas WHERE ativa=1'), 'empresas.php', 'primary'],
    ['Ofertas no comparador', $q('SELECT COUNT(*) FROM ofertas WHERE ativo=1'), 'ofertas.php', 'primary'],
];
admin_topo('Painel', $u);
aviso_flash();
?>
<div class="row g-3"><?php foreach ($cards as [$t, $n, $href, $cor]): ?>
<div class="col-6 col-lg-4"><a class="card text-decoration-none h-100 shadow-sm" href="/admin/<?= e($href) ?>"><div class="card-body"><div class="text-secondary small"><?= e($t) ?></div><div class="display-6 text-<?= e($cor) ?>"><?= $n ?></div></div></a></div>
<?php endforeach; ?></div>
<p class="mt-4 text-secondary">As páginas públicas continuam estáticas (rápidas). Para refletir mudanças de empresas/ofertas feitas aqui no site, use <a href="/admin/dados.php">Dados</a> → exportar, e depois gere as páginas (<code>node tools/build.js</code>).</p>
<?php admin_rodape();
