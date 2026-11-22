/* São João Digital — Agendamento: calcula horários livres pelo horário de funcionamento e envia a solicitação pelo WhatsApp */
(function () {
  'use strict';
  var SJD = window.SJD;
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var mins = function (hhmm) { var p = hhmm.split(':'); return +p[0] * 60 + +p[1]; };
  var fmt = function (m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
  var DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function agoraSP() {
    var p = {};
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { data: p.year + '-' + p.month + '-' + p.day, min: (parseInt(p.hour, 10) % 24) * 60 + parseInt(p.minute, 10) };
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('ag-form');
    if (!form) return;
    var slug = form.getAttribute('data-slug');
    var serv = document.getElementById('a-serv'), data = document.getElementById('a-data'), hora = document.getElementById('a-hora');
    var aviso = document.getElementById('a-aviso'), erro = document.getElementById('a-erro'), emp = null;

    SJD.json('empresas').then(function (j) {
      emp = j.empresas.filter(function (x) { return x.slug === slug; })[0];
      if (!emp) return;
      var a = emp.agendamento, hoje = agoraSP().data;
      var max = new Date(hoje + 'T12:00:00'); max.setDate(max.getDate() + a.dias_a_frente);
      data.min = hoje; data.max = max.toISOString().slice(0, 10);
      serv.addEventListener('change', slots); data.addEventListener('change', slots);
    }).catch(function () { aviso.textContent = 'Não foi possível carregar os horários. Fale direto pelo WhatsApp.'; });

    function slots() {
      hora.textContent = '';
      aviso.textContent = '';
      if (!emp || !data.value) return;
      var a = emp.agendamento, s = a.servicos[+serv.value], ag = agoraSP();
      var dow = DOW[new Date(data.value + 'T12:00:00').getDay()];
      var janelas = emp.horario.filter(function (h) { return h.dow.indexOf(dow) > -1; });
      var lista = [];
      janelas.forEach(function (h) {
        for (var m = mins(h.abre); m + s.duracao_min <= mins(h.fecha); m += a.passo_min) {
          if (data.value === ag.data && m < ag.min + a.antecedencia_horas * 60) continue; // respeita antecedência mínima
          lista.push(m);
        }
      });
      if (!lista.length) {
        var o = document.createElement('option'); o.value = ''; o.textContent = 'Sem horários neste dia'; hora.appendChild(o);
        aviso.textContent = janelas.length ? 'Não há mais horários livres neste dia. Escolha outra data.' : emp.nome + ' não atende neste dia da semana.';
        return;
      }
      var p = document.createElement('option'); p.value = ''; p.textContent = 'Escolha um horário'; hora.appendChild(p);
      lista.forEach(function (m) { var o = document.createElement('option'); o.value = fmt(m); o.textContent = fmt(m); hora.appendChild(o); });
      aviso.textContent = 'Horários calculados pelo funcionamento da empresa; a confirmação final é dela.';
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!emp) return;
      var s = emp.agendamento.servicos[+serv.value];
      var nome = document.getElementById('a-nome').value.trim(), tel = document.getElementById('a-tel').value.replace(/\D/g, '');
      var msg = '';
      if (!data.value) msg = 'Escolha a data.';
      else if (!hora.value) msg = 'Escolha o horário.';
      else if (!nome) msg = 'Informe seu nome.';
      else if (tel.length < 10 || tel.length > 11) msg = 'Informe um WhatsApp válido com DDD.';
      erro.hidden = !msg; erro.textContent = msg;
      if (msg) return;
      var d = data.value.split('-');
      var obs = document.getElementById('a-obs').value.trim();
      var texto = ['Olá, ' + emp.nome + '! Gostaria de agendar pelo São João Digital:', '',
        'Serviço: ' + s.nome, 'Data: ' + d[2] + '/' + d[1] + '/' + d[0] + ' às ' + hora.value,
        'Nome: ' + nome, 'Meu WhatsApp: ' + document.getElementById('a-tel').value.trim()].concat(obs ? ['Obs: ' + obs] : []).concat(['', 'Aguardo a confirmação, obrigado!']).join('\n');
      window.open('https://wa.me/' + String(emp.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
    });
  });
})();
