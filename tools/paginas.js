/**
 * Páginas estáticas de conteúdo: shopping digital, minisite modelo (12), ofertas da semana,
 * hub de serviços, mapa do site e termos de uso. Registra também as URLs das páginas PHP no sitemap.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { SISTEMAS, CATEGORIAS } = require('./sistemas-map');

module.exports = function gerarPaginas(ctx) {
  const { esc, write, layout, pageHero, crumbLd, demoNotice, abs, addUrl, brl, CIDADE, EMP, EVT, NOT, CATS, empBySlug, catById, CORE_JS, TODAY, ROOT } = ctx;
  const ler = (n) => JSON.parse(fs.readFileSync(path.join(ROOT, 'dados', n), 'utf8'));
  const wrap = (inner, demo = true) => `<div class="container pg">${demo ? demoNotice({ demo: true }) : ''}${inner}</div>`;
  const dataCurta = (iso) => iso.split('-').reverse().join('/');
  const vigente = (o) => (!o.data_inicio || o.data_inicio <= TODAY) && (!o.data_fim || o.data_fim >= TODAY);
  const wa = (e, t) => `https://wa.me/55${String(e.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(t)}`;
  const maps = (e) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${e.nome}, ${e.endereco.rua}, ${e.endereco.numero}, ${e.endereco.cidade} ${e.endereco.uf}`)}`;
  const pagina = (url, title, desc, h1, sub, body, jsonld = [], demo = true) => {
    write(`${url.slice(1)}index.html`, layout({
      title, desc, path: url, hero: pageHero([['/', 'Início'], [url, h1]], h1, sub), body: wrap(body, demo), scripts: CORE_JS,
      jsonld: [...jsonld, crumbLd([['/', 'Início'], [url, h1]])]
    }));
  };

  /* ===== Shopping digital ===== */
  const porCat = CATS.map((c) => ({ c, l: EMP.filter((e) => e.categoria === c.id) })).filter((x) => x.l.length);
  const shop = porCat.map(({ c, l }) => `<section class="mb-4" id="${c.slug}"><h2 class="h4"><span aria-hidden="true">${c.icone}</span> <a href="/categorias/${c.slug}/">${esc(c.nome)}</a></h2><div class="row g-3">${l.map((e) => `<div class="col-12 col-md-6 col-lg-4"><article class="card h-100"><div class="card-body"><h3 class="h6"><a href="/empresas/${e.slug}/">${esc(e.nome)}</a></h3><p class="meta mb-2">${esc(e.subcategoria)} · ${esc(e.endereco.bairro)}</p><p class="mb-3">${esc(e.resumo)}</p><p class="mb-0 d-flex flex-wrap gap-2"><a class="btn btn-sm btn-primary" href="/empresas/${e.slug}/">Ver empresa</a><a class="btn btn-sm btn-outline-secondary" href="${esc(maps(e))}" rel="noopener" target="_blank">Ver no mapa</a><a class="btn btn-sm btn-outline-secondary" href="${esc(wa(e, `Olá! Vi ${e.nome} no São João Digital.`))}" rel="noopener" target="_blank">WhatsApp</a></p></div></article></div>`).join('')}</div></section>`).join('');
  pagina('/shopping-digital/', `Shopping digital de ${CIDADE}: empresas por categoria`, `Todas as empresas de ${CIDADE} organizadas por categoria, com mapa, WhatsApp e página completa.`, 'Shopping digital', 'Um passeio pelas lojas e serviços da cidade, por categoria.', `<p class="meta">Atalhos: ${porCat.map(({ c }) => `<a href="#${c.slug}">${esc(c.nome)}</a>`).join(' · ')}</p>${shop}`);
  addUrl('/shopping-digital/', TODAY, '0.7', 'weekly');

  /* ===== Ofertas da semana ===== */
  const of = ler('ofertas.json').ofertas.filter((o) => o.ativo && o.preco_promocional && vigente(o) && empBySlug[o.empresa]);
  const cp = ler('cupons.json').cupons.filter((c) => c.ativo !== false && c.semana && vigente(c) && empBySlug[c.empresa]);
  const cardOf = (o) => { const e = empBySlug[o.empresa]; const eco = Math.round((1 - o.preco_promocional / o.preco) * 100); return `<div class="col-12 col-md-6 col-lg-4"><article class="card h-100"><div class="card-body d-flex flex-column"><div class="mb-2"><span class="badge text-bg-warning">${eco}% OFF</span></div><h3 class="h5">${esc(o.produto)}</h3><p class="meta mb-1"><a href="/empresas/${e.slug}/">${esc(e.nome)}</a></p><p class="mb-2">${esc(o.descricao)}</p><p class="mb-2"><s class="text-secondary">${brl(o.preco)}</s> <strong class="fs-5">${brl(o.preco_promocional)}</strong></p><p class="meta">Válido até ${dataCurta(o.data_fim)}</p><a class="btn btn-success btn-sm mt-auto align-self-start" href="${esc(wa(e, `Olá! Vi a oferta "${o.produto}" por ${brl(o.preco_promocional)} no São João Digital. Ainda está disponível?`))}" rel="noopener" target="_blank">Quero esta oferta</a></div></article></div>`; };
  const cardCp = (c) => { const e = empBySlug[c.empresa]; return `<div class="col-12 col-md-6 col-lg-4"><article class="card h-100 cupom"><div class="card-body"><span class="badge text-bg-warning">Cupom</span><h3 class="h5 mt-2">${esc(c.titulo)}</h3><p class="meta mb-1"><a href="/empresas/${e.slug}/">${esc(e.nome)}</a></p><p>${esc(c.descricao)}</p><p class="mb-0"><code>${esc(c.codigo)}</code> · até ${dataCurta(c.data_fim)}</p></div></article></div>`; };
  pagina('/ofertas-semana/', `Ofertas da semana em ${CIDADE}`, `Promoções vigentes de empresas de ${CIDADE} (SP): preços promocionais e cupons com validade.`, 'Ofertas da semana', 'Promoções vigentes das empresas da cidade.',
    `<div class="row g-3">${of.map(cardOf).join('')}${cp.map(cardCp).join('')}</div><p class="mt-3"><a href="/cupons/">Todos os cupons</a> · <a href="/comparador/">Comparar preços</a> · <a href="/encartes/">Encartes</a></p>`);
  addUrl('/ofertas-semana/', TODAY, '0.8', 'daily');

  /* ===== Minisite modelo ===== */
  CATS.forEach((c) => {
    const url = `/minisite-modelo/${c.slug}/`;
    const servs = c.subcategorias.slice(0, 6).map((s) => s.nome);
    const body = `<div class="row g-4"><div class="col-lg-8">
<section class="panel"><h2 class="h4">Sobre a empresa</h2><p>Aqui a empresa conta quem é, há quanto tempo atende em ${CIDADE} e o que a diferencia. Exemplo para a categoria <strong>${esc(c.nome)}</strong>: ${esc(c.intro)}</p></section>
<section class="panel"><h2 class="h4">Serviços e produtos</h2><ul>${servs.map((s) => `<li>${esc(s)} <span class="text-secondary">(exemplo)</span></li>`).join('')}</ul></section>
<section class="panel"><h2 class="h4">Perguntas frequentes</h2><p class="mb-0"><strong>Qual o horário de atendimento?</strong> A empresa informa o horário completo, inclusive feriados.</p></section>
<section class="panel"><h2 class="h4">Avaliações</h2><p class="meta mb-0">Espaço para avaliações de clientes. Notas só entram nos dados estruturados quando verificadas.</p></section></div>
<aside class="col-lg-4"><section class="panel"><h2 class="h5">Contato</h2><dl class="kv mb-0"><dt>Endereço</dt><dd>Rua Exemplo, 100 · Centro</dd><dt>Telefone</dt><dd>(19) 99999-0000</dd><dt>Horário</dt><dd>Seg a sex, 8h às 18h</dd></dl></section>
<section class="panel"><h2 class="h5">Quer este minisite?</h2><p>É gratuito no cadastro básico. Os planos pagos liberam fotos, cardápio, agendamento e assistente de IA.</p><a class="btn btn-primary" href="/cadastrar/">Cadastrar minha empresa</a> <a class="btn btn-outline-secondary mt-2" href="/planos/">Ver planos</a></section></aside></div>`;
    pagina(url, `Minisite modelo para ${c.nome}`, `Modelo de página gratuita para empresas de ${c.nome} em ${CIDADE}: sobre, serviços, perguntas frequentes, avaliações e contato.`, `Minisite modelo: ${c.nome}`, `Veja como fica a página da sua empresa na categoria ${c.nome}.`, body);
    addUrl(url, TODAY, '0.4', 'monthly');
  });
  pagina('/minisite-modelo/', 'Minisite modelo gratuito para empresas', `Modelos de minisite para cada uma das 12 categorias do São João Digital.`, 'Minisite modelo', 'Um modelo gratuito de página para cada categoria.',
    `<div class="row g-3">${CATS.map((c) => `<div class="col-6 col-md-4 col-lg-3"><article class="card cat-card h-100"><div class="card-body"><span class="ico" aria-hidden="true">${c.icone}</span><h3 class="h6 mt-2"><a href="/minisite-modelo/${c.slug}/">${esc(c.nome)}</a></h3><p class="meta mb-0">Ver modelo</p></div></article></div>`).join('')}</div>`, [], false);
  addUrl('/minisite-modelo/', TODAY, '0.5', 'monthly');

  /* ===== Hub de serviços ===== */
  const cardSis = Object.values(SISTEMAS).map((s) => `<div class="col-12 col-md-6 col-lg-4"><article class="card h-100"><div class="card-body d-flex flex-column"><div class="fs-1" aria-hidden="true">${s.icone}</div><h3 class="h5 mt-2"><a href="${s.url}">${esc(s.nome)}</a></h3><p>${esc(s.desc)}</p><p class="meta mt-auto mb-0">${esc(s.tecnologia)}</p></div></article></div>`).join('');
  const matriz = CATS.map((c) => `<tr><th scope="row"><a href="/categorias/${c.slug}/">${c.icone} ${esc(c.nome)}</a></th><td>${CATEGORIAS[c.slug].map((k) => `<a href="${SISTEMAS[k].url}">${esc(SISTEMAS[k].nome)}</a>`).join(', ')}</td></tr>`).join('');
  pagina('/servicos/', `Todos os serviços online de ${CIDADE}`, `Cardápio digital, agendamento, imóveis, veículos, saúde, cupons, comparador e mais: veja tudo o que o São João Digital oferece.`, 'Todos os serviços', 'Cada categoria tem seus próprios micro-sistemas.',
    `<div class="row g-3 mb-4">${cardSis}</div><h2 class="h4">Serviços por categoria</h2><div class="table-responsive"><table class="table align-middle"><tbody>${matriz}</tbody></table></div>`, [], false);
  addUrl('/servicos/', TODAY, '0.8', 'weekly');

  /* ===== Mapa do site ===== */
  const li = (h, t) => `<li><a href="${h}">${esc(t)}</a></li>`;
  const mapa = `<div class="row g-4">
<div class="col-md-6 col-lg-4"><h2 class="h5">Principais</h2><ul>${[['/', 'Início'], ['/empresas/', 'Empresas'], ['/categorias/', 'Categorias'], ['/busca/', 'Busca'], ['/assistente/', 'Assistente de IA'], ['/eventos/', 'Eventos'], ['/noticias/', 'Notícias']].map(([h, t]) => li(h, t)).join('')}</ul></div>
<div class="col-md-6 col-lg-4"><h2 class="h5">Serviços e micro-sistemas</h2><ul>${[...Object.values(SISTEMAS).map((s) => li(s.url, s.nome)), li('/servicos/', 'Todos os serviços')].join('')}</ul></div>
<div class="col-md-6 col-lg-4"><h2 class="h5">Para empresas</h2><ul>${[['/anuncie/', 'Anuncie'], ['/planos/', 'Planos'], ['/solucoes-digitais/', 'Soluções digitais'], ['/cadastrar/', 'Cadastrar empresa'], ['/minisite-modelo/', 'Minisite modelo']].map(([h, t]) => li(h, t)).join('')}</ul><h2 class="h5 mt-4">Institucional</h2><ul>${[['/sobre/', 'Sobre e como interpretar os dados'], ['/privacidade/', 'Privacidade'], ['/termos/', 'Termos de uso'], ['/llms.txt', 'llms.txt'], ['/sitemap.xml', 'sitemap.xml']].map(([h, t]) => li(h, t)).join('')}</ul></div>
<div class="col-12"><h2 class="h5">As 12 categorias e suas subcategorias</h2><div class="row g-3">${CATS.map((c) => `<div class="col-md-6 col-lg-4"><h3 class="h6"><a href="/categorias/${c.slug}/">${c.icone} ${esc(c.nome)}</a></h3><ul class="small">${c.subcategorias.map((s) => li(`/categorias/${c.slug}/${s.slug}/`, s.nome)).join('')}</ul></div>`).join('')}</div></div>
<div class="col-md-6"><h2 class="h5">Empresas</h2><ul>${EMP.map((e) => li(`/empresas/${e.slug}/`, e.nome)).join('')}</ul></div>
<div class="col-md-6"><h2 class="h5">Eventos e notícias</h2><ul>${EVT.map((v) => li(`/eventos/${v.slug}/`, v.titulo)).join('')}${NOT.map((n) => li(`/noticias/${n.slug}/`, n.titulo)).join('')}</ul></div></div>`;
  pagina('/mapa-do-site/', `Mapa do site`, `Todas as páginas do ${ctx.SITE_NAME || 'São João Digital'}: categorias, subcategorias, serviços, empresas, eventos e notícias.`, 'Mapa do site', 'Todas as páginas, em um só lugar.', mapa, [], false);
  addUrl('/mapa-do-site/', TODAY, '0.5', 'weekly');

  /* ===== Termos de uso ===== */
  pagina('/termos/', 'Termos de uso', `Termos de uso do São João Digital: informações, responsabilidades, conteúdo patrocinado e contato entre clientes e empresas.`, 'Termos de uso', 'Regras simples para usar o site.',
    `<div class="article"><p class="notice"><strong>Texto-base.</strong> Revise com um advogado antes de publicar.</p>
<h2>O que é o serviço</h2><p>O São João Digital reúne informações de empresas, serviços, eventos e ofertas de ${CIDADE}. Não vende produtos nem presta os serviços anunciados.</p>
<h2>Informações das empresas</h2><p>Dados, preços, horários e ofertas são informados pelas próprias empresas e podem mudar. Confirme sempre diretamente com o estabelecimento antes de decidir.</p>
<h2>Contato e negociação</h2><p>Pedidos, agendamentos, propostas e visitas são combinados entre você e a empresa, por WhatsApp ou telefone. O São João Digital não participa do pagamento nem garante o negócio.</p>
<h2>Conteúdo patrocinado</h2><p>Conteúdo pago é identificado como patrocinado, com a empresa responsável indicada.</p>
<h2>Referências e valores</h2><p>Valores de referência, como a Tabela FIPE e calculadoras de saúde, são informativos e não substituem avaliação de um profissional.</p>
<h2>Dados pessoais</h2><p>O uso de dados pessoais segue a <a href="/privacidade/">política de privacidade</a>.</p></div>`, [], false);
  addUrl('/termos/', TODAY, '0.3', 'yearly');

  /* ===== Páginas PHP (dinâmicas) no sitemap ===== */
  [['/imoveis/', '0.8', 'weekly'], ['/veiculos/', '0.8', 'weekly'], ['/saude/', '0.7', 'monthly'], ['/profissionais-saude/', '0.7', 'weekly'], ['/parceiros-saude/', '0.6', 'monthly']].forEach(([u, p, f]) => addUrl(u, TODAY, p, f));
};
