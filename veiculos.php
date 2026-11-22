<?php
declare(strict_types=1);
/**
 * Micro-sistema Carros e Motos: consulta a Tabela FIPE (servidor, com cache), intenção
 * (comprar ou vender/trocar) e envio ao WhatsApp da garagem escolhida.
 */
require __DIR__ . '/src/pagina.php';

/** Consulta a API FIPE (parallelum) com cache de 24 h. Só aceita caminhos conhecidos. */
function fipe(string $caminho): ?array
{
    if (!preg_match('#^(carros|motos)/marcas(/\d{1,5}/modelos(/\d{1,8}/anos(/[0-9-]{3,12})?)?)?$#', $caminho)) return null;
    $arq = sys_get_temp_dir() . '/sjd-fipe-' . md5($caminho) . '.json';
    if (is_file($arq) && time() - filemtime($arq) < 86400) {
        $j = json_decode((string)file_get_contents($arq), true);
        if (is_array($j)) return $j;
    }
    $url = 'https://parallelum.com.br/fipe/api/v1/' . $caminho;
    $raw = false;
    if (function_exists('curl_init')) {
        $c = curl_init($url);
        curl_setopt_array($c, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_FOLLOWLOCATION => false]);
        $raw = curl_exec($c);
        $http = (int)curl_getinfo($c, CURLINFO_RESPONSE_CODE);
        curl_close($c);
        if ($http !== 200) $raw = false;
    } else {
        $raw = @file_get_contents($url, false, stream_context_create(['http' => ['timeout' => 8]]));
    }
    $j = $raw ? json_decode((string)$raw, true) : null;
    if (!is_array($j)) return is_file($arq) ? json_decode((string)file_get_contents($arq), true) : null;
    @file_put_contents($arq, $raw, LOCK_EX);
    return $j;
}

$garagens = rodizio(parceiros('garagem'));
$t = get_opt('t', ['carros', 'motos']);
$manual = isset($_GET['manual']);
$m = $mo = $a = '';
$marcas = $modelos = $anos = [];
$preco = null;
$fipeFora = false;

if ($t && !$manual) {
    $marcas = fipe("$t/marcas");
    if ($marcas === null) {
        $fipeFora = true;
    } else {
        $m = get_txt('m', 6);
        if (!in_array($m, array_column($marcas, 'codigo'), true)) $m = '';
        if ($m !== '') {
            $r = fipe("$t/marcas/$m/modelos");
            $modelos = $r['modelos'] ?? [];
            $mo = get_txt('mo', 9);
            // mudou a marca: recomeça a escolha do modelo
            if (get_txt('pm', 6) !== '' && get_txt('pm', 6) !== $m) $mo = '';
            if (!in_array($mo, array_map('strval', array_column($modelos, 'codigo')), true)) $mo = '';
        }
        if ($mo !== '') {
            $anos = fipe("$t/marcas/$m/modelos/$mo/anos") ?? [];
            $a = get_txt('a', 12);
            if (get_txt('pmo', 9) !== '' && get_txt('pmo', 9) !== $mo) $a = '';
            if (!in_array($a, array_column($anos, 'codigo'), true)) $a = '';
        }
        if ($a !== '') $preco = fipe("$t/marcas/$m/modelos/$mo/anos/$a");
    }
}

$manualDados = ['marca' => get_txt('marca', 60), 'modelo' => get_txt('modelo', 80), 'ano' => get_txt('ano', 4)];
$temVeiculo = $preco !== null || ($manual && $manualDados['marca'] !== '' && $manualDados['modelo'] !== '');
$intencao = $temVeiculo ? get_opt('q', ['comprar', 'vender']) : '';

$msgPara = function (array $g) use ($preco, $manual, $manualDados, $intencao): string {
    $acao = $intencao === 'comprar' ? 'COMPRAR' : 'VENDER / DAR DE TROCA';
    $l = ["Olá, *{$g['nome']}*! 👋", '', "Tenho interesse em *{$acao}* um veículo.", ''];
    if ($preco) {
        array_push($l, '📊 *Referência Tabela FIPE:*', "• 🚗 Marca: {$preco['Marca']}", "• 📋 Modelo: {$preco['Modelo']}", "• 📅 Ano: {$preco['AnoModelo']} – {$preco['Combustivel']}", "• 💰 Valor FIPE: {$preco['Valor']}", "• 📖 Código FIPE: {$preco['CodigoFipe']}");
    } else {
        array_push($l, '🚗 *Veículo:*', "• Marca: {$manualDados['marca']}", "• Modelo: {$manualDados['modelo']}");
        if ($manualDados['ano'] !== '') $l[] = "• Ano: {$manualDados['ano']}";
    }
    array_push($l, '', 'Aguardo o contato! 😊');
    return implode("\n", $l);
};

$faq = [
    ['O que é a Tabela FIPE?', 'É uma referência de preço médio de veículos usados, calculada pela Fundação Instituto de Pesquisas Econômicas. O valor real de negociação pode ser maior ou menor.'],
    ['Como funciona?', 'Você consulta o valor FIPE do veículo, diz se quer comprar ou vender/trocar e escolhe a garagem. O site monta a mensagem para o WhatsApp dela.'],
    ['A ordem das garagens é fixa?', 'Não. A ordem muda a cada 5 minutos para dar a mesma visibilidade a todas.'],
    ['O site vende veículos?', 'Não. A negociação é feita entre você e a garagem; o São João Digital não participa do pagamento.'],
];
pagina_topo([
    'titulo' => 'Carros e motos em São João da Boa Vista: consulta FIPE e garagens', 'desc' => 'Consulte o valor FIPE de carros e motos e fale com garagens de São João da Boa Vista para comprar, vender ou dar de troca.',
    'path' => '/veiculos/', 'h1' => 'Carros e motos', 'sub' => 'Consulte a tabela FIPE e fale com a garagem pelo WhatsApp.',
    'crumbs' => [['/', 'Início'], ['/veiculos/', 'Carros e motos']], 'jsonld' => faq_ld($faq),
]);
echo aviso_demo();
?>
<section class="panel" id="passo1">
  <h2 class="h4">1. Qual é o veículo?</h2>
  <div class="intencoes">
    <a class="intencao<?= $t === 'carros' ? ' ativo' : '' ?>" href="/veiculos/?t=carros#passo2"><span aria-hidden="true">🚗</span> Carro</a>
    <a class="intencao<?= $t === 'motos' ? ' ativo' : '' ?>" href="/veiculos/?t=motos#passo2"><span aria-hidden="true">🏍️</span> Moto</a>
  </div>
</section>

<?php if ($t): ?>
<section class="panel" id="passo2">
  <h2 class="h4">2. Marca, modelo e ano</h2>
  <?php if ($fipeFora && !$manual): ?>
    <p class="notice">A consulta à Tabela FIPE está indisponível agora. <a href="<?= e(url_com('/veiculos/', ['t' => $t, 'manual' => 1])) ?>#passo2">Informe o veículo manualmente</a> ou tente de novo em instantes.</p>
  <?php elseif ($manual): ?>
    <form method="get" action="/veiculos/#passo3" class="row g-3">
      <input type="hidden" name="t" value="<?= e($t) ?>"><input type="hidden" name="manual" value="1">
      <div class="col-md-4"><label class="form-label" for="marca">Marca</label><input class="form-control" id="marca" name="marca" maxlength="60" required value="<?= e($manualDados['marca']) ?>"></div>
      <div class="col-md-5"><label class="form-label" for="modelo">Modelo</label><input class="form-control" id="modelo" name="modelo" maxlength="80" required value="<?= e($manualDados['modelo']) ?>"></div>
      <div class="col-md-3"><label class="form-label" for="ano">Ano</label><input class="form-control" id="ano" name="ano" inputmode="numeric" maxlength="4" value="<?= e($manualDados['ano']) ?>"></div>
      <div class="col-12"><button class="btn btn-primary" type="submit">Continuar</button></div>
    </form>
  <?php else: ?>
    <form method="get" action="/veiculos/#passo2" class="row g-3">
      <input type="hidden" name="t" value="<?= e($t) ?>"><input type="hidden" name="pm" value="<?= e($m) ?>"><input type="hidden" name="pmo" value="<?= e($mo) ?>">
      <div class="col-md-4"><label class="form-label" for="m">Marca</label><select class="form-select" id="m" name="m"><option value="">Selecione</option><?php foreach ($marcas as $x): ?><option value="<?= e($x['codigo']) ?>"<?= (string)$x['codigo'] === $m ? ' selected' : '' ?>><?= e($x['nome']) ?></option><?php endforeach; ?></select></div>
      <?php if ($m !== ''): ?><div class="col-md-5"><label class="form-label" for="mo">Modelo</label><select class="form-select" id="mo" name="mo"><option value="">Selecione</option><?php foreach ($modelos as $x): ?><option value="<?= e($x['codigo']) ?>"<?= (string)$x['codigo'] === $mo ? ' selected' : '' ?>><?= e($x['nome']) ?></option><?php endforeach; ?></select></div><?php endif; ?>
      <?php if ($mo !== ''): ?><div class="col-md-3"><label class="form-label" for="a">Ano</label><select class="form-select" id="a" name="a"><option value="">Selecione</option><?php foreach ($anos as $x): ?><option value="<?= e($x['codigo']) ?>"<?= $x['codigo'] === $a ? ' selected' : '' ?>><?= e($x['nome']) ?></option><?php endforeach; ?></select></div><?php endif; ?>
      <div class="col-12"><button class="btn btn-primary" type="submit"><?= $a !== '' ? 'Consultar FIPE' : 'Continuar' ?></button> <a class="btn btn-link" href="<?= e(url_com('/veiculos/', ['t' => $t, 'manual' => 1])) ?>#passo2">Informar manualmente</a></div>
    </form>
  <?php endif; ?>
</section>
<?php endif; ?>

<?php if ($temVeiculo): ?>
<section class="panel" id="passo3">
  <h2 class="h4">3. Resultado e intenção</h2>
  <?php if ($preco): ?>
    <div class="fipe-card"><p class="mb-1"><strong><?= e($preco['Marca']) ?> <?= e($preco['Modelo']) ?></strong> · <?= e((string)$preco['AnoModelo']) ?> · <?= e($preco['Combustivel']) ?></p><p class="fipe-valor mb-1"><?= e($preco['Valor']) ?></p><p class="meta mb-0">Tabela FIPE, referência <?= e($preco['MesReferencia']) ?> · código <?= e($preco['CodigoFipe']) ?>. Valor médio de referência, não é preço de venda.</p></div>
  <?php else: ?>
    <div class="fipe-card"><p class="mb-0"><strong><?= e($manualDados['marca']) ?> <?= e($manualDados['modelo']) ?></strong><?= $manualDados['ano'] !== '' ? ' · ' . e($manualDados['ano']) : '' ?> (informado por você)</p></div>
  <?php endif; ?>
  <?php $base = $preco ? ['t' => $t, 'm' => $m, 'mo' => $mo, 'a' => $a] : ['t' => $t, 'manual' => 1, 'marca' => $manualDados['marca'], 'modelo' => $manualDados['modelo'], 'ano' => $manualDados['ano']]; ?>
  <div class="intencoes mt-3">
    <a class="intencao<?= $intencao === 'comprar' ? ' ativo' : '' ?>" href="<?= e(url_com('/veiculos/', $base + ['q' => 'comprar'])) ?>#passo4"><span aria-hidden="true">🟢</span> Quero comprar</a>
    <a class="intencao<?= $intencao === 'vender' ? ' ativo' : '' ?>" href="<?= e(url_com('/veiculos/', $base + ['q' => 'vender'])) ?>#passo4"><span aria-hidden="true">🟠</span> Quero vender ou dar de troca</a>
  </div>
</section>
<?php endif; ?>

<?php if ($intencao): ?>
<section class="panel" id="passo4">
  <h2 class="h4">4. Escolha a garagem</h2>
  <p class="meta">Ao escolher, abrimos o WhatsApp da garagem com a mensagem pronta. Ordem rotativa a cada 5 minutos.</p>
  <div class="row g-3">
    <?php foreach ($garagens as $g): ?>
      <div class="col-6 col-md-4 col-lg-3"><form method="post" action="/ir/" class="h-100"><input type="hidden" name="s" value="veiculos"><input type="hidden" name="p" value="<?= e($g['slug']) ?>"><input type="hidden" name="q" value="<?= e($intencao) ?>"><input type="hidden" name="m" value="<?= e($msgPara($g)) ?>"><button class="parceiro w-100" type="submit"><span class="avatar av-<?= crc32($g['slug']) % 6 ?>" aria-hidden="true"><?= e(iniciais($g['nome'])) ?></span><span class="parceiro-nome"><?= e($g['nome']) ?></span></button></form></div>
    <?php endforeach; ?>
  </div>
</section>
<?php endif; ?>

<?= faq_html('faq-veiculos', $faq) ?>
<p class="meta mt-3">Sua garagem não está na lista? <a href="/cadastrar/">Cadastre-se gratuitamente</a>. Veja também <a href="/categorias/carro-moto/">Carro e Moto</a>, <a href="/comparador/">comparador de preços</a> e <a href="/servicos/">todos os serviços</a>.</p>
<?php pagina_rodape();
