<?php
declare(strict_types=1);

/** Cálculo de horários livres (mesma regra do navegador, mais os horários já ocupados no banco). */

function hhmm_min(string $h): int
{
    [$a, $b] = array_map('intval', explode(':', $h));
    return $a * 60 + $b;
}

function min_hhmm(int $m): string
{
    return sprintf('%02d:%02d', intdiv($m, 60), $m % 60);
}

/**
 * @return string[] horários livres ("HH:MM") para o serviço na data.
 */
function horarios_livres(array $empresa, int $idxServico, string $data): array
{
    $ag = $empresa['agendamento'] ?? null;
    if (!$ag || empty($ag['ativo']) || !isset($ag['servicos'][$idxServico])) return [];
    $serv = $ag['servicos'][$idxServico];
    $dur = (int)$serv['duracao_min'];
    $passo = max(5, (int)($ag['passo_min'] ?? 30));
    $capacidade = max(1, (int)($ag['capacidade'] ?? 1));

    $hoje = new DateTime('today');
    $dt = new DateTime($data);
    if ($dt < $hoje) return [];
    $limite = (clone $hoje)->modify('+' . (int)($ag['dias_a_frente'] ?? 14) . ' days');
    if ($dt > $limite) return [];

    $dow = $dt->format('l'); // Monday...
    $minimo = ($data === $hoje->format('Y-m-d'))
        ? (int)date('G') * 60 + (int)date('i') + (int)($ag['antecedencia_horas'] ?? 2) * 60
        : -1;

    // ocupados (pendentes e confirmados)
    $st = db()->prepare("SELECT horario, duracao_min FROM agendamentos WHERE empresa_slug = ? AND data = ? AND status <> 'cancelado'");
    $st->execute([$empresa['slug'], $data]);
    $ocupados = array_map(fn($r) => [hhmm_min($r['horario']), hhmm_min($r['horario']) + (int)$r['duracao_min']], $st->fetchAll());

    $livres = [];
    foreach ($empresa['horario'] ?? [] as $h) {
        if (!in_array($dow, $h['dow'] ?? [], true)) continue;
        for ($m = hhmm_min($h['abre']); $m + $dur <= hhmm_min($h['fecha']); $m += $passo) {
            if ($m < $minimo) continue;
            $uso = 0;
            foreach ($ocupados as [$ini, $fim]) {
                if ($m < $fim && $ini < $m + $dur) $uso++;
            }
            if ($uso < $capacidade) $livres[] = min_hhmm($m);
        }
    }
    return array_values(array_unique($livres));
}
