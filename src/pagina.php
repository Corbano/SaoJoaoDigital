<?php
declare(strict_types=1);

/**
 * Base das páginas dinâmicas públicas (imóveis, veículos, saúde, busca):
 * layout compartilhado (cabeçalho e rodapé gerados por tools/build.js), acesso a dados
 * (MySQL, com os JSON como reserva) e utilitários.
 */

require_once __DIR__ . '/bootstrap.php';

function site_url(): string
{
    $f = SJD_ROOT . '/config/config.php';
    if (is_file($f) && cfg('site_url')) return rtrim((string)cfg('site_url'), '/');
    return 'https://saojoaodigital.com.br';
}

/** Conexão com o banco ou null (sem config/banco fora do ar). */
function banco(): ?PDO
{
    static $feito = false, $pdo = null;
    if ($feito) return $pdo;
    $feito = true;
    if (!is_file(SJD_ROOT . '/config/config.php')) return null;
    try {
        $pdo = db();
    } catch (Throwable $t) {
        $pdo = null;
    }
    return $pdo;
}

function json_dados(string $arq): array
{
    $j = json_decode((string)@file_get_contents(SJD_ROOT . '/dados/' . $arq), true);
    return is_array($j) ? $j : [];
}

/* ---------- dados (MySQL com reserva em JSON) ---------- */

/** Parceiros de um sistema: 'imobiliaria' ou 'garagem'. Cada item: slug, nome, whatsapp. */
function parceiros(string $tipo): array
{
    $pdo = banco();
    if ($pdo) {
        try {
            $st = $pdo->prepare('SELECT slug, nome, whatsapp FROM parceiros WHERE tipo = ? AND ativo = 1 ORDER BY nome');
            $st->execute([$tipo]);
            $l = $st->fetchAll();
            if ($l) return $l;
        } catch (Throwable $t) {
        }
    }
    $j = json_dados('parceiros.json');
    $l = $j[$tipo === 'imobiliaria' ? 'imobiliarias' : 'garagens'] ?? [];
    return array_map(fn($p) => ['slug' => $p['id'], 'nome' => $p['nome'], 'whatsapp' => $p['whatsapp']], $l);
}

function tipos_saude(): array
{
    return json_dados('parceiros.json')['tipos_saude'] ?? [];
}

function profissionais(?string $tipo = null): array
{
    $pdo = banco();
    if ($pdo) {
        try {
            $sql = 'SELECT slug, tipo, nome, especialidade, endereco, whatsapp, instagram, maps_url FROM profissionais_saude WHERE ativo = 1' . ($tipo ? ' AND tipo = ?' : '') . ' ORDER BY nome';
            $st = $pdo->prepare($sql);
            $st->execute($tipo ? [$tipo] : []);
            $l = $st->fetchAll();
            if ($l) return $l;
        } catch (Throwable $t) {
        }
    }
    $l = json_dados('parceiros.json')['profissionais_saude'] ?? [];
    $l = array_map(fn($p) => ['slug' => $p['id'], 'tipo' => $p['tipo'], 'nome' => $p['nome'], 'especialidade' => $p['especialidade'] ?? '', 'endereco' => $p['endereco'] ?? '', 'whatsapp' => $p['whatsapp'], 'instagram' => '', 'maps_url' => ''], $l);
    return $tipo ? array_values(array_filter($l, fn($p) => $p['tipo'] === $tipo)) : $l;
}

/** Ordem rotativa a cada 5 minutos (mesma para todos na janela): igualdade entre anunciantes. */
function rodizio(array $itens): array
{
    $janela = (string)intdiv(time(), 300);
    usort($itens, fn($a, $b) => crc32($a['slug'] . $janela) <=> crc32($b['slug'] . $janela));
    return $itens;
}

function achar(array $itens, string $slug): ?array
{
    foreach ($itens as $i) if ($i['slug'] === $slug) return $i;
    return null;
}

/* ---------- utilitários ---------- */

function norm(string $s): string
{
    $s = strtr(mb_strtolower($s), [
        'á' => 'a', 'à' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a', 'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
        'í' => 'i', 'ì' => 'i', 'î' => 'i', 'ï' => 'i', 'ó' => 'o', 'ò' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
        'ú' => 'u', 'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ç' => 'c', 'ñ' => 'n',
    ]);
    return trim(preg_replace('/[^a-z0-9]+/', ' ', $s));
}

function brl_p(float $n): string
{
    return 'R$ ' . number_format($n, 2, ',', '.');
}

function wa_url(string $numero, string $msg): string
{
    return 'https://wa.me/' . preg_replace('/\D/', '', $numero) . '?text=' . rawurlencode($msg);
}

function iniciais(string $nome): string
{
    $p = preg_split('/\s+/u', trim($nome));
    $a = mb_substr($p[0] ?? '', 0, 1);
    $b = count($p) > 1 ? mb_substr($p[count($p) - 1], 0, 1) : mb_substr($p[0] ?? '', 1, 1);
    return mb_strtoupper($a . $b);
}

/** Parâmetro GET textual, limpo e limitado. */
function get_txt(string $k, int $max = 120): string
{
    $v = $_GET[$k] ?? '';
    if (!is_string($v)) return '';
    $v = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $v);
    return mb_substr(trim((string)$v), 0, $max);
}

/** Parâmetro GET restrito a uma lista. */
function get_opt(string $k, array $validos): string
{
    $v = $_GET[$k] ?? '';
    return is_string($v) && in_array($v, $validos, true) ? $v : '';
}

/** Valor monetário/numérico digitado pelo usuário, só para exibir na mensagem. */
function get_num(string $k): string
{
    return preg_replace('/[^0-9.,]/', '', get_txt($k, 20));
}

/* ---------- layout ---------- */

function pagina_topo(array $o): void
{
    $titulo = $o['titulo'];
    $desc = $o['desc'] ?? '';
    $path = $o['path'];
    $full = $titulo . ' | São João Digital';
    $bloqueado = is_file(SJD_ROOT . '/config/config.php') && cfg('noindex', false);
    $robots = (!empty($o['noindex']) || $bloqueado) ? 'noindex,nofollow' : 'index,follow,max-image-preview:large,max-snippet:-1';
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache');
    $ld = '';
    if (!empty($o['jsonld'])) $ld = '<script type="application/ld+json">' . json_encode($o['jsonld'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) . '</script>';
    $u = site_url() . $path;
    echo '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
    echo '<title>' . e($full) . '</title><meta name="description" content="' . e(mb_substr($desc, 0, 160)) . '"><meta name="robots" content="' . $robots . '">';
    echo '<link rel="canonical" href="' . e($u) . '"><link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml"><meta name="theme-color" content="#2e1a5c">';
    echo '<meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="São João Digital"><meta property="og:type" content="website">';
    echo '<meta property="og:title" content="' . e($full) . '"><meta property="og:description" content="' . e(mb_substr($desc, 0, 200)) . '"><meta property="og:url" content="' . e($u) . '"><meta property="og:image" content="' . e(site_url()) . '/assets/img/og-default.svg">';
    echo file_get_contents(__DIR__ . '/partials/head-links.html') . $ld . '</head>';
    echo file_get_contents(__DIR__ . '/partials/header.html');
    $c = '';
    foreach ($o['crumbs'] ?? [] as $i => [$h, $t]) $c .= ($h && $i < count($o['crumbs']) - 1) ? '<a href="' . e($h) . '">' . e($t) . '</a> › ' : '<span>' . e($t) . '</span>';
    echo '<div class="page-hero"><div class="container"><nav class="crumbs" aria-label="Você está em">' . $c . '</nav><h1>' . e($o['h1'] ?? $titulo) . '</h1>' . (!empty($o['sub']) ? '<p>' . e($o['sub']) . '</p>' : '') . '</div></div>';
    echo '<div class="container pg">';
}

function pagina_rodape(): void
{
    echo '</div></main>';
    echo file_get_contents(__DIR__ . '/partials/footer.html');
    echo '<script src="/assets/vendor/bootstrap.bundle.min.js" defer></script></body></html>';
}

function aviso_demo(): string
{
    return '<p class="notice"><strong>Dados de demonstração.</strong> Parceiros, profissionais e telefones são fictícios e servem para testar a plataforma.</p>';
}

/** Botão que registra o clique (POST /ir/) e leva ao WhatsApp do parceiro. */
function botao_whatsapp(string $sistema, string $parceiro, string $intencao, string $msg, string $rotulo, string $classe = 'btn btn-success'): string
{
    return '<form method="post" action="/ir/" class="d-inline"><input type="hidden" name="s" value="' . e($sistema) . '"><input type="hidden" name="p" value="' . e($parceiro) . '"><input type="hidden" name="q" value="' . e($intencao) . '"><input type="hidden" name="m" value="' . e($msg) . '"><button class="' . e($classe) . '" type="submit">' . e($rotulo) . '</button></form>';
}

/** Grade de parceiros (logo com iniciais + nome). $href recebe o parceiro e devolve a URL. */
function grade_parceiros(array $lista, callable $href, string $selecionado = ''): string
{
    $h = '<div class="row g-3">';
    foreach ($lista as $p) {
        $sel = $selecionado !== '' && $selecionado === $p['slug'];
        $h .= '<div class="col-6 col-md-4 col-lg-3"><a class="parceiro' . ($sel ? ' ativo' : '') . '" href="' . e($href($p)) . '"' . ($sel ? ' aria-current="true"' : '') . '><span class="avatar av-' . (crc32($p['slug']) % 6) . '" aria-hidden="true">' . e(iniciais($p['nome'])) . '</span><span class="parceiro-nome">' . e($p['nome']) . '</span></a></div>';
    }
    return $h . '</div>';
}

/** Monta URL da própria página com parâmetros. */
function url_com(string $base, array $p): string
{
    $p = array_filter($p, fn($v) => $v !== '' && $v !== null);
    return $base . ($p ? '?' . http_build_query($p) : '');
}

function faq_html(string $id, array $faq): string
{
    $h = '<section class="panel mt-4"><h2 class="h4">Perguntas frequentes</h2><div class="accordion" id="' . e($id) . '">';
    foreach ($faq as $i => [$p, $r]) {
        $h .= '<div class="accordion-item"><h3 class="accordion-header"><button class="accordion-button' . ($i ? ' collapsed' : '') . '" type="button" data-bs-toggle="collapse" data-bs-target="#' . e($id) . '-' . $i . '" aria-expanded="' . ($i ? 'false' : 'true') . '" aria-controls="' . e($id) . '-' . $i . '">' . e($p) . '</button></h3><div id="' . e($id) . '-' . $i . '" class="accordion-collapse collapse' . ($i ? '' : ' show') . '" data-bs-parent="#' . e($id) . '"><div class="accordion-body">' . e($r) . '</div></div></div>';
    }
    return $h . '</div></section>';
}

function faq_ld(array $faq): array
{
    return ['@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => array_map(fn($f) => ['@type' => 'Question', 'name' => $f[0], 'acceptedAnswer' => ['@type' => 'Answer', 'text' => $f[1]]], $faq)];
}
