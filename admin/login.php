<?php
declare(strict_types=1);
require __DIR__ . '/_layout.php';
cabecalhos_admin();
sessao();
if (usuario_atual()) voltar('');

$erro = '';
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    exigir_post_csrf();
    if (limite_excedido('login', (int)cfg('limites.login_max'), (int)cfg('limites.login_janela'))) {
        $erro = 'Muitas tentativas. Aguarde alguns minutos.';
    } elseif (tentar_login(mb_strtolower(trim((string)($_POST['email'] ?? ''))), (string)($_POST['senha'] ?? ''))) {
        voltar('');
    } else {
        $erro = 'E-mail ou senha incorretos.';
    }
}
admin_topo('Entrar');
?>
<div class="row justify-content-center"><div class="col-md-5"><form method="post" class="panel" autocomplete="on">
<?= csrf_campo() ?>
<?php if ($erro): ?><div class="alert alert-danger" role="alert"><?= e($erro) ?></div><?php endif; ?>
<div class="mb-3"><label class="form-label" for="email">E-mail</label><input class="form-control" id="email" name="email" type="email" required autocomplete="username"></div>
<div class="mb-3"><label class="form-label" for="senha">Senha</label><input class="form-control" id="senha" name="senha" type="password" required autocomplete="current-password"></div>
<button class="btn btn-primary w-100" type="submit">Entrar</button></form></div></div>
<?php admin_rodape();
