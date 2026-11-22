<?php
declare(strict_types=1);
/** Saúde e bem-estar: calculadoras (IMC, água, estresse, frequência cardíaca) com encaminhamento a profissionais. */
require __DIR__ . '/src/pagina.php';

$calc = get_opt('calc', ['imc', 'agua', 'stress', 'fc']);
$res = null; // ['titulo','sub','cor','tipo' (profissional sugerido),'extra' html]
$erro = '';

function num_get(string $k): float
{
    return (float)str_replace(',', '.', get_txt($k, 8));
}

if ($calc === 'imc') {
    $p = num_get('peso');
    $h = num_get('altura');
    if ($p < 20 || $p > 300 || $h < 100 || $h > 250) {
        $erro = 'Informe o peso entre 20 e 300 kg e a altura entre 100 e 250 cm.';
    } else {
        $imc = $p / (($h / 100) ** 2);
        [$cl, $dica, $cor] = match (true) {
            $imc < 18.5 => ['Abaixo do peso', 'Um nutricionista pode ajudar a ganhar peso com saúde e qualidade.', 'faixa-azul'],
            $imc < 25 => ['Peso normal', 'Mantenha hábitos saudáveis de alimentação e exercício.', 'faixa-verde'],
            $imc < 30 => ['Sobrepeso', 'Um nutricionista pode ajudar a ajustar a alimentação de forma sustentável.', 'faixa-amarela'],
            $imc < 35 => ['Obesidade grau 1', 'Recomendamos consultar um médico e um nutricionista para acompanhamento.', 'faixa-laranja'],
            default => ['Obesidade grave', 'Procure atendimento médico especializado o quanto antes.', 'faixa-vermelha'],
        };
        $res = ['titulo' => 'IMC ' . number_format($imc, 1, ',', '') . ': ' . $cl, 'sub' => $dica, 'cor' => $cor, 'tipo' => 'nutricionista', 'rotulo' => 'Quer ajuda para chegar ao peso ideal? Falar com um nutricionista'];
    }
} elseif ($calc === 'agua') {
    $p = num_get('peso');
    if ($p < 20 || $p > 300) {
        $erro = 'Informe o peso entre 20 e 300 kg.';
    } else {
        $ml = $p * 35;
        $res = ['titulo' => 'Água: ' . number_format($ml / 1000, 1, ',', '') . ' L por dia', 'sub' => 'Cerca de ' . round($ml) . ' ml, o equivalente a ' . round($ml / 250) . ' copos de 250 ml (35 ml por kg).', 'cor' => 'faixa-azul', 'tipo' => 'nutricionista', 'rotulo' => 'Montar um plano alimentar com um nutricionista'];
    }
} elseif ($calc === 'stress') {
    $total = 0;
    $ok = true;
    for ($i = 1; $i <= 5; $i++) {
        $v = (int)get_txt("s$i", 1);
        if ($v < 1 || $v > 5) $ok = false;
        $total += $v;
    }
    if (!$ok) {
        $erro = 'Responda às cinco perguntas para ver o resultado.';
    } else {
        [$n, $dica, $cor, $tipo] = $total <= 10
            ? ['Estresse baixo', 'Continue assim! Seus hábitos estão ajudando a saúde mental.', 'faixa-verde', 'academia']
            : ($total <= 17
                ? ['Estresse moderado', 'Técnicas de relaxamento, como respiração profunda e meditação, podem ajudar muito.', 'faixa-amarela', 'psicologo']
                : ['Estresse alto', 'Recomendamos conversar com um profissional de saúde mental para apoio especializado.', 'faixa-vermelha', 'psicologo']);
        $res = ['titulo' => "Nível de estresse: $n", 'sub' => $dica . ' Este teste é informativo e não é um diagnóstico.', 'cor' => $cor, 'tipo' => $tipo, 'rotulo' => $tipo === 'academia' ? 'Conhecer academias com aula experimental' : 'Falar com um psicólogo'];
    }
} elseif ($calc === 'fc') {
    $idade = (int)get_txt('idade', 3);
    if ($idade < 10 || $idade > 100) {
        $erro = 'Informe a idade entre 10 e 100 anos.';
    } else {
        $fc = 220 - $idade;
        $zonas = [['Aquecimento', 50, 60, 'Aquecimento e recuperação ativa', 'faixa-azul'], ['Queima de gordura', 60, 70, 'Maior proporção de gordura como combustível', 'faixa-verde'], ['Aeróbica', 70, 80, 'Melhora a resistência cardiovascular', 'faixa-amarela'], ['Anaeróbica', 80, 90, 'Melhora desempenho e força', 'faixa-laranja'], ['Máxima', 90, 100, 'Esforço máximo, curta duração', 'faixa-vermelha']];
        $tab = '<ul class="zonas">';
        foreach ($zonas as [$nz, $a, $b, $d, $c]) $tab .= '<li class="' . $c . '"><strong>' . $nz . ' (' . $a . '–' . $b . '%)</strong><span>' . $d . '</span><b>' . round($fc * $a / 100) . '–' . round($fc * $b / 100) . ' bpm</b></li>';
        $res = ['titulo' => "FC máxima: $fc bpm ($idade anos)", 'sub' => 'Estimativa pela fórmula 220 − idade. Zonas de treino:', 'cor' => 'faixa-vermelha', 'tipo' => 'personal', 'rotulo' => 'Treinar com um personal trainer', 'extra' => $tab . '</ul>'];
    }
}

function resultado(array $r, string $id): void
{
    $msgR = $r['titulo'] . ' — ' . $r['sub'];
    echo '<div class="resultado ' . e($r['cor']) . '" role="status"><p class="resultado-t">' . e($r['titulo']) . '</p><p>' . e($r['sub']) . '</p>' . ($r['extra'] ?? '') . '<p class="mb-0"><a class="btn btn-primary btn-sm" href="' . e(url_com('/profissionais-saude/', ['tipo' => $r['tipo'], 'r' => mb_substr($msgR, 0, 200)])) . '">' . e($r['rotulo']) . '</a></p></div>';
}
function bloco_erro(string $erro, string $quando, string $calc): void
{
    if ($erro && $calc === $quando) echo '<p class="text-danger" role="alert">' . e($erro) . '</p>';
}

$PERG = ['Com que frequência você se sente sobrecarregado?', 'Você tem dificuldade para dormir?', 'Sente tensão muscular com frequência?', 'Tem dificuldade de concentração?', 'Irrita-se facilmente?'];
$faq = [
    ['As calculadoras substituem uma consulta?', 'Não. São ferramentas informativas. Para diagnóstico e tratamento, procure um profissional de saúde.'],
    ['Meus dados ficam salvos?', 'Não. As contas são feitas na hora e nada é armazenado.'],
    ['Como encontro um profissional?', 'Depois do resultado, você é levado à lista de profissionais da cidade e pode chamar direto no WhatsApp com o resultado na mensagem, se quiser.'],
];
pagina_topo([
    'titulo' => 'Saúde e bem-estar: calculadoras de IMC, água, estresse e frequência cardíaca', 'desc' => 'Calcule seu IMC, a água ideal por dia, o nível de estresse e a frequência cardíaca, e encontre profissionais de saúde em São João da Boa Vista.',
    'path' => '/saude/', 'h1' => 'Saúde e bem-estar', 'sub' => 'Calculadoras rápidas e profissionais da cidade.',
    'crumbs' => [['/', 'Início'], ['/saude/', 'Saúde']], 'jsonld' => faq_ld($faq),
]);
?>
<p class="meta">Atalhos: <a href="#imc">IMC</a> · <a href="#agua">Água</a> · <a href="#stress">Estresse</a> · <a href="#fc">Frequência cardíaca</a> · <a href="/profissionais-saude/">Profissionais</a> · <a href="/guia-medico/">Guia médico</a></p>
<div class="row g-4">
  <div class="col-lg-6"><section class="panel h-100" id="imc"><h2 class="h4">⚖️ IMC</h2><p class="meta">Índice de massa corporal pela classificação da OMS.</p>
    <form method="get" action="/saude/#imc" class="row g-3"><input type="hidden" name="calc" value="imc">
      <div class="col-6"><label class="form-label" for="imc-peso">Peso (kg)</label><input class="form-control" id="imc-peso" name="peso" inputmode="decimal" placeholder="70" value="<?= $calc === 'imc' ? e(get_txt('peso', 8)) : '' ?>"></div>
      <div class="col-6"><label class="form-label" for="imc-alt">Altura (cm)</label><input class="form-control" id="imc-alt" name="altura" inputmode="numeric" placeholder="170" value="<?= $calc === 'imc' ? e(get_txt('altura', 8)) : '' ?>"></div>
      <div class="col-12"><button class="btn btn-primary" type="submit">Calcular</button></div></form>
    <?php bloco_erro($erro, 'imc', $calc); if ($res && $calc === 'imc') resultado($res, 'imc'); ?></section></div>
  <div class="col-lg-6"><section class="panel h-100" id="agua"><h2 class="h4">💧 Água por dia</h2><p class="meta">Referência de 35 ml por quilo de peso.</p>
    <form method="get" action="/saude/#agua" class="row g-3"><input type="hidden" name="calc" value="agua">
      <div class="col-12"><label class="form-label" for="ag-peso">Peso (kg)</label><input class="form-control" id="ag-peso" name="peso" inputmode="decimal" placeholder="70" value="<?= $calc === 'agua' ? e(get_txt('peso', 8)) : '' ?>"></div>
      <div class="col-12"><button class="btn btn-primary" type="submit">Calcular</button></div></form>
    <?php bloco_erro($erro, 'agua', $calc); if ($res && $calc === 'agua') resultado($res, 'agua'); ?></section></div>
  <div class="col-lg-6"><section class="panel h-100" id="stress"><h2 class="h4">🧠 Nível de estresse</h2><p class="meta">Dê uma nota de 1 (nunca) a 5 (sempre).</p>
    <form method="get" action="/saude/#stress"><input type="hidden" name="calc" value="stress">
      <?php foreach ($PERG as $i => $p): $n = $i + 1; $sel = $calc === 'stress' ? (int)get_txt("s$n", 1) : 0; ?>
        <fieldset class="mb-3"><legend class="form-label fs-6"><?= $n ?>. <?= e($p) ?></legend><div class="notas"><?php for ($v = 1; $v <= 5; $v++): ?><label class="nota"><input type="radio" name="s<?= $n ?>" value="<?= $v ?>"<?= $sel === $v ? ' checked' : '' ?>><span><?= $v ?></span></label><?php endfor; ?></div></fieldset>
      <?php endforeach; ?>
      <button class="btn btn-primary" type="submit">Ver resultado</button></form>
    <?php bloco_erro($erro, 'stress', $calc); if ($res && $calc === 'stress') resultado($res, 'stress'); ?></section></div>
  <div class="col-lg-6"><section class="panel h-100" id="fc"><h2 class="h4">❤️ Frequência cardíaca</h2><p class="meta">Zonas de treino a partir da sua idade.</p>
    <form method="get" action="/saude/#fc" class="row g-3"><input type="hidden" name="calc" value="fc">
      <div class="col-12"><label class="form-label" for="fc-idade">Idade (anos)</label><input class="form-control" id="fc-idade" name="idade" inputmode="numeric" placeholder="35" value="<?= $calc === 'fc' ? e(get_txt('idade', 3)) : '' ?>"></div>
      <div class="col-12"><button class="btn btn-primary" type="submit">Calcular</button></div></form>
    <?php bloco_erro($erro, 'fc', $calc); if ($res && $calc === 'fc') resultado($res, 'fc'); ?></section></div>
</div>
<?= faq_html('faq-saude', $faq) ?>
<p class="meta mt-3">Precisa de ajuda profissional? <a href="/profissionais-saude/">Profissionais de saúde</a> · <a href="/parceiros-saude/">Primeira consulta gratuita</a> · <a href="/categorias/saude-beleza/">Saúde e Beleza</a>. Em emergência, ligue 192 (SAMU).</p>
<?php pagina_rodape();
