<?php
declare(strict_types=1);
/**
 * Registra o clique de um funil (imóveis, veículos, saúde) e leva ao WhatsApp do parceiro.
 * O destino sai SEMPRE do cadastro do parceiro (nunca de um parâmetro), então não há redirecionamento aberto.
 * Guarda só a contagem: sistema, parceiro e intenção. A mensagem não é armazenada.
 */
require __DIR__ . '/src/pagina.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    exit('Método não permitido.');
}
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    $h = parse_url($origin, PHP_URL_HOST) . (parse_url($origin, PHP_URL_PORT) ? ':' . parse_url($origin, PHP_URL_PORT) : '');
    if (!hash_equals((string)($_SERVER['HTTP_HOST'] ?? ''), (string)$h)) {
        http_response_code(403);
        exit('Origem não permitida.');
    }
}

$sistema = (string)($_POST['s'] ?? '');
$slug = mb_substr((string)($_POST['p'] ?? ''), 0, 120);
$intencao = preg_replace('/[^a-z_-]/', '', mb_substr((string)($_POST['q'] ?? ''), 0, 30));
$msg = mb_convert_encoding((string)($_POST['m'] ?? ''), 'UTF-8', 'UTF-8'); // bytes inválidos viram "?"
$msg = (string)preg_replace('/[\x00-\x09\x0B-\x1F\x7F]/u', '', $msg);
$msg = mb_substr($msg, 0, 1500);

$lista = match ($sistema) {
    'imoveis' => parceiros('imobiliaria'),
    'veiculos' => parceiros('garagem'),
    'saude' => profissionais(),
    default => [],
};
$alvo = achar($lista, $slug);
if (!$alvo) {
    http_response_code(404);
    exit('Parceiro não encontrado.');
}

$pdo = banco();
if ($pdo) {
    try {
        if (!limite_excedido('ir', 40, 3600)) {
            $pdo->prepare('INSERT INTO cliques (sistema, parceiro_slug, intencao, ip_hash) VALUES (?,?,?,?)')->execute([$sistema, $slug, $intencao, ip_hash()]);
        }
    } catch (Throwable $t) {
        // a contagem nunca impede o contato
    }
}

header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');
header('Location: ' . wa_url($alvo['whatsapp'], $msg), true, 303);
exit;
