<?php
declare(strict_types=1);
/** Profissionais de saúde por tipo, com contato direto no WhatsApp (o resultado das calculadoras pode ir na mensagem). */
require __DIR__ . '/src/pagina.php';

$tipos = tipos_saude();
$porTipo = [];
foreach ($tipos as $t) $porTipo[$t['tipo']] = $t;
$tipo = get_opt('tipo', array_keys($porTipo));
$r = get_txt('r', 200);
$lista = $tipo ? rodizio(profissionais($tipo)) : [];
$info = $tipo ? $porTipo[$tipo] : null;

function url_externa(string $u): string
{
    return preg_match('#^https://#i', $u) ? $u : '';
}

pagina_topo([
    'titulo' => $info ? $info['titulo'] . ' em São João da Boa Vista' : 'Profissionais de saúde em São João da Boa Vista',
    'desc' => $info ? $info['descricao'] . ' Contato direto pelo WhatsApp.' : 'Nutricionistas, personal trainers, academias, psicólogos e psiquiatras de São João da Boa Vista, com contato direto pelo WhatsApp.',
    'path' => '/profissionais-saude/' . ($tipo ? '?tipo=' . $tipo : ''), 'h1' => $info ? $info['titulo'] : 'Profissionais de saúde', 'sub' => $info ? $info['descricao'] : 'Escolha a área e fale direto com o profissional.',
    'crumbs' => $info ? [['/', 'Início'], ['/saude/', 'Saúde'], ['/profissionais-saude/', 'Profissionais'], ['', $info['titulo']]] : [['/', 'Início'], ['/saude/', 'Saúde'], ['/profissionais-saude/', 'Profissionais']],
]);
echo aviso_demo();
?>
<?php foreach (['corpo' => 'Corpo', 'mente' => 'Mente'] as $g => $rot): ?>
  <h2 class="h4 mt-2"><?= $rot ?></h2>
  <div class="row g-3 mb-3">
    <?php foreach ($tipos as $t): if ($t['grupo'] !== $g) continue; ?>
      <div class="col-12 col-md-6 col-lg-4"><a class="card h-100 text-decoration-none<?= $tipo === $t['tipo'] ? ' parceiro ativo' : '' ?>" href="<?= e(url_com('/profissionais-saude/', ['tipo' => $t['tipo'], 'r' => $r])) ?>#lista"><div class="card-body"><div class="fs-2" aria-hidden="true"><?= e($t['emoji']) ?></div><h3 class="h5 mt-2"><?= e($t['titulo']) ?></h3><p class="meta mb-1"><?= e($t['descricao']) ?></p><span class="badge text-bg-warning"><?= e($t['badge']) ?></span></div></a></div>
    <?php endforeach; ?>
  </div>
<?php endforeach; ?>

<?php if ($info): ?>
<section class="panel" id="lista">
  <h2 class="h4"><?= e($info['titulo']) ?></h2>
  <?php if ($r): ?><p class="meta">Seu resultado será incluído na mensagem: “<?= e($r) ?>”. <a href="<?= e(url_com('/profissionais-saude/', ['tipo' => $tipo])) ?>#lista">Remover</a></p><?php endif; ?>
  <?php if (!$lista): ?><p>Ainda não há profissionais cadastrados nesta área. <a href="/cadastrar/">Cadastre-se</a>.</p><?php endif; ?>
  <div class="row g-3">
    <?php foreach ($lista as $p):
        $m = "Olá, {$p['nome']}! Vi seu perfil no São João Digital." . ($r ? "\n\n📊 Meu resultado: $r" : '') . "\n\nGostaria de " . $info['msg'] . '. 😊';
        $ig = $p['instagram'] !== '' ? 'https://www.instagram.com/' . rawurlencode(ltrim($p['instagram'], '@')) . '/' : '';
        $mp = url_externa($p['maps_url']); ?>
      <div class="col-12 col-md-6"><article class="card h-100"><div class="card-body d-flex gap-3">
        <span class="avatar av-<?= crc32($p['slug']) % 6 ?>" aria-hidden="true"><?= e(iniciais($p['nome'])) ?></span>
        <div class="flex-grow-1"><h3 class="h6 mb-1"><?= e($p['nome']) ?></h3><p class="meta mb-1"><?= e($p['especialidade']) ?><?= $p['endereco'] !== '' ? ' · ' . e($p['endereco']) : '' ?></p>
          <p class="mb-0 d-flex flex-wrap gap-2 align-items-center"><?= botao_whatsapp('saude', $p['slug'], $tipo, $m, 'Falar no WhatsApp', 'btn btn-success btn-sm') ?>
            <?php if ($ig): ?><a class="btn btn-sm btn-outline-secondary" href="<?= e($ig) ?>" rel="noopener" target="_blank">Instagram</a><?php endif; ?>
            <?php if ($mp): ?><a class="btn btn-sm btn-outline-secondary" href="<?= e($mp) ?>" rel="noopener" target="_blank">Mapa</a><?php endif; ?></p></div>
      </div></article></div>
    <?php endforeach; ?>
  </div>
  <p class="meta mt-3 mb-0">Ordem rotativa a cada 5 minutos. O São João Digital não presta atendimento de saúde; valores e horários são combinados com o profissional.</p>
</section>
<?php endif; ?>
<p class="meta">Veja também <a href="/saude/">calculadoras de saúde</a>, <a href="/parceiros-saude/">primeira consulta gratuita</a> e <a href="/guia-medico/">guia médico</a>.</p>
<?php pagina_rodape();
