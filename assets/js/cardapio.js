/* São João Digital — Cardápio digital: carrinho e envio do pedido pelo WhatsApp (nada é armazenado) */
(function () {
  'use strict';
  var brl = function (n) { return 'R$ ' + n.toFixed(2).replace('.', ','); };

  document.addEventListener('DOMContentLoaded', function () {
    var box = document.getElementById('pedido');
    if (!box) return;
    var qtd = {}, info = {};
    var lista = document.getElementById('ped-itens'), total = document.getElementById('ped-total');
    var form = document.getElementById('ped-form'), erro = document.getElementById('p-erro');

    // Destaca o prato do dia (fuso de São Paulo)
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
        var d = b.getAttribute('data-act') === 'mais' ? 1 : -1;
        qtd[id] = Math.max(0, Math.min(99, qtd[id] + d));
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

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var soma = render(), nome = document.getElementById('p-nome').value.trim(), end = document.getElementById('p-end').value.trim();
      var msg = '';
      if (!soma) msg = 'Adicione ao menos um item.';
      else if (!nome) msg = 'Informe seu nome.';
      else if (tipo.value === 'Entrega' && !end) msg = 'Informe o endereço de entrega.';
      erro.hidden = !msg; erro.textContent = msg;
      if (msg) return;
      var linhas = ['Olá, ' + box.getAttribute('data-empresa') + '! Pedido feito pelo São João Digital:', ''];
      Object.keys(qtd).forEach(function (id) { if (qtd[id]) linhas.push(qtd[id] + 'x ' + info[id].nome + ' (' + brl(qtd[id] * info[id].preco) + ')'); });
      linhas.push('', 'Total dos itens: ' + brl(soma), 'Nome: ' + nome, 'Receber: ' + tipo.value + (tipo.value === 'Entrega' ? ' — ' + end : ''), 'Pagamento: ' + document.getElementById('p-pag').value);
      var obs = document.getElementById('p-obs').value.trim(); if (obs) linhas.push('Obs: ' + obs);
      var num = String(box.getAttribute('data-wa') || '').replace(/\D/g, '');
      window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(linhas.join('\n')), '_blank', 'noopener');
    });
  });
})();
