/* São João Digital — Comparador de preços: filtro e vigência das ofertas (o HTML já vem completo sem JS) */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var norm = window.SJD.norm;
    var hoje = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()) + 'T00:00:00');

    // Esconde ofertas fora da vigência (a página estática pode ser mais antiga que o prazo)
    document.querySelectorAll('[data-inicio],[data-fim]').forEach(function (el) {
      var i = el.getAttribute('data-inicio'), f = el.getAttribute('data-fim');
      if ((i && new Date(i + 'T00:00:00') > hoje) || (f && new Date(f + 'T23:59:59') < hoje)) el.hidden = true;
    });

    var list = document.getElementById('lista-produtos');
    if (!list) return;
    var items = [].slice.call(list.querySelectorAll('[data-busca]'));
    var q = document.getElementById('c-q'), cat = document.getElementById('c-cat'), cnt = document.getElementById('c-count');
    function apply() {
      var t = norm(q.value), c = cat.value, n = 0;
      items.forEach(function (el) {
        var ok = (!c || el.getAttribute('data-cat') === c) && (!t || el.getAttribute('data-busca').indexOf(t) > -1);
        el.hidden = !ok; if (ok) n++;
      });
      cnt.textContent = n + (n === 1 ? ' produto' : ' produtos');
    }
    q.addEventListener('input', apply); cat.addEventListener('change', apply);
    document.querySelectorAll('.chip-prod').forEach(function (b) {
      b.addEventListener('click', function () { q.value = b.textContent; apply(); q.focus(); });
    });
    var pre = new URLSearchParams(location.search).get('q');
    if (pre) q.value = pre.slice(0, 100);
    apply();
  });
})();
