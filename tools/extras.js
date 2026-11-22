/**
 * Recursos portados do projeto antigo: cupons/ofertas da semana, encartes, vitrine virtual,
 * guia médico, soluções digitais e página "Anuncie".
 * Chamado por build.js (antes da home) e devolve blocos HTML para a home.
 */
'use strict';
const fs = require('fs');
const path = require('path');

module.exports = function gerarExtras(ctx) {
  const { esc, write, layout, pageHero, crumbLd, demoNotice, abs, addUrl, brl, CIDADE, EMP, empBySlug, catById, CORE_JS, TODAY, ROOT } = ctx;
  const ler = (n) => JSON.parse(fs.readFileSync(path.join(ROOT, 'dados', n), 'utf8'));
  const cuponsData = ler('cupons.json');
  const encartesData = ler('encartes.json');
  const vitrineData = ler('vitrine.json');
  const EXTRAS_JS = CORE_JS.concat('/assets/js/extras.js');
  const wrap = (inner, demo = true) => `<div class="container pg">${demo ? demoNotice({ demo: true }) : ''}${inner}</div>`;
  const dataCurta = (iso) => iso.split('-').reverse().join('/');
  const waLink = (e, texto) => `https://wa.me/55${String(e.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`;
  const vigente = (o) => (!o.data_inicio || o.data_inicio <= TODAY) && (!o.data_fim || o.data_fim >= TODAY);

  /* ================= Cupons ================= */
  const cupons = cuponsData.cupons.filter((c) => c.ativo !== false && empBySlug[c.empresa] && vigente(c))
    .sort((a, b) => Number(b.semana) - Number(a.semana) || a.data_fim.localeCompare(b.data_fim));
  const valorTxt = (c) => (c.tipo === 'percentual' ? `${c.valor}% OFF` : c.tipo === 'valor' ? `${brl(c.valor)} OFF` : 'BRINDE');
  const cardCupom = (c) => {
    const e = empBySlug[c.empresa];
    return `<div class="col-12 col-md-6 col-lg-4"><article class="card h-100 shadow-sm cupom"><div class="card-body d-flex flex-column">
<div class="d-flex justify-content-between align-items-start mb-2"><span class="badge text-bg-success fs-6">${esc(valorTxt(c))}</span>${c.semana ? '<span class="badge text-bg-warning">Oferta da semana</span>' : ''}</div>
<h3 class="h5">${esc(c.titulo)}</h3><p class="meta mb-1"><a href="/empresas/${e.slug}/">${esc(e.nome)}</a> · ${esc(catById[e.categoria].nome)}</p>
<p>${esc(c.descricao)}</p><p class="meta">${esc(c.condicoes)}</p>
<div class="mt-auto"><div class="cupom-codigo d-flex align-items-center gap-2 mb-2"><code class="fs-5">${esc(c.codigo)}</code><button type="button" class="btn btn-sm btn-outline-primary" data-copiar="${esc(c.codigo)}">Copiar código</button></div>
<p class="meta mb-2">Válido até <time datetime="${c.data_fim}" data-fim="${c.data_fim}">${dataCurta(c.data_fim)}</time></p>
<a class="btn btn-success btn-sm" href="${esc(waLink(e, `Olá! Quero usar o cupom ${c.codigo} (${c.titulo}) que vi no São João Digital.`))}" rel="noopener" target="_blank">Usar no WhatsApp</a></div></div></article></div>`;
  };
  const ldCupons = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: `Cupons e ofertas da semana em ${CIDADE}`,
    itemListElement: cupons.map((c, i) => { const e = empBySlug[c.empresa]; return { '@type': 'ListItem', position: i + 1, item: { '@type': 'Offer', name: c.titulo, description: c.descricao, url: abs('/cupons/'), validFrom: c.data_inicio, validThrough: c.data_fim, availability: 'https://schema.org/InStock', seller: { '@type': 'LocalBusiness', name: e.nome, url: abs(`/empresas/${e.slug}/`) } } }; })
  };
  write('cupons/index.html', layout({
    title: `Cupons e ofertas da semana em ${CIDADE}`, desc: `Cupons de desconto e ofertas da semana de restaurantes, lojas e serviços de ${CIDADE} (SP). Copie o código e use no WhatsApp.`,
    path: '/cupons/', hero: pageHero([['/', 'Início'], ['/cupons/', 'Cupons']], 'Cupons e ofertas da semana', 'Descontos de empresas da cidade. Copie o código e apresente na compra.'),
    body: wrap(`<div class="row g-3" id="lista-cupons">${cupons.map(cardCupom).join('')}</div><p class="meta mt-3">Cupons vencidos saem da lista automaticamente. Condições são definidas por cada empresa; confirme com o estabelecimento.</p>`),
    scripts: EXTRAS_JS, jsonld: [ldCupons, crumbLd([['/', 'Início'], ['/cupons/', 'Cupons']])]
  }));
  addUrl('/cupons/', TODAY, '0.8', 'daily');

  /* ================= Encartes ================= */
  const encartes = encartesData.encartes.filter((x) => empBySlug[x.empresa] && vigente(x));
  encartes.forEach((x) => {
    const e = empBySlug[x.empresa];
    const url = `/encartes/${x.slug}/`;
    const secoes = x.secoes.map((s) => `<section class="panel"><h2 class="h5">${esc(s.nome)}</h2><div class="table-responsive"><table class="table table-sm align-middle mb-0"><thead><tr><th>Produto</th><th class="text-end">Preço</th></tr></thead><tbody>${s.itens.map((i) => `<tr><td>${esc(i.nome)}<br><small class="text-secondary">${esc(i.un)}</small></td><td class="text-end">${i.de ? `<s class="text-secondary small">${brl(i.de)}</s> ` : ''}<strong>${brl(i.preco)}</strong></td></tr>`).join('')}</tbody></table></div></section>`).join('');
    const ld = {
      '@context': 'https://schema.org', '@type': 'OfferCatalog', name: x.titulo, url: abs(url),
      itemListElement: x.secoes.flatMap((s) => s.itens.map((i) => ({ '@type': 'Offer', itemOffered: { '@type': 'Product', name: i.nome }, price: i.preco.toFixed(2), priceCurrency: 'BRL', validFrom: x.data_inicio, validThrough: x.data_fim, seller: { '@type': 'LocalBusiness', name: e.nome, url: abs(`/empresas/${e.slug}/`) } })))
    };
    write(`encartes/${x.slug}/index.html`, layout({
      title: `${x.titulo}: ofertas até ${dataCurta(x.data_fim)}`, desc: `${x.resumo} Válido de ${dataCurta(x.data_inicio)} a ${dataCurta(x.data_fim)} em ${CIDADE}.`,
      path: url, hero: pageHero([['/', 'Início'], ['/encartes/', 'Encartes'], [url, x.titulo]], x.titulo, x.resumo),
      body: wrap(`<p><strong>Validade:</strong> ${dataCurta(x.data_inicio)} a ${dataCurta(x.data_fim)} · <a href="/empresas/${e.slug}/">${esc(e.nome)}</a> · ${esc(e.endereco.bairro)}</p>${secoes}<p><a class="btn btn-success" href="${esc(waLink(e, `Olá! Vi o encarte "${x.titulo}" no São João Digital e quero mais informações.`))}" rel="noopener" target="_blank">Falar com a loja no WhatsApp</a></p><p class="meta">Preços válidos enquanto durarem os estoques e dentro da vigência. Confirme com a loja.</p>`),
      scripts: CORE_JS, jsonld: [ld, crumbLd([['/', 'Início'], ['/encartes/', 'Encartes'], [url, x.titulo]])]
    }));
    addUrl(url, TODAY, '0.6', 'weekly');
  });
  write('encartes/index.html', layout({
    title: `Encartes digitais de lojas de ${CIDADE}`, desc: `Encartes de ofertas de lojas e mercados de ${CIDADE} (SP), com preços e validade.`,
    path: '/encartes/', hero: pageHero([['/', 'Início'], ['/encartes/', 'Encartes']], 'Encartes digitais', 'Ofertas das lojas da cidade em formato de lista, com validade.'),
    body: wrap(`<div class="row g-3">${encartes.map((x) => { const e = empBySlug[x.empresa]; const n = x.secoes.reduce((a, s) => a + s.itens.length, 0); return `<div class="col-12 col-md-6 col-lg-4"><article class="card h-100 shadow-sm"><div class="card-body"><span class="badge text-bg-info">${esc(catById[e.categoria].nome)}</span><h3 class="h5 mt-2"><a href="/encartes/${x.slug}/">${esc(x.titulo)}</a></h3><p>${esc(x.resumo)}</p><p class="meta mb-0">${n} itens · até ${dataCurta(x.data_fim)}</p></div></article></div>`; }).join('')}</div>`),
    scripts: CORE_JS, jsonld: [crumbLd([['/', 'Início'], ['/encartes/', 'Encartes']])]
  }));
  addUrl('/encartes/', TODAY, '0.7', 'daily');

  /* ================= Vitrine virtual ================= */
  const vitrine = vitrineData.produtos.filter((p) => empBySlug[p.empresa]);
  const catsV = [...new Set(vitrine.map((p) => p.categoria))];
  const cardProd = (p) => {
    const e = empBySlug[p.empresa];
    return `<div class="col-6 col-md-4 col-lg-3" data-cat="${esc(p.categoria)}"><article class="card h-100 shadow-sm"><div class="card-body d-flex flex-column"><div class="fs-1" aria-hidden="true">${p.emoji}</div><h3 class="h6 mt-2">${esc(p.nome)}</h3><p class="meta mb-1">${esc(p.descricao)}</p><p class="meta mb-2"><a href="/empresas/${e.slug}/">${esc(e.nome)}</a></p><strong class="mb-2">${brl(p.preco)}</strong><a class="btn btn-success btn-sm mt-auto" href="${esc(waLink(e, `Olá! Vi "${p.nome}" (${brl(p.preco)}) na Vitrine do São João Digital. Ainda está disponível?`))}" rel="noopener" target="_blank">Tenho interesse</a></div></article></div>`;
  };
  const ldVit = { '@context': 'https://schema.org', '@type': 'ItemList', name: `Vitrine virtual de ${CIDADE}`, itemListElement: vitrine.map((p, i) => { const e = empBySlug[p.empresa]; return { '@type': 'ListItem', position: i + 1, item: { '@type': 'Product', name: p.nome, description: p.descricao, offers: { '@type': 'Offer', price: p.preco.toFixed(2), priceCurrency: 'BRL', seller: { '@type': 'LocalBusiness', name: e.nome, url: abs(`/empresas/${e.slug}/`) } } } }; }) };
  write('vitrine/index.html', layout({
    title: `Vitrine virtual: produtos de lojas de ${CIDADE}`, desc: `Produtos de lojas locais de ${CIDADE} (SP) com preço e contato direto pelo WhatsApp.`,
    path: '/vitrine/', hero: pageHero([['/', 'Início'], ['/vitrine/', 'Vitrine']], 'Vitrine virtual', 'Produtos de lojas locais. Fale direto com o vendedor pelo WhatsApp.'),
    body: wrap(`<div class="filters mb-3" id="vitrine-filtros" role="group" aria-label="Filtrar por categoria"><button type="button" class="btn btn-sm btn-primary" data-filtro="">Todos</button> ${catsV.map((c) => `<button type="button" class="btn btn-sm btn-outline-secondary" data-filtro="${esc(c)}">${esc(c)}</button>`).join(' ')}</div><div class="row g-3" id="vitrine-lista">${vitrine.map(cardProd).join('')}</div>`),
    scripts: EXTRAS_JS, jsonld: [ldVit, crumbLd([['/', 'Início'], ['/vitrine/', 'Vitrine']])]
  }));
  addUrl('/vitrine/', TODAY, '0.7', 'weekly');

  /* ================= Guia médico ================= */
  const cat = catById['saude-beleza'];
  const SUB_SAUDE = ['clinicas-medicas', 'dentistas', 'psicologos-terapeutas', 'nutricionistas', 'pilates', 'podologos', 'massagistas'];
  const subs = cat.subcategorias.filter((s) => SUB_SAUDE.includes(s.slug));
  const medEmp = EMP.filter((e) => e.categoria === 'saude-beleza' && SUB_SAUDE.includes(e.subcategoria_slug));
  const blocosMed = subs.map((s) => {
    const l = medEmp.filter((e) => e.subcategoria_slug === s.slug);
    return `<section class="panel"><h2 class="h5">${esc(s.nome)}</h2>${l.length ? `<div class="row g-3">${l.map((e) => `<div class="col-12 col-md-6"><article class="card h-100"><div class="card-body"><h3 class="h6"><a href="/empresas/${e.slug}/">${esc(e.nome)}</a></h3><p class="meta mb-2">${esc(e.endereco.bairro)} · ${esc(e.telefone)}</p><p class="mb-2">${esc(e.resumo)}</p>${e.agendamento && e.agendamento.ativo ? `<a class="btn btn-primary btn-sm" href="/agendar/${e.slug}/">Solicitar agendamento</a>` : ''}</div></article></div>`).join('')}</div>` : '<p class="meta mb-0">Nenhum profissional cadastrado ainda nesta especialidade. <a href="/cadastrar/">Cadastre o seu consultório</a>.</p>'}</section>`;
  }).join('');
  const ldMed = { '@context': 'https://schema.org', '@type': 'ItemList', name: `Guia médico de ${CIDADE}`, itemListElement: medEmp.map((e, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`/empresas/${e.slug}/`), name: e.nome })) };
  write('guia-medico/index.html', layout({
    title: `Guia médico e de saúde em ${CIDADE}`, desc: `Clínicas, dentistas, psicólogos, nutricionistas e outros profissionais de saúde de ${CIDADE} (SP), com contato e agendamento.`,
    path: '/guia-medico/', hero: pageHero([['/', 'Início'], ['/guia-medico/', 'Guia Médico']], 'Guia médico', 'Profissionais de saúde da cidade por especialidade.'),
    body: wrap(`${blocosMed}<p class="meta">Este guia não substitui orientação médica. Em emergências, ligue 192 (SAMU).</p>`),
    scripts: CORE_JS, jsonld: [ldMed, crumbLd([['/', 'Início'], ['/guia-medico/', 'Guia Médico']])]
  }));
  addUrl('/guia-medico/', TODAY, '0.7', 'weekly');

  /* ================= Soluções digitais ================= */
  const SOLUCOES = [
    ['🌐', 'Página da empresa (minisite)', 'Página própria com fotos, horário, produtos, serviços, perguntas frequentes e dados estruturados.', '/empresas/', 'Ver exemplos'],
    ['🍽️', 'Cardápio digital', 'Cardápio com preços, cardápio do dia e pedido enviado ao WhatsApp e registrado no painel.', '/cardapios/', 'Ver cardápios'],
    ['📅', 'Agendamento online', 'Clientes escolhem serviço, dia e horário livre; horário ocupado é bloqueado automaticamente.', '/agendar/', 'Ver agendamento'],
    ['⚖️', 'Comparador de preços', 'Sua oferta aparece ao lado das concorrentes, do menor para o maior preço.', '/comparador/', 'Ver comparador'],
    ['🏷️', 'Cupons e ofertas da semana', 'Cupons com código, validade e botão de WhatsApp, destacados na home.', '/cupons/', 'Ver cupons'],
    ['📰', 'Encartes digitais', 'Seu encarte de ofertas em formato de lista, indexável por buscadores e IAs.', '/encartes/', 'Ver encartes'],
    ['🛍️', 'Vitrine virtual', 'Produtos com preço e botão "tenho interesse" direto no WhatsApp do vendedor.', '/vitrine/', 'Ver vitrine'],
    ['🤖', 'Assistente de IA', 'Assistente da empresa que responde só com os dados cadastrados, sem inventar.', '/assistente/', 'Testar assistente']
  ];
  write('solucoes-digitais/index.html', layout({
    title: `Soluções digitais para empresas de ${CIDADE}`, desc: `Página da empresa, cardápio digital, agendamento, comparador, cupons, encartes, vitrine e assistente de IA para negócios de ${CIDADE}.`,
    path: '/solucoes-digitais/', hero: pageHero([['/', 'Início'], ['/solucoes-digitais/', 'Soluções digitais']], 'Soluções digitais', 'Ferramentas para o seu negócio vender mais, sem complicação.'),
    body: wrap(`<div class="row g-3">${SOLUCOES.map(([i, t, d, h, b]) => `<div class="col-12 col-md-6 col-lg-3"><article class="card h-100 shadow-sm"><div class="card-body d-flex flex-column"><div class="fs-1" aria-hidden="true">${i}</div><h3 class="h5 mt-2">${t}</h3><p>${d}</p><a class="btn btn-outline-primary btn-sm mt-auto" href="${h}">${b}</a></div></article></div>`).join('')}</div><p class="mt-4"><a class="btn btn-primary" href="/anuncie/">Quero anunciar minha empresa</a></p>`, false),
    scripts: CORE_JS, jsonld: [crumbLd([['/', 'Início'], ['/solucoes-digitais/', 'Soluções digitais']])]
  }));
  addUrl('/solucoes-digitais/', TODAY, '0.6', 'monthly');

  /* ================= Anuncie ================= */
  const faqAn = [
    ['Preciso pagar para aparecer?', 'Não. O cadastro básico é gratuito e coloca sua empresa nos dados abertos da cidade.'],
    ['Quanto tempo leva para publicar?', 'Depois do cadastro, a equipe revisa os dados e publica a página. Os prazos dependem da revisão.'],
    ['Posso cancelar quando quiser?', 'Sim. Os planos pagos não têm fidelidade neste modelo; o que muda é só o conjunto de recursos.'],
    ['Como meus dados são tratados?', 'Os dados da empresa são públicos por natureza; dados de clientes (pedidos e agendamentos) seguem a política de privacidade e a LGPD.']
  ];
  const ldFaq = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqAn.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  write('anuncie/index.html', layout({
    title: `Anuncie sua empresa em ${CIDADE}`, desc: `Coloque seu negócio de ${CIDADE} na base de conhecimento local: página, cardápio, agendamento, cupons e assistente de IA. Comece grátis.`,
    path: '/anuncie/', hero: pageHero([['/', 'Início'], ['/anuncie/', 'Anuncie']], 'Anuncie sua empresa', 'Seja encontrado por moradores, visitantes e assistentes de IA.'),
    body: wrap(`<div class="row g-3 mb-4">
<div class="col-md-4"><article class="card h-100"><div class="card-body"><h2 class="h5">1. Cadastre</h2><p class="mb-0">Preencha o formulário com os dados do negócio. Leva poucos minutos.</p></div></article></div>
<div class="col-md-4"><article class="card h-100"><div class="card-body"><h2 class="h5">2. Revisamos</h2><p class="mb-0">A equipe confere as informações e publica a página com dados estruturados.</p></div></article></div>
<div class="col-md-4"><article class="card h-100"><div class="card-body"><h2 class="h5">3. Venda mais</h2><p class="mb-0">Receba contatos, pedidos e agendamentos pelo WhatsApp e pelo painel.</p></div></article></div></div>
<p><a class="btn btn-primary btn-lg" href="/cadastrar/">Cadastrar minha empresa</a> <a class="btn btn-outline-secondary btn-lg" href="/planos/">Ver planos</a> <a class="btn btn-outline-secondary btn-lg" href="/solucoes-digitais/">Soluções digitais</a></p>
<section class="mt-4"><h2 class="h4">Perguntas frequentes</h2><div class="accordion" id="faq-an">${faqAn.map(([q, a], i) => `<div class="accordion-item"><h3 class="accordion-header"><button class="accordion-button${i ? ' collapsed' : ''}" type="button" data-bs-toggle="collapse" data-bs-target="#fa${i}" aria-expanded="${i ? 'false' : 'true'}" aria-controls="fa${i}">${esc(q)}</button></h3><div id="fa${i}" class="accordion-collapse collapse${i ? '' : ' show'}" data-bs-parent="#faq-an"><div class="accordion-body">${esc(a)}</div></div></div>`).join('')}</div></section>`, false),
    scripts: CORE_JS, jsonld: [ldFaq, crumbLd([['/', 'Início'], ['/anuncie/', 'Anuncie']])]
  }));
  addUrl('/anuncie/', TODAY, '0.7', 'monthly');

  /* ================= Blocos da home ================= */
  const semana = cupons.filter((c) => c.semana).slice(0, 3);
  const homeBlocks = `
<section class="block"><div class="container"><h2>Cupons e ofertas da semana</h2><p class="sub">Descontos de empresas da cidade, com código para usar na hora.</p>
<div class="row g-3">${semana.map(cardCupom).join('')}</div><p><a class="btn btn-outline-secondary" href="/cupons/">Ver todos os cupons</a> <a class="btn btn-outline-secondary" href="/encartes/">Encartes</a> <a class="btn btn-outline-secondary" href="/vitrine/">Vitrine virtual</a></p></div></section>
<section class="block alt"><div class="container"><h2>Guia médico e soluções digitais</h2><div class="row g-3">
<div class="col-12 col-md-6"><article class="card h-100 shadow-sm"><div class="card-body"><h3>🩺 Guia médico</h3><p>Clínicas, dentistas, psicólogos e outros profissionais de saúde por especialidade, com agendamento.</p><a class="btn btn-primary btn-sm" href="/guia-medico/">Abrir guia médico</a></div></article></div>
<div class="col-12 col-md-6"><article class="card h-100 shadow-sm"><div class="card-body"><h3>🧰 Soluções digitais</h3><p>Cardápio digital, agendamento, comparador, cupons e assistente de IA para o seu negócio.</p><a class="btn btn-primary btn-sm" href="/solucoes-digitais/">Conhecer soluções</a> <a class="btn btn-outline-secondary btn-sm" href="/anuncie/">Anuncie</a></div></article></div></div></div></section>`;

  const llms = `- [Cupons e ofertas da semana](${abs('/cupons/')}): cupons com código e validade
- [Encartes](${abs('/encartes/')}): ofertas de lojas com preço e validade
- [Vitrine virtual](${abs('/vitrine/')}): produtos de lojas locais
- [Guia médico](${abs('/guia-medico/')}): profissionais de saúde por especialidade
- [Soluções digitais](${abs('/solucoes-digitais/')}) e [Anuncie](${abs('/anuncie/')})`;
  return { homeBlocks, llms };
};
