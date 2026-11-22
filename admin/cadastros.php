<?php
declare(strict_types=1);
require __DIR__ . '/_layout.php';
$u = exigir_login();
$cats = categorias_json();

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    exigir_post_csrf();
    $id = (int)($_POST['id'] ?? 0);
    $acao = (string)($_POST['acao'] ?? '');
    $pdo = db();
    $st = $pdo->prepare("SELECT * FROM cadastros_pendentes WHERE id = ? AND status = 'pendente'");
    $st->execute([$id]);
    $c = $st->fetch();
    if ($c && $acao === 'rejeitar') {
        $pdo->prepare("UPDATE cadastros_pendentes SET status='rejeitado' WHERE id=?")->execute([$id]);
        aviso_flash('Cadastro rejeitado.');
    } elseif ($c && $acao === 'aprovar') {
        $base = slug_de($c['nome_empresa']);
        $slug = $base;
        for ($i = 2; (int)$pdo->query('SELECT COUNT(*) FROM empresas WHERE slug = ' . $pdo->quote($slug))->fetchColumn() > 0; $i++) $slug = $base . '-' . $i;
        $subNome = '';
        foreach ($cats[$c['categoria']]['subcategorias'] ?? [] as $s) if ($s['slug'] === $c['subcategoria_slug']) $subNome = $s['nome'];
        $wa = $c['whatsapp'] ?: $c['telefone'];
        $dados = [
            'id' => 'emp-' . $slug, 'slug' => $slug, 'nome' => $c['nome_empresa'], 'categoria' => $c['categoria'],
            'subcategoria_slug' => $c['subcategoria_slug'], 'subcategoria' => $subNome ?: $cats[$c['categoria']]['nome'], 'tags' => [],
            'plano' => 'gratuito', 'ia' => false, 'destaque' => false, 'demo' => false,
            'resumo' => mb_substr($c['descricao'] ?: $c['nome_empresa'] . ' em São João da Boa Vista.', 0, 200),
            'descricao' => $c['descricao'] ?: $c['nome_empresa'] . ' em São João da Boa Vista.',
            'historia' => '', 'produtos' => [], 'servicos' => [], 'diferenciais' => [], 'publico' => '',
            'endereco' => ['rua' => $c['endereco'], 'numero' => '', 'bairro' => '', 'cidade' => 'São João da Boa Vista', 'uf' => 'SP', 'cep' => '', 'referencia' => ''],
            'telefone' => $c['telefone'], 'whatsapp' => '55' . $wa, 'email' => $c['email'], 'site' => '', 'redes' => [],
            'horario' => [], 'fechado' => '', 'pagamento' => [], 'faq' => [], 'avaliacoes_verificadas' => false, 'avaliacoes' => [], 'atualizacoes' => [],
            'atualizado' => date('Y-m-d'),
        ];
        $pdo->beginTransaction();
        $pdo->prepare('INSERT INTO empresas (slug, nome, categoria, subcategoria_slug, plano, whatsapp, ativa, dados) VALUES (?,?,?,?,?,?,1,?)')
            ->execute([$slug, $c['nome_empresa'], $c['categoria'], $c['subcategoria_slug'], 'gratuito', '55' . $wa, json_encode($dados, JSON_UNESCAPED_UNICODE)]);
        $pdo->prepare("UPDATE cadastros_pendentes SET status='aprovado' WHERE id=?")->execute([$id]);
        $pdo->commit();
        aviso_flash("Empresa aprovada e criada ({$slug}). Complete os dados em Empresas.");
    }
    voltar('cadastros.php');
}

$linhas = db()->query("SELECT * FROM cadastros_pendentes ORDER BY status='pendente' DESC, id DESC LIMIT 100")->fetchAll();
admin_topo('Cadastros de empresas', $u);
aviso_flash();
?>
<div class="table-responsive"><table class="table table-sm align-middle bg-white">
<thead><tr><th>#</th><th>Empresa</th><th>Contato</th><th>Categoria</th><th>Status</th><th>Ações</th></tr></thead><tbody>
<?php foreach ($linhas as $c): ?>
<tr><td><?= (int)$c['id'] ?></td>
<td><strong><?= e($c['nome_empresa']) ?></strong><br><small class="text-secondary"><?= e($c['descricao']) ?></small><br><small><?= e($c['endereco']) ?></small></td>
<td><?= e($c['responsavel']) ?><br><small><?= e($c['telefone']) ?> · <?= e($c['email']) ?></small></td>
<td><?= e($cats[$c['categoria']]['nome'] ?? $c['categoria']) ?></td>
<td><?= badge_status($c['status']) ?><br><small class="text-secondary"><?= e(date('d/m/Y', strtotime($c['criado_em']))) ?></small></td>
<td class="text-nowrap"><?php if ($c['status'] === 'pendente'): ?><form method="post" class="d-inline"><?= csrf_campo() ?><input type="hidden" name="id" value="<?= (int)$c['id'] ?>">
<button class="btn btn-sm btn-success" name="acao" value="aprovar">Aprovar</button> <button class="btn btn-sm btn-outline-secondary" name="acao" value="rejeitar">Rejeitar</button></form><?php endif; ?></td></tr>
<?php endforeach; if (!$linhas): ?><tr><td colspan="6" class="text-center text-secondary">Nenhum cadastro.</td></tr><?php endif; ?>
</tbody></table></div>
<?php admin_rodape();
