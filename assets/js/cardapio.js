/* São João Digital — Cardápio digital: carrinho e pedido.
 * Com o back-end PHP: grava o pedido em /api/pedido.php (preços conferidos no servidor) e abre o WhatsApp.
 * Sem back-end: monta a mensagem e abre apenas o WhatsApp.
 */
(function () {
  'use strict';
  var brl = function (n) { return 'R$ ' + n.toFixed(2).replace('.', ','); };

  document.addEventListener('DOMContentLoaded', function () {
    var box = document.getElementById('pedido');
    if (!box) return;
    var slug = box.getAttribute('data-slug');
    var qtd = {}, info = {};
    var lista = document.getElementById('ped-itens'), total = document.getElementById('ped-total');
    var form = document.getElementById('ped-form'), erro = document.getElementById('p-erro'), btn = form.querySelector('button[type=submit]');

    var dia = document.getElementById('cardapio-dia');
    if (dia) {
      var w = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'long' }).format(new Date());
      var li = dia.querySelector('[data-dow="' + w + '"]');
      if (li) { li.classList.add('fw-bold'); li.insertAdjacentText('afterbegin', 'Hoje → '); }
    }

    document.querySelectorAll('.qty').forEach(function (q) {
      var id = q.getAttribute('data-id');
      info[id] = { nome: q.getAttribute('data-nome'), preco: parseFloat(q.getAttribute('data-preco')) };
      qtd[id] = 0;
      q.addEventListener('click', function (ev) {
        var b = ev.target.closest('button'); if (!b) return;
        qtd[id] = Math.max(0, Math.min(99, qtd[id] + (b.getAttribute('data-act') === 'mais' ? 1 : -1)));
        q.querySelector('output').textContent = qtd[id];
        render();
      });
    });

    function render() {
      var soma = 0, n = 0;
      lista.textContent = '';
      Object.keys(qtd).forEach(function (id) {
        if (!qtd[id]) return;
        n++; soma += qtd[id] * info[id].preco;
        var li = document.createElement('li');
        li.textContent = qtd[id] + '× ' + info[id].nome + ' — ' + brl(qtd[id] * info[id].preco);
        lista.appendChild(li);
      });
      if (!n) { var v = document.createElement('li'); v.className = 'text-secondary'; v.textContent = 'Nenhum item ainda.'; lista.appendChild(v); }
      total.textContent = brl(soma);
      return soma;
    }

    var tipo = document.getElementById('p-tipo'), endBox = document.getElementById('p-end-box');
    tipo.addEventListener('change', function () { endBox.hidden = tipo.value !== 'Entrega'; });
    function abrirWhats(url) { if (url) { var win = window.open(url, '_blank'); if (win) win.opener = null; } }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var soma = render(), nome = document.getElementById('p-nome').value.trim(), end = document.getElementById('p-end').value.trim();
      var msg = '';
      if (!soma) msg = 'Adicione ao menos um item.';
      else if (!nome) msg = 'Informe seu nome.';
      else if (tipo.value === 'Entrega' && !end) msg = 'Informe o endereço de entrega.';
      else if (!document.getElementById('p-ok').checked) msg = 'Aceite o uso dos dados para enviar o pedido.';
      erro.hidden = !msg; erro.className = 'text-danger small'; erro.textContent = msg;
      if (msg) return;

      var pag = document.getElementById('p-pag').value, obs = document.getElementById('p-obs').value.trim();
      var linhas = ['Olá, ' + box.getAttribute('data-empresa') + '! Pedido feito pelo São João Digital:', ''];
      var itens = [];
      Object.keys(qtd).forEach(function (id) { if (qtd[id]) { itens.push({ id: +id, qtd: qtd[id] }); linhas.push(qtd[id] + 'x ' + info[id].nome + ' (' + brl(qtd[id] * info[id].preco) + ')'); } });
      linhas.push('', 'Total dos itens: ' + brl(soma), 'Nome: ' + nome, 'Receber: ' + tipo.value + (tipo.value === 'Entrega' ? ' — ' + end : ''), 'Pagamento: ' + pag);
      if (obs) linhas.push('Obs: ' + obs);
      var fallback = 'https://wa.me/' + String(box.getAttribute('data-wa') || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(linhas.join('\n'));

      btn.disabled = true;
      fetch('/api/pedido.php', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slug, itens: itens, nome: nome, tipo: tipo.value, endereco: end, pagamento: pag, obs: obs, consentimento: true, website: document.getElementById('p-site').value })
      }).then(function (r) { return r.json(); })
        .then(function (j) {
          if (j && j.ok) { erro.hidden = false; erro.className = 'text-success small'; erro.textContent = 'Pedido #' + j.pedido + ' registrado. Abrindo o WhatsApp…'; abrirWhats(j.whatsapp_url); }
          else { erro.hidden = false; erro.className = 'text-danger small'; erro.textContent = (j && j.erro) || 'Não foi possível registrar o pedido.'; }
        })
        .catch(function () { abrirWhats(fallback); })
        .then(function () { btn.disabled = false; });
    });
  });
})();
