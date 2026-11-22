/* São João Digital — formulário de cadastro de empresa (envia para /api/cadastro.php) */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('cad-form');
    if (!form) return;
    var cat = document.getElementById('c-cat'), sub = document.getElementById('c-sub'), msg = document.getElementById('c-msg'), btn = form.querySelector('button[type=submit]');
    var cats = null;

    function aviso(texto, ok) { msg.hidden = false; msg.className = 'small ' + (ok ? 'text-success' : 'text-danger'); msg.textContent = texto; }

    cat.addEventListener('change', function () {
      sub.textContent = '';
      var o = document.createElement('option'); o.value = ''; o.textContent = 'Escolha…'; sub.appendChild(o);
      if (!cat.value) { sub.disabled = true; return; }
      (cats ? Promise.resolve(cats) : window.SJD.json('categorias').then(function (j) { cats = j.categorias; return cats; })).then(function (lista) {
        var c = lista.filter(function (x) { return x.slug === cat.value; })[0];
        (c ? c.subcategorias : []).forEach(function (s) { var op = document.createElement('option'); op.value = s.slug; op.textContent = s.nome; sub.appendChild(op); });
        sub.disabled = false;
      });
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var v = function (id) { return document.getElementById(id).value.trim(); };
      if (!v('c-nome') || !cat.value || !v('c-resp') || !v('c-email') || !v('c-tel')) return aviso('Preencha os campos obrigatórios (*).', false);
      if (!document.getElementById('c-ok').checked) return aviso('Aceite o uso dos dados para enviar o cadastro.', false);
      btn.disabled = true;
      fetch('/api/cadastro.php', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome_empresa: v('c-nome'), categoria: cat.value, subcategoria: sub.value, responsavel: v('c-resp'), email: v('c-email'), telefone: v('c-tel'), whatsapp: v('c-wa'), endereco: v('c-end'), descricao: v('c-desc'), consentimento: true, website: v('c-site') })
      }).then(function (r) { return r.json(); })
        .then(function (j) { if (j && j.ok) { aviso(j.mensagem || 'Cadastro recebido!', true); form.reset(); } else aviso((j && j.erro) || 'Não foi possível enviar.', false); })
        .catch(function () { aviso('Serviço indisponível no momento. Tente novamente mais tarde.', false); })
        .then(function () { btn.disabled = false; });
    });
  });
})();
