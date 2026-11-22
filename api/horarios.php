<?php
declare(strict_types=1);
require __DIR__ . '/../src/bootstrap.php';
require __DIR__ . '/../src/agenda.php';

// GET /api/horarios.php?slug=...&servico=0&data=2026-12-01  -> horários livres (já descontados os ocupados)
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') falha('Método não permitido.', 405);

$slug = (string)($_GET['slug'] ?? '');
if (!preg_match('/^[a-z0-9-]{1,160}$/', $slug)) falha('Empresa inválida.');
$empresa = empresa_por_slug($slug);
if (!$empresa) falha('Empresa não encontrada.', 404);
$data = data_valida($_GET['data'] ?? '');
$idx = filter_var($_GET['servico'] ?? 0, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => 50]]);
if ($idx === false) falha('Serviço inválido.');

json_out(['ok' => true, 'horarios' => horarios_livres($empresa, $idx, $data)]);
