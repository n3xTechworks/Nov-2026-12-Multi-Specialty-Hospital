/* Doctors: department chips (site.js) + search box (?q= and ?dept=) + profile modal */
(function () {
  var N = window.Northcrest || {};
  var grid = document.getElementById('docGrid');
  if (!grid) return;
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.doctor-card'));
  var form = document.getElementById('docSearch');
  var input = document.getElementById('doc-q');
  var bar = document.querySelector('[data-filter-group="#docGrid"]');
  var count = document.getElementById('docCount');
  var empty = document.getElementById('docEmpty');
  var emptyText = document.getElementById('docEmptyText');
  var params = new URLSearchParams(location.search);
  // richer search index: card text + bio, languages, department conditions and procedures (so "knee" or "stroke" finds the right doctors)
  var extra = {};
  cards.forEach(function (c) {
    var d = N.doctorById && N.doctorById(c.id);
    var dep = d && N.deptBySlug ? N.deptBySlug(d.department) : null;
    var bits = [c.getAttribute('data-search') || ''];
    if (d) bits.push(d.bio, d.languages.join(' '), d.opd.join(' '));
    if (dep) bits.push(dep.tagline || '', dep.summary || '', (dep.conditions || []).join(' '), (dep.procedures || []).map(function (x) { return x[0]; }).join(' '));
    extra[c.id] = bits.join(' ').toLowerCase();
  });
  var deptParam = (params.get('dept') || '').toLowerCase().replace(/[^a-z-]/g, '');

  function activeDept() {
    var c = bar && bar.querySelector('[aria-pressed="true"]');
    return c ? c.getAttribute('data-filter') : 'all';
  }
  function apply() {
    var dept = activeDept();
    var words = (input.value || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
    var shown = 0;
    cards.forEach(function (c) {
      var hay = extra[c.id] || c.getAttribute('data-search') || '';
      var okDept = dept === 'all' || (c.getAttribute('data-group') || '').split(/\s+/).indexOf(dept) > -1;
      var okText = words.every(function (w) { return hay.indexOf(w) > -1; });
      var on = okDept && okText;
      c.hidden = !on;
      if (on) shown++;
    });
    count.textContent = shown === 1 ? 'Showing 1 doctor' : 'Showing ' + shown + ' doctors';
    empty.hidden = shown > 0;
    if (!shown) {
      var d = N.deptBySlug && dept !== 'all' ? N.deptBySlug(dept) : null;
      emptyText.textContent = (input.value ? 'No match for "' + input.value + '"' + (d ? ' in ' + d.name : '') + '. ' : '') + 'Try another name or condition, or ask our helpline to find the right specialist.';
    }
  }
  // chip clicks: site.js filters by department first, then we intersect with the search text
  grid.addEventListener('filter:change', apply);
  input.addEventListener('input', apply);
  form.addEventListener('submit', function (e) {
    e.preventDefault(); e.stopImmediatePropagation(); apply();
    var u = new URL(location.href);
    if (input.value.trim()) u.searchParams.set('q', input.value.trim()); else u.searchParams.delete('q');
    history.replaceState(null, '', u);
  }, true);
  grid.addEventListener('filter:change', function (e) {
    var u = new URL(location.href);
    if (e.detail && e.detail.key && e.detail.key !== 'all') u.searchParams.set('dept', e.detail.key); else u.searchParams.delete('dept');
    history.replaceState(null, '', u);
  });
  document.getElementById('docReset').addEventListener('click', function () {
    input.value = '';
    var all = bar.querySelector('[data-filter="all"]');
    if (all) all.click(); else apply();
    input.focus();
  });

  // initial state from the URL (Home search panel sends ?q=&dept=)
  if (params.get('q')) input.value = params.get('q');
  if (deptParam) {
    var chip = bar.querySelector('[data-filter="' + deptParam + '"]');
    if (chip) chip.click();
    else {
      // department without listed doctors: show the empty state with a helpful message
      bar.querySelectorAll('[data-filter]').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
      cards.forEach(function (c) { c.hidden = true; });
      count.textContent = 'Showing 0 doctors';
      empty.hidden = false;
      var dd = N.deptBySlug ? N.deptBySlug(deptParam) : null;
      emptyText.textContent = (dd ? dd.name + ' consultants are booked through the OPD desk. ' : '') + 'Request an appointment on the contact page or show all doctors.';
    }
  } else apply();
  if (deptParam || params.get('q')) {
    var dir = document.getElementById('directory');
    if (dir && !location.hash) setTimeout(function () { dir.scrollIntoView({ block: 'start' }); }, 50);
  }

  // highlight a card linked as doctors.html#doc-N
  function flash() {
    var id = location.hash.slice(1);
    var c = id && document.getElementById(id);
    if (c && c.classList.contains('doctor-card')) {
      if (c.hidden) { input.value = ''; var all = bar.querySelector('[data-filter="all"]'); if (all) all.click(); }
      c.classList.add('is-target');
      setTimeout(function () { c.scrollIntoView({ block: 'center' }); }, 60);
      setTimeout(function () { c.classList.remove('is-target'); }, 2600);
    }
  }
  flash();
  window.addEventListener('hashchange', flash);

  // profile modal
  var esc = N.esc || function (s) { return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); };
  function $(id) { return document.getElementById(id); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-doctor-profile]');
    if (!b || !N.doctorById) return;
    var d = N.doctorById(b.getAttribute('data-doctor-profile'));
    if (!d) return;
    var dept = N.deptBySlug(d.department) || { name: d.department, page: 'departments.html' };
    $('dm-photo').innerHTML = '<img class="dm-photo" src="images/' + d.id + '-160.webp" width="160" height="160" alt="' + esc(d.name) + '" decoding="async">';
    $('dm-name').textContent = d.name;
    $('dm-title').textContent = d.title + ', ' + dept.name;
    $('dm-chips').innerHTML = d.qualifications.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('');
    var fee = N.fmtPrice ? N.fmtPrice(d.fee) : '₹' + d.fee;
    $('dm-facts').innerHTML = [
      ['Experience', d.experience + ' years'], ['Consultation fee', fee],
      ['OPD days', d.opd.join(', ')], ['OPD time', d.opdTime],
      ['Languages', d.languages.join(', ')], ['Rating', d.rating + ' / 5 (' + d.reviews + ' reviews)']
    ].map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('');
    $('dm-bio').textContent = d.bio;
    $('dm-edu').innerHTML = d.education.map(function (x) { return '<li><strong>' + esc(x[0]) + '</strong><span>' + esc(x[1]) + ', <span class="ltr-num">' + esc(x[2]) + '</span></span></li>'; }).join('');
    $('dm-awards').innerHTML = (d.awards || []).map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('');
    $('dm-book').href = 'dashboard-appointments.html?doctor=' + d.id;
    $('dm-book').innerHTML = 'Book with ' + esc(d.name.replace(/^Dr /, 'Dr '));
    var dh = dept.detail ? dept.page : 'contact.html?dept=' + d.department + '#appointment';
    $('dm-dept').href = dh;
    $('dm-dept').textContent = dept.detail ? 'View ' + dept.name : 'Request appointment';
    N.openModal('doctorModal', b);
  });
})();
