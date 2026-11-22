<?php
declare(strict_types=1);

/** Importação e exportação entre os JSON do site (dados/) e o banco. */

function importar_json(): array
{
    $pdo = db();
    $emp = json_decode((string)file_get_contents(SJD_ROOT . '/dados/empresas.json'), true);
    $of = json_decode((string)file_get_contents(SJD_ROOT . '/dados/ofertas.json'), true);
    $cp = json_decode((string)file_get_contents(SJD_ROOT . '/dados/cupons.json'), true);
    $pa = json_decode((string)file_get_contents(SJD_ROOT . '/dados/parceiros.json'), true);
    $ne = $no = $nc = $np = 0;

    $pdo->beginTransaction();
    try {
        $up = $pdo->prepare('INSERT INTO empresas (slug, nome, categoria, subcategoria_slug, plano, whatsapp, ativa, dados)
            VALUES (:slug,:nome,:cat,:sub,:plano,:wa,1,:dados)
            ON DUPLICATE KEY UPDATE nome=VALUES(nome), categoria=VALUES(categoria), subcategoria_slug=VALUES(subcategoria_slug),
              plano=VALUES(plano), whatsapp=VALUES(whatsapp), dados=VALUES(dados)');
        foreach ($emp['empresas'] as $e) {
            $up->execute([
                ':slug' => $e['slug'], ':nome' => $e['nome'], ':cat' => $e['categoria'], ':sub' => $e['subcategoria_slug'] ?? '',
                ':plano' => ($e['plano'] ?? 'gratuito') === 'premium' ? 'premium' : 'gratuito',
                ':wa' => $e['whatsapp'] ?? '', ':dados' => json_encode($e, JSON_UNESCAPED_UNICODE),
            ]);
            $ne++;
        }
        $uo = $pdo->prepare('INSERT INTO ofertas (ref, empresa_slug, produto, descricao, preco, preco_promocional, data_inicio, data_fim, ativo)
            VALUES (:ref,:emp,:prod,:desc,:preco,:promo,:ini,:fim,:ativo)
            ON DUPLICATE KEY UPDATE empresa_slug=VALUES(empresa_slug), produto=VALUES(produto), descricao=VALUES(descricao),
              preco=VALUES(preco), preco_promocional=VALUES(preco_promocional), data_inicio=VALUES(data_inicio), data_fim=VALUES(data_fim), ativo=VALUES(ativo)');
        foreach ($of['ofertas'] as $o) {
            $uo->execute([
                ':ref' => $o['id'], ':emp' => $o['empresa'], ':prod' => $o['produto'], ':desc' => $o['descricao'] ?? '',
                ':preco' => $o['preco'], ':promo' => $o['preco_promocional'] ?? null,
                ':ini' => $o['data_inicio'] ?? null, ':fim' => $o['data_fim'] ?? null, ':ativo' => !empty($o['ativo']) ? 1 : 0,
            ]);
            $no++;
        }
        $uc = $pdo->prepare('INSERT INTO cupons (ref, empresa_slug, titulo, descricao, codigo, tipo, valor, semana, condicoes, data_inicio, data_fim, ativo)
            VALUES (:ref,:emp,:tit,:desc,:cod,:tipo,:valor,:sem,:cond,:ini,:fim,1)
            ON DUPLICATE KEY UPDATE empresa_slug=VALUES(empresa_slug), titulo=VALUES(titulo), descricao=VALUES(descricao), codigo=VALUES(codigo),
              tipo=VALUES(tipo), valor=VALUES(valor), semana=VALUES(semana), condicoes=VALUES(condicoes), data_inicio=VALUES(data_inicio), data_fim=VALUES(data_fim)');
        foreach ($cp['cupons'] as $c) {
            $uc->execute([
                ':ref' => $c['id'], ':emp' => $c['empresa'], ':tit' => $c['titulo'], ':desc' => $c['descricao'] ?? '', ':cod' => $c['codigo'],
                ':tipo' => $c['tipo'] ?? 'percentual', ':valor' => $c['valor'] ?? 0, ':sem' => !empty($c['semana']) ? 1 : 0,
                ':cond' => $c['condicoes'] ?? '', ':ini' => $c['data_inicio'] ?? null, ':fim' => $c['data_fim'] ?? null,
            ]);
            $nc++;
        }
        $up2 = $pdo->prepare('INSERT INTO parceiros (tipo, slug, nome, whatsapp, ativo, demo) VALUES (?,?,?,?,1,?)
            ON DUPLICATE KEY UPDATE nome=VALUES(nome), whatsapp=VALUES(whatsapp), demo=VALUES(demo)');
        foreach (['imobiliaria' => 'imobiliarias', 'garagem' => 'garagens'] as $tipo => $chave) {
            foreach ($pa[$chave] ?? [] as $p) {
                $up2->execute([$tipo, $p['id'], $p['nome'], preg_replace('/D/', '', $p['whatsapp']), !empty($p['demo']) ? 1 : 0]);
                $np++;
            }
        }
        $up3 = $pdo->prepare('INSERT INTO profissionais_saude (tipo, slug, nome, especialidade, endereco, whatsapp, ativo, demo) VALUES (?,?,?,?,?,?,1,?)
            ON DUPLICATE KEY UPDATE tipo=VALUES(tipo), nome=VALUES(nome), especialidade=VALUES(especialidade), endereco=VALUES(endereco), whatsapp=VALUES(whatsapp), demo=VALUES(demo)');
        foreach ($pa['profissionais_saude'] ?? [] as $p) {
            $up3->execute([$p['tipo'], $p['id'], $p['nome'], $p['especialidade'] ?? '', $p['endereco'] ?? '', preg_replace('/D/', '', $p['whatsapp']), !empty($p['demo']) ? 1 : 0]);
            $np++;
        }
        $pdo->commit();
    } catch (Throwable $t) {
        $pdo->rollBack();
        throw $t;
    }
    return ['empresas' => $ne, 'ofertas' => $no, 'cupons' => $nc, 'parceiros' => $np];
}

/** Escreve dados/empresas.json e dados/ofertas.json a partir do banco (faz cópia .bak antes). */
function exportar_json(): array
{
    $pdo = db();
    $dir = SJD_ROOT . '/dados/';
    $hoje = date('Y-m-d');

    $meta = json_decode((string)file_get_contents($dir . 'empresas.json'), true);
    $empresas = [];
    foreach ($pdo->query('SELECT dados FROM empresas WHERE ativa = 1 ORDER BY id') as $r) $empresas[] = json_decode($r['dados'], true);
    $saidaE = ['versao' => $meta['versao'] ?? '1.0', 'atualizado' => $hoje, 'aviso' => $meta['aviso'] ?? '', 'empresas' => $empresas];

    $metaO = json_decode((string)file_get_contents($dir . 'ofertas.json'), true);
    $ofertas = [];
    foreach ($pdo->query('SELECT o.* FROM ofertas o JOIN empresas e ON e.slug = o.empresa_slug AND e.ativa = 1 ORDER BY o.id') as $r) {
        $ofertas[] = [
            'id' => $r['ref'] ?: 'of-' . $r['id'], 'empresa' => $r['empresa_slug'],
            'categoria' => (json_decode((string)$pdo->query('SELECT dados FROM empresas WHERE slug = ' . $pdo->quote($r['empresa_slug']))->fetchColumn(), true)['categoria'] ?? ''),
            'produto' => $r['produto'], 'descricao' => $r['descricao'], 'preco' => (float)$r['preco'],
            'preco_promocional' => $r['preco_promocional'] !== null ? (float)$r['preco_promocional'] : null,
            'data_inicio' => $r['data_inicio'], 'data_fim' => $r['data_fim'], 'ativo' => (bool)$r['ativo'],
        ];
    }
    $saidaO = ['versao' => $metaO['versao'] ?? '1.0', 'atualizado' => $hoje, 'aviso' => $metaO['aviso'] ?? '', 'ofertas' => $ofertas];

    $metaC = json_decode((string)file_get_contents($dir . 'cupons.json'), true);
    $cupons = [];
    foreach ($pdo->query('SELECT c.* FROM cupons c JOIN empresas e ON e.slug = c.empresa_slug AND e.ativa = 1 WHERE c.ativo = 1 ORDER BY c.id') as $r) {
        $cupons[] = [
            'id' => $r['ref'] ?: 'cp-' . $r['id'], 'empresa' => $r['empresa_slug'], 'titulo' => $r['titulo'], 'descricao' => $r['descricao'],
            'codigo' => $r['codigo'], 'tipo' => $r['tipo'], 'valor' => (float)$r['valor'], 'semana' => (bool)$r['semana'],
            'data_inicio' => $r['data_inicio'], 'data_fim' => $r['data_fim'], 'condicoes' => $r['condicoes'],
        ];
    }
    $saidaC = ['versao' => $metaC['versao'] ?? '1.0', 'atualizado' => $hoje, 'aviso' => $metaC['aviso'] ?? '', 'cupons' => $cupons];

    foreach (['empresas.json' => $saidaE, 'ofertas.json' => $saidaO, 'cupons.json' => $saidaC] as $arq => $conteudo) {
        @copy($dir . $arq, $dir . $arq . '.bak');
        $ok = file_put_contents($dir . $arq, json_encode($conteudo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX);
        if ($ok === false) throw new RuntimeException("Sem permissão para gravar dados/{$arq}.");
    }
    return ['empresas' => count($empresas), 'ofertas' => count($ofertas), 'cupons' => count($cupons)];
}
