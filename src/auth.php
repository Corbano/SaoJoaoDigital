<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';

/** Sessão e autenticação do painel administrativo. */

function sessao(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_name('sjd_admin');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/admin/',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function cabecalhos_admin(): void
{
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex, nofollow');
    header('X-Frame-Options: DENY');
}

function usuario_atual(): ?array
{
    sessao();
    if (empty($_SESSION['uid'])) return null;
    if (($_SESSION['ua'] ?? '') !== hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? '')) { // proteção simples contra roubo de sessão
        session_destroy();
        return null;
    }
    $st = db()->prepare('SELECT id, nome, email, tipo FROM usuarios WHERE id = ? AND ativo = 1');
    $st->execute([$_SESSION['uid']]);
    return $st->fetch() ?: null;
}

function exigir_login(): array
{
    cabecalhos_admin();
    $u = usuario_atual();
    if (!$u) {
        header('Location: /admin/login.php');
        exit;
    }
    return $u;
}

function csrf_token(): string
{
    sessao();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}

function csrf_campo(): string
{
    return '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">';
}

/** Valida POST + token CSRF; encerra com 403 se falhar. */
function exigir_post_csrf(): void
{
    sessao();
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST'
        || !hash_equals($_SESSION['csrf'] ?? '', (string)($_POST['csrf'] ?? ''))) {
        http_response_code(403);
        exit('Requisição inválida (token expirado). Volte e tente de novo.');
    }
}

function tentar_login(string $email, string $senha): bool
{
    $st = db()->prepare('SELECT id, senha_hash FROM usuarios WHERE email = ? AND ativo = 1');
    $st->execute([$email]);
    $u = $st->fetch();
    // verifica sempre um hash (evita revelar se o e-mail existe pelo tempo de resposta)
    $hash = $u['senha_hash'] ?? '$2y$10$usesomesillystringforsaltexample.invalidhashvalueXXXXXXXXXXXXXX';
    $ok = password_verify($senha, $hash) && $u;
    if ($ok) {
        session_regenerate_id(true);
        $_SESSION['uid'] = (int)$u['id'];
        $_SESSION['ua'] = hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? '');
        if (password_needs_rehash($u['senha_hash'], PASSWORD_DEFAULT)) {
            db()->prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?')->execute([password_hash($senha, PASSWORD_DEFAULT), $u['id']]);
        }
    }
    return (bool)$ok;
}

function senha_forte(string $s): bool
{
    return strlen($s) >= 10 && preg_match('/[A-Za-z]/', $s) && preg_match('/\d/', $s);
}
