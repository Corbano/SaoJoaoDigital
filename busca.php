<?php
declare(strict_types=1);
/** Busca geral: empresas, produtos/ofertas, cupons, vitrine, eventos, notícias e profissionais de saúde. */
require __DIR__ . '/src/pagina.php';

$q = get_txt('q', 80);
$tokens = array_values(array_filter(explode(' ', norm($q)), fn($t) => mb_strlen($t) >= 2));
$grupos = [];

/** Todos os termos precisam aparecer no texto (sem acentos, sem maiúsculas). */
$casa = function (string $texto) use ($tokens): bool {
    $n = ' ' . norm($texto);
    foreach ($tokens as $t) if (!str_contains($n, $t)) return false;
    return true;
};
$add = function (string $grupo, string $url, string $titulo, string $detalhe) use (&$grupos): void {
    if (count($grupos[$grupo] ?? []) < 12) $grupos[$grupo][] = [$url, $titulo, $detalhe];
};

if ($tokens) {
    $cats = [];
    foreach (json_dados('categorias.json')['categorias'] ?? [] as $c) $cats[$c['slug']] = $c;
    $emp = [];
    foreach (json_dados('empresas.json')['empresas'] ?? [] as $e) {
        $emp[$e['slug']] = $e;
        $hay = implode(' ', [$e['nome'], $e['resumo'] ?? '', $e['descricao'] ?? '', $e['subcategoria'] ?? '', $cats[$e['categoria']]['nome'] ?? '', implode(' ', $e['tags'] ?? []), implode(' ', $e['servicos'] ?? []), implode(' ', array_column($e['produtos'] ?? [], 'nome')), $e['endereco']['bairro'] ?? '']);
        if ($casa($hay)) $add('Empresas', '/empresas/' . $e['slug'] . '/', $e['nome'], ($e['subcategoria'] ?? '') . ' · ' . ($e['endereco']['bairro'] ?? ''));
    }
    foreach ($cats as $c) {
        if ($casa($c['nome'] . ' ' . implode(' ', $c['sinonimos'] ?? []) . ' ' . implode(' ', array_column($c['subcategorias'], 'nome')))) $add('Categorias', '/categorias/' . $c['slug'] . '/', $c['nome'], $c['descricao']);
        foreach ($c['subcategorias'] as $s) if ($casa($s['nome'])) $add('Categorias', '/categorias/' . $c['slug'] . '/' . $s['slug'] . '/', $s['nome'], $c['nome']);
    }
    $hoje = date('Y-m-d');
    foreach (json_dados('ofertas.json')['ofertas'] ?? [] as $o) {
        if (empty($o['ativo']) || !isset($emp[$o['empresa']]) || ($o['data_fim'] ?? '9999') < $hoje || ($o['data_inicio'] ?? '0') > $hoje) continue;
        if ($casa($o['produto'] . ' ' . ($o['descricao'] ?? '') . ' ' . $emp[$o['empresa']]['nome'])) $add('Preços e ofertas', '/comparador/' . trim(preg_replace('/[^a-z0-9]+/', '-', norm($o['produto'])), '-') . '/', $o['produto'], $emp[$o['empresa']]['nome'] . ' · ' . brl_p((float)($o['preco_promocional'] ?? $o['preco'])));
    }
    foreach (json_dados('cupons.json')['cupons'] ?? [] as $c) {
        if (($c['data_fim'] ?? '9999') < $hoje || !isset($emp[$c['empresa']])) continue;
        if ($casa($c['titulo'] . ' ' . $c['descricao'] . ' ' . $emp[$c['empresa']]['nome'])) $add('Cupons', '/cupons/', $c['titulo'], $emp[$c['empresa']]['nome'] . ' · código ' . $c['codigo']);
    }
    foreach (json_dados('vitrine.json')['produtos'] ?? [] as $p) {
        if (isset($emp[$p['empresa']]) && $casa($p['nome'] . ' ' . $p['descricao'] . ' ' . $p['categoria'] . ' ' . $emp[$p['empresa']]['nome'])) $add('Vitrine', '/vitrine/', $p['nome'], $emp[$p['empresa']]['nome'] . ' · ' . brl_p((float)$p['preco']));
    }
    foreach (json_dados('eventos.json')['eventos'] ?? [] as $v) if ($casa($v['titulo'] . ' ' . $v['resumo'] . ' ' . $v['local'])) $add('Eventos', '/eventos/' . $v['slug'] . '/', $v['titulo'], date('d/m/Y', strtotime($v['inicio'])) . ' · ' . $v['local']);
    foreach (json_dados('noticias.json')['noticias'] ?? [] as $n) if ($casa($n['titulo'] . ' ' . $n['resumo'])) $add('Notícias e guias', '/noticias/' . $n['slug'] . '/', $n['titulo'], $n['resumo']);
    $tp = [];
    foreach (tipos_saude() as $t) $tp[$t['tipo']] = $t['titulo'];
    foreach (profissionais() as $p) if ($casa($p['nome'] . ' ' . $p['especialidade'] . ' ' . ($tp[$p['tipo']] ?? ''))) $add('Profissionais de saúde', '/profissionais-saude/?tipo=' . $p['tipo'] . '#lista', $p['nome'], ($tp[$p['tipo']] ?? '') . ' · ' . $p['especialidade']);
    foreach (['imóveis casa apartamento alugar comprar vender terreno' => ['/imoveis/', 'Imóveis', 'Comprar, alugar ou vender'], 'carro moto veículo fipe garagem' => ['/veiculos/', 'Carros e motos', 'Consulta FIPE e garagens'], 'saúde imc água estresse calculadora' => ['/saude/', 'Saúde e bem-estar', 'Calculadoras e profissionais'], 'cardápio pedido delivery comida' => ['/cardapios/', 'Cardápios digitais', 'Peça pelo WhatsApp'], 'agendar agendamento horário consulta' => ['/agendar/', 'Agendamento online', 'Escolha dia e horário']] as $chaves => [$u, $t, $d]) {
        if ($casa($chaves . ' ' . $t)) $add('Serviços', $u, $t, $d);
    }
}
$total = array_sum(array_map('count', $grupos));

pagina_topo([
    'titulo' => $q !== '' ? "Busca: $q" : 'Buscar no São João Digital', 'desc' => 'Procure empresas, produtos, ofertas, cupons, eventos, notícias e profissionais de São João da Boa Vista.',
    'path' => '/busca/', 'h1' => 'Buscar', 'sub' => 'Empresas, produtos, ofertas, cupons, eventos e notícias da cidade.', 'noindex' => true,
    'crumbs' => [['/', 'Início'], ['/busca/', 'Busca']],
]);
?>
<form method="get" action="/busca/" role="search" class="ask mb-4"><label class="visually-hidden" for="q">O que você procura?</label><input id="q" name="q" type="search" maxlength="80" placeholder="Ex.: pizza, mecânico, cimento, dentista" value="<?= e($q) ?>" autofocus><button class="btn btn-warning fw-bold" type="submit">Buscar</button></form>
<?php if ($q === ''): ?>
  <p>Digite o que procura ou explore: <a href="/categorias/">categorias</a>, <a href="/servicos/">serviços</a> e <a href="/mapa-do-site/">mapa do site</a>.</p>
<?php elseif (!$tokens): ?>
  <p>Digite pelo menos 2 letras para buscar.</p>
<?php elseif ($total === 0): ?>
  <p><strong>Nada encontrado para “<?= e($q) ?>”.</strong> Tente outra palavra ou veja as <a href="/categorias/">categorias</a>. Pergunte também ao <a href="/assistente/?q=<?= e(rawurlencode($q)) ?>">assistente</a>.</p>
<?php else: ?>
  <p class="meta"><?= $total ?> <?= $total === 1 ? 'resultado' : 'resultados' ?> para “<?= e($q) ?>”.</p>
  <?php foreach ($grupos as $g => $itens): ?>
    <section class="mb-4"><h2 class="h5"><?= e($g) ?></h2><ul class="list-unstyled resultados">
      <?php foreach ($itens as [$u, $t, $d]): ?><li><a href="<?= e($u) ?>"><?= e($t) ?></a><br><span class="meta"><?= e($d) ?></span></li><?php endforeach; ?>
    </ul></section>
  <?php endforeach; ?>
<?php endif; ?>
<?php pagina_rodape();
