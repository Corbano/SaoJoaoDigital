/**
 * Páginas de categoria (12) e de subcategoria (somente as que têm empresas).
 * Cada categoria reúne empresas, comparador de preços, cardápios/agendamento, eventos, notícias e FAQ (GEO).
 */
'use strict';

module.exports = function gerarCategorias(ctx) {
  const { esc, write, layout, pageHero, crumbLd, demoNotice, abs, addUrl, CIDADE, CATS, EMP, EVT, NOT, PROD, CARD, empBySlug, catById, cardEmpresa, cardEvento, cardNoticia, cardProduto, CORE_JS, TODAY } = ctx;
  const lista = (a) => (a.length > 1 ? a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1] : a[0] || '');

  const faqHtml = (id, faq) => `<section class="panel" aria-labelledby="${id}-h"><h2 class="h4" id="${id}-h">Perguntas frequentes</h2><div class="accordion" id="${id}">${faq.map((f, i) => `<div class="accordion-item"><h3 class="accordion-header"><button class="accordion-button${i ? ' collapsed' : ''}" type="button" data-bs-toggle="collapse" data-bs-target="#${id}-${i}" aria-expanded="${i ? 'false' : 'true'}" aria-controls="${id}-${i}">${esc(f.p)}</button></h3><div id="${id}-${i}" class="accordion-collapse collapse${i ? '' : ' show'}" data-bs-parent="#${id}"><div class="accordion-body">${f.r}</div></div></div>`).join('')}</div></section>`;
  const faqLd = (faq) => ({ '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.p, acceptedAnswer: { '@type': 'Answer', text: f.r.replace(/<[^>]+>/g, '') } })) });
  const grid = (html) => `<div class="row g-3">${html}</div>`;

  CATS.forEach((c) => {
    const emps = EMP.filter((e) => e.categoria === c.id);
    const url = `/categorias/${c.slug}/`;
    const prods = PROD.filter((p) => p.categoria === c.id);
    const evs = EVT.filter((v) => v.categoria === c.id);
    const nots = NOT.filter((n) => n.categoria === c.id);
    const comCard = emps.filter((e) => CARD[e.slug]);
    const comAg = emps.filter((e) => e.agendamento && e.agendamento.ativo);

    const chips = c.subcategorias.map((sc) => {
      const n = emps.filter((e) => e.subcategoria_slug === sc.slug).length;
      return `<li class="list-inline-item mb-1">${n ? `<a class="badge rounded-pill text-bg-primary text-decoration-none" href="${url}${sc.slug}/">${esc(sc.nome)} (${n})</a>` : `<span class="badge rounded-pill text-bg-light border">${esc(sc.nome)}</span>`}</li>`;
    }).join('');

    const faq = [
      { p: `Quais tipos de negócio há em ${c.nome} em ${CIDADE}?`, r: `A categoria ${esc(c.nome)} reúne: ${esc(lista(c.subcategorias.map((s) => s.nome)))}.` },
      { p: `Quais empresas de ${c.nome} estão cadastradas?`, r: emps.length ? `Atualmente: ${lista(emps.map((e) => `<a href="/empresas/${e.slug}/">${esc(e.nome)}</a>`))}.` : 'Ainda não há empresas cadastradas nesta categoria.' },
      ...(comCard.length ? [{ p: 'Dá para ver cardápio e pedir pelo WhatsApp?', r: `Sim, em: ${lista(comCard.map((e) => `<a href="/cardapios/${e.slug}/">${esc(e.nome)}</a>`))}.` }] : []),
      ...(comAg.length ? [{ p: 'Posso agendar horário online?', r: `Sim, por solicitação via WhatsApp em: ${lista(comAg.map((e) => `<a href="/agendar/${e.slug}/">${esc(e.nome)}</a>`))}. O horário só vale após a confirmação da empresa.` }] : []),
      { p: `Como cadastrar minha empresa em ${c.nome}?`, r: 'O cadastro básico é gratuito; o plano premium libera página completa, destaque e assistente de IA. Veja a <a href="/planos/">página de planos</a>.' }
    ];

    const sec = (cond, titulo, html) => (cond ? `<section class="mb-4"><h2 class="h4">${titulo}</h2>${html}</section>` : '');
    const body = `<div class="container" style="padding-top:26px;padding-bottom:40px">${demoNotice({ demo: true })}
<p class="lead">${esc(c.intro)}</p>
<section class="mb-4"><h2 class="h5">Subcategorias</h2><ul class="list-inline subcats mb-0">${chips}</ul></section>
${sec(true, 'Empresas', emps.length ? grid(emps.map(cardEmpresa).join('')) : '<p>Ainda não há empresas cadastradas nesta categoria. <a href="/planos/">Cadastre a sua gratuitamente</a>.</p>')}
${sec(prods.length, 'Compare preços', grid(prods.map(cardProduto).join('')))}
${sec(comCard.length || comAg.length, 'Serviços online', `<ul>${comCard.map((e) => `<li><a href="/cardapios/${e.slug}/">Cardápio digital — ${esc(e.nome)}</a></li>`).join('')}${comAg.map((e) => `<li><a href="/agendar/${e.slug}/">Agendar — ${esc(e.nome)}</a></li>`).join('')}</ul>`)}
${sec(evs.length, 'Eventos', grid(evs.map(cardEvento).join('')))}
${sec(nots.length, 'Notícias e guias', grid(nots.map(cardNoticia).join('')))}
${faqHtml('faq-' + c.slug, faq)}</div>`;

    const hero = `<div class="page-hero" style="border-bottom:4px solid ${c.cor}"><div class="container"><nav class="crumbs" aria-label="Você está em"><a href="/">Início</a> › <a href="/categorias/">Categorias</a> › <span>${esc(c.nome)}</span></nav><h1><span aria-hidden="true">${c.icone}</span> ${esc(c.nome)} em ${CIDADE}</h1><p>${esc(c.descricao)}</p></div></div>`;
    write(`categorias/${c.slug}/index.html`, layout({
      title: `${c.nome} em ${CIDADE}`, desc: `${c.descricao} ${emps.length} ${emps.length === 1 ? 'empresa cadastrada' : 'empresas cadastradas'} em ${CIDADE} (SP).`,
      path: url, hero, body, scripts: CORE_JS,
      jsonld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: `${c.nome} em ${CIDADE}`, description: c.intro, mainEntity: { '@type': 'ItemList', itemListElement: emps.map((e, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`/empresas/${e.slug}/`), name: e.nome })) } }, faqLd(faq), crumbLd([['/', 'Início'], ['/categorias/', 'Categorias'], [url, c.nome]])]
    }));
    addUrl(url, TODAY, '0.8', 'weekly');

    // subcategorias que já têm empresas
    c.subcategorias.forEach((sc) => {
      const se = emps.filter((e) => e.subcategoria_slug === sc.slug);
      if (!se.length) return;
      const surl = `${url}${sc.slug}/`;
      const sprods = prods.filter((p) => p.ofertas.some((o) => se.some((e) => e.slug === o.empresa)));
      const sfaq = [
        { p: `Quais ${sc.nome.toLowerCase()} há em ${CIDADE}?`, r: `Cadastrados no São João Digital: ${lista(se.map((e) => `<a href="/empresas/${e.slug}/">${esc(e.nome)}</a>`))}.` },
        { p: `Como encontro o contato de ${sc.nome.toLowerCase()}?`, r: 'Cada empresa tem página com telefone, WhatsApp, endereço e horário de funcionamento.' }
      ];
      const sbody = `<div class="container" style="padding-top:26px;padding-bottom:40px">${demoNotice({ demo: true })}
<p class="lead">${esc(sc.nome)} em ${CIDADE}, dentro de <a href="${url}">${esc(c.nome)}</a>. ${se.length} ${se.length === 1 ? 'empresa cadastrada' : 'empresas cadastradas'}.</p>
${sec(true, 'Empresas', grid(se.map(cardEmpresa).join('')))}
${sec(sprods.length, 'Compare preços', grid(sprods.map(cardProduto).join('')))}
${faqHtml('faq-' + sc.slug, sfaq)}</div>`;
      write(`categorias/${c.slug}/${sc.slug}/index.html`, layout({
        title: `${sc.nome} em ${CIDADE}`, desc: `${sc.nome} em ${CIDADE} (SP): ${se.map((e) => e.nome).join(', ')}. Telefone, endereço, horário e preços.`,
        path: surl, hero: pageHero([['/', 'Início'], ['/categorias/', 'Categorias'], [url, c.nome], [surl, sc.nome]], `${sc.nome} em ${CIDADE}`, c.nome), body: sbody, scripts: CORE_JS,
        jsonld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: `${sc.nome} em ${CIDADE}`, mainEntity: { '@type': 'ItemList', itemListElement: se.map((e, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`/empresas/${e.slug}/`), name: e.nome })) } }, faqLd(sfaq), crumbLd([['/', 'Início'], ['/categorias/', 'Categorias'], [url, c.nome], [surl, sc.nome]])]
      }));
      addUrl(surl, TODAY, '0.6', 'weekly');
    });
  });
};
