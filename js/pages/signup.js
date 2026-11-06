/* signup: 3 steps (account -> verify code -> health details), strength meter, social sign-up, mock session */
(function () {
  'use strict';
  var form = document.getElementById('suForm');
  if (!form) return;
  var N = window.Northcrest;
  var steps = document.querySelectorAll('[data-su-step]'), crumbs = document.querySelectorAll('#suSteps li');
  var title = document.getElementById('auth-title'), sub = document.getElementById('suSub');
  var HEAD = [
    ['Create your patient account', 'Takes about two minutes. Free for every Northcrest patient.'],
    ['Verify your mobile', 'One quick check so we know it is really you.'],
    ['Your health details', 'Almost done. This helps us prepare your first visit.']
  ];
  var account = null;

  function go(n) {
    steps.forEach(function (s) { s.hidden = s.getAttribute('data-su-step') !== String(n); });
    crumbs.forEach(function (li, i) { li.classList.toggle('is-done', i < n - 1); li.classList.toggle('is-current', i === n - 1); });
    title.textContent = HEAD[n - 1][0]; sub.textContent = HEAD[n - 1][1];
    var first = document.querySelector('[data-su-step="' + n + '"] input, [data-su-step="' + n + '"] select');
    if (first && n > 1) first.focus();
    window.scrollTo({ top: 0 });
  }

  var pw = document.getElementById('s-pw'), meter = document.getElementById('pwMeter'), hint = document.getElementById('pwHint');
  var LABELS = ['At least 8 characters, with a letter and a number.', 'Weak: add more characters.', 'Fair: add a number or symbol.', 'Good password.', 'Strong password.'];
  pw.addEventListener('input', function () {
    var v = pw.value, s = 0;
    if (v.length >= 8) s++; if (/[A-Za-z]/.test(v) && /\d/.test(v)) s++; if (v.length >= 12) s++; if (/[^A-Za-z0-9]/.test(v) && /[A-Z]/.test(v)) s++;
    if (!v) s = 0; else if (s === 0) s = 1;
    meter.setAttribute('data-level', String(s)); hint.textContent = LABELS[s];
  });

  form.addEventListener('form:success', function () {
    var f = form.elements;
    account = { first: f['first-name'].value.trim(), last: f['last-name'].value.trim(), email: f.email.value.trim().toLowerCase(), phone: f.phone.value.trim(), password: f['new-password'].value };
    account.name = account.first + ' ' + account.last;
    document.getElementById('verifyEmail').textContent = account.email;
    document.getElementById('verifyPhone').textContent = '+91 ' + account.phone.replace(/(\d{5})(\d{5})/, '$1 $2');
    N.toast('Verification code sent to ' + account.phone, 'info');
    go(2);
  });

  /* 6-digit code */
  var inputs = Array.prototype.slice.call(document.querySelectorAll('.code-input')), codeErr = document.getElementById('codeError');
  inputs.forEach(function (inp, i) {
    inp.addEventListener('input', function () {
      inp.value = inp.value.replace(/\D/g, '').slice(-1);
      inputs.forEach(function (x) { x.removeAttribute('aria-invalid'); }); codeErr.textContent = '';
      if (inp.value && inputs[i + 1]) inputs[i + 1].focus();
    });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && !inp.value && inputs[i - 1]) { inputs[i - 1].focus(); inputs[i - 1].value = ''; }
      if (e.key === 'ArrowLeft' && inputs[i - 1]) inputs[i - 1].focus();
      if (e.key === 'ArrowRight' && inputs[i + 1]) inputs[i + 1].focus();
    });
    inp.addEventListener('paste', function (e) {
      var t = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      if (!t) return; e.preventDefault();
      t.split('').forEach(function (c, k) { if (inputs[k]) inputs[k].value = c; });
      inputs[Math.min(t.length, 5)].focus();
    });
  });
  document.getElementById('verifyForm').addEventListener('form:success', function () {
    var c = inputs.map(function (i) { return i.value; }).join('');
    if (c.length < 6) {
      codeErr.textContent = 'Enter all 6 digits of the code.';
      inputs.forEach(function (x) { if (!x.value) x.setAttribute('aria-invalid', 'true'); });
      (inputs.filter(function (x) { return !x.value; })[0] || inputs[0]).focus(); return;
    }
    N.toast('Mobile number verified', 'ok');
    go(3);
  });
  document.getElementById('resendCode').addEventListener('click', function (e) {
    var b = e.currentTarget, n = 30; if (b.disabled) return;
    b.disabled = true; N.toast('A new code is on its way', 'info');
    b.textContent = 'Resend code in ' + n + 's';
    var t = setInterval(function () { n--; b.textContent = n > 0 ? 'Resend code in ' + n + 's' : 'Resend code'; if (n <= 0) { clearInterval(t); b.disabled = false; } }, 1000);
  });
  document.querySelector('[data-su-back]').addEventListener('click', function () { go(1); form.elements.email.focus(); });

  /* step 3 */
  var dob = document.getElementById('p-dob');
  dob.max = new Date().toISOString().slice(0, 10);
  document.getElementById('prefChips').addEventListener('click', function (e) {
    var c = e.target.closest('.chip'); if (!c) return;
    this.querySelectorAll('.chip').forEach(function (x) { var on = x === c; x.setAttribute('aria-pressed', String(on)); x.setAttribute('aria-checked', String(on)); });
  });
  var pref = document.getElementById('prefForm');
  pref.addEventListener('submit', function (e) {
    if (dob.value && dob.value > dob.max) {
      e.preventDefault(); e.stopImmediatePropagation();
      dob.setAttribute('aria-invalid', 'true'); N.toast('Date of birth cannot be in the future.', 'error'); dob.focus();
    }
  }, true);
  function finish(skip) {
    var accs = []; try { accs = JSON.parse(localStorage.getItem('northcrest-accounts')) || []; } catch (e) { /* noop */ }
    accs = accs.filter(function (a) { return a.email !== account.email; });
    accs.push({ email: account.email, password: account.password, name: account.name });
    var f = pref.elements;
    try {
      localStorage.setItem('northcrest-accounts', JSON.stringify(accs));
      localStorage.setItem('northcrest-profile', JSON.stringify({ first: account.first, last: account.last, email: account.email, phone: account.phone,
        dob: skip ? '' : f.dob.value, gender: skip ? '' : f.gender.value, bloodGroup: skip ? '' : f['blood-group'].value, uhid: skip || !f.uhid.value.trim() ? '' : 'UHID ' + f.uhid.value.trim(),
        patientId: 'NCH-' + Math.floor(205000 + Math.random() * 900), passwordChanged: new Date().toISOString().slice(0, 10) }));
      localStorage.setItem('northcrest-notify', JSON.stringify({ apptSms: skip ? true : f.sms.checked, apptEmail: true, reports: skip ? true : f.reports.checked, meds: true, bills: true, whatsapp: false, news: false }));
    } catch (e) { /* noop */ }
    N.session.login(account.name, account.email);
    N.toast('Account created. Welcome to Northcrest, ' + account.first + '.', 'ok');
    setTimeout(function () { location.href = 'dashboard.html'; }, 800);
  }
  pref.addEventListener('form:success', function () { if (account) finish(false); });
  document.getElementById('skipPref').addEventListener('click', function () { if (account) finish(true); });

  /* social sign-up */
  document.querySelectorAll('[data-social]').forEach(function (b) {
    b.addEventListener('click', function () {
      var who = b.getAttribute('data-social');
      document.querySelectorAll('[data-social]').forEach(function (x) { x.disabled = true; });
      N.toast('Connecting to ' + who + '... (demo sign-up)', 'info');
      setTimeout(function () { try { localStorage.removeItem('northcrest-profile'); } catch (e) { /* noop */ } N.session.login('Priya Raman', 'priya.raman@example.com'); location.href = 'dashboard.html'; }, 900);
    });
  });
})();
