/* forgot-password: validated email, sent state, resend countdown */
(function () {
  'use strict';
  var form = document.getElementById('fpForm');
  if (!form) return;
  var N = window.Northcrest, formPane = document.querySelector('[data-fp="form"]'), sent = document.querySelector('[data-fp="sent"]');
  form.addEventListener('form:success', function () {
    var btn = document.getElementById('fpBtn');
    btn.classList.add('is-busy'); btn.textContent = 'Sending...';
    setTimeout(function () {
      document.getElementById('fpEmail').textContent = form.elements.email.value.trim().toLowerCase();
      formPane.hidden = true; sent.hidden = false;
      N.toast('Reset link sent', 'ok');
      var link = sent.querySelector('a'); if (link) link.focus();
    }, 600);
  });
  document.getElementById('fpResend').addEventListener('click', function (e) {
    var b = e.currentTarget, n = 30; b.disabled = true;
    N.toast('We sent the email again', 'info');
    b.textContent = 'Resend in ' + n + 's';
    var t = setInterval(function () { n--; b.textContent = n > 0 ? 'Resend in ' + n + 's' : 'Resend email'; if (n <= 0) { clearInterval(t); b.disabled = false; } }, 1000);
  });
})();
