<?php
declare(strict_types=1);
require __DIR__ . '/../src/bootstrap.php';
require __DIR__ . '/../src/agenda.php';

exigir_post_json();
$d = corpo_json();
anti_robo($d);
limitar('agendamento', (int)cfg('limites.api_max'), (int)cfg('limites.api_janela'));

$slug = (string)($d['slug'] ?? '');
if (!preg_match('/^[a-z0-9-]{1,160}$/', $slug)) falha('Empresa inválida.');
$empresa = empresa_por_slug($slug);
if (!$empresa || empty($empresa['agendamento']['ativo'])) falha('Esta empresa não aceita agendamento.', 404);

$idx = filter_var($d['servico'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => 50]]);
if ($idx === false || !isset($empresa['agendamento']['servicos'][$idx])) falha('Serviço inválido.');
$serv = $empresa['agendamento']['servicos'][$idx];

$data = data_valida($d['data'] ?? '');
$horario = (string)($d['horario'] ?? '');
if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $horario)) falha('Horário inválido.');
$nome = texto($d['nome'] ?? '', 120);
$tel = telefone($d['telefone'] ?? '');
$obs = texto($d['obs'] ?? '', 300, false);
if (empty($d['consentimento'])) falha('É necessário aceitar o uso dos dados para o agendamento.');

$pdo = db();
// trava por empresa+data para impedir duas reservas no mesmo horário
$lock = 'sjd_ag_' . substr(md5($slug . $data), 0, 20);
$pdo->query('SELECT GET_LOCK(' . $pdo->quote($lock) . ', 5)')->fetchColumn();
$id = 0;
try {
    if (in_array($horario, horarios_livres($empresa, $idx, $data), true)) {
        $pdo->prepare('INSERT INTO agendamentos (empresa_slug, servico, data, horario, duracao_min, cliente_nome, cliente_whatsapp, observacoes, ip_hash)
                       VALUES (?,?,?,?,?,?,?,?,?)')
            ->execute([$slug, $serv['nome'], $data, $horario, (int)$serv['duracao_min'], $nome, $tel, $obs, ip_hash()]);
        $id = (int)$pdo->lastInsertId();
    }
} finally {
    $pdo->query('SELECT RELEASE_LOCK(' . $pdo->quote($lock) . ')')->fetchColumn();
}
if ($id === 0) falha('Esse horário acabou de ser ocupado ou não está disponível. Escolha outro.', 409);

[$a, $m, $dia] = explode('-', $data);
$msg = "Olá, {$empresa['nome']}! Fiz uma solicitação de agendamento no São João Digital (protocolo #{$id}):\n"
     . "Serviço: {$serv['nome']}\nData: {$dia}/{$m}/{$a} às {$horario}\nNome: {$nome}\nMeu WhatsApp: {$tel}"
     . ($obs !== '' ? "\nObs: {$obs}" : '') . "\n\nAguardo a confirmação, obrigado!";

json_out([
    'ok' => true,
    'protocolo' => $id,
    'whatsapp_url' => 'https://wa.me/' . preg_replace('/\D/', '', (string)$empresa['whatsapp']) . '?text=' . rawurlencode($msg),
]);
