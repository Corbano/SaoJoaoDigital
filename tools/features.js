/**
 * Cardápio digital e Agendamento (gerados a partir de dados/cardapios.json e do campo "agendamento" das empresas).
 * Chamado por build.js com o contexto (helpers e dados).
 */
'use strict';

module.exports = function gerarRecursos(ctx) {
  const { esc, write, layout, pageHero, crumbLd, demoNotice, abs, addUrl, brl, CIDADE, EMP, empBySlug, catById, CORE_JS, cardapios } = ctx;

  /* ================= Cardápio digital ================= */
  const CARD_JS = CORE_JS.concat('/assets/js/cardapio.js');
  const DIAS = [['Monday', 'Segunda'], ['Tuesday', 'Terça'], ['Wednesday', 'Quarta'], ['Thursday', 'Quinta'], ['Friday', 'Sexta']];
  const EMOJI = { restaurante: '🍝', pizzaria: '🍕', lanchonete: '🍔', marmitaria: '🍱' };

  cardapios.forEach((c) => {
    const e = empBySlug[c.empresa];
    if (!e) return;
    const url = `/cardapios/${e.slug}/`;
    const cats = [...new Set(c.itens.map((i) => i.cat))];
    const secoes = cats.map((cat, ci) => `<section class="mb-4" aria-labelledby="cat-${ci}"><h2 class="h4" id="cat-${ci}">${esc(cat)}</h2><div class="row g-2">${c.itens.filter((i) => i.cat === cat).map((i) => `
<div class="col-12 col-md-6"><div class="card item-menu"><div class="card-body d-flex justify-content-between align-items-start gap-3">
<div><h3 class="h6 mb-1">${esc(i.nome)}${i.promo ? ' <span class="badge text-bg-warning">Promo</span>' : ''}</h3><p class="meta mb-1">${esc(i.descricao)}</p><strong>${brl(i.preco)}</strong></div>
<div class="qty" data-id="${i.id}" data-nome="${esc(i.nome)}" data-preco="${i.preco}"><button type="button" class="btn btn-sm btn-outline-secondary" data-act="menos" aria-label="Remover ${esc(i.nome)}">−</button><output aria-live="polite">0</output><button type="button" class="btn btn-sm btn-primary" data-act="mais" aria-label="Adicionar ${esc(i.nome)}">+</button></div>
</div></div></div>`).join('')}</div></section>`).join('');
    const dia = c.cardapio_dia ? `<section class="panel" aria-labelledby="dia"><h2 id="dia" class="h4">Cardápio do dia</h2><ul class="list-unstyled mb-0" id="cardapio-dia">${DIAS.map(([k, n]) => c.cardapio_dia[k] ? `<li data-dow="${k}"><strong>${n}:</strong> ${esc(c.cardapio_dia[k].prato)} <span class="text-secondary">(opção: ${esc(c.cardapio_dia[k].opcao)})</span></li>` : '').join('')}</ul></section>` : '';
    const body = `<div class="container" style="padding-top:26px;padding-bottom:50px">${demoNotice({ demo: true })}
<div class="row g-4"><div class="col-lg-8">${dia}${secoes}</div>
<aside class="col-lg-4"><section class="panel sticky-lg-top" style="top:76px" id="pedido" data-slug="${esc(e.slug)}" data-wa="${esc(e.whatsapp)}" data-empresa="${esc(e.nome)}" aria-labelledby="ped-h"><h2 class="h5" id="ped-h">Seu pedido</h2>
<ul class="list-unstyled" id="ped-itens"><li class="text-secondary">Nenhum item ainda.</li></ul>
<p class="fs-5 mb-3">Total: <strong id="ped-total">R$ 0,00</strong></p>
<form id="ped-form" novalidate>
<div class="mb-2"><label class="form-label" for="p-nome">Seu nome</label><input class="form-control" id="p-nome" maxlength="80" required autocomplete="name"></div>
<div class="mb-2"><label class="form-label" for="p-tipo">Como receber</label><select class="form-select" id="p-tipo"><option value="Retirada no local">Retirada no local</option><option value="Entrega">Entrega</option></select></div>
<div class="mb-2" id="p-end-box" hidden><label class="form-label" for="p-end">Endereço de entrega</label><input class="form-control" id="p-end" maxlength="160" autocomplete="street-address"></div>
<div class="mb-2"><label class="form-label" for="p-pag">Pagamento</label><select class="form-select" id="p-pag">${(e.pagamento.length ? e.pagamento : ['Combinar']).map((p) => `<option>${esc(p)}</option>`).join('')}</select></div>
<div class="mb-3"><label class="form-label" for="p-obs">Observações</label><textarea class="form-control" id="p-obs" rows="2" maxlength="200"></textarea></div>
<div class="form-check mb-3"><input class="form-check-input" type="checkbox" id="p-ok" required><label class="form-check-label small" for="p-ok">Autorizo o uso do meu nome e dados do pedido para a empresa atendê-lo. Veja a <a href="/privacidade/">política de privacidade</a>.</label></div><div class="visually-hidden" aria-hidden="true"><label for="p-site">Não preencha</label><input id="p-site" name="website" tabindex="-1" autocomplete="off"></div>
<p class="text-danger small" id="p-erro" role="alert" hidden></p>
<button class="btn btn-success w-100" type="submit">Enviar pedido</button></form>
<p class="meta mt-2 mb-0">${esc(c.entrega)} O pedido só é confirmado quando ${esc(e.nome)} responder no WhatsApp. O pedido fica registrado para a empresa atendê-lo.</p></section></aside></div></div>`;
    const ld = {
      '@context': 'https://schema.org', '@type': 'Menu', name: `Cardápio de ${e.nome}`, inLanguage: 'pt-BR', url: abs(url),
      hasMenuSection: cats.map((cat) => ({ '@type': 'MenuSection', name: cat, hasMenuItem: c.itens.filter((i) => i.cat === cat).map((i) => ({ '@type': 'MenuItem', name: i.nome, description: i.descricao, offers: { '@type': 'Offer', price: i.preco.toFixed(2), priceCurrency: 'BRL' } })) }))
    };
    write(`cardapios/${e.slug}/index.html`, layout({
      title: `Cardápio digital de ${e.nome} — peça pelo WhatsApp`, desc: `Veja o cardápio e os preços de ${e.nome} em ${CIDADE} e monte seu pedido para enviar pelo WhatsApp.`,
      path: url, hero: pageHero([['/', 'Início'], ['/cardapios/', 'Cardápios'], [url, e.nome]], `${EMOJI[c.tipo] || '🍽️'} Cardápio de ${e.nome}`, e.resumo),
      body, scripts: CARD_JS, jsonld: [ld, crumbLd([['/', 'Início'], ['/cardapios/', 'Cardápios'], [url, e.nome]])]
    }));
    addUrl(url, '2026-11-22', '0.7', 'weekly');
  });

  const listaC = cardapios.map((c) => { const e = empBySlug[c.empresa]; if (!e) return ''; const min = Math.min(...c.itens.map((i) => i.preco)); return `<div class="col-12 col-md-6 col-lg-4"><article class="card h-100 shadow-sm"><div class="card-body"><span class="badge text-bg-info">${esc(catById[e.categoria].nome)}</span><h3 class="h5 mt-2"><a href="/cardapios/${e.slug}/">${EMOJI[c.tipo] || '🍽️'} ${esc(e.nome)}</a></h3><p class="meta mb-1">${esc(e.subcategoria)} · ${esc(e.endereco.bairro)}</p><p class="mb-0">${c.itens.length} itens · a partir de <strong>${brl(min)}</strong></p></div></article></div>`; }).join('');
  write('cardapios/index.html', layout({
    title: `Cardápios digitais em ${CIDADE}`, desc: `Cardápios de restaurantes, pizzarias e marmitarias de ${CIDADE} com preços e pedido pelo WhatsApp.`,
    path: '/cardapios/', hero: pageHero([['/', 'Início'], ['/cardapios/', 'Cardápios']], 'Cardápios digitais', 'Veja o menu, monte o pedido e envie pelo WhatsApp.'),
    body: `<div class="container" style="padding-top:26px;padding-bottom:40px">${demoNotice({ demo: true })}<div class="row g-3">${listaC}</div></div>`,
    scripts: CORE_JS, jsonld: [crumbLd([['/', 'Início'], ['/cardapios/', 'Cardápios']])]
  }));
  addUrl('/cardapios/', '2026-11-22', '0.7', 'weekly');

  /* ================= Agendamento ================= */
  const AG_JS = CORE_JS.concat('/assets/js/agendar.js');
  const comAg = EMP.filter((e) => e.agendamento && e.agendamento.ativo);

  comAg.forEach((e) => {
    const a = e.agendamento;
    const url = `/agendar/${e.slug}/`;
    const hoje = new Date().toISOString().slice(0, 10);
    const body = `<div class="container" style="padding-top:26px;padding-bottom:50px">${demoNotice(e)}
<div class="row g-4"><div class="col-lg-7"><section class="panel" aria-labelledby="ag-h"><h2 class="h4" id="ag-h">Solicite seu horário</h2>
<form id="ag-form" data-slug="${esc(e.slug)}" novalidate>
<div class="mb-3"><label class="form-label" for="a-serv">Serviço</label><select class="form-select" id="a-serv" required>${a.servicos.map((s, i) => `<option value="${i}">${esc(s.nome)}${s.preco ? ' — ' + brl(s.preco) : s.preco === 0 ? ' — grátis' : ''} (${s.duracao_min} min)</option>`).join('')}</select></div>
<div class="row g-2 mb-3"><div class="col-sm-6"><label class="form-label" for="a-data">Data</label><input class="form-control" type="date" id="a-data" required min="${hoje}"></div>
<div class="col-sm-6"><label class="form-label" for="a-hora">Horário</label><select class="form-select" id="a-hora" required><option value="">Escolha a data</option></select></div></div>
<p class="small text-secondary" id="a-aviso" aria-live="polite"></p>
<div class="row g-2 mb-3"><div class="col-sm-6"><label class="form-label" for="a-nome">Seu nome</label><input class="form-control" id="a-nome" maxlength="80" required autocomplete="name"></div>
<div class="col-sm-6"><label class="form-label" for="a-tel">Seu WhatsApp (com DDD)</label><input class="form-control" id="a-tel" inputmode="tel" maxlength="16" placeholder="(19) 99999-0000" required autocomplete="tel"></div></div>
<div class="mb-3"><label class="form-label" for="a-obs">Observações (opcional)</label><textarea class="form-control" id="a-obs" rows="2" maxlength="200"></textarea></div>
<div class="form-check mb-3"><input class="form-check-input" type="checkbox" id="a-ok" required><label class="form-check-label small" for="a-ok">Autorizo o uso do meu nome e WhatsApp para a empresa confirmar o horário. Veja a <a href="/privacidade/">política de privacidade</a>.</label></div><div class="visually-hidden" aria-hidden="true"><label for="a-site">Não preencha</label><input id="a-site" name="website" tabindex="-1" autocomplete="off"></div>
<p class="text-danger small" id="a-erro" role="alert" hidden></p>
<button class="btn btn-success" type="submit">Solicitar horário</button></form>
<p class="meta mt-3 mb-0"><strong>Importante:</strong> isto é uma solicitação. O horário só está confirmado quando ${esc(e.nome)} responder no WhatsApp. Sua solicitação fica registrada para a empresa; você pode pedir a exclusão dos dados a qualquer momento (veja a política de privacidade).</p></section></div>
<aside class="col-lg-5"><section class="panel"><h2 class="h5">${esc(e.nome)}</h2><p class="meta">${esc(e.subcategoria)} · ${esc(e.endereco.bairro)}</p>
<h3 class="h6">Horário de funcionamento</h3><p>${e.horario.map((h) => `${esc(h.dias)}: ${h.abre}–${h.fecha}`).join('<br>')}${e.fechado ? `<br><small>Fechado: ${esc(e.fechado)}</small>` : ''}</p>
<p class="mb-0"><a href="/empresas/${e.slug}/">Ver página da empresa</a></p></section></aside></div></div>`;
    const ld = { '@context': 'https://schema.org', '@type': 'WebPage', name: `Agendar em ${e.nome}`, url: abs(url), about: { '@type': 'LocalBusiness', name: e.nome, url: abs(`/empresas/${e.slug}/`) }, potentialAction: { '@type': 'ReserveAction', name: 'Solicitar agendamento', target: { '@type': 'EntryPoint', urlTemplate: abs(url), actionPlatform: 'http://schema.org/DesktopWebPlatform' }, result: { '@type': 'Reservation', name: 'Solicitação de agendamento' } } };
    write(`agendar/${e.slug}/index.html`, layout({
      title: `Agendar horário em ${e.nome}`, desc: `Solicite um horário em ${e.nome} (${e.subcategoria}) em ${CIDADE}: escolha serviço, data e horário e envie pelo WhatsApp.`,
      path: url, hero: pageHero([['/', 'Início'], ['/agendar/', 'Agendamento'], [url, e.nome]], `Agendar em ${e.nome}`, 'Escolha serviço, data e horário disponível.'),
      body, scripts: AG_JS, jsonld: [ld, crumbLd([['/', 'Início'], ['/agendar/', 'Agendamento'], [url, e.nome]])]
    }));
    addUrl(url, e.atualizado, '0.6', 'monthly');
  });

  write('agendar/index.html', layout({
    title: `Agendamento online em ${CIDADE}`, desc: `Solicite horário em clínicas, oficinas, pet shops, restaurantes e outros serviços de ${CIDADE} pelo WhatsApp.`,
    path: '/agendar/', hero: pageHero([['/', 'Início'], ['/agendar/', 'Agendamento']], 'Agendamento online', 'Peça seu horário em poucos cliques; a confirmação vem da própria empresa.'),
    body: `<div class="container" style="padding-top:26px;padding-bottom:40px">${demoNotice({ demo: true })}<div class="row g-3">${comAg.map((e) => `<div class="col-12 col-md-6 col-lg-4"><article class="card h-100 shadow-sm"><div class="card-body"><span class="badge text-bg-info">${esc(catById[e.categoria].nome)}</span><h3 class="h5 mt-2"><a href="/agendar/${e.slug}/">${esc(e.nome)}</a></h3><p class="meta mb-1">${esc(e.subcategoria)}</p><p class="mb-0">${esc(e.agendamento.servicos.map((s) => s.nome).join(' · '))}</p></div></article></div>`).join('')}</div></div>`,
    scripts: CORE_JS, jsonld: [crumbLd([['/', 'Início'], ['/agendar/', 'Agendamento']])]
  }));
  addUrl('/agendar/', '2026-11-22', '0.7', 'weekly');

  /* ================= Cadastro de empresa e privacidade ================= */
  const cats = ctx.CATS;
  const cadBody = `<div class="container" style="padding-top:26px;padding-bottom:50px"><div class="row justify-content-center"><div class="col-lg-8">
<p>O cadastro básico é <strong>gratuito</strong>. Depois de enviado, nossa equipe analisa as informações e publica a página da sua empresa. Para página completa, destaque e assistente de IA, conheça o <a href="/planos/">plano premium</a>.</p>
<form id="cad-form" class="panel" novalidate>
<div class="row g-3">
<div class="col-md-8"><label class="form-label" for="c-nome">Nome da empresa *</label><input class="form-control" id="c-nome" maxlength="200" required autocomplete="organization"></div>
<div class="col-md-4"><label class="form-label" for="c-cat">Categoria *</label><select class="form-select" id="c-cat" required><option value="">Escolha…</option>${cats.map((c) => `<option value="${c.slug}">${esc(c.nome)}</option>`).join('')}</select></div>
<div class="col-md-12"><label class="form-label" for="c-sub">Subcategoria</label><select class="form-select" id="c-sub" disabled><option value="">Escolha a categoria primeiro</option></select></div>
<div class="col-md-6"><label class="form-label" for="c-resp">Responsável *</label><input class="form-control" id="c-resp" maxlength="120" required autocomplete="name"></div>
<div class="col-md-6"><label class="form-label" for="c-email">E-mail *</label><input class="form-control" type="email" id="c-email" maxlength="190" required autocomplete="email"></div>
<div class="col-md-6"><label class="form-label" for="c-tel">Telefone com DDD *</label><input class="form-control" id="c-tel" inputmode="tel" maxlength="16" required autocomplete="tel"></div>
<div class="col-md-6"><label class="form-label" for="c-wa">WhatsApp com DDD</label><input class="form-control" id="c-wa" inputmode="tel" maxlength="16"></div>
<div class="col-12"><label class="form-label" for="c-end">Endereço</label><input class="form-control" id="c-end" maxlength="250" autocomplete="street-address"></div>
<div class="col-12"><label class="form-label" for="c-desc">Descreva sua empresa (produtos, serviços, diferenciais)</label><textarea class="form-control" id="c-desc" rows="4" maxlength="1000"></textarea></div>
</div>
<div class="form-check my-3"><input class="form-check-input" type="checkbox" id="c-ok" required><label class="form-check-label small" for="c-ok">Autorizo o São João Digital a usar estes dados para analisar e publicar o cadastro. Veja a <a href="/privacidade/">política de privacidade</a>.</label></div>
<div class="visually-hidden" aria-hidden="true"><label for="c-site">Não preencha</label><input id="c-site" tabindex="-1" autocomplete="off"></div>
<p id="c-msg" role="alert" class="small" hidden></p>
<button class="btn btn-primary" type="submit">Enviar cadastro</button></form></div></div></div>`;
  write('cadastrar/index.html', layout({
    title: `Cadastre sua empresa gratuitamente`, desc: `Cadastre sua empresa de ${CIDADE} no São João Digital gratuitamente e apareça para moradores, visitantes e assistentes de inteligência artificial.`,
    path: '/cadastrar/', hero: pageHero([['/', 'Início'], ['/cadastrar/', 'Cadastrar empresa']], 'Cadastre sua empresa', 'Gratuito. Análise pela nossa equipe antes de publicar.'),
    body: cadBody, scripts: CORE_JS.concat('/assets/js/cadastro.js'), jsonld: [crumbLd([['/', 'Início'], ['/cadastrar/', 'Cadastrar empresa']])]
  }));
  addUrl('/cadastrar/', '2026-11-22', '0.6', 'monthly');

  const priv = `<div class="article"><h2>Quais dados coletamos</h2>
<p>Quando você usa agendamento, pedido pelo cardápio ou cadastro de empresa, guardamos apenas o que o formulário pede (nome, telefone/WhatsApp, e-mail quando solicitado, endereço de entrega, observações) e um código anônimo derivado do IP, usado só para evitar abuso.</p>
<h2>Para que usamos</h2><p>Os dados são usados para a empresa escolhida atender sua solicitação (confirmar horário, preparar o pedido) e, no cadastro, para analisarmos e publicarmos a página da empresa. Não vendemos dados nem os usamos para publicidade.</p>
<h2>Com quem compartilhamos</h2><p>Com a empresa que você escolheu e, se você clicar em enviar pelo WhatsApp, com o WhatsApp (Meta), conforme os termos dele.</p>
<h2>Seus direitos (LGPD)</h2><p>Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento pelo canal de contato do site. Solicitações de agendamento e pedidos podem ser excluídos pela administração mediante pedido.</p>
<h2>Cookies</h2><p>As páginas públicas não usam cookies de rastreamento. O painel administrativo usa um cookie de sessão necessário ao login.</p>
<p class="meta">Texto-base para adaptação: revise com um profissional jurídico antes de publicar e informe o contato do controlador dos dados.</p></div>`;
  write('privacidade/index.html', layout({
    title: 'Política de privacidade', desc: 'Como o São João Digital trata dados de agendamentos, pedidos e cadastros, conforme a LGPD.',
    path: '/privacidade/', hero: pageHero([['/', 'Início'], ['/privacidade/', 'Privacidade']], 'Política de privacidade', ''), body: priv, scripts: CORE_JS, jsonld: [crumbLd([['/', 'Início'], ['/privacidade/', 'Privacidade']])]
  }));
  addUrl('/privacidade/', '2026-11-22', '0.3', 'yearly');

  return { comAg };
};
