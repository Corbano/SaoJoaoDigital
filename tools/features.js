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
<aside class="col-lg-4"><section class="panel sticky-lg-top" style="top:76px" id="pedido" data-wa="${esc(e.whatsapp)}" data-empresa="${esc(e.nome)}" aria-labelledby="ped-h"><h2 class="h5" id="ped-h">Seu pedido</h2>
<ul class="list-unstyled" id="ped-itens"><li class="text-secondary">Nenhum item ainda.</li></ul>
<p class="fs-5 mb-3">Total: <strong id="ped-total">R$ 0,00</strong></p>
<form id="ped-form" novalidate>
<div class="mb-2"><label class="form-label" for="p-nome">Seu nome</label><input class="form-control" id="p-nome" maxlength="80" required autocomplete="name"></div>
<div class="mb-2"><label class="form-label" for="p-tipo">Como receber</label><select class="form-select" id="p-tipo"><option value="Retirada no local">Retirada no local</option><option value="Entrega">Entrega</option></select></div>
<div class="mb-2" id="p-end-box" hidden><label class="form-label" for="p-end">Endereço de entrega</label><input class="form-control" id="p-end" maxlength="160" autocomplete="street-address"></div>
<div class="mb-2"><label class="form-label" for="p-pag">Pagamento</label><select class="form-select" id="p-pag">${(e.pagamento.length ? e.pagamento : ['Combinar']).map((p) => `<option>${esc(p)}</option>`).join('')}</select></div>
<div class="mb-3"><label class="form-label" for="p-obs">Observações</label><textarea class="form-control" id="p-obs" rows="2" maxlength="200"></textarea></div>
<p class="text-danger small" id="p-erro" role="alert" hidden></p>
<button class="btn btn-success w-100" type="submit">Enviar pedido pelo WhatsApp</button></form>
<p class="meta mt-2 mb-0">${esc(c.entrega)} O pedido só é confirmado quando ${esc(e.nome)} responder. Seus dados não ficam salvos aqui: seguem direto para o WhatsApp da empresa.</p></section></aside></div></div>`;
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
<p class="text-danger small" id="a-erro" role="alert" hidden></p>
<button class="btn btn-success" type="submit">Pedir horário pelo WhatsApp</button></form>
<p class="meta mt-3 mb-0"><strong>Importante:</strong> isto é uma solicitação. O horário só está confirmado quando ${esc(e.nome)} responder no WhatsApp. Seus dados não são armazenados neste site; seguem direto para a empresa.</p></section></div>
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

  return { comAg };
};
