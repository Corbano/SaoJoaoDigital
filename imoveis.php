<?php
declare(strict_types=1);
/**
 * Micro-sistema Imóveis: escolher a imobiliária, informar a intenção (comprar, alugar ou vender),
 * preencher o perfil e falar no WhatsApp. Tudo montado pelo servidor (sem JavaScript).
 */
require __DIR__ . '/src/pagina.php';

const IMV_TIPOS = ['Casa', 'Apartamento', 'Terreno', 'Comercial', 'Chácara / Sítio'];
$imobs = rodizio(parceiros('imobiliaria'));
$imob = achar($imobs, get_txt('i'));
$q = $imob ? get_opt('q', ['comprar', 'alugar', 'vender']) : '';
$f = [
    'tipo' => get_opt('tipo', IMV_TIPOS), 'renda' => get_num('renda'), 'entrada' => get_num('entrada'), 'parcela' => get_num('parcela'),
    'quartos' => get_opt('quartos', ['1', '2', '3', '4+']), 'vagas' => get_opt('vagas', ['0', '1', '2', '3+']), 'bairros' => get_txt('bairros', 120),
    'local' => get_txt('local', 140), 'valor' => get_num('valor'), 'area' => get_num('area'), 'caract' => get_txt('caract', 200),
];
$enviar = $q !== '' && isset($_GET['enviar']);
$msg = '';
$erro = '';

if ($enviar) {
    $ok = $q === 'vender' ? ($f['tipo'] || $f['local'] || $f['valor']) : ($f['renda'] || $f['parcela'] || $f['tipo']);
    if (!$ok) {
        $erro = $q === 'vender' ? 'Informe ao menos o tipo, a localização ou o valor pretendido.' : 'Informe ao menos a renda, a parcela ou aluguel máximo, ou o tipo de imóvel.';
        $enviar = false;
    } else {
        $l = ["Olá, *{$imob['nome']}*! 👋", ''];
        if ($q === 'vender') {
            array_push($l, 'Tenho um imóvel para *VENDER* e gostaria de uma avaliação.', '', '📋 *Detalhes do imóvel:*');
            if ($f['tipo']) $l[] = "• 🏠 Tipo: {$f['tipo']}";
            if ($f['local']) $l[] = "• 📍 Localização: {$f['local']}";
            if ($f['valor']) $l[] = "• 💰 Valor pretendido: R$ {$f['valor']}";
            if ($f['area']) $l[] = "• 📐 Área: {$f['area']} m²";
            if ($f['caract']) $l[] = "• ✨ Características: {$f['caract']}";
        } else {
            array_push($l, 'Tenho interesse em *' . ($q === 'comprar' ? 'COMPRAR' : 'ALUGAR') . '* um imóvel.', '', '📋 *Meu perfil:*');
            if ($f['renda']) $l[] = "• 💰 Renda familiar: R$ {$f['renda']}";
            if ($q === 'comprar' && $f['entrada']) $l[] = "• 💵 Entrada disponível: R$ {$f['entrada']}";
            if ($f['parcela']) $l[] = '• 📅 ' . ($q === 'alugar' ? 'Aluguel máximo' : 'Parcela máxima') . ": R$ {$f['parcela']}";
            if ($f['tipo']) $l[] = "• 🏠 Tipo: {$f['tipo']}";
            if ($f['quartos']) $l[] = "• 🛏 Quartos: {$f['quartos']}";
            if ($f['vagas']) $l[] = "• 🚗 Vagas: {$f['vagas']}";
            if ($f['bairros']) $l[] = "• 📍 Bairros: {$f['bairros']}";
        }
        array_push($l, '', 'Aguardo o contato! 😊');
        $msg = implode("\n", $l);
    }
}

$faq = [
    ['Como funciona?', 'Você escolhe a imobiliária, informa o que procura e o site monta uma mensagem pronta para você enviar pelo WhatsApp. Nada é cobrado e o site não participa da negociação.'],
    ['A ordem das imobiliárias é fixa?', 'Não. A ordem muda a cada 5 minutos para dar a mesma visibilidade a todas.'],
    ['Posso vender meu imóvel por aqui?', 'Sim. Escolha "Vender", descreva o imóvel e peça uma avaliação à imobiliária.'],
    ['Meus dados ficam salvos?', 'O perfil que você digita só vai na mensagem do WhatsApp. O site registra apenas a contagem de cliques por imobiliária, sem os seus dados.'],
];

pagina_topo([
    'titulo' => 'Imóveis em São João da Boa Vista: comprar, alugar ou vender', 'desc' => 'Escolha uma imobiliária de São João da Boa Vista, informe seu perfil e fale direto no WhatsApp para comprar, alugar ou vender um imóvel.',
    'path' => '/imoveis/', 'h1' => 'Imóveis', 'sub' => 'Escolha a imobiliária, diga o que procura e fale no WhatsApp.',
    'crumbs' => [['/', 'Início'], ['/imoveis/', 'Imóveis']], 'jsonld' => faq_ld($faq),
]);
echo aviso_demo();
?>
<section class="panel" id="passo1">
  <h2 class="h4">1. Escolha a imobiliária</h2>
  <p class="meta">Ordem rotativa a cada 5 minutos, para dar igualdade entre os anunciantes.</p>
  <?= grade_parceiros($imobs, fn($p) => url_com('/imoveis/', ['i' => $p['slug']]) . '#passo2', $imob['slug'] ?? '') ?>
</section>

<?php if ($imob): ?>
<section class="panel" id="passo2">
  <h2 class="h4">2. O que você deseja fazer?</h2>
  <p class="meta">Imobiliária escolhida: <strong><?= e($imob['nome']) ?></strong> · <a href="/imoveis/#passo1">trocar</a></p>
  <div class="intencoes">
    <?php foreach (['comprar' => ['Comprar', '🟢'], 'alugar' => ['Alugar', '🔵'], 'vender' => ['Vender', '🟠']] as $k => [$rot, $emo]): ?>
      <a class="intencao<?= $q === $k ? ' ativo' : '' ?>" href="<?= e(url_com('/imoveis/', ['i' => $imob['slug'], 'q' => $k])) ?>#passo3"<?= $q === $k ? ' aria-current="true"' : '' ?>><span aria-hidden="true"><?= $emo ?></span> <?= $rot ?></a>
    <?php endforeach; ?>
  </div>
</section>
<?php endif; ?>

<?php if ($q && !$enviar): ?>
<section class="panel" id="passo3">
  <h2 class="h4">3. <?= $q === 'vender' ? 'Conte sobre o seu imóvel' : 'Conte sobre o seu perfil' ?></h2>
  <?php if ($erro): ?><p class="text-danger" role="alert"><?= e($erro) ?></p><?php endif; ?>
  <form method="get" action="/imoveis/#resumo" class="row g-3">
    <input type="hidden" name="i" value="<?= e($imob['slug']) ?>"><input type="hidden" name="q" value="<?= e($q) ?>"><input type="hidden" name="enviar" value="1">
    <div class="col-md-6"><label class="form-label" for="tipo">Tipo de imóvel</label><select class="form-select" id="tipo" name="tipo"><option value="">Selecione</option><?php foreach (IMV_TIPOS as $t): ?><option<?= $f['tipo'] === $t ? ' selected' : '' ?>><?= e($t) ?></option><?php endforeach; ?></select></div>
    <?php if ($q === 'vender'): ?>
      <div class="col-md-6"><label class="form-label" for="valor">Valor pretendido (R$)</label><input class="form-control" id="valor" name="valor" inputmode="decimal" placeholder="250.000,00" value="<?= e($f['valor']) ?>"></div>
      <div class="col-md-8"><label class="form-label" for="local">Localização / endereço</label><input class="form-control" id="local" name="local" maxlength="140" placeholder="Rua, bairro" value="<?= e($f['local']) ?>"></div>
      <div class="col-md-4"><label class="form-label" for="area">Área total (m²)</label><input class="form-control" id="area" name="area" inputmode="decimal" placeholder="150" value="<?= e($f['area']) ?>"></div>
      <div class="col-12"><label class="form-label" for="caract">Características e diferenciais</label><textarea class="form-control" id="caract" name="caract" rows="3" maxlength="200" placeholder="Ex.: 3 quartos, piscina, churrasqueira"><?= e($f['caract']) ?></textarea></div>
    <?php else: ?>
      <div class="col-md-6"><label class="form-label" for="renda">Renda familiar (R$)</label><input class="form-control" id="renda" name="renda" inputmode="decimal" placeholder="5.000,00" value="<?= e($f['renda']) ?>"></div>
      <?php if ($q === 'comprar'): ?><div class="col-md-6"><label class="form-label" for="entrada">Valor da entrada (R$)</label><input class="form-control" id="entrada" name="entrada" inputmode="decimal" placeholder="30.000,00" value="<?= e($f['entrada']) ?>"></div><?php endif; ?>
      <div class="col-md-6"><label class="form-label" for="parcela"><?= $q === 'alugar' ? 'Aluguel máximo (R$)' : 'Parcela máxima (R$)' ?></label><input class="form-control" id="parcela" name="parcela" inputmode="decimal" placeholder="1.500,00" value="<?= e($f['parcela']) ?>"></div>
      <div class="col-6 col-md-3"><label class="form-label" for="quartos">Quartos</label><select class="form-select" id="quartos" name="quartos"><option value="">Tanto faz</option><?php foreach (['1', '2', '3', '4+'] as $n): ?><option<?= $f['quartos'] === $n ? ' selected' : '' ?>><?= $n ?></option><?php endforeach; ?></select></div>
      <div class="col-6 col-md-3"><label class="form-label" for="vagas">Vagas</label><select class="form-select" id="vagas" name="vagas"><option value="">Tanto faz</option><?php foreach (['0', '1', '2', '3+'] as $n): ?><option<?= $f['vagas'] === $n ? ' selected' : '' ?>><?= $n ?></option><?php endforeach; ?></select></div>
      <div class="col-12"><label class="form-label" for="bairros">Bairros de interesse</label><input class="form-control" id="bairros" name="bairros" maxlength="120" placeholder="Centro, Vila Conrado" value="<?= e($f['bairros']) ?>"></div>
    <?php endif; ?>
    <div class="col-12"><button class="btn btn-primary" type="submit">Gerar mensagem</button></div>
  </form>
</section>
<?php endif; ?>

<?php if ($enviar): ?>
<section class="panel" id="resumo">
  <h2 class="h4">4. Sua mensagem está pronta</h2>
  <p class="meta">Confira o texto e abra o WhatsApp da <strong><?= e($imob['nome']) ?></strong>. Você ainda pode editar antes de enviar.</p>
  <pre class="msg-previa"><?= e($msg) ?></pre>
  <p class="mb-0"><?= botao_whatsapp('imoveis', $imob['slug'], $q, $msg, 'Abrir WhatsApp de ' . $imob['nome']) ?> <a class="btn btn-outline-secondary" href="<?= e(url_com('/imoveis/', ['i' => $imob['slug'], 'q' => $q])) ?>#passo3">Editar dados</a></p>
</section>
<?php endif; ?>

<?= faq_html('faq-imoveis', $faq) ?>
<p class="meta mt-3">Sua imobiliária não está na lista? <a href="/cadastrar/">Cadastre-se gratuitamente</a>. Veja também <a href="/categorias/casa-construcao/imobiliarias/">imobiliárias cadastradas</a> e <a href="/servicos/">todos os serviços</a>.</p>
<?php pagina_rodape();
