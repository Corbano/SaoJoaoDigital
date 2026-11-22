<?php
// Copie este arquivo para config/config.php e preencha. O config.php NÃO vai para o Git.
return [
    'db' => [
        'host'    => 'localhost',
        'name'    => 'saojoaodigital',
        'user'    => 'root',
        'pass'    => '',
        'charset' => 'utf8mb4',
    ],
    // Texto longo e aleatório (32+ caracteres). Usado para anonimizar IPs. Troque!
    'segredo'     => 'troque-por-um-texto-aleatorio-longo-aqui',
    // Chave pedida em /admin/instalar.php para criar o 1º administrador (apague o instalar.php depois).
    'install_key' => 'troque-esta-chave',
    'site_url'    => 'https://saojoaodigital.com.br',
    // true = as páginas PHP pedem aos buscadores para NÃO indexar (use enquanto houver dados de demonstração).
    // Troque para false quando publicar dados reais (e gere as páginas estáticas sem NOINDEX).
    'noindex'     => true,
    // Limites por IP (requisições por janela de tempo)
    'limites' => [
        'api_max'    => 12,    // agendamentos/pedidos/cadastros
        'api_janela' => 3600,  // segundos
        'login_max'  => 8,
        'login_janela' => 900,
    ],
    'debug' => false,
];
