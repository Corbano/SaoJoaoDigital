<?php
declare(strict_types=1);
require __DIR__ . '/_layout.php';
require __DIR__ . '/../src/dados.php';
$u = exigir_login();

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    exigir_post_csrf();
    try {
        if (($_POST['acao'] ?? '') === 'importar') {
            $r = importar_json();
            aviso_flash("Importado: {$r['empresas']} empresas, {$r['ofertas']} ofertas e {$r['cupons']} cupons e {$r['parceiros']} parceiros/profissionais (registros existentes foram atualizados com o conteúdo dos JSON).");
        } elseif (($_POST['acao'] ?? '') === 'exportar') {
            $r = exportar_json();
            aviso_flash("Exportado para dados/*.json: {$r['empresas']} empresas, {$r['ofertas']} ofertas e {$r['cupons']} cupons (cópia .bak criada). Agora gere as páginas com node tools/build.js.");
        }
    } catch (Throwable $t) {
        aviso_flash('Erro: ' . (cfg('debug') ? $t->getMessage() : 'não foi possível concluir.'), 'danger');
    }
    voltar('dados.php');
}
admin_topo('Dados (JSON ↔ banco)', $u);
aviso_flash();
?>
<div class="row g-3">
<div class="col-md-6"><div class="panel h-100"><h2 class="h5">Importar JSON → banco</h2>
<p>Lê <code>dados/empresas.json</code> e <code>dados/ofertas.json</code>, <code>dados/cupons.json</code>, <code>dados/parceiros.json</code> (imobiliárias, garagens e profissionais de saúde) e cria/atualiza os registros no MySQL. <strong>Sobrescreve</strong> as empresas e ofertas que tenham o mesmo slug/id. Use na primeira instalação.</p>
<form method="post" data-confirm="Importar e sobrescrever registros existentes com o conteúdo dos JSON?"><?= csrf_campo() ?><button class="btn btn-primary" name="acao" value="importar">Importar</button></form></div></div>
<div class="col-md-6"><div class="panel h-100"><h2 class="h5">Exportar banco → JSON</h2>
<p>Grava as empresas e ofertas do banco em <code>dados/*.json</code> (com cópia <code>.bak</code>). Depois rode <code>node tools/build.js</code> no seu computador e envie as páginas novas para a hospedagem.</p>
<form method="post" data-confirm="Sobrescrever dados/empresas.json, ofertas.json e cupons.json com o conteúdo do banco?"><?= csrf_campo() ?><button class="btn btn-warning fw-bold" name="acao" value="exportar">Exportar</button></form></div></div></div>
<?php admin_rodape();
