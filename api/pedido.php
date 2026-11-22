<?php
declare(strict_types=1);
require __DIR__ . '/../src/bootstrap.php';

exigir_post_json();
$d = corpo_json();
anti_robo($d);
limitar('pedido', (int)cfg('limites.api_max'), (int)cfg('limites.api_janela'));

$slug = (string)($d['slug'] ?? '');
if (!preg_match('/^[a-z0-9-]{1,160}$/', $slug)) falha('Empresa inválida.');
$empresa = empresa_por_slug($slug);
if (!$empresa) falha('Empresa não encontrada.', 404);

// O cardápio é a fonte da verdade dos preços (o cliente só informa id e quantidade).
$cardapios = json_decode((string)file_get_contents(SJD_ROOT . '/dados/cardapios.json'), true)['cardapios'] ?? [];
$menu = null;
foreach ($cardapios as $c) if ($c['empresa'] === $slug) $menu = $c;
if (!$menu) falha('Esta empresa não tem cardápio digital.', 404);
$porId = [];
foreach ($menu['itens'] as $it) $porId[(int)$it['id']] = $it;

$itens = [];
$total = 0.0;
foreach ((array)($d['itens'] ?? []) as $linha) {
    $id = (int)($linha['id'] ?? 0);
    $q = (int)($linha['qtd'] ?? 0);
    if (!isset($porId[$id]) || $q < 1 || $q > 99) falha('Item inválido no pedido.');
    $itens[] = ['id' => $id, 'nome' => $porId[$id]['nome'], 'qtd' => $q, 'preco' => (float)$porId[$id]['preco']];
    $total += $q * (float)$porId[$id]['preco'];
}
if (!$itens || count($itens) > 40) falha('Adicione ao menos um item.');

$nome = texto($d['nome'] ?? '', 120);
$tipo = ($d['tipo'] ?? '') === 'Entrega' ? 'Entrega' : 'Retirada no local';
$end = texto($d['endereco'] ?? '', 200, $tipo === 'Entrega');
$pag = texto($d['pagamento'] ?? '', 60, false);
$obs = texto($d['obs'] ?? '', 300, false);
if (empty($d['consentimento'])) falha('É necessário aceitar o uso dos dados para o pedido.');

db()->prepare('INSERT INTO pedidos (empresa_slug, itens, total, cliente_nome, tipo_entrega, endereco, pagamento, observacoes, ip_hash) VALUES (?,?,?,?,?,?,?,?,?)')
    ->execute([$slug, json_encode($itens, JSON_UNESCAPED_UNICODE), round($total, 2), $nome, $tipo, $end, $pag, $obs, ip_hash()]);
$id = (int)db()->lastInsertId();

$fmt = fn(float $n) => 'R$ ' . number_format($n, 2, ',', '.');
$linhas = ["Olá, {$empresa['nome']}! Pedido #{$id} feito pelo São João Digital:", ''];
foreach ($itens as $i) $linhas[] = "{$i['qtd']}x {$i['nome']} (" . $fmt($i['qtd'] * $i['preco']) . ')';
$linhas[] = '';
$linhas[] = 'Total dos itens: ' . $fmt($total);
$linhas[] = "Nome: {$nome}";
$linhas[] = 'Receber: ' . $tipo . ($tipo === 'Entrega' ? " — {$end}" : '');
if ($pag !== '') $linhas[] = "Pagamento: {$pag}";
if ($obs !== '') $linhas[] = "Obs: {$obs}";

json_out([
    'ok' => true,
    'pedido' => $id,
    'total' => round($total, 2),
    'whatsapp_url' => 'https://wa.me/' . preg_replace('/\D/', '', (string)$empresa['whatsapp']) . '?text=' . rawurlencode(implode("\n", $linhas)),
]);
