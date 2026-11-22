/* São João Digital — motor dos assistentes (cidade e empresa)
 *
 * Funciona 100% no navegador, sem servidor e sem banco: recupera informações dos arquivos JSON
 * e responde SOMENTE com os dados cadastrados.
 *
 * Para plugar uma IA generativa no futuro, defina ANTES de carregar este arquivo:
 *   window.SJD_AI = { provider: 'http', endpoint: 'https://seu-proxy.exemplo/ia', timeoutMs: 15000 };
 * O endpoint recebe { escopo, pergunta, contexto } (apenas dados cadastrados) e deve devolver { resposta }.
 * NUNCA coloque chaves de API no front-end: use um proxy próprio que guarde a chave.
 * Se o endpoint falhar, o motor local responde normalmente (fallback).
 */
(function (w) {
  'use strict';
  var SJD = w.SJD, norm = SJD.norm;
  var CFG = w.SJD_AI || { provider: 'local' };

  var STOP = ['de','da','do','das','dos','a','o','as','os','um','uma','e','em','no','na','nos','nas','que','qual','quais','tem','ha','por','para','pra','com','me','meu','minha','eu','preciso','quero','onde','como','sao','joao','boa','vista','cidade','perto','proximo','algum','alguma','voce','vcs','tem','existe','indica','indique','ou','se','ao','aos','mais','muito','favor','comprar','produto','produtos','empresa','empresas','ola','oi','bom','dia','tarde','noite'];

  function tokens(q) {
    return norm(q).split(' ').filter(function (t) { return t.length > 1 && STOP.indexOf(t) === -1; }).map(stem);
  }
  function stem(t) {
    if (t.length > 4 && /oes$/.test(t)) return t.slice(0, -3) + 'ao';
    if (t.length > 3 && /s$/.test(t)) return t.slice(0, -1);
    return t;
  }
  function hay(list) { return norm((list || []).join(' ')); }

  /* ---------- Assistente da cidade ---------- */
  function scoreEmpresa(e, toks, cats) {
    var nome = norm(e.nome), sub = norm(e.subcategoria), tags = hay(e.tags),
      prods = hay((e.produtos || []).map(function (p) { return p.nome + ' ' + p.descricao; })),
      servs = hay(e.servicos), desc = norm(e.resumo + ' ' + e.descricao),
      local = norm((e.endereco || {}).bairro + ' ' + (e.endereco || {}).referencia);
    var s = 0, hits = 0;
    toks.forEach(function (t) {
      var h = 0;
      if (nome.indexOf(t) > -1) h += 5;
      if (sub.indexOf(t) > -1) h += 4;
      if (tags.indexOf(t) > -1) h += 4;
      if (servs.indexOf(t) > -1 || prods.indexOf(t) > -1) h += 3;
      if (desc.indexOf(t) > -1) h += 0.5;
      if (h) hits++;
      s += h;
    });
    // localização só reforça quando algum outro termo já combinou (evita "centro" listar tudo)
    if (s >= 3) toks.forEach(function (t) { if (local.indexOf(t) > -1) s += 2; });
    cats.forEach(function (c) { if (c.id === e.categoria) s += 2; });
    if (e.plano === 'premium') s += s > 0 ? 0.5 : 0; // desempate leve, nunca cria relevância sozinho
    return { s: s, hits: hits };
  }

  function cityLocal(pergunta, d) {
    var toks = tokens(pergunta);
    var cats = d.categorias.filter(function (c) {
      return toks.some(function (t) { return c.sinonimos.map(stem).indexOf(t) > -1; });
    });
    if (!toks.length) return { texto: 'Pode me dizer o que você procura? Exemplo: "restaurante italiano", "mecânico no centro" ou "produtos para piscina".', itens: [] };
    var r = d.empresas.map(function (e) { var x = scoreEmpresa(e, toks, cats); return { e: e, s: x.s, hits: x.hits }; })
      .filter(function (x) { return x.s >= 3; })
      .sort(function (a, b) { return b.s - a.s; }).slice(0, 5);
    if (!r.length) {
      return { texto: 'Não encontrei empresas cadastradas para essa busca. Tente outras palavras ou veja as categorias.', itens: [], fallback: '/categorias/' };
    }
    var intro = r.length === 1 ? 'Encontrei 1 empresa cadastrada:' : 'Encontrei ' + r.length + ' empresas cadastradas que podem ajudar:';
    return { texto: intro, itens: r.map(function (x) { return x.e; }) };
  }

  /* ---------- Assistente da empresa (somente dados da própria empresa) ---------- */
  var INTENTS = [
    ['horario', /(horari|abre|fecha|funcion|aberto|atend[ei]\b|hora)/],
    ['telefone', /(telefon|ligar|ligo|contato|numero)/],
    ['whatsapp', /(whats|zap)/],
    ['endereco', /(endereco|onde fica|localiz|chegar|rua|bairro|mapa|fica)/],
    ['produtos', /(produt|vende|venda|cardapio|menu|trabalha com|tem para|catalogo)/],
    ['servicos', /(servic|faz\b|fazem|realiza|oferece|atende)/],
    ['pagamento', /(pagamento|pagar|pix|cartao|dinheiro|credito|debito|parcel|aceita)/],
    ['diferenciais', /(diferencial|diferente|melhor|vantagem|por que escolher|porque escolher)/],
    ['publico', /(publico|para quem|quem atende|crianca|idoso)/],
    ['historia', /(historia|fundad|desde quando|quando comecou|origem|quem criou)/],
    ['redes', /(instagram|facebook|rede social|redes sociais|site)/],
    ['sobre', /(quem e|o que e|sobre|descri|apresent|fala sobre)/],
    ['avaliacao', /(avalia|nota|opinia|comentario)/]
  ];

  function lista(a) { return a.length > 1 ? a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1] : (a[0] || ''); }

  function companyLocal(pergunta, e) {
    var q = norm(pergunta), end = e.endereco || {}, nome = e.nome;
    var hit = null;
    for (var i = 0; i < INTENTS.length; i++) { if (INTENTS[i][1].test(q)) { hit = INTENTS[i][0]; break; } }

    // FAQ cadastrada tem prioridade quando a pergunta é muito parecida
    var best = null, bestN = 0, qt = tokens(pergunta);
    (e.faq || []).forEach(function (f) {
      var ft = tokens(f.p), n = qt.filter(function (t) { return ft.indexOf(t) > -1; }).length;
      if (n > bestN) { bestN = n; best = f; }
    });
    if (best && bestN >= 2) return best.r;

    switch (hit) {
      case 'horario':
        if (!e.horario || !e.horario.length) break;
        var t = e.horario.map(function (h) { return h.dias + ' das ' + h.abre.replace(':00', 'h').replace(':', 'h') + ' às ' + h.fecha.replace(':00', 'h').replace(':', 'h'); });
        return nome + ' funciona ' + lista(t) + '.' + (e.fechado ? ' Fechado: ' + e.fechado.toLowerCase() + '.' : '');
      case 'telefone': return e.telefone ? 'O telefone de ' + nome + ' é ' + e.telefone + '.' : null;
      case 'whatsapp': return e.whatsapp ? 'Você pode chamar ' + nome + ' pelo WhatsApp: https://wa.me/' + e.whatsapp : null;
      case 'endereco': return 'Fica em ' + SJD.enderecoTexto(e) + '.' + (end.referencia ? ' Referência: ' + end.referencia + '.' : '');
      case 'produtos':
        if (e.produtos && e.produtos.length) return nome + ' trabalha com: ' + lista(e.produtos.map(function (p) { return p.nome + (p.preco ? ' (' + p.preco + ')' : ''); })) + '.';
        if (e.servicos && e.servicos.length) return nome + ' não tem produtos cadastrados, mas oferece: ' + lista(e.servicos) + '.';
        break;
      case 'servicos':
        if (e.servicos && e.servicos.length) return 'Serviços de ' + nome + ': ' + lista(e.servicos) + '.';
        break;
      case 'pagamento':
        if (e.pagamento && e.pagamento.length) return 'Formas de pagamento aceitas: ' + lista(e.pagamento) + '.';
        break;
      case 'diferenciais':
        if (e.diferenciais && e.diferenciais.length) return 'Diferenciais de ' + nome + ': ' + lista(e.diferenciais) + '.';
        break;
      case 'publico': if (e.publico) return e.publico; break;
      case 'historia': if (e.historia) return e.historia; break;
      case 'redes':
        var r = []; if (e.redes && e.redes.instagram) r.push('Instagram: ' + e.redes.instagram);
        if (e.redes && e.redes.facebook) r.push('Facebook: ' + e.redes.facebook);
        if (e.site) r.push('Site: ' + e.site);
        if (r.length) return r.join('\n'); break;
      case 'sobre': return e.descricao;
      case 'avaliacao':
        if (e.avaliacoes && e.avaliacoes.length && e.avaliacoes_verificadas) {
          var m = e.avaliacoes.reduce(function (a, b) { return a + b.nota; }, 0) / e.avaliacoes.length;
          return 'A nota média é ' + m.toFixed(1) + ' com base em ' + e.avaliacoes.length + ' avaliações.';
        }
        return 'Ainda não há avaliações verificadas cadastradas para ' + nome + '.';
    }

    // Busca livre nos produtos, serviços e diferenciais cadastrados
    var found = [];
    (e.produtos || []).concat((e.servicos || []).concat(e.diferenciais || []).map(function (s) { return { nome: s, descricao: '' }; })).forEach(function (p) {
      var pt = norm(p.nome + ' ' + p.descricao);
      if (qt.some(function (t) { return pt.indexOf(t) > -1; })) found.push(p.nome);
    });
    if (found.length) return 'Sim, encontrei no cadastro de ' + nome + ': ' + lista(found) + '.';

    return 'Não tenho essa informação cadastrada sobre ' + nome + '. Você pode perguntar diretamente' + (e.whatsapp ? ' pelo WhatsApp: https://wa.me/' + e.whatsapp : (e.telefone ? ' pelo telefone ' + e.telefone : '')) + '.';
  }

  /* ---------- Provedor externo opcional ---------- */
  function viaHttp(escopo, pergunta, contexto) {
    if (CFG.provider !== 'http' || !CFG.endpoint) return Promise.resolve(null);
    var ctl = new AbortController(), tm = setTimeout(function () { ctl.abort(); }, CFG.timeoutMs || 15000);
    return fetch(CFG.endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
      body: JSON.stringify({ escopo: escopo, pergunta: pergunta, contexto: contexto })
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return j && typeof j.resposta === 'string' ? j.resposta : null; })
      .catch(function () { return null; })
      .then(function (x) { clearTimeout(tm); return x; });
  }

  SJD.assistenteCidade = function (pergunta) {
    return SJD.data().then(function (d) {
      var local = cityLocal(pergunta, d);
      return viaHttp('cidade', pergunta, local.itens).then(function (t) {
        if (t) local.texto = t;
        return local;
      });
    });
  };

  SJD.assistenteEmpresa = function (slug, pergunta) {
    return SJD.json('empresas').then(function (j) {
      var e = j.empresas.filter(function (x) { return x.slug === slug; })[0];
      if (!e) return 'Empresa não encontrada.';
      return viaHttp('empresa:' + slug, pergunta, e).then(function (t) { return t || companyLocal(pergunta, e); });
    });
  };

  /* ---------- UI de chat reutilizável ---------- */
  SJD.montarChat = function (root, mode, slug) {
    var log = root.querySelector('.chat-log'), form = root.querySelector('form'), inp = root.querySelector('input[name=q]');

    function linkify(parent, text) {
      text.split(/(https?:\/\/[^\s]+)/g).forEach(function (part) {
        if (/^https?:\/\//.test(part)) {
          var a = document.createElement('a'); a.href = SJD.safeUrl(part); a.textContent = part.replace(/^https?:\/\//, '');
          a.rel = 'noopener nofollow'; a.target = '_blank'; parent.appendChild(a);
        } else parent.appendChild(document.createTextNode(part));
      });
    }
    function add(cls, text) {
      var m = document.createElement('div'); m.className = 'msg ' + cls; linkify(m, text); log.appendChild(m);
      log.scrollTop = log.scrollHeight; return m;
    }
    function resultados(m, itens) {
      if (!itens.length) return;
      var box = document.createElement('div'); box.className = 'results';
      itens.forEach(function (e) {
        var a = document.createElement('a'); a.className = 'res'; a.href = '/empresas/' + encodeURIComponent(e.slug) + '/';
        var b = document.createElement('strong'); b.textContent = e.nome;
        var s = document.createElement('small'); s.textContent = e.subcategoria + ' · ' + ((e.endereco || {}).bairro || '') + ' · ' + (e.telefone || '');
        a.appendChild(b); a.appendChild(s); box.appendChild(a);
      });
      m.appendChild(box);
    }
    function ask(q) {
      q = q.trim(); if (!q) return;
      add('user', q);
      var wait = add('bot', '…');
      var p = mode === 'cidade'
        ? SJD.assistenteCidade(q).then(function (r) {
          wait.textContent = r.texto; resultados(wait, r.itens);
          if (r.fallback) { var a = document.createElement('a'); a.href = r.fallback; a.textContent = ' Ver categorias'; wait.appendChild(a); }
        })
        : SJD.assistenteEmpresa(slug, q).then(function (t) { wait.textContent = ''; linkify(wait, t); });
      p.catch(function () { wait.textContent = 'Não consegui carregar os dados agora. Tente novamente.'; });
      log.scrollTop = log.scrollHeight;
    }
    form.addEventListener('submit', function (ev) { ev.preventDefault(); ask(inp.value); inp.value = ''; });
    root.querySelectorAll('.suggest button').forEach(function (b) {
      b.addEventListener('click', function () { ask(b.textContent); });
    });
    return ask;
  };
})(window);
