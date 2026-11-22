/* Painel administrativo: confirmação de ações destrutivas (sem JavaScript inline, por causa da CSP) */
document.addEventListener('submit', function (ev) {
  var f = ev.target, msg = f.getAttribute && f.getAttribute('data-confirm');
  if (msg && !window.confirm(msg)) ev.preventDefault();
});
