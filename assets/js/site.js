/* São João Digital — comportamentos de página (progressive enhancement: o HTML já é completo sem JS) */
(function () {
  'use strict';
  var SJD = window.SJD;

  document.addEventListener('DOMContentLoaded', function () {
    // Home: caixa de pergunta leva ao assistente
    var home = document.getElementById('home-ask');
    if (home) {
      var go = function (q) { location.href = '/assistente/?q=' + encodeURIComponent(q); };
      home.addEventListener('submit', function (e) { e.preventDefault(); var q = home.q.value.trim(); if (q) go(q); });
      document.querySelectorAll('.chip[data-q]').forEach(function (c) {
        c.addEventListener('click', function () { go(c.getAttribute('data-q')); });
      });
    }

    // Assistente da cidade
    var city = document.getElementById('chat-cidade');
    if (city) {
      var ask = SJD.montarChat(city, 'cidade');
      var q = new URLSearchParams(location.search).get('q');
      if (q) ask(q.slice(0, 200));
    }

    // Assistente da empresa
    var comp = document.getElementById('chat-empresa');
    if (comp) SJD.montarChat(comp, 'empresa', comp.getAttribute('data-slug'));

    // Filtro da listagem de empresas
    var list = document.getElementById('lista-empresas');
    if (list) {
      var cards = [].slice.call(list.querySelectorAll('[data-busca]'));
      var inp = document.getElementById('f-q'), sel = document.getElementById('f-cat'), cnt = document.getElementById('f-count');
      var apply = function () {
        var t = SJD.norm(inp.value), c = sel.value, n = 0;
        cards.forEach(function (el) {
          var ok = (!c || el.getAttribute('data-cat') === c) && (!t || el.getAttribute('data-busca').indexOf(t) > -1);
          el.hidden = !ok; if (ok) n++;
        });
        cnt.textContent = n + (n === 1 ? ' empresa' : ' empresas');
      };
      inp.addEventListener('input', apply); sel.addEventListener('change', apply);
      var pre = new URLSearchParams(location.search).get('categoria');
      if (pre) sel.value = pre;
      apply();
    }

    // "Aberto agora" nas páginas de empresa
    var on = document.getElementById('open-now');
    if (on) {
      SJD.json('empresas').then(function (j) {
        var e = j.empresas.filter(function (x) { return x.slug === on.getAttribute('data-slug'); })[0];
        if (!e) return;
        var r = SJD.abertoAgora(e);
        on.textContent = r.aberto ? 'Aberto agora (até ' + r.ate + ')' : 'Fechado agora';
        on.className = 'open-now ' + (r.aberto ? 'on' : 'off');
      }).catch(function () {});
    }
  });
})();
