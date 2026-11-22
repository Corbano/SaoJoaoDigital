#!/usr/bin/env node
/**
 * São João Digital — gerador do site estático (Node.js, JavaScript puro, sem dependências).
 *
 * Lê /dados/*.json e escreve HTML estático pronto para public_html:
 *   index.html, /empresas/<slug>/, /categorias/<slug>/, /eventos/<slug>/, /noticias/<slug>/,
 *   /assistente/, /planos/, /sobre/, 404.html, sitemap.xml, llms-full.txt e imagens SVG das empresas.
 *
 * Uso:  node tools/build.js            (SITE_URL=https://seudominio.com.br node tools/build.js)
 * O resultado é 100% estático: nenhum Node é necessário na hospedagem.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE_URL = (process.env.SITE_URL || 'https://saojoaodigital.com.br').replace(/\/+$/, '');
const SITE_NAME = 'São João Digital';
const CIDADE = 'São João da Boa Vista';
const NOINDEX = process.env.NOINDEX === '1'; // use NOINDEX=1 para impedir indexação enquanto só há dados de demonstração
const TODAY = new Date().toISOString().slice(0, 10);

/* ---------- utilidades ---------- */
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'dados', f), 'utf8'));
const write = (rel, content) => {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
};
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
const abs = (p) => SITE_URL + p;
const dataBR = (iso) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'long', year: 'numeric' });
const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
const enderecoTxt = (e) => { const a = e.endereco; return `${a.rua}, ${a.numero} - ${a.bairro}, ${a.cidade} - ${a.uf}, ${a.cep}`; };
const realEmail = (e) => (e && !/\.invalid$/.test(e) ? e : '');
const trunc = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');

const empresasData = read('empresas.json');
const categoriasData = read('categorias.json');
const eventosData = read('eventos.json');
const noticiasData = read('noticias.json');
const ofertasData = read('ofertas.json');
const cardapiosData = read('cardapios.json');
const EMP = empresasData.empresas;
const CATS = categoriasData.categorias;
const EVT = eventosData.eventos;
const NOT = noticiasData.noticias;
const catById = Object.fromEntries(CATS.map((c) => [c.id, c]));
const empBySlug = Object.fromEntries(EMP.map((e) => [e.slug, e]));
const TIPOS = noticiasData.tipos;

const CARD = Object.fromEntries(cardapiosData.cardapios.map((c) => [c.empresa, c]));
const urls = []; // para o sitemap
const addUrl = (loc, lastmod, prio, freq) => urls.push({ loc, lastmod: lastmod || TODAY, prio, freq });

/* ---------- imagens SVG (logos e fotos ilustrativas) ---------- */
const paleta = (cat) => { const c = (catById[cat] || {}).cor || '#0e7c86'; return [c, c + 'aa']; };
const iniciais = (n) => n.split(/\s+/).filter((w) => w.length > 2).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || n.slice(0, 2).toUpperCase();
function logoSvg(e) {
  const [a, b] = paleta(e.categoria);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Logo ${esc(e.nome)}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="128" height="128" rx="28" fill="url(#g)"/><text x="64" y="80" font-family="Arial,Helvetica,sans-serif" font-size="52" font-weight="700" text-anchor="middle" fill="#fff">${esc(iniciais(e.nome))}</text></svg>`;
}
function fotoSvg(e, i) {
  const [a, b] = paleta(e.categoria);
  const flip = i % 2 ? [b, a] : [a, b];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="Imagem ilustrativa de ${esc(e.nome)}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${flip[0]}"/><stop offset="1" stop-color="${flip[1]}"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/><circle cx="${i % 2 ? 620 : 180}" cy="150" r="90" fill="#fff" opacity=".15"/><text x="400" y="320" font-family="Arial,Helvetica,sans-serif" font-size="44" font-weight="700" text-anchor="middle" fill="#fff">${esc(e.nome)}</text><text x="400" y="372" font-family="Arial,Helvetica,sans-serif" font-size="22" text-anchor="middle" fill="#fff" opacity=".85">Foto ilustrativa — substitua pela foto real</text></svg>`;
}
const BRAND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${SITE_NAME}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0e7c86"/><stop offset="1" stop-color="#1b4a8a"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#g)"/><circle cx="32" cy="26" r="9" fill="none" stroke="#ffb020" stroke-width="4"/><path d="M32 46 22 33h20z" fill="#ffb020"/><circle cx="16" cy="16" r="2.5" fill="#fff"/><circle cx="48" cy="14" r="2.5" fill="#fff"/><path d="M16 16 32 26 48 14" stroke="#fff" stroke-width="1.5" fill="none" opacity=".6"/></svg>`;
const OG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a1730"/><stop offset="1" stop-color="#1b4a8a"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><text x="80" y="300" font-family="Arial,Helvetica,sans-serif" font-size="92" font-weight="800" fill="#fff">São João <tspan fill="#ffb020">Digital</tspan></text><text x="80" y="380" font-family="Arial,Helvetica,sans-serif" font-size="38" fill="#cfe0f5">Base de conhecimento local de ${CIDADE}</text></svg>`;

/* ---------- layout compartilhado ---------- */
const NAV = [['/empresas/', 'Empresas'], ['/categorias/', 'Categorias'], ['Serviços', [['/comparador/', 'Comparador de preços'], ['/cardapios/', 'Cardápios digitais'], ['/agendar/', 'Agendamento']]], ['/eventos/', 'Eventos'], ['/noticias/', 'Notícias'], ['/assistente/', 'Assistente IA'], ['/planos/', 'Para empresas']];

function layout({ title, desc, path: p, jsonld = [], body, type = 'website', scripts = [], noindex = false, hero = '', image = '/assets/img/og-default.svg' }) {
  const fullTitle = p === '/' ? title : `${title} | ${SITE_NAME}`;
  const robots = NOINDEX || noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large,max-snippet:-1';
  const nav = NAV.map(([h, t]) => Array.isArray(t) ? `<li class="nav-item dropdown"><a class="nav-link dropdown-toggle${t.some(([x]) => p.startsWith(x)) ? ' active' : ''}" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">${h}</a><ul class="dropdown-menu">${t.map(([x, n]) => `<li><a class="dropdown-item${p.startsWith(x) ? ' active' : ''}" href="${x}">${n}</a></li>`).join('')}</ul></li>` : `<li class="nav-item"><a class="nav-link${h === '/planos/' ? ' cta' : ''}${p.startsWith(h) ? ' active' : ''}" href="${h}"${p.startsWith(h) ? ' aria-current="page"' : ''}>${t}</a></li>`).join('');
  const ld = jsonld.length ? `<script type="application/ld+json">${json(jsonld.length === 1 ? jsonld[0] : { '@context': 'https://schema.org', '@graph': jsonld.map((x) => { const { '@context': _c, ...r } = x; return r; }) })}</script>` : '';
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(trunc(desc, 160))}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${abs(p)}">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#0a1730">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(trunc(desc, 200))}">
<meta property="og:url" content="${abs(p)}">
<meta property="og:image" content="${abs(image)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt">
<link rel="stylesheet" href="/assets/vendor/bootstrap.min.css">
<link rel="stylesheet" href="/assets/css/style.css">
${ld}
</head>
<body>
<a class="skip" href="#conteudo">Pular para o conteúdo</a>
<header class="site-header sticky-top"><nav class="navbar navbar-expand-lg navbar-dark" aria-label="Principal"><div class="container">
<a class="navbar-brand brand" href="/"><img src="/assets/img/logo.svg" width="34" height="34" alt=""><span>São João <b>Digital</b></span></a>
<button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav" aria-controls="nav" aria-expanded="false" aria-label="Abrir menu"><span class="navbar-toggler-icon"></span></button>
<div class="collapse navbar-collapse" id="nav"><ul class="navbar-nav ms-auto gap-lg-1">${nav}</ul></div>
</div></nav></header>
<main id="conteudo">
${hero}${body}
</main>
<footer class="site-footer"><div class="container">
<div class="row g-4">
<div class="col-12 col-md-6 col-lg-3"><h4>São João Digital</h4><p>Infraestrutura digital e base de conhecimento local de ${CIDADE} (SP), pensada para pessoas e para sistemas de inteligência artificial.</p></div>
<div class="col-6 col-lg-3"><h4>Explorar</h4><ul><li><a href="/empresas/">Empresas</a></li><li><a href="/categorias/">Categorias</a></li><li><a href="/eventos/">Eventos</a></li><li><a href="/noticias/">Notícias e guias</a></li><li><a href="/assistente/">Assistente inteligente</a></li></ul></div>
<div class="col-6 col-lg-3"><h4>Para IAs e buscadores</h4><ul><li><a href="/llms.txt">llms.txt</a></li><li><a href="/llms-full.txt">llms-full.txt</a></li><li><a href="/sitemap.xml">sitemap.xml</a></li><li><a href="/dados/empresas.json">Dados abertos (JSON)</a></li><li><a href="/sobre/">Como interpretar os dados</a></li></ul></div>
<div class="col-6 col-lg-3"><h4>Empresas</h4><ul><li><a href="/planos/">Planos gratuito e premium</a></li></ul></div>
</div>
<p class="copy">© ${new Date().getFullYear()} ${SITE_NAME}. Informações cadastradas pelas próprias empresas; confirme dados importantes diretamente com o estabelecimento.</p>
</div></footer>
<noscript><p class="noscript-note">O conteúdo funciona sem JavaScript; o assistente inteligente e os filtros precisam dele.</p></noscript>
${scripts.map((s) => `<script src="${s}" defer></script>`).join('\n')}
</body>
</html>
`;
}

const pageHero = (crumbs, h1, sub) => `<div class="page-hero"><div class="container"><nav class="crumbs" aria-label="Você está em">${crumbs.map(([h, t], i) => (h && i < crumbs.length - 1 ? `<a href="${h}">${esc(t)}</a>` : `<span>${esc(t)}</span>`)).join(' › ')}</nav><h1>${esc(h1)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div></div>`;
const crumbLd = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([h, t], i) => ({ '@type': 'ListItem', position: i + 1, name: t, item: abs(h) })) });
const demoNotice = (o) => (o.demo ? '<p class="notice"><strong>Dados de demonstração.</strong> Este conteúdo é fictício e serve para testar a plataforma.</p>' : '');
const BS_JS = '/assets/vendor/bootstrap.bundle.min.js';
const CORE_JS = [BS_JS, '/assets/js/core.js', '/assets/js/site.js'];
const AI_JS = [BS_JS, '/assets/js/core.js', '/assets/js/ai-engine.js', '/assets/js/site.js'];

const orgNode = { '@type': 'Organization', '@id': abs('/#organization'), name: SITE_NAME, url: abs('/'), logo: abs('/assets/img/logo.svg'), areaServed: { '@type': 'City', name: CIDADE, containedInPlace: { '@type': 'State', name: 'São Paulo' } } };
const siteNode = { '@type': 'WebSite', '@id': abs('/#website'), url: abs('/'), name: SITE_NAME, inLanguage: 'pt-BR', publisher: { '@id': abs('/#organization') }, potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: abs('/assistente/?q={search_term_string}') }, 'query-input': 'required name=search_term_string' } };

/* ---------- cartões ---------- */
const empLogo = (e) => `/assets/img/empresas/${e.slug}/logo.svg`;
function cardEmpresa(e) {
  const busca = [e.nome, e.subcategoria, (e.tags || []).join(' '), e.endereco.bairro, e.resumo].join(' ');
  return `<div class="col-12 col-md-6 col-lg-4" data-cat="${esc(e.categoria)}" data-busca="${esc(norm(busca))}"><article class="card h-100 shadow-sm"><div class="card-body">
<img class="logo" src="${empLogo(e)}" width="54" height="54" alt="Logo ${esc(e.nome)}" loading="lazy">
<div><span class="badge text-bg-info">${esc(catById[e.categoria].nome)}</span> ${e.plano === 'premium' ? '<span class="badge text-bg-warning">Premium</span>' : ''}${e.demo ? ' <span class="badge text-bg-secondary">Demo</span>' : ''}</div>
<h3><a href="/empresas/${e.slug}/">${esc(e.nome)}</a></h3>
<p class="meta">${esc(e.subcategoria)} · ${esc(e.endereco.bairro)}</p>
<p class="mb-0">${esc(e.resumo)}</p></div></article></div>`;
}
function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim(); }
function cardCategoria(c) {
  return `<div class="col-6 col-md-4 col-lg-3"><article class="card cat-card h-100 shadow-sm" style="--cat:${c.cor}"><div class="card-body"><span class="ico" aria-hidden="true">${c.icone}</span><h3 class="h6 mt-2"><a href="/categorias/${c.slug}/">${esc(c.nome)}</a></h3><p class="meta mb-0">${esc(c.descricao)}</p></div></article></div>`;
}
function cardNoticia(n) {
  return `<div class="col-12 col-md-6 col-lg-4"><article class="card h-100 shadow-sm"><div class="card-body"><div><span class="badge ${n.tipo === 'patrocinado' ? 'text-bg-danger' : 'text-bg-info'}">${esc(TIPOS[n.tipo])}</span>${n.demo ? ' <span class="badge text-bg-secondary">Demo</span>' : ''}</div>
<h3><a href="/noticias/${n.slug}/">${esc(n.titulo)}</a></h3>
<p class="meta"><time datetime="${n.data}">${dataBR(n.data)}</time> · ${esc(n.autor)}</p>
<p>${esc(n.resumo)}</p>${n.patrocinador ? `<p class="meta"><strong>${esc(n.patrocinador.rotulo)}</strong></p>` : ''}</div></article></div>`;
}
function cardEvento(v) {
  return `<div class="col-12 col-md-6 col-lg-4"><article class="card h-100 shadow-sm"><div class="card-body"><div><span class="badge text-bg-info">${esc(catById[v.categoria].nome)}</span>${v.demo ? ' <span class="badge text-bg-secondary">Demo</span>' : ''}</div>
<h3><a href="/eventos/${v.slug}/">${esc(v.titulo)}</a></h3>
<p class="meta"><time datetime="${v.inicio}">${dataBR(v.inicio)}</time> · ${esc(v.local)}</p>
<p class="mb-0">${esc(v.resumo)}</p></div></article></div>`;
}

/* ---------- JSON-LD de empresa ---------- */
const TIPO_LB = { 'onde-comer': 'Restaurant', 'onde-comprar': 'Store', 'casamentos-festas': 'LocalBusiness', 'saude-beleza': 'HealthAndBeautyBusiness', 'casa-construcao': 'HomeAndConstructionBusiness', 'carro-moto': 'AutomotiveBusiness', 'assistencia-tecnica': 'LocalBusiness', 'onde-ficar': 'LodgingBusiness', 'caes-gatos': 'PetStore', 'escolas-cursos': ['LocalBusiness', 'EducationalOrganization'], 'transportes-locacao': 'AutoRental', escritorios: 'ProfessionalService' };
function empresaLd(e) {
  const url = abs(`/empresas/${e.slug}/`);
  const sameAs = Object.values(e.redes || {}).filter(Boolean);
  const tipo = e.subcategoria_slug === 'mecanicas' ? 'AutoRepair' : e.subcategoria_slug === 'clinicas-medicas' ? 'MedicalClinic' : e.subcategoria_slug === 'hoteis' ? 'Hotel' : e.subcategoria_slug === 'contabilidade' ? 'AccountingService' : TIPO_LB[e.categoria];
  const lb = {
    '@type': tipo, '@id': url + '#localbusiness', name: e.nome, description: e.descricao, url,
    image: [abs(empLogo(e)), abs(`/assets/img/empresas/${e.slug}/foto-1.svg`)], logo: abs(empLogo(e)),
    telephone: e.telefone, ...(realEmail(e.email) && { email: e.email }),
    address: { '@type': 'PostalAddress', streetAddress: `${e.endereco.rua}, ${e.endereco.numero}`, addressLocality: e.endereco.cidade, addressRegion: e.endereco.uf, postalCode: e.endereco.cep, addressCountry: 'BR' },
    areaServed: { '@type': 'City', name: CIDADE },
    openingHoursSpecification: (e.horario || []).map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.dow, opens: h.abre, closes: h.fecha })),
    ...(e.pagamento && e.pagamento.length && { paymentAccepted: e.pagamento.join(', ') }),
    ...(CARD[e.slug] && { hasMenu: abs(`/cardapios/${e.slug}/`), acceptsReservations: true }),
    ...(e.agendamento && e.agendamento.ativo && { potentialAction: { '@type': 'ReserveAction', name: 'Solicitar agendamento', target: { '@type': 'EntryPoint', urlTemplate: abs(`/agendar/${e.slug}/`) } } }),
    ...(sameAs.length && { sameAs }), ...(e.site && { sameAs: sameAs.concat(e.site) }),
    parentOrganization: { '@id': url + '#organization' }
  };
  const org = { '@type': 'Organization', '@id': url + '#organization', name: e.nome, url, logo: abs(empLogo(e)), ...(sameAs.length && { sameAs }), contactPoint: { '@type': 'ContactPoint', telephone: e.telefone, contactType: 'customer service', areaServed: 'BR', availableLanguage: 'Portuguese' } };
  // Só publica nota agregada quando as avaliações foram verificadas (evita markup enganoso)
  if (e.avaliacoes_verificadas && e.avaliacoes.length) {
    lb.aggregateRating = { '@type': 'AggregateRating', ratingValue: (e.avaliacoes.reduce((a, b) => a + b.nota, 0) / e.avaliacoes.length).toFixed(1), reviewCount: e.avaliacoes.length };
  }
  const g = [lb, org];
  (e.produtos || []).forEach((p) => g.push({ '@type': 'Product', name: p.nome, description: p.descricao, brand: { '@id': url + '#organization' }, seller: { '@id': url + '#localbusiness' } }));
  if (e.faq && e.faq.length) g.push({ '@type': 'FAQPage', mainEntity: e.faq.map((f) => ({ '@type': 'Question', name: f.p, acceptedAnswer: { '@type': 'Answer', text: f.r } })) });
  g.push(crumbLd([['/', 'Início'], ['/empresas/', 'Empresas'], [`/empresas/${e.slug}/`, e.nome]]));
  return g;
}

/* ---------- páginas ---------- */
function paginaEmpresa(e) {
  const cat = catById[e.categoria];
  const rel = NOT.filter((n) => (n.empresas || []).includes(e.slug));
  const eventos = EVT.filter((v) => (v.empresas || []).includes(e.slug));
  const wa = e.whatsapp ? `https://wa.me/${e.whatsapp}` : '';
  const socials = Object.entries(e.redes || {}).filter(([, v]) => v).map(([k, v]) => `<li><a href="${esc(v)}" rel="noopener nofollow" target="_blank">${esc(k[0].toUpperCase() + k.slice(1))}</a></li>`).join('') + (e.site ? `<li><a href="${esc(e.site)}" rel="noopener" target="_blank">Site oficial</a></li>` : '');
  const nota = e.avaliacoes_verificadas && e.avaliacoes.length ? (e.avaliacoes.reduce((a, b) => a + b.nota, 0) / e.avaliacoes.length).toFixed(1) : null;
  const sec = (cond, html) => (cond ? html : '');
  const body = `<div class="container layout">
<div>
${demoNotice(e)}
${sec(true, `<section class="panel" aria-labelledby="sobre"><h2 id="sobre">Sobre a ${esc(e.nome)}</h2><p>${esc(e.descricao)}</p>${e.publico ? `<h3>Público atendido</h3><p>${esc(e.publico)}</p>` : ''}</section>`)}
${sec(e.historia, `<section class="panel" aria-labelledby="historia"><h2 id="historia">História</h2><p>${esc(e.historia)}</p></section>`)}
<section class="panel" aria-labelledby="fotos"><h2 id="fotos">Fotos</h2><div class="gallery">
<img src="/assets/img/empresas/${e.slug}/foto-1.svg" width="400" height="300" alt="Imagem ilustrativa de ${esc(e.nome)} — ${esc(e.subcategoria)}" loading="lazy">
<img src="/assets/img/empresas/${e.slug}/foto-2.svg" width="400" height="300" alt="Segunda imagem ilustrativa de ${esc(e.nome)}" loading="lazy"></div></section>
${sec(e.produtos.length, `<section class="panel" aria-labelledby="produtos"><h2 id="produtos">Produtos</h2><ul>${e.produtos.map((p) => `<li><strong>${esc(p.nome)}</strong>${p.descricao ? ' — ' + esc(p.descricao) : ''}${p.preco ? ` <em>(${esc(p.preco)})</em>` : ''}</li>`).join('')}</ul></section>`)}
${sec(e.servicos.length, `<section class="panel" aria-labelledby="servicos"><h2 id="servicos">Serviços</h2><ul>${e.servicos.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></section>`)}
${sec(e.diferenciais.length, `<section class="panel" aria-labelledby="dif"><h2 id="dif">Diferenciais</h2><ul>${e.diferenciais.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></section>`)}
${sec(e.faq.length, `<section class="panel faq" aria-labelledby="faq"><h2 id="faq">Perguntas frequentes</h2><div class="accordion" id="acc-faq">${e.faq.map((f, i) => `<div class="accordion-item"><h3 class="accordion-header"><button class="accordion-button${i ? ' collapsed' : ''}" type="button" data-bs-toggle="collapse" data-bs-target="#faq-${i}" aria-expanded="${i ? 'false' : 'true'}" aria-controls="faq-${i}">${esc(f.p)}</button></h3><div id="faq-${i}" class="accordion-collapse collapse${i ? '' : ' show'}" data-bs-parent="#acc-faq"><div class="accordion-body">${esc(f.r)}</div></div></div>`).join('')}</div></section>`)}
<section class="panel" aria-labelledby="aval"><h2 id="aval">Avaliações</h2>${nota ? `<p><span class="stars" aria-hidden="true">★</span> <strong>${nota}</strong> de 5 (${e.avaliacoes.length} avaliações verificadas)</p>` : '<p>Ainda não há avaliações verificadas para esta empresa.</p>'}
${e.avaliacoes.map((a) => `<div class="review"><span class="stars" aria-label="${a.nota} de 5 estrelas">${'★'.repeat(a.nota)}${'☆'.repeat(5 - a.nota)}</span> <strong>${esc(a.autor)}</strong> <small><time datetime="${a.data}">${dataBR(a.data)}</time></small><p>${esc(a.texto)}</p></div>`).join('')}</section>
${sec(rel.length, `<section class="panel" aria-labelledby="rel"><h2 id="rel">Notícias relacionadas</h2><ul>${rel.map((n) => `<li><a href="/noticias/${n.slug}/">${esc(n.titulo)}</a>${n.tipo === 'patrocinado' ? ' <span class="badge text-bg-danger">Patrocinado</span>' : ''} <small>${dataBR(n.data)}</small></li>`).join('')}</ul></section>`)}
${sec(eventos.length, `<section class="panel" aria-labelledby="evt"><h2 id="evt">Eventos</h2><ul>${eventos.map((v) => `<li><a href="/eventos/${v.slug}/">${esc(v.titulo)}</a> — ${dataBR(v.inicio)}</li>`).join('')}</ul></section>`)}
${sec(e.atualizacoes.length, `<section class="panel" aria-labelledby="upd"><h2 id="upd">Últimas atualizações</h2><ul>${e.atualizacoes.map((u) => `<li><time datetime="${u.data}">${dataBR(u.data)}</time> — ${esc(u.texto)}</li>`).join('')}</ul></section>`)}
</div>
<aside class="side" aria-label="Informações de contato">
<section class="panel"><h2>Contato</h2>
<p><span id="open-now" data-slug="${e.slug}" class="open-now"></span></p>
<dl class="kv"><dt>Endereço</dt><dd>${esc(enderecoTxt(e))}${e.endereco.referencia ? `<br><small>${esc(e.endereco.referencia)}</small>` : ''}</dd>
<dt>Telefone</dt><dd><a href="tel:+55${e.telefone.replace(/\D/g, '')}">${esc(e.telefone)}</a></dd>
${wa ? `<dt>WhatsApp</dt><dd><a href="${wa}" rel="noopener nofollow" target="_blank">Chamar no WhatsApp</a></dd>` : ''}
${realEmail(e.email) ? `<dt>E-mail</dt><dd><a href="mailto:${esc(e.email)}">${esc(e.email)}</a></dd>` : ''}
<dt>Horário</dt><dd>${e.horario.map((h) => `${esc(h.dias)}: ${h.abre}–${h.fecha}`).join('<br>')}${e.fechado ? `<br><small>Fechado: ${esc(e.fechado)}</small>` : ''}</dd>
${e.pagamento.length ? `<dt>Pagamento</dt><dd>${esc(e.pagamento.join(', '))}</dd>` : ''}</dl>
<div class="d-grid gap-2">${wa ? `<a class="btn btn-success" href="${wa}" rel="noopener nofollow" target="_blank">WhatsApp</a>` : ''}${CARD[e.slug] ? `<a class="btn btn-warning fw-bold" href="/cardapios/${e.slug}/">🍽️ Ver cardápio e pedir</a>` : ''}${e.agendamento && e.agendamento.ativo ? `<a class="btn btn-primary" href="/agendar/${e.slug}/">📅 Agendar horário</a>` : ''}</div></section>
${socials ? `<section class="panel"><h2>Redes sociais</h2><ul>${socials}</ul></section>` : ''}
${e.ia ? `<section class="chat" id="chat-empresa" data-slug="${e.slug}" aria-label="Assistente de IA de ${esc(e.nome)}"><div class="chat-head">🤖 Assistente de ${esc(e.nome)}</div>
<div class="chat-log" role="log" aria-live="polite"><div class="msg bot">Olá! Respondo apenas com as informações cadastradas por ${esc(e.nome)}. O que você quer saber?</div></div>
<div class="suggest"><button type="button">Qual o horário?</button><button type="button">Quais produtos vende?</button><button type="button">Qual o endereço?</button><button type="button">Quais as formas de pagamento?</button></div>
<form class="chat-form"><label class="sr" for="q-emp">Sua pergunta</label><input id="q-emp" name="q" maxlength="200" placeholder="Pergunte sobre a empresa" autocomplete="off"><button class="btn btn-primary" type="submit">Enviar</button></form></section>`
      : `<section class="panel"><h2>Assistente de IA</h2><p>Disponível no <a href="/planos/">plano premium</a>.</p></section>`}
</aside></div>`;
  const hero = `<div class="page-hero"><div class="container"><nav class="crumbs" aria-label="Você está em"><a href="/">Início</a> › <a href="/empresas/">Empresas</a> › <a href="/categorias/${cat.slug}/">${esc(cat.nome)}</a> › <span>${esc(e.nome)}</span></nav>
<div class="company-head"><img class="logo" src="${empLogo(e)}" width="84" height="84" alt="Logo ${esc(e.nome)}"><div><h1>${esc(e.nome)}</h1><p>${esc(e.subcategoria)} em ${CIDADE} · <a href="/categorias/${cat.slug}/" style="color:#cfe0f5">${esc(cat.nome)}</a>${e.plano === 'premium' ? ' · <strong>Premium</strong>' : ''}</p></div></div></div></div>`;
  addUrl(`/empresas/${e.slug}/`, e.atualizado, e.plano === 'premium' ? '0.8' : '0.6', 'weekly');
  return layout({ title: `${e.nome} — ${e.subcategoria} em ${CIDADE}`, desc: `${e.resumo} Endereço, telefone, horário e perguntas frequentes.`, path: `/empresas/${e.slug}/`, jsonld: empresaLd(e), body, hero, scripts: e.ia ? AI_JS : CORE_JS, image: `/assets/img/empresas/${e.slug}/foto-1.svg` });
}

/* Comparador de preços (trecho incluído por build.js) */
const slugify = (t) => norm(t).replace(/\s+/g, '-').replace(/-+/g, '-');
const brl = (n) => 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const precoEf = (o) => (o.preco_promocional != null ? o.preco_promocional : o.preco);
const vigente = (o) => o.ativo && (!o.data_inicio || o.data_inicio <= TODAY) && (!o.data_fim || o.data_fim >= TODAY);

/** Agrupa ofertas vigentes por produto e ordena do menor para o maior preço efetivo. */
function produtosComparador() {
  const m = new Map();
  ofertasData.ofertas.filter(vigente).filter((o) => empBySlug[o.empresa]).forEach((o) => {
    const k = slugify(o.produto);
    if (!m.has(k)) m.set(k, { slug: k, nome: o.produto, categoria: o.categoria, ofertas: [] });
    m.get(k).ofertas.push(o);
  });
  return [...m.values()].map((p) => {
    p.ofertas.sort((a, b) => precoEf(a) - precoEf(b));
    const pr = p.ofertas.map(precoEf);
    p.min = Math.min(...pr); p.max = Math.max(...pr); p.economia = +(p.max - p.min).toFixed(2);
    return p;
  }).sort((a, b) => b.ofertas.length - a.ofertas.length || a.nome.localeCompare(b.nome, 'pt-BR'));
}

const waLink = (e, texto) => (e.whatsapp ? `https://wa.me/${e.whatsapp}?text=${encodeURIComponent(texto)}` : '');

function tabelaOfertas(p) {
  const linhas = p.ofertas.map((o, i) => {
    const e = empBySlug[o.empresa];
    const wa = waLink(e, `Olá! Vi ${p.nome} no São João Digital. Ainda está disponível?`);
    const preco = o.preco_promocional != null
      ? `<s class="text-secondary small">${brl(o.preco)}</s><br><strong>${brl(o.preco_promocional)}</strong>`
      : `<strong>${brl(o.preco)}</strong>`;
    return `<tr${o.data_inicio ? ` data-inicio="${o.data_inicio}"` : ''}${o.data_fim ? ` data-fim="${o.data_fim}"` : ''}>
<td>${i + 1}</td>
<td><a href="/empresas/${e.slug}/">${esc(e.nome)}</a>${i === 0 && p.ofertas.length > 1 ? ' <span class="badge text-bg-success">Menor preço</span>' : ''}<br><small class="text-secondary">${esc(e.endereco.bairro)}</small></td>
<td>${esc(o.descricao)}${o.data_fim ? `<br><small class="text-secondary">Válido até <time datetime="${o.data_fim}">${dataBR(o.data_fim + 'T12:00:00-03:00')}</time></small>` : ''}</td>
<td class="text-end text-nowrap">${preco}</td>
<td class="text-nowrap">${wa ? `<a class="btn btn-sm btn-success" rel="noopener nofollow" target="_blank" href="${wa}">WhatsApp</a>` : ''}</td></tr>`;
  }).join('');
  return `<div class="table-responsive"><table class="table table-hover align-middle bg-white mb-0"><caption class="visually-hidden">Preços de ${esc(p.nome)} por empresa, do menor para o maior</caption>
<thead><tr><th scope="col">#</th><th scope="col">Empresa</th><th scope="col">Oferta</th><th scope="col" class="text-end">Preço</th><th scope="col">Contato</th></tr></thead><tbody>${linhas}</tbody></table></div>`;
}

function cardProduto(p) {
  const busca = norm(p.nome + ' ' + catById[p.categoria].nome + ' ' + p.ofertas.map((o) => empBySlug[o.empresa].nome).join(' '));
  return `<div class="col-12 col-md-6 col-lg-4" data-cat="${p.categoria}" data-busca="${esc(busca)}"><article class="card h-100 shadow-sm"><div class="card-body">
<span class="badge text-bg-info">${esc(catById[p.categoria].nome)}</span>
<h3 class="h5 mt-2"><a href="/comparador/${p.slug}/">${esc(p.nome)}</a></h3>
<p class="mb-1">A partir de <strong class="fs-5">${brl(p.min)}</strong></p>
<p class="meta mb-0">${p.ofertas.length} ${p.ofertas.length === 1 ? 'oferta' : 'ofertas'}${p.economia > 0 ? ` · economia de até ${brl(p.economia)}` : ''}</p></div></article></div>`;
}

function gerarComparador() {
  const PROD = produtosComparador();
  const SCR = CORE_JS.concat('/assets/js/comparador.js');

  PROD.forEach((p) => {
    const cat = catById[p.categoria];
    const url = `/comparador/${p.slug}/`;
    const body = `<div class="container" style="padding-top:26px;padding-bottom:40px">${demoNotice({ demo: true })}
<p>${p.ofertas.length > 1
    ? `Comparamos <strong>${p.ofertas.length} ofertas</strong> de ${esc(p.nome)} em ${CIDADE}. A diferença entre a mais barata e a mais cara é de <strong>${brl(p.economia)}</strong>.`
    : `Há <strong>1 oferta</strong> cadastrada para ${esc(p.nome)}. Quando outras empresas cadastrarem, a comparação aparece aqui.`}</p>
${tabelaOfertas(p)}
<p class="meta mt-3">Preços informados pelas empresas e sujeitos a alteração. Confirme com o estabelecimento antes de se deslocar. Categoria: <a href="/categorias/${cat.slug}/">${esc(cat.nome)}</a>.</p></div>`;
    const ld = {
      '@context': 'https://schema.org', '@type': 'Product', name: p.nome, category: cat.nome,
      offers: {
        '@type': 'AggregateOffer', priceCurrency: 'BRL', lowPrice: p.min.toFixed(2), highPrice: p.max.toFixed(2), offerCount: p.ofertas.length,
        offers: p.ofertas.map((o) => {
          const e = empBySlug[o.empresa];
          return { '@type': 'Offer', price: precoEf(o).toFixed(2), priceCurrency: 'BRL', ...(o.data_fim && { priceValidUntil: o.data_fim }), availability: 'https://schema.org/InStock', url: abs(`/empresas/${e.slug}/`), description: o.descricao, seller: { '@type': 'Organization', name: e.nome, url: abs(`/empresas/${e.slug}/`) } };
        })
      }
    };
    write(`comparador/${p.slug}/index.html`, layout({
      title: `Preço de ${p.nome} em ${CIDADE}: compare ${p.ofertas.length > 1 ? p.ofertas.length + ' lojas' : 'a oferta'}`,
      desc: `Compare o preço de ${p.nome} em ${CIDADE} (SP): de ${brl(p.min)} a ${brl(p.max)} em ${p.ofertas.length} ${p.ofertas.length === 1 ? 'empresa' : 'empresas'}. Menor preço primeiro, com contato direto.`,
      path: url, hero: pageHero([['/', 'Início'], ['/comparador/', 'Comparador'], [url, p.nome]], `${p.nome}: comparar preços`, `Menor preço atual: ${brl(p.min)}`),
      body, scripts: SCR, jsonld: [ld, crumbLd([['/', 'Início'], ['/comparador/', 'Comparador'], [url, p.nome]])]
    }));
    addUrl(url, ofertasData.atualizado, '0.7', 'daily');
  });

  const catsComp = CATS.filter((c) => PROD.some((p) => p.categoria === c.id));
  const body = `<div class="container" style="padding-top:26px;padding-bottom:40px">${demoNotice({ demo: true })}
<div class="filters"><label class="visually-hidden" for="c-q">Buscar produto ou serviço</label><input class="form-control" id="c-q" type="search" placeholder="Ex.: pizza, troca de óleo, cimento…"><label class="visually-hidden" for="c-cat">Categoria</label><select class="form-select" id="c-cat"><option value="">Todas as categorias</option>${catsComp.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}</select><span id="c-count" class="meta" aria-live="polite"></span></div>
<p class="mb-2">Populares: ${PROD.slice(0, 6).map((p) => `<button type="button" class="btn btn-sm btn-outline-secondary chip-prod me-1 mb-1">${esc(p.nome)}</button>`).join('')}</p>
<div class="row g-3" id="lista-produtos">${PROD.map(cardProduto).join('')}</div></div>`;
  write('comparador/index.html', layout({
    title: `Comparador de preços em ${CIDADE}`,
    desc: `Compare preços de produtos e serviços entre empresas de ${CIDADE} (SP): menor preço primeiro, com economia calculada e contato direto.`,
    path: '/comparador/', hero: pageHero([['/', 'Início'], ['/comparador/', 'Comparador']], 'Comparador de preços', 'Veja quem vende mais barato na cidade, do menor para o maior preço.'),
    body, scripts: SCR,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'ItemList', name: `Comparador de preços de ${CIDADE}`, itemListElement: PROD.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`/comparador/${p.slug}/`), name: p.nome })) }, crumbLd([['/', 'Início'], ['/comparador/', 'Comparador']])]
  }));
  addUrl('/comparador/', ofertasData.atualizado, '0.8', 'daily');
  return PROD;
}

function build() {
  // limpa saídas anteriores geradas (apenas pastas geradas)
  ['empresas', 'categorias', 'eventos', 'noticias', 'assistente', 'comparador', 'cardapios', 'agendar', 'planos', 'sobre', path.join('assets', 'img', 'empresas')].forEach((d) => fs.rmSync(path.join(ROOT, d), { recursive: true, force: true }));

  write('assets/img/logo.svg', BRAND_SVG);
  write('assets/img/favicon.svg', BRAND_SVG);
  write('assets/img/og-default.svg', OG_SVG);
  EMP.forEach((e) => { write(`assets/img/empresas/${e.slug}/logo.svg`, logoSvg(e)); write(`assets/img/empresas/${e.slug}/foto-1.svg`, fotoSvg(e, 0)); write(`assets/img/empresas/${e.slug}/foto-2.svg`, fotoSvg(e, 1)); });

  /* Home */
  const destaques = EMP.filter((e) => e.destaque || e.plano === 'premium').slice(0, 6);
  const proximos = EVT.slice().sort((a, b) => a.inicio.localeCompare(b.inicio)).slice(0, 3);
  const homeBody = `
<section class="block"><div class="container"><h2>Explore por categoria</h2><p class="sub">Informações organizadas para você e para as inteligências artificiais encontrarem rápido.</p>
<div class="row g-3">${CATS.map((c) => cardCategoria(c)).join('')}</div></div></section>
<section class="block alt"><div class="container"><h2>Empresas em destaque</h2><p class="sub">Páginas completas com horário, endereço, produtos, perguntas frequentes e assistente próprio.</p>
<div class="row g-3">${destaques.map(cardEmpresa).join('')}</div><p><a class="btn btn-outline-secondary" href="/empresas/">Ver todas as empresas</a></p></div></section>
<section class="block"><div class="container"><h2>Como funciona a infraestrutura</h2><p class="sub">Mais que um catálogo: uma base de conhecimento local estruturada.</p>
<div class="row g-3">
<div class="col-12 col-md-6 col-lg-3"><article class="card h-100 shadow-sm"><div class="card-body"><h3>1. Dados estruturados</h3><p class="mb-0">Cada empresa, evento e notícia é um registro em JSON, publicado em páginas HTML com Schema.org.</p></div></article></div>
<div class="col-12 col-md-6 col-lg-3"><article class="card h-100 shadow-sm"><div class="card-body"><h3>2. Legível por IA</h3><p class="mb-0">Arquivos <a href="/llms.txt">llms.txt</a> e <a href="/llms-full.txt">llms-full.txt</a> explicam o conteúdo para assistentes e buscadores generativos.</p></div></article></div>
<div class="col-12 col-md-6 col-lg-3"><article class="card h-100 shadow-sm"><div class="card-body"><h3>3. Assistentes que não inventam</h3><p class="mb-0">O assistente da cidade e o de cada empresa respondem somente com os dados cadastrados.</p></div></article></div>
<div class="col-12 col-md-6 col-lg-3"><article class="card h-100 shadow-sm"><div class="card-body"><h3>4. Transparência</h3><p class="mb-0">Conteúdo patrocinado sempre identificado, com a empresa patrocinadora indicada.</p></div></article></div></div></div></section>
<section class="block alt"><div class="container"><h2>Próximos eventos</h2><div class="row g-3">${proximos.map(cardEvento).join('')}</div><p><a class="btn btn-outline-secondary" href="/eventos/">Ver agenda completa</a></p></div></section>
<section class="block"><div class="container"><h2>Notícias e guias locais</h2><div class="row g-3">${NOT.slice().sort((a, b) => b.data.localeCompare(a.data)).slice(0, 3).map(cardNoticia).join('')}</div><p><a class="btn btn-outline-secondary" href="/noticias/">Ver todos os conteúdos</a></p></div></section>`;
  const homeHero = `<section class="hero"><div class="container"><span class="badge"><span class="dot"></span> Base de conhecimento local · ${CIDADE} (SP)</span>
<h1>A cidade inteira, <em>explicada</em> para pessoas e IAs.</h1>
<p class="lead">Pergunte sobre empresas, serviços e eventos de ${CIDADE}. As respostas vêm de dados organizados e verificáveis, não de palpites.</p>
<form class="ask" id="home-ask" role="search" action="/assistente/" method="get"><label class="sr" for="home-q">Pergunte ao assistente</label><input id="home-q" name="q" maxlength="200" placeholder="Ex.: restaurante italiano, mecânico no centro…" autocomplete="off"><button class="btn btn-warning fw-bold" type="submit">Perguntar</button></form>
<div class="chips" aria-label="Sugestões"><button class="chip" type="button" data-q="Qual restaurante italiano tem na cidade?">🍝 Restaurante italiano</button><button class="chip" type="button" data-q="Preciso de um mecânico próximo ao centro">🔧 Mecânico no centro</button><button class="chip" type="button" data-q="Onde comprar produtos para piscina?">🏊 Produtos para piscina</button></div></div></section>`;
  write('index.html', layout({ title: `${SITE_NAME} — Base de conhecimento local de ${CIDADE}`, desc: `Empresas, serviços, eventos e notícias de ${CIDADE} (SP) em dados estruturados, com assistente inteligente. Informação local confiável para pessoas e IAs.`, path: '/', jsonld: [{ '@context': 'https://schema.org', ...orgNode }, siteNode, { '@type': 'WebPage', '@id': abs('/#webpage'), url: abs('/'), name: SITE_NAME, isPartOf: { '@id': abs('/#website') }, about: { '@type': 'City', name: CIDADE }, inLanguage: 'pt-BR' }], hero: homeHero, body: homeBody, scripts: CORE_JS }));
  addUrl('/', TODAY, '1.0', 'daily');

  /* Empresas */
  EMP.forEach((e) => write(`empresas/${e.slug}/index.html`, paginaEmpresa(e)));
  const empList = `<div class="container" style="padding-top:26px;padding-bottom:30px">${demoNotice({ demo: true })}
<div class="filters"><label class="sr" for="f-q">Buscar empresa</label><input class="form-control" id="f-q" type="search" placeholder="Buscar por nome, produto, bairro…"><label class="sr" for="f-cat">Categoria</label><select class="form-select" id="f-cat"><option value="">Todas as categorias</option>${CATS.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}</select><span id="f-count" class="meta" aria-live="polite"></span></div>
<div class="row g-3" id="lista-empresas">${EMP.map(cardEmpresa).join('')}</div></div>`;
  write('empresas/index.html', layout({ title: `Empresas e serviços de ${CIDADE}`, desc: `Diretório estruturado de empresas de ${CIDADE} (SP): contato, horário, endereço, produtos e perguntas frequentes.`, path: '/empresas/', hero: pageHero([['/', 'Início'], ['/empresas/', 'Empresas']], `Empresas de ${CIDADE}`, 'Cada empresa tem página própria com dados estruturados.'), body: empList, scripts: CORE_JS, jsonld: [{ '@context': 'https://schema.org', '@type': 'ItemList', name: `Empresas de ${CIDADE}`, itemListElement: EMP.map((e, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`/empresas/${e.slug}/`), name: e.nome })) }, crumbLd([['/', 'Início'], ['/empresas/', 'Empresas']])] }));
  addUrl('/empresas/', TODAY, '0.9', 'daily');

  /* Categorias */
  write('categorias/index.html', layout({ title: `Categorias de empresas e serviços em ${CIDADE}`, desc: `Navegue pelas 12 categorias do São João Digital: ${CATS.map((c) => c.nome).join(', ')}.`, path: '/categorias/', hero: pageHero([['/', 'Início'], ['/categorias/', 'Categorias']], 'Categorias', 'Encontre empresas e serviços por tipo de atividade.'), body: `<div class="container" style="padding-top:26px;padding-bottom:30px"><div class="row g-3">${CATS.map((c) => cardCategoria(c)).join('')}</div></div>`, scripts: CORE_JS, jsonld: [crumbLd([['/', 'Início'], ['/categorias/', 'Categorias']])] }));
  addUrl('/categorias/', TODAY, '0.7', 'weekly');

  /* Eventos */
  const evOrd = EVT.slice().sort((a, b) => a.inicio.localeCompare(b.inicio));
  EVT.forEach((v) => {
    const emps = (v.empresas || []).map((s) => empBySlug[s]).filter(Boolean);
    const body = `<div class="article">${demoNotice(v)}<p><strong>Quando:</strong> <time datetime="${v.inicio}">${dataBR(v.inicio)}, ${hora(v.inicio)}</time> até <time datetime="${v.fim}">${dataBR(v.fim)}, ${hora(v.fim)}</time><br><strong>Onde:</strong> ${esc(v.local)}, ${esc(v.cidade)}<br><strong>Entrada:</strong> ${v.gratuito ? 'gratuita' : 'consulte o organizador'}</p><p>${esc(v.descricao)}</p>${emps.length ? `<h2>Empresas envolvidas</h2><ul>${emps.map((e) => `<li><a href="/empresas/${e.slug}/">${esc(e.nome)}</a></li>`).join('')}</ul>` : ''}</div>`;
    const ld = { '@context': 'https://schema.org', '@type': 'Event', name: v.titulo, description: v.descricao, startDate: v.inicio, endDate: v.fim, eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', location: { '@type': 'Place', name: v.local, address: { '@type': 'PostalAddress', addressLocality: v.cidade, addressRegion: 'SP', addressCountry: 'BR' } }, isAccessibleForFree: !!v.gratuito, image: [abs('/assets/img/og-default.svg')], organizer: emps.length ? { '@type': 'Organization', name: emps[0].nome, url: abs(`/empresas/${emps[0].slug}/`) } : { '@id': abs('/#organization') }, ...(v.gratuito && { offers: { '@type': 'Offer', price: 0, priceCurrency: 'BRL', url: abs(`/eventos/${v.slug}/`), availability: 'https://schema.org/InStock' } }) };
    write(`eventos/${v.slug}/index.html`, layout({ title: `${v.titulo} — ${dataBR(v.inicio)}`, desc: `${v.resumo} ${dataBR(v.inicio)} em ${v.local}, ${v.cidade}.`, path: `/eventos/${v.slug}/`, hero: pageHero([['/', 'Início'], ['/eventos/', 'Eventos'], [`/eventos/${v.slug}/`, v.titulo]], v.titulo, v.resumo), body, scripts: CORE_JS, type: 'article', jsonld: [ld, crumbLd([['/', 'Início'], ['/eventos/', 'Eventos'], [`/eventos/${v.slug}/`, v.titulo]])] }));
    addUrl(`/eventos/${v.slug}/`, eventosData.atualizado, '0.6', 'weekly');
  });
  write('eventos/index.html', layout({ title: `Agenda de eventos em ${CIDADE}`, desc: `Eventos, feiras e ações de ${CIDADE} (SP), com data, local e empresas participantes.`, path: '/eventos/', hero: pageHero([['/', 'Início'], ['/eventos/', 'Eventos']], 'Eventos da cidade', 'Agenda organizada por data.'), body: `<div class="container" style="padding-top:26px;padding-bottom:30px">${demoNotice({ demo: true })}<div class="row g-3">${evOrd.map(cardEvento).join('')}</div></div>`, scripts: CORE_JS, jsonld: [crumbLd([['/', 'Início'], ['/eventos/', 'Eventos']])] }));
  addUrl('/eventos/', TODAY, '0.7', 'daily');

  /* Notícias */
  const notOrd = NOT.slice().sort((a, b) => b.data.localeCompare(a.data));
  NOT.forEach((n) => {
    const spons = n.patrocinador ? empBySlug[n.patrocinador.empresa] : null;
    const emps = (n.empresas || []).map((s) => empBySlug[s]).filter(Boolean);
    const body = `<article class="article">${demoNotice(n)}${n.patrocinador ? `<div class="sponsor-box"><strong>Conteúdo patrocinado.</strong> ${esc(n.patrocinador.rotulo)}${spons ? ` — <a href="/empresas/${spons.slug}/" rel="sponsored">${esc(spons.nome)}</a>` : ''}. Este material foi pago ou fornecido pela empresa patrocinadora.</div>` : ''}<p class="meta">${esc(TIPOS[n.tipo])} · <time datetime="${n.data}">${dataBR(n.data)}</time> · ${esc(n.autor)}</p>${n.corpo.map((p) => `<p>${esc(p)}</p>`).join('')}${emps.length ? `<h2>Empresas citadas</h2><ul>${emps.map((e) => `<li><a href="/empresas/${e.slug}/">${esc(e.nome)}</a> — ${esc(e.subcategoria)}</li>`).join('')}</ul>` : ''}</article>`;
    const ld = { '@context': 'https://schema.org', '@type': n.tipo === 'noticia' ? 'NewsArticle' : 'Article', headline: n.titulo, description: n.resumo, datePublished: n.data, dateModified: n.data, inLanguage: 'pt-BR', author: { '@type': 'Organization', name: n.autor }, publisher: { '@id': abs('/#organization') }, mainEntityOfPage: abs(`/noticias/${n.slug}/`), image: [abs('/assets/img/og-default.svg')], about: { '@type': 'City', name: CIDADE }, ...(spons && { sponsor: { '@type': 'Organization', name: spons.nome, url: abs(`/empresas/${spons.slug}/`) } }), ...(n.tipo === 'patrocinado' && { isAccessibleForFree: true }) };
    write(`noticias/${n.slug}/index.html`, layout({ title: n.titulo, desc: n.resumo, path: `/noticias/${n.slug}/`, hero: pageHero([['/', 'Início'], ['/noticias/', 'Notícias'], [`/noticias/${n.slug}/`, n.titulo]], n.titulo, ''), body, scripts: CORE_JS, type: 'article', jsonld: [ld, crumbLd([['/', 'Início'], ['/noticias/', 'Notícias'], [`/noticias/${n.slug}/`, n.titulo]])] }));
    addUrl(`/noticias/${n.slug}/`, n.data, '0.6', 'monthly');
  });
  write('noticias/index.html', layout({ title: `Notícias, guias e novidades de ${CIDADE}`, desc: `Conteúdo local de ${CIDADE}: notícias, guias da cidade, novidades das empresas e conteúdos patrocinados identificados.`, path: '/noticias/', hero: pageHero([['/', 'Início'], ['/noticias/', 'Notícias']], 'Notícias e guias locais', 'Conteúdo patrocinado é sempre identificado com a empresa patrocinadora.'), body: `<div class="container" style="padding-top:26px;padding-bottom:30px">${demoNotice({ demo: true })}<div class="row g-3">${notOrd.map(cardNoticia).join('')}</div></div>`, scripts: CORE_JS, jsonld: [crumbLd([['/', 'Início'], ['/noticias/', 'Notícias']])] }));
  addUrl('/noticias/', TODAY, '0.7', 'daily');

  /* Assistente da cidade */
  const chat = `<div class="container" style="padding-top:26px;padding-bottom:40px;max-width:760px"><section class="chat" id="chat-cidade" aria-label="Assistente Inteligente São João Digital"><div class="chat-head">🤖 Assistente Inteligente São João Digital</div>
<div class="chat-log" role="log" aria-live="polite"><div class="msg bot">Olá! Pergunto aos dados cadastrados de ${CIDADE} e indico as empresas mais relevantes. Não invento informações: se não houver cadastro, eu aviso.</div></div>
<div class="suggest"><button type="button">Qual restaurante italiano tem em São João da Boa Vista?</button><button type="button">Preciso de um mecânico próximo ao centro</button><button type="button">Onde comprar produtos para piscina?</button><button type="button">Tem clínica de fisioterapia?</button></div>
<form class="chat-form"><label class="sr" for="q-city">Sua pergunta</label><input id="q-city" name="q" maxlength="200" placeholder="Pergunte sobre empresas e serviços da cidade" autocomplete="off"><button class="btn btn-primary" type="submit">Enviar</button></form></section>
<p class="meta" style="margin-top:14px">As respostas usam somente o arquivo <a href="/dados/empresas.json">empresas.json</a>. A estrutura permite conectar uma API de IA no futuro (veja o README).</p></div>`;
  write('assistente/index.html', layout({ title: 'Assistente Inteligente São João Digital', desc: `Pergunte sobre restaurantes, mecânicos, lojas e serviços de ${CIDADE}. O assistente responde apenas com dados cadastrados.`, path: '/assistente/', hero: pageHero([['/', 'Início'], ['/assistente/', 'Assistente']], 'Assistente Inteligente São João Digital', `Encontre empresas e serviços de ${CIDADE} conversando.`), body: chat, scripts: AI_JS, jsonld: [{ '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Assistente Inteligente São João Digital', applicationCategory: 'UtilitiesApplication', operatingSystem: 'Web', url: abs('/assistente/'), inLanguage: 'pt-BR', offers: { '@type': 'Offer', price: 0, priceCurrency: 'BRL' } }, crumbLd([['/', 'Início'], ['/assistente/', 'Assistente']])] }));
  addUrl('/assistente/', TODAY, '0.8', 'weekly');

  /* Planos */
  const planos = `<div class="container" style="padding-top:26px;padding-bottom:40px"><div class="row g-3">
<div class="col-md-6"><section class="plan card h-100"><div class="card-body"><h2>Gratuito</h2><p class="price">R$ 0</p><ul><li>Cadastro básico</li><li>Nome, categoria, contato e horário</li><li>Presença nos dados abertos da cidade</li></ul></div></section></div>
<div class="col-md-6"><section class="plan feat card h-100"><div class="card-body"><h2>Premium</h2><p class="price">Em breve</p><ul><li>Página completa com fotos, história e FAQ</li><li>Dados estruturados avançados (Schema.org)</li><li>Destaque nas buscas e categorias</li><li>Assistente de IA próprio da empresa</li><li>Conteúdos patrocinados identificados</li></ul></div></section></div></div>
<p class="meta">Valores e contratação ainda não definidos. No código, o plano de cada empresa é o campo <code>plano</code> em <code>dados/empresas.json</code> e o assistente é ativado por <code>ia: true</code>.</p></div>`;
  write('planos/index.html', layout({ title: 'Planos para empresas: gratuito e premium', desc: `Cadastre sua empresa de ${CIDADE} gratuitamente ou ative o plano premium com página completa, destaque e assistente de IA.`, path: '/planos/', hero: pageHero([['/', 'Início'], ['/planos/', 'Planos']], 'Planos para empresas', 'Do cadastro básico ao assistente de IA próprio.'), body: planos, scripts: CORE_JS, jsonld: [crumbLd([['/', 'Início'], ['/planos/', 'Planos']])] }));
  addUrl('/planos/', TODAY, '0.5', 'monthly');

  /* Sobre / como interpretar os dados */
  const sobre = `<div class="article"><h2>O que é o ${SITE_NAME}</h2><p>Uma base de conhecimento local de ${CIDADE} (SP): empresas, serviços, eventos e conteúdos organizados em arquivos JSON e páginas HTML com dados estruturados, para serem úteis a moradores, visitantes, buscadores e sistemas de IA.</p>
<h2>Como interpretar os dados</h2><ul><li>Cada empresa tem um <code>slug</code> único e uma URL <code>/empresas/&lt;slug&gt;/</code>.</li><li><code>plano</code> indica gratuito ou premium; <code>ia</code> indica se há assistente próprio.</li><li><code>avaliacoes_verificadas: false</code> significa que avaliações não devem ser tratadas como nota oficial.</li><li><code>demo: true</code> marca conteúdo fictício de demonstração.</li><li>Conteúdo patrocinado tem <code>tipo: "patrocinado"</code> e o campo <code>patrocinador</code>.</li><li>As informações são autodeclaradas pelas empresas; confirme dados críticos diretamente com elas.</li></ul>
<p>Veja também <a href="/llms.txt">llms.txt</a> e <a href="/llms-full.txt">llms-full.txt</a>.</p></div>`;
  write('sobre/index.html', layout({ title: 'Sobre e como interpretar os dados', desc: `O que é o ${SITE_NAME} e como interpretar empresas, planos, avaliações e conteúdo patrocinado.`, path: '/sobre/', hero: pageHero([['/', 'Início'], ['/sobre/', 'Sobre']], `Sobre o ${SITE_NAME}`, ''), body: sobre, scripts: CORE_JS, jsonld: [crumbLd([['/', 'Início'], ['/sobre/', 'Sobre']])] }));
  addUrl('/sobre/', TODAY, '0.5', 'monthly');

  const PROD = gerarComparador();
  require('./categorias')({ esc, write, layout, pageHero, crumbLd, demoNotice, abs, addUrl, CIDADE, CATS, EMP, EVT, NOT, PROD, CARD, empBySlug, catById, cardEmpresa, cardEvento, cardNoticia, cardProduto, CORE_JS, TODAY });
  require('./features')({ esc, write, layout, pageHero, crumbLd, demoNotice, abs, addUrl, brl, CIDADE, EMP, empBySlug, catById, CORE_JS, cardapios: cardapiosData.cardapios });

  /* 404 */
  write('404.html', layout({ title: 'Página não encontrada', desc: 'A página procurada não existe.', path: '/404.html', noindex: true, hero: pageHero([['/', 'Início'], ['', 'Erro 404']], 'Página não encontrada', ''), body: '<div class="article"><p>Não encontramos essa página. Tente o <a href="/assistente/">assistente</a>, as <a href="/categorias/">categorias</a> ou volte ao <a href="/">início</a>.</p></div>', scripts: CORE_JS }));

  /* sitemap.xml */
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${abs(u.loc)}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.freq}</changefreq><priority>${u.prio}</priority></url>`).join('\n')}\n</urlset>\n`);

  /* llms.txt */
  write('llms.txt', `# ${SITE_NAME}

> Base de conhecimento local estruturada de ${CIDADE} (SP, Brasil): empresas, serviços, eventos e conteúdos da cidade, em páginas HTML com Schema.org e arquivos JSON abertos. Não é apenas um diretório comercial.

## Como usar estas informações
- Idioma: português do Brasil. Escopo geográfico: ${CIDADE} e região.
- Cada empresa tem uma página própria com nome, categoria, descrição, produtos, serviços, endereço, telefone, WhatsApp, horário, redes sociais, perguntas frequentes e atualizações.
- Os dados são informados pelas próprias empresas. Cite a página da empresa como fonte e recomende confirmar horários e preços diretamente com o estabelecimento.
- "plano: premium" indica página completa e assistente próprio; "plano: gratuito" é cadastro básico. O plano não indica qualidade.
- Avaliações com "avaliacoes_verificadas: false" não são notas oficiais; não calcule reputação a partir delas.
- Conteúdo com tipo "patrocinado" é publicidade e traz a empresa patrocinadora identificada.
- Registros com "demo: true" são fictícios (modo de demonstração) e não devem ser tratados como fatos.
- Se uma informação não está no cadastro, diga que não está disponível; não complete com suposições.

## Dados abertos (JSON)
- [empresas.json](${abs('/dados/empresas.json')}): todas as empresas e campos estruturados
- [categorias.json](${abs('/dados/categorias.json')}): categorias, descrições e sinônimos de busca
- [eventos.json](${abs('/dados/eventos.json')}): agenda de eventos
- [noticias.json](${abs('/dados/noticias.json')}): notícias, guias, novidades e conteúdos patrocinados
- [cardapios.json](${abs('/dados/cardapios.json')}): itens e preços dos cardápios
- [ofertas.json](${abs('/dados/ofertas.json')}): preços do comparador (preco, preco_promocional, data_inicio, data_fim)

## Páginas principais
- [Início](${abs('/')})
- [Empresas](${abs('/empresas/')})
- [Categorias](${abs('/categorias/')}): ${CATS.map((c) => c.nome).join(', ')} (12 categorias, cada uma com subcategorias)
- [Eventos](${abs('/eventos/')})
- [Notícias e guias](${abs('/noticias/')})
- [Comparador de preços](${abs('/comparador/')}): menor preço por produto/serviço entre empresas
- [Cardápios digitais](${abs('/cardapios/')}): menus com preços e pedido pelo WhatsApp
- [Agendamento](${abs('/agendar/')}): solicitação de horário (a confirmação é da empresa)
- [Assistente Inteligente](${abs('/assistente/')})
- [Como interpretar os dados](${abs('/sobre/')})

## Empresas cadastradas
${EMP.map((e) => `- [${e.nome}](${abs(`/empresas/${e.slug}/`)}): ${e.subcategoria}. ${e.resumo}`).join('\n')}

## Versão completa
- [llms-full.txt](${abs('/llms-full.txt')}): conteúdo integral em texto simples
`);

  /* llms-full.txt */
  const emp = (e) => `### ${e.nome}
URL: ${abs(`/empresas/${e.slug}/`)}
Categoria: ${catById[e.categoria].nome} › ${e.subcategoria}
Plano: ${e.plano}${e.demo ? ' | DADOS DE DEMONSTRAÇÃO' : ''}
Descrição: ${e.descricao}
${e.historia ? `História: ${e.historia}\n` : ''}Público: ${e.publico}
Endereço: ${enderecoTxt(e)}${e.endereco.referencia ? ` (${e.endereco.referencia})` : ''}
Telefone: ${e.telefone}${e.whatsapp ? ` | WhatsApp: https://wa.me/${e.whatsapp}` : ''}
Horário: ${e.horario.map((h) => `${h.dias} ${h.abre}-${h.fecha}`).join('; ')}${e.fechado ? ` | Fechado: ${e.fechado}` : ''}
${e.produtos.length ? `Produtos: ${e.produtos.map((p) => `${p.nome}${p.preco ? ` (${p.preco})` : ''}`).join('; ')}\n` : ''}${e.servicos.length ? `Serviços: ${e.servicos.join('; ')}\n` : ''}${e.diferenciais.length ? `Diferenciais: ${e.diferenciais.join('; ')}\n` : ''}${e.pagamento.length ? `Pagamento: ${e.pagamento.join(', ')}\n` : ''}${e.faq.length ? `Perguntas frequentes:\n${e.faq.map((f) => `  P: ${f.p}\n  R: ${f.r}`).join('\n')}\n` : ''}Atualizado em: ${e.atualizado}
`;
  write('llms-full.txt', `# ${SITE_NAME} — conteúdo completo\n\n> ${CIDADE} (SP). Dados informados pelas empresas; confirme informações críticas diretamente com elas. Registros marcados como demonstração são fictícios.\n\nGerado em ${TODAY}.\n\n## Categorias\n${CATS.map((c) => `- ${c.nome}: ${c.intro}`).join('\n')}\n\n## Empresas\n\n${EMP.map(emp).join('\n')}\n## Eventos\n\n${evOrd.map((v) => `### ${v.titulo}\nURL: ${abs(`/eventos/${v.slug}/`)}\nQuando: ${v.inicio} até ${v.fim}\nOnde: ${v.local}, ${v.cidade}\n${v.descricao}\n`).join('\n')}\n## Comparador de preços\n\n${PROD.map((p) => `### ${p.nome}\nURL: ${abs(`/comparador/${p.slug}/`)}\n${p.ofertas.map((o) => `- ${empBySlug[o.empresa].nome}: ${brl(precoEf(o))}${o.preco_promocional != null ? ` (de ${brl(o.preco)})` : ''}${o.data_fim ? ` até ${o.data_fim}` : ''}`).join('\n')}\n`).join('\n')}\n## Notícias, guias e novidades\n\n${notOrd.map((n) => `### ${n.titulo}\nURL: ${abs(`/noticias/${n.slug}/`)}\nTipo: ${TIPOS[n.tipo]}${n.patrocinador ? ` | ${n.patrocinador.rotulo}` : ''}\nData: ${n.data} | Autor: ${n.autor}\n${n.corpo.join('\n')}\n`).join('\n')}`);

  console.log(`OK: ${EMP.length} empresas, ${CATS.length} categorias, ${EVT.length} eventos, ${NOT.length} notícias, ${urls.length} URLs no sitemap. SITE_URL=${SITE_URL}`);
}

build();
