<?php
declare(strict_types=1);
require __DIR__ . '/_layout.php';
$u = exigir_login();
$pdo = db();
$por_sistema = $pdo->query("SELECT sistema, COUNT(*) n, SUM(criado_em >= NOW() - INTERVAL 7 DAY) n7, SUM(criado_em >= NOW() - INTERVAL 30 DAY) n30 FROM cliques GROUP BY sistema ORDER BY n DESC")->fetchAll();
$por_parceiro = $pdo->query("SELECT sistema, parceiro_slug, COUNT(*) n, SUM(criado_em >= NOW() - INTERVAL 30 DAY) n30, MAX(criado_em) ultimo FROM cliques GROUP BY sistema, parceiro_slug ORDER BY n DESC LIMIT 100")->fetchAll();
$nomes = [];
foreach ($pdo->query('SELECT slug, nome FROM parceiros') as $r) $nomes[$r['slug']] = $r['nome'];
foreach ($pdo->query('SELECT slug, nome FROM profissionais_saude') as $r) $nomes[$r['slug']] = $r['nome'];
admin_topo('Cliques nos funis (imóveis, veículos, saúde)', $u);
?>
<p class="text-secondary">Conta quantas vezes cada parceiro recebeu um contato pelo site. Os dados do perfil do cliente não são guardados.</p>
<div class="row g-3 mb-4"><?php foreach ($por_sistema as $s): ?><div class="col-md-4"><div class="panel mb-0"><h2 class="h6 text-capitalize"><?= e($s['sistema']) ?></h2><p class="fs-3 mb-0"><?= (int)$s['n'] ?> <small class="fs-6 text-secondary">total · <?= (int)$s['n7'] ?> em 7 dias · <?= (int)$s['n30'] ?> em 30</small></p></div></div><?php endforeach; if (!$por_sistema): ?><p>Ainda não há cliques.</p><?php endif; ?></div>
<div class="table-responsive"><table class="table table-sm bg-white"><thead><tr><th>Sistema</th><th>Parceiro</th><th class="text-end">Total</th><th class="text-end">30 dias</th><th>Último</th></tr></thead><tbody>
<?php foreach ($por_parceiro as $p): ?><tr><td><?= e($p['sistema']) ?></td><td><?= e($nomes[$p['parceiro_slug']] ?? $p['parceiro_slug']) ?></td><td class="text-end"><?= (int)$p['n'] ?></td><td class="text-end"><?= (int)$p['n30'] ?></td><td><?= e(date('d/m/Y H:i', strtotime($p['ultimo']))) ?></td></tr><?php endforeach; ?>
</tbody></table></div>
<?php admin_rodape();
