<?php
declare(strict_types=1);

/**
 * Inicialização comum: configuração, conexão PDO e funções auxiliares.
 * Este diretório (src/) é bloqueado pelo .htaccess; só é incluído por PHP.
 */

date_default_timezone_set('America/Sao_Paulo');
mb_internal_encoding('UTF-8');

define('SJD_ROOT', dirname(__DIR__));

function cfg(?string $chave = null, $padrao = null)
{
    static $c = null;
    if ($c === null) {
        $arq = SJD_ROOT . '/config/config.php';
        if (!is_file($arq)) {
            http_response_code(500);
            exit('Configuração ausente: copie config/config.example.php para config/config.php.');
        }
        $c = require $arq;
    }
    if ($chave === null) return $c;
    $v = $c;
    foreach (explode('.', $chave) as $p) {
        if (!is_array($v) || !array_key_exists($p, $v)) return $padrao;
        $v = $v[$p];
    }
    return $v;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $d = cfg('db');
        $pdo = new PDO(
            "mysql:host={$d['host']};dbname={$d['name']};charset={$d['charset']}",
            $d['user'],
            $d['pass'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
        $pdo->exec("SET time_zone = '-03:00'");
    }
    return $pdo;
}

/* ---------- saída ---------- */

function e($s): string
{
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function json_out(array $dados, int $codigo = 200): never
{
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function falha(string $msg, int $codigo = 400): never
{
    json_out(['ok' => false, 'erro' => $msg], $codigo);
}

/** Lê o corpo JSON (limite de 32 KB). */
function corpo_json(): array
{
    $raw = file_get_contents('php://input', false, null, 0, 32769);
    if ($raw === false || $raw === '' || strlen($raw) > 32768) falha('Requisição inválida.', 400);
    $d = json_decode($raw, true);
    if (!is_array($d)) falha('JSON inválido.', 400);
    return $d;
}

/** Garante POST, mesma origem (Origin/Host) e Content-Type JSON em endpoints públicos. */
function exigir_post_json(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        header('Allow: POST');
        falha('Método não permitido.', 405);
    }
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '') {
        $host = parse_url($origin, PHP_URL_HOST);
        $port = parse_url($origin, PHP_URL_PORT);
        $h = $host . ($port ? ':' . $port : '');
        if (!hash_equals((string)($_SERVER['HTTP_HOST'] ?? ''), $h)) falha('Origem não permitida.', 403);
    }
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) falha('Use application/json.', 415);
}

/* ---------- validações ---------- */

function texto($v, int $max, bool $obrigatorio = true): string
{
    $s = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', (string)$v));
    $s = preg_replace('/\s+/u', ' ', $s);
    if ($obrigatorio && $s === '') falha('Preencha todos os campos obrigatórios.');
    if (mb_strlen($s) > $max) falha("Texto muito longo (máx. {$max} caracteres).");
    return $s;
}

function telefone($v, bool $obrigatorio = true): string
{
    $d = preg_replace('/\D/', '', (string)$v);
    if ($d === '' && !$obrigatorio) return '';
    if (strlen($d) === 13 && str_starts_with($d, '55')) $d = substr($d, 2);
    if (strlen($d) < 10 || strlen($d) > 11) falha('Informe um telefone válido com DDD.');
    return $d;
}

function email_valido($v): string
{
    $s = trim((string)$v);
    if (!filter_var($s, FILTER_VALIDATE_EMAIL) || mb_strlen($s) > 190) falha('Informe um e-mail válido.');
    return $s;
}

function data_valida($v): string
{
    $d = DateTime::createFromFormat('!Y-m-d', (string)$v);
    if (!$d || $d->format('Y-m-d') !== $v) falha('Data inválida.');
    return $d->format('Y-m-d');
}

function slug_de(string $t): string
{
    $t = strtr(mb_strtolower($t), [
        'á' => 'a', 'à' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a', 'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
        'í' => 'i', 'ì' => 'i', 'î' => 'i', 'ï' => 'i', 'ó' => 'o', 'ò' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
        'ú' => 'u', 'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ç' => 'c', 'ñ' => 'n',
    ]);
    $t = preg_replace('/[^a-z0-9]+/', '-', $t);
    return trim($t, '-') ?: 'empresa';
}

/* ---------- segurança / abuso ---------- */

function ip_hash(): string
{
    return hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', (string)cfg('segredo'));
}

/** Registra a ação; devolve true se o limite da janela já foi excedido (e nesse caso não registra). */
function limite_excedido(string $chave, int $max, int $janelaSeg): bool
{
    $pdo = db();
    $k = substr($chave . ':' . ip_hash(), 0, 100);
    $pdo->prepare('DELETE FROM rate_limit WHERE criado_em < (NOW() - INTERVAL 1 DAY)')->execute();
    $st = $pdo->prepare('SELECT COUNT(*) FROM rate_limit WHERE chave = ? AND criado_em > (NOW() - INTERVAL ? SECOND)');
    $st->execute([$k, $janelaSeg]);
    if ((int)$st->fetchColumn() >= $max) return true;
    $pdo->prepare('INSERT INTO rate_limit (chave) VALUES (?)')->execute([$k]);
    return false;
}

/** Versão para APIs JSON: responde 429 e encerra se excedeu. */
function limitar(string $chave, int $max, int $janelaSeg): void
{
    if (limite_excedido($chave, $max, $janelaSeg)) {
        header('Retry-After: ' . $janelaSeg);
        falha('Muitas tentativas. Tente novamente mais tarde.', 429);
    }
}

/** Honeypot: campo "site_url" escondido que humanos não preenchem. */
function anti_robo(array $d): void
{
    if (!empty($d['website'])) json_out(['ok' => true]); // finge sucesso para o robô
}

/* ---------- dados do site ---------- */

function categorias_json(): array
{
    static $c = null;
    if ($c === null) {
        $j = json_decode((string)file_get_contents(SJD_ROOT . '/dados/categorias.json'), true);
        $c = [];
        foreach ($j['categorias'] as $cat) $c[$cat['slug']] = $cat;
    }
    return $c;
}

function empresa_por_slug(string $slug): ?array
{
    $st = db()->prepare('SELECT dados FROM empresas WHERE slug = ? AND ativa = 1');
    $st->execute([$slug]);
    $r = $st->fetchColumn();
    return $r ? json_decode($r, true) : null;
}
