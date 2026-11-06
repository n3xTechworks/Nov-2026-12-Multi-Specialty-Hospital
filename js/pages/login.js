/* login: validated email + password, demo account, remember me, social sign-in (mock session) */
(function () {
  'use strict';
  var form = document.getElementById('loginForm');
  if (!form) return;
  var N = window.Northcrest;
  var err = document.getElementById('login-error'), email = document.getElementById('l-email'), pw = document.getElementById('l-pw'), btn = document.getElementById('loginBtn');
  var DEMO = { email: 'priya.raman@example.com', password: 'Northcrest123', name: 'Priya Raman' };

  function accounts() { try { return JSON.parse(localStorage.getItem('northcrest-accounts')) || []; } catch (e) { return []; } }
  function check(e, p) {
    e = e.trim().toLowerCase();
    if (p === 'wrongpass') return null;
    if (e === DEMO.email) return DEMO.name;
    var acc = accounts().filter(function (a) { return a.email === e; })[0];
    if (acc) return acc.password === p ? acc.name : null;
    return e.split('@')[0].replace(/[._-]+/g, ' ').replace(/\d+/g, '').trim().replace(/\b\w/g, function (c) { return c.toUpperCase(); }) || 'Patient';
  }
  function showError(msg) { err.querySelector('[data-error-text]').textContent = msg; err.hidden = false; pw.setAttribute('aria-invalid', 'true'); }
  function clearError() { err.hidden = true; }
  [email, pw].forEach(function (f) { f.addEventListener('input', clearError); });

  try { var rem = localStorage.getItem('northcrest-remember'); if (rem) { email.value = rem; document.getElementById('l-remember').checked = true; } } catch (e) { /* noop */ }

  document.getElementById('useDemo').addEventListener('click', function () {
    email.value = DEMO.email; pw.value = DEMO.password; clearError();
    email.removeAttribute('aria-invalid'); pw.removeAttribute('aria-invalid');
    N.toast('Demo details filled in. Press Log in.', 'info');
    btn.focus();
  });

  function go(name, mail) {
    N.session.login(name, mail);
    N.toast('Welcome back, ' + name.split(' ')[0] + '. Opening your dashboard.', 'ok');
    var next = new URLSearchParams(location.search).get('next');
    setTimeout(function () { location.href = (next && /^dashboard[\w-]*\.html$/.test(next)) ? next : 'dashboard.html'; }, 700);
  }

  form.addEventListener('form:success', function () {
    var mail = email.value.trim().toLowerCase(), name = check(mail, pw.value);
    if (!name) { showError('That email and password do not match. Check them, or reset your password.'); pw.focus(); pw.select(); return; }
    clearError();
    try {
      if (document.getElementById('l-remember').checked) localStorage.setItem('northcrest-remember', mail); else localStorage.removeItem('northcrest-remember');
      if (mail !== DEMO.email) {
        var p = JSON.parse(localStorage.getItem('northcrest-profile') || 'null'), parts = name.split(' ');
        if (!p || p.email !== mail) localStorage.setItem('northcrest-profile', JSON.stringify({ first: parts[0], last: parts.slice(1).join(' ') || 'Patient', email: mail, phone: '', patientId: 'NCH-' + Math.floor(205000 + Math.random() * 900) }));
      } else {
        var q = JSON.parse(localStorage.getItem('northcrest-profile') || 'null');
        if (q && q.email !== DEMO.email) localStorage.removeItem('northcrest-profile');
      }
    } catch (e) { /* noop */ }
    btn.classList.add('is-busy'); btn.textContent = 'Signing in...';
    go(name, mail);
  });

  document.querySelectorAll('[data-social]').forEach(function (b) {
    b.addEventListener('click', function () {
      var who = b.getAttribute('data-social');
      document.querySelectorAll('[data-social]').forEach(function (x) { x.disabled = true; });
      b.classList.add('is-busy');
      N.toast('Connecting to ' + who + '... (demo sign-in)', 'info');
      setTimeout(function () { try { localStorage.removeItem('northcrest-profile'); } catch (e) { /* noop */ } go(DEMO.name, DEMO.email); }, 900);
    });
  });
})();
