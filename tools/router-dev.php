<?php
// Roteador SOMENTE para teste local: php -S localhost:8099 -t . tools/router-dev.php
// Em produção quem faz isso é o .htaccess.
$u = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('#^/(imoveis|veiculos|saude|profissionais-saude|parceiros-saude|busca|ir)/?$#', $u, $m)) {
    require __DIR__ . '/../' . $m[1] . '.php';
    return true;
}
return false;
