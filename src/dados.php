<?php
declare(strict_types=1);

/** Importação e exportação entre os JSON do site (dados/) e o banco. */

function importar_json(): array
{
    $pdo = db();
    $emp = json_decode((string)file_get_contents(SJD_ROOT . '/dados/empresas.json'), true);
    $of = json_decode((string)file_get_contents(SJD_ROOT . '/dados/ofertas.json'), true);
    $ne = $no = 0;

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
        $pdo->commit();
    } catch (Throwable $t) {
        $pdo->rollBack();
        throw $t;
    }
    return ['empresas' => $ne, 'ofertas' => $no];
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

    foreach (['empresas.json' => $saidaE, 'ofertas.json' => $saidaO] as $arq => $conteudo) {
        @copy($dir . $arq, $dir . $arq . '.bak');
        $ok = file_put_contents($dir . $arq, json_encode($conteudo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX);
        if ($ok === false) throw new RuntimeException("Sem permissão para gravar dados/{$arq}.");
    }
    return ['empresas' => count($empresas), 'ofertas' => count($ofertas)];
}
