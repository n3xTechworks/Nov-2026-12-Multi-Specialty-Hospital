/* reset-password: strength meter, matching confirmation, done state */
(function () {
  'use strict';
  var form = document.getElementById('rpForm');
  if (!form) return;
  var N = window.Northcrest, pw = document.getElementById('rp-pw'), meter = document.getElementById('pwMeter'), hint = document.getElementById('pwHint');
  var LABELS = ['At least 8 characters, with a letter and a number.', 'Weak: add more characters.', 'Fair: add a number or symbol.', 'Good password.', 'Strong password.'];
  pw.addEventListener('input', function () {
    var v = pw.value, s = 0;
    if (v.length >= 8) s++; if (/[A-Za-z]/.test(v) && /\d/.test(v)) s++; if (v.length >= 12) s++; if (/[^A-Za-z0-9]/.test(v) && /[A-Z]/.test(v)) s++;
    if (!v) s = 0; else if (s === 0) s = 1;
    meter.setAttribute('data-level', String(s)); hint.textContent = LABELS[s];
  });
  form.addEventListener('form:success', function () {
    document.querySelector('[data-rp="form"]').hidden = true;
    document.querySelector('[data-rp="done"]').hidden = false;
    N.toast('Password updated', 'ok');
    try { var p = JSON.parse(localStorage.getItem('northcrest-profile') || 'null'); if (p) { p.passwordChanged = new Date().toISOString().slice(0, 10); localStorage.setItem('northcrest-profile', JSON.stringify(p)); } } catch (e) { /* noop */ }
    document.querySelector('[data-rp="done"] a').focus();
  });
})();
