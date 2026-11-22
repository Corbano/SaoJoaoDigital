<?php
declare(strict_types=1);
require __DIR__ . '/../src/bootstrap.php';

exigir_post_json();
$d = corpo_json();
anti_robo($d);
limitar('cadastro', 5, 3600);

$cats = categorias_json();
$cat = (string)($d['categoria'] ?? '');
if (!isset($cats[$cat])) falha('Escolha uma categoria.');
$sub = (string)($d['subcategoria'] ?? '');
$subOk = array_column($cats[$cat]['subcategorias'], 'slug');
if ($sub !== '' && !in_array($sub, $subOk, true)) $sub = '';

$nome = texto($d['nome_empresa'] ?? '', 200);
$resp = texto($d['responsavel'] ?? '', 120);
$tel = telefone($d['telefone'] ?? '');
$wa = telefone($d['whatsapp'] ?? '', false);
$email = email_valido($d['email'] ?? '');
$end = texto($d['endereco'] ?? '', 250, false);
$desc = texto($d['descricao'] ?? '', 1000, false);
if (empty($d['consentimento'])) falha('É necessário aceitar o uso dos dados para o cadastro.');

db()->prepare('INSERT INTO cadastros_pendentes (nome_empresa, categoria, subcategoria_slug, responsavel, telefone, whatsapp, email, endereco, descricao, ip_hash) VALUES (?,?,?,?,?,?,?,?,?,?)')
    ->execute([$nome, $cat, $sub, $resp, $tel, $wa, $email, $end, $desc, ip_hash()]);

json_out(['ok' => true, 'mensagem' => 'Cadastro recebido! Nossa equipe vai analisar e entrar em contato.']);
