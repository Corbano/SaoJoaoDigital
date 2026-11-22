/* São João Digital — cupons (copiar código, ocultar vencidos) e filtro da vitrine */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var d = new Date();
    var hoje = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    document.querySelectorAll('[data-fim]').forEach(function (t) {
      if (t.getAttribute('data-fim') < hoje) { var c = t.closest('.col-12'); if (c) c.hidden = true; }
    });
    document.querySelectorAll('[data-copiar]').forEach(function (b) {
      b.addEventListener('click', function () {
        var cod = b.getAttribute('data-copiar');
        var ok = function () { b.textContent = 'Código copiado'; setTimeout(function () { b.textContent = 'Copiar código'; }, 2200); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(cod).then(ok, function () { b.textContent = cod; });
        else b.textContent = cod;
      });
    });
    var filtros = document.getElementById('vitrine-filtros');
    if (filtros) {
      var itens = [].slice.call(document.querySelectorAll('#vitrine-lista [data-cat]'));
      filtros.addEventListener('click', function (e) {
        var b = e.target.closest('[data-filtro]');
        if (!b) return;
        var f = b.getAttribute('data-filtro');
        filtros.querySelectorAll('button').forEach(function (x) {
          var on = x === b;
          x.className = 'btn btn-sm ' + (on ? 'btn-primary' : 'btn-outline-secondary');
          x.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        itens.forEach(function (i) { i.hidden = !!f && i.getAttribute('data-cat') !== f; });
      });
    }
  });
})();
