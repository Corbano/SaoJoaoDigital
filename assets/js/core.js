/* São João Digital — utilitários compartilhados (JavaScript puro) */
(function (w) {
  'use strict';
  var SJD = w.SJD = w.SJD || {};

  /** Remove acentos, baixa caixa e limpa pontuação. */
  SJD.norm = function (s) {
    return String(s == null ? '' : s).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  };

  /** Escapa HTML — toda saída dinâmica passa por aqui (ou por textContent). */
  SJD.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /** Só permite URLs internas (/...) ou http(s) nos links montados via JS. */
  SJD.safeUrl = function (u) {
    u = String(u || '');
    return (/^\/(?!\/)/.test(u) || /^https?:\/\//i.test(u)) ? u : '#';
  };

  var cache = {};
  SJD.json = function (name) {
    if (!cache[name]) {
      cache[name] = fetch('/dados/' + name + '.json', { credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) throw new Error(name + ' ' + r.status); return r.json(); });
    }
    return cache[name];
  };

  SJD.data = function () {
    return Promise.all([SJD.json('empresas'), SJD.json('categorias')]).then(function (a) {
      return { empresas: a[0].empresas, categorias: a[1].categorias };
    });
  };

  SJD.enderecoTexto = function (e) {
    var a = e.endereco || {};
    return [a.rua && (a.rua + (a.numero ? ', ' + a.numero : '')), a.bairro, a.cidade && (a.cidade + (a.uf ? ' - ' + a.uf : '')), a.cep]
      .filter(Boolean).join(' · ');
  };

  /** Calcula se está aberto agora (fuso de São Paulo). */
  SJD.abertoAgora = function (e) {
    var fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false });
    var p = {}; fmt.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    var now = (parseInt(p.hour, 10) % 24) * 60 + parseInt(p.minute, 10);
    var list = e.horario || [];
    for (var i = 0; i < list.length; i++) {
      var h = list[i];
      if (h.dow.indexOf(p.weekday) === -1) continue;
      var a = h.abre.split(':'), f = h.fecha.split(':');
      var ini = +a[0] * 60 + +a[1], fim = +f[0] * 60 + +f[1];
      if (now >= ini && now <= fim) return { aberto: true, ate: h.fecha };
    }
    return { aberto: false };
  };

  // Menu mobile
  document.addEventListener('DOMContentLoaded', function () {
    var t = document.querySelector('.nav-toggle'), n = document.getElementById('nav');
    if (t && n) {
      t.addEventListener('click', function () {
        var o = n.classList.toggle('open');
        t.setAttribute('aria-expanded', o ? 'true' : 'false');
      });
    }
  });
})(window);
