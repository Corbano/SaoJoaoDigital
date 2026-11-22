/* São João Digital — Agendamento
 * Com o back-end PHP ativo: horários livres vêm de /api/horarios.php (já sem os ocupados) e a solicitação é gravada
 * em /api/agendamento.php antes de abrir o WhatsApp. Sem back-end (hospedagem só estática): calcula pelo horário de
 * funcionamento e envia apenas pelo WhatsApp.
 */
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
    var aviso = document.getElementById('a-aviso'), erro = document.getElementById('a-erro'), btn = form.querySelector('button[type=submit]');
    var emp = null, apiOk = true;

    SJD.json('empresas').then(function (j) {
      emp = j.empresas.filter(function (x) { return x.slug === slug; })[0];
      if (!emp) return;
      var a = emp.agendamento, hoje = agoraSP().data;
      var max = new Date(hoje + 'T12:00:00'); max.setDate(max.getDate() + a.dias_a_frente);
      data.min = hoje; data.max = max.toISOString().slice(0, 10);
      serv.addEventListener('change', carregar); data.addEventListener('change', carregar);
    }).catch(function () { aviso.textContent = 'Não foi possível carregar os horários. Fale direto pelo WhatsApp.'; });

    function preencher(lista, msgVazio) {
      hora.textContent = '';
      var p = document.createElement('option'); p.value = '';
      if (!lista.length) { p.textContent = 'Sem horários neste dia'; hora.appendChild(p); aviso.textContent = msgVazio; return; }
      p.textContent = 'Escolha um horário'; hora.appendChild(p);
      lista.forEach(function (h) { var o = document.createElement('option'); o.value = h; o.textContent = h; hora.appendChild(o); });
      aviso.textContent = apiOk ? 'Horários livres agora. A confirmação final é da empresa.' : 'Horários pelo funcionamento da empresa; a confirmação final é dela.';
    }

    function calcularLocal() {
      var a = emp.agendamento, s = a.servicos[+serv.value], ag = agoraSP();
      var dow = DOW[new Date(data.value + 'T12:00:00').getDay()];
      var janelas = emp.horario.filter(function (h) { return h.dow.indexOf(dow) > -1; }), lista = [];
      janelas.forEach(function (h) {
        for (var m = mins(h.abre); m + s.duracao_min <= mins(h.fecha); m += a.passo_min) {
          if (data.value === ag.data && m < ag.min + a.antecedencia_horas * 60) continue;
          lista.push(fmt(m));
        }
      });
      preencher(lista, janelas.length ? 'Não há mais horários livres neste dia. Escolha outra data.' : emp.nome + ' não atende neste dia da semana.');
    }

    function carregar() {
      hora.textContent = ''; aviso.textContent = '';
      if (!emp || !data.value) return;
      var url = '/api/horarios.php?slug=' + encodeURIComponent(slug) + '&servico=' + encodeURIComponent(serv.value) + '&data=' + encodeURIComponent(data.value);
      fetch(url, { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (j) { apiOk = true; preencher(j.horarios, 'Não há horários livres neste dia (ou a empresa não atende). Escolha outra data.'); })
        .catch(function () { apiOk = false; calcularLocal(); });
    }

    function abrirWhats(url) { if (url) { var w = window.open(url, '_blank'); if (w) w.opener = null; } }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!emp) return;
      var s = emp.agendamento.servicos[+serv.value];
      var nome = document.getElementById('a-nome').value.trim(), telRaw = document.getElementById('a-tel').value.trim(), tel = telRaw.replace(/\D/g, '');
      var cons = document.getElementById('a-ok').checked, obs = document.getElementById('a-obs').value.trim();
      var msg = '';
      if (!data.value) msg = 'Escolha a data.';
      else if (!hora.value) msg = 'Escolha o horário.';
      else if (!nome) msg = 'Informe seu nome.';
      else if (tel.length < 10 || tel.length > 11) msg = 'Informe um WhatsApp válido com DDD.';
      else if (!cons) msg = 'Aceite o uso dos dados para enviar a solicitação.';
      erro.hidden = !msg; erro.textContent = msg;
      if (msg) return;

      btn.disabled = true;
      var d = data.value.split('-');
      var textoLocal = ['Olá, ' + emp.nome + '! Gostaria de agendar pelo São João Digital:', '', 'Serviço: ' + s.nome, 'Data: ' + d[2] + '/' + d[1] + '/' + d[0] + ' às ' + hora.value,
        'Nome: ' + nome, 'Meu WhatsApp: ' + telRaw].concat(obs ? ['Obs: ' + obs] : []).concat(['', 'Aguardo a confirmação, obrigado!']).join('\n');
      var fallback = 'https://wa.me/' + String(emp.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent(textoLocal);

      fetch('/api/agendamento.php', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slug, servico: +serv.value, data: data.value, horario: hora.value, nome: nome, telefone: telRaw, obs: obs, consentimento: true, website: document.getElementById('a-site').value })
      }).then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); })
        .then(function (x) {
          if (x.j && x.j.ok) {
            erro.hidden = false; erro.className = 'text-success small'; erro.textContent = 'Solicitação registrada (protocolo #' + (x.j.protocolo || '') + '). Abrindo o WhatsApp para confirmar com a empresa…';
            abrirWhats(x.j.whatsapp_url); carregar();
          } else {
            erro.hidden = false; erro.className = 'text-danger small'; erro.textContent = (x.j && x.j.erro) || 'Não foi possível registrar.';
            if (x.s === 409) carregar();
          }
        })
        .catch(function () { abrirWhats(fallback); }) // sem back-end: segue só pelo WhatsApp
        .then(function () { btn.disabled = false; });
    });
  });
})();
