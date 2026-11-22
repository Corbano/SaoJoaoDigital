<?php
declare(strict_types=1);
/**
 * Cria o PRIMEIRO administrador. Só funciona enquanto a tabela usuarios estiver vazia e exige a
 * install_key do config/config.php. APAGUE este arquivo do servidor depois de usar.
 */
require __DIR__ . '/_layout.php';
cabecalhos_admin();
sessao();

$temUsuario = (int)db()->query('SELECT COUNT(*) FROM usuarios')->fetchColumn() > 0;
$msg = '';
$ok = false;
if (!$temUsuario && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    exigir_post_csrf();
    $nome = trim((string)($_POST['nome'] ?? ''));
    $email = filter_var(mb_strtolower(trim((string)($_POST['email'] ?? ''))), FILTER_VALIDATE_EMAIL);
    $senha = (string)($_POST['senha'] ?? '');
    if (!hash_equals((string)cfg('install_key'), (string)($_POST['chave'] ?? ''))) $msg = 'Chave de instalação incorreta.';
    elseif ($nome === '' || !$email) $msg = 'Informe nome e e-mail válidos.';
    elseif (!senha_forte($senha)) $msg = 'A senha precisa de 10+ caracteres, com letras e números.';
    else {
        db()->prepare('INSERT INTO usuarios (nome, email, senha_hash, tipo) VALUES (?,?,?,\'admin\')')
            ->execute([mb_substr($nome, 0, 120), $email, password_hash($senha, PASSWORD_DEFAULT)]);
        $ok = true;
    }
}
admin_topo('Instalação');
if ($temUsuario && !$ok): ?>
<div class="alert alert-warning">Já existe um administrador. <strong>Apague o arquivo admin/instalar.php</strong> do servidor. <a href="/admin/login.php">Ir para o login</a></div>
<?php elseif ($ok): ?>
<div class="alert alert-success">Administrador criado. <strong>Apague admin/instalar.php agora.</strong> <a href="/admin/login.php">Entrar</a></div>
<?php else: ?>
<?php if ($msg): ?><div class="alert alert-danger" role="alert"><?= e($msg) ?></div><?php endif; ?>
<form method="post" class="panel" style="max-width:520px"><?= csrf_campo() ?>
<div class="mb-3"><label class="form-label" for="chave">Chave de instalação (config.php)</label><input class="form-control" id="chave" name="chave" type="password" required></div>
<div class="mb-3"><label class="form-label" for="nome">Nome</label><input class="form-control" id="nome" name="nome" maxlength="120" required></div>
<div class="mb-3"><label class="form-label" for="email">E-mail</label><input class="form-control" id="email" name="email" type="email" required></div>
<div class="mb-3"><label class="form-label" for="senha">Senha (10+ caracteres, letras e números)</label><input class="form-control" id="senha" name="senha" type="password" minlength="10" required autocomplete="new-password"></div>
<button class="btn btn-primary" type="submit">Criar administrador</button></form>
<?php endif;
admin_rodape();
