<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/auth.php';

function admin_topo(string $titulo, ?array $u = null): void
{
    $atual = basename($_SERVER['SCRIPT_NAME'], '.php');
    $menu = ['index' => 'Painel', 'agendamentos' => 'Agendamentos', 'pedidos' => 'Pedidos', 'cadastros' => 'Cadastros', 'empresas' => 'Empresas', 'ofertas' => 'Ofertas', 'dados' => 'Dados'];
    ?><!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title><?= e($titulo) ?> — Admin São João Digital</title>
<link rel="stylesheet" href="/assets/vendor/bootstrap.min.css"><link rel="stylesheet" href="/assets/css/style.css"></head>
<body>
<?php if ($u): ?>
<header class="site-header"><nav class="navbar navbar-expand-lg navbar-dark"><div class="container">
<a class="navbar-brand brand" href="/admin/">Admin <b>SJD</b></a>
<button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav" aria-label="Menu"><span class="navbar-toggler-icon"></span></button>
<div class="collapse navbar-collapse" id="nav"><ul class="navbar-nav me-auto">
<?php foreach ($menu as $k => $t): ?><li class="nav-item"><a class="nav-link<?= $atual === $k ? ' active' : '' ?>" href="/admin/<?= $k === 'index' ? '' : e($k) . '.php' ?>"><?= e($t) ?></a></li><?php endforeach; ?>
</ul><span class="navbar-text me-3"><?= e($u['nome']) ?></span>
<form method="post" action="/admin/logout.php" class="d-flex"><?= csrf_campo() ?><button class="btn btn-sm btn-outline-light" type="submit">Sair</button></form>
</div></div></nav></header>
<?php endif; ?>
<main class="container py-4"><h1 class="h3 mb-3"><?= e($titulo) ?></h1>
<?php }

function admin_rodape(): void
{
    echo '</main><script src="/assets/vendor/bootstrap.bundle.min.js" defer></script><script src="/assets/js/admin.js" defer></script></body></html>';
}

function aviso_flash(?string $msg = null, string $tipo = 'success'): void
{
    sessao();
    if ($msg !== null) { $_SESSION['flash'] = [$msg, $tipo]; return; }
    if (!empty($_SESSION['flash'])) {
        [$m, $t] = $_SESSION['flash'];
        unset($_SESSION['flash']);
        echo '<div class="alert alert-' . e($t) . '" role="status">' . e($m) . '</div>';
    }
}

function voltar(string $arq): never
{
    header('Location: /admin/' . $arq);
    exit;
}

function badge_status(string $s): string
{
    $c = ['pendente' => 'warning', 'confirmado' => 'success', 'cancelado' => 'secondary', 'novo' => 'warning', 'em_preparo' => 'info', 'entregue' => 'success', 'aprovado' => 'success', 'rejeitado' => 'secondary'][$s] ?? 'secondary';
    return '<span class="badge text-bg-' . $c . '">' . e(str_replace('_', ' ', $s)) . '</span>';
}

function brl_php(float $n): string
{
    return 'R$ ' . number_format($n, 2, ',', '.');
}
