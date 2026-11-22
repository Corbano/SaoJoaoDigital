<?php
declare(strict_types=1);
/** Parceiros de saúde: ofertas de primeira consulta, avaliação ou aula experimental. */
require __DIR__ . '/src/pagina.php';

$tipos = tipos_saude();
pagina_topo([
    'titulo' => 'Primeira consulta, avaliação ou aula experimental gratuita', 'desc' => 'Psicólogos, nutricionistas, personal trainers e academias de São João da Boa Vista com primeira consulta, avaliação ou aula experimental.',
    'path' => '/parceiros-saude/', 'h1' => 'Parceiros de saúde', 'sub' => 'Dê o primeiro passo com uma consulta, avaliação ou aula experimental.',
    'crumbs' => [['/', 'Início'], ['/saude/', 'Saúde'], ['/parceiros-saude/', 'Parceiros']],
]);
echo aviso_demo();
?>
<div class="row g-3">
  <?php foreach ($tipos as $t): $n = count(profissionais($t['tipo'])); ?>
    <div class="col-12 col-md-6 col-lg-4"><article class="card h-100"><div class="card-body d-flex flex-column">
      <div class="fs-1" aria-hidden="true"><?= e($t['emoji']) ?></div>
      <h2 class="h5 mt-2"><?= e($t['titulo']) ?></h2>
      <p><span class="badge text-bg-warning"><?= e($t['badge']) ?></span></p>
      <p><?= e($t['descricao']) ?></p>
      <p class="meta mt-auto"><?= $n ?> <?= $n === 1 ? 'profissional' : 'profissionais' ?> cadastrados</p>
      <a class="btn btn-primary" href="<?= e(url_com('/profissionais-saude/', ['tipo' => $t['tipo']])) ?>#lista">Ver <?= e(mb_strtolower($t['titulo'])) ?></a>
    </div></article></div>
  <?php endforeach; ?>
</div>
<p class="meta mt-3">A oferta (gratuita ou não) é definida por cada profissional; confirme ao entrar em contato. Veja também <a href="/saude/">calculadoras de saúde</a> e <a href="/guia-medico/">guia médico</a>.</p>
<?php pagina_rodape();
