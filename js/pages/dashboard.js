/* dashboard (overview): greeting, quick actions, next appointment, outstanding bills, recent reports, active prescriptions, health trends */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var D = window.NorthcrestData, T = window.Northcrest;
    if (!D || !T) return;
    var E = D.esc, p = D.profile(), $ = function (id) { return document.getElementById(id); };

    var h = new Date().getHours();
    $('greet').textContent = (h < 12 ? 'Good morning, ' : h < 17 ? 'Good afternoon, ' : 'Good evening, ') + p.first;
    $('greetSub').textContent = 'Patient ID ' + (p.patientId || 'pending') + (p.uhid ? ' · ' + p.uhid : '') + '. Here is a summary of your care at Northcrest.';
    document.querySelector('.ov-avatar').alt = p.first + ' ' + p.last;

    /* next appointment */
    function rel(date) { var n = Math.round((D.parse(date) - D.parse(D.today())) / 864e5); return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : 'In ' + n + ' days'; }
    function renderNext() {
      var a = D.upcoming()[0], box = $('nextAppt');
      if (!a) {
        $('nextStatus').innerHTML = '';
        box.innerHTML = '<div class="empty empty--slim"><h3>No upcoming appointments</h3><p>Book a consultation with any of our specialists.</p><a class="btn btn-primary btn-sm" href="dashboard-appointments.html#book">Book appointment</a></div>';
        return;
      }
      var d = D.parse(a.date), doc = D.doctor(a.doctor), video = a.type === 'video';
      $('nextStatus').innerHTML = D.statusHtml('confirmed');
      box.innerHTML = '<div class="next-when"><div class="next-date"><small>' + D.DAYS[d.getDay()] + '</small><strong>' + d.getDate() + '</strong><small>' + D.MONTHS[d.getMonth()] + '</small></div>' +
        '<div class="next-info"><p class="countdown">' + rel(a.date) + ' at ' + D.t12(a.time) + '</p><h3>' + E(doc.name) + '</h3><p>' + E(doc.title) + ' · ' + E(D.deptName(doc.department)) + '</p></div></div>' +
        '<div class="next-meta"><span class="badge' + (video ? ' badge--solid' : '') + '">' + (video ? 'Video consultation' : 'In person, OPD') + '</span><span class="badge badge--neutral">Ref ' + E(a.ref) + '</span>' + (a.reason ? '<span class="badge badge--neutral">' + E(a.reason) + '</span>' : '') + '</div>' +
        '<div class="next-actions"><button class="btn btn-secondary btn-sm" type="button" id="nxCal">Add to calendar</button>' +
        (video ? '<button class="btn btn-secondary btn-sm" type="button" id="nxJoin">Test video</button>' : '<button class="btn btn-secondary btn-sm" type="button" id="nxDir">Get directions</button>') +
        '<a class="btn btn-primary btn-sm" href="dashboard-appointments.html#upcoming">Manage</a></div>';
      $('nxCal').addEventListener('click', function () { D.downloadIcs(a); T.toast('Calendar file for ' + D.fmt(a.date, 'day') + ' downloaded', 'ok'); });
      var j = $('nxJoin'); if (j) j.addEventListener('click', function () { T.toast('Camera and microphone look good. The join link opens 15 minutes before your call.', 'ok'); });
      var g = $('nxDir'); if (g) g.addEventListener('click', function () { T.toast('Northcrest OPD: Block A, ground floor. Directions sent to your phone by SMS.', 'info'); });
    }
    renderNext();

    /* bills */
    var due = D.bills().filter(D.isOpen), amt = D.outstanding(), over = due.filter(function (b) { return D.billStatus(b) === 'overdue'; }).length;
    $('billAmt').textContent = D.inr(amt);
    $('billSub').textContent = due.length ? due.length + ' bill' + (due.length > 1 ? 's' : '') + ' to pay after insurance' + (over ? ', ' + over + ' overdue.' : '.') : 'You are all paid up. Thank you.';
    $('qkBill').textContent = due.length ? D.inr(amt) + ' outstanding' : 'Nothing due';
    if (!due.length) { $('billPay').classList.add('btn-secondary'); $('billPay').classList.remove('btn-primary'); $('billPay').textContent = 'View receipts'; $('billPay').href = 'dashboard-billing.html'; }

    /* reports */
    var reps = D.REPORTS.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 4);
    $('qkReports').textContent = D.REPORTS.filter(function (r) { return r.status === 'ready'; }).length + ' reports ready';
    $('repList').innerHTML = reps.map(function (r) {
      var f = D.flagCount(r);
      return '<div class="row-item"><div class="row-lead"><span class="doc-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg></span><div class="row-main"><strong>' + E(r.name) + '</strong><span>' + E(D.TYPE_LABEL[r.type]) + ' · ' + D.fmt(r.date) + '</span></div></div>' +
        '<div class="row-end">' + (r.status !== 'ready' ? D.statusHtml('processing') : f ? D.statusHtml('high', f + ' flagged') : D.statusHtml('ok', 'All normal')) +
        (r.status === 'ready' ? '<a class="btn btn-secondary btn-sm" href="dashboard-reports.html?report=' + r.id + '">View</a>' : '') + '</div></div>';
    }).join('');

    /* prescriptions */
    var SLOT = ['Morning', 'Afternoon', 'Night'];
    $('rxList').innerHTML = D.PRESCRIPTIONS.filter(function (r) { return r.status === 'active'; }).slice(0, 4).map(function (r) {
      var when = r.dose.map(function (n, i) { return n ? SLOT[i] : null; }).filter(Boolean).join(', ');
      var left = D.rxDaysLeft(r);
      return '<div class="row-item"><div class="row-main"><strong>' + E(r.name + ' ' + r.strength) + '</strong><span>' + E(r.weekly ? r.food : when + ' · ' + r.food) + '</span></div>' +
        '<div class="row-end">' + (left <= 7 ? D.statusHtml('due', left + ' days left') : '<span class="field-hint">' + left + ' days left</span>') + '</div></div>';
    }).join('');

    /* vitals */
    var cur = 'bp';
    function readings(k) { var extra = D.read('northcrest-readings') || {}; return D.VITALS[k].values.concat(extra[k] || []).slice(-6); }
    function labels(k) { var extra = (D.read('northcrest-readings') || {})[k] || []; return D.VITALS[k].labels.concat(extra.map(function () { return 'New'; })).slice(-6); }
    function renderVit(k) {
      cur = k;
      var m = D.VITALS[k], v = readings(k), last = v[v.length - 1], first = v[0], diff = Math.round((last - first) * 10) / 10;
      var good = k === 'weight' ? last <= m.target : last < m.target + (k === 'bp' ? 1 : 0);
      $('vitNow').innerHTML = '<strong>' + last + ' <small>' + E(m.unit) + '</small></strong>' + (good ? D.statusHtml('ok', 'On target') : D.statusHtml('due', 'Above goal')) +
        '<span>' + (diff === 0 ? 'No change' : (diff < 0 ? 'Down ' : 'Up ') + Math.abs(diff) + ' ' + m.unit) + ' in six months. ' + E(m.range) + '.</span>';
      T.lineChart($('vitChart'), { label: m.label, unit: m.unit, labels: labels(k), values: v, target: m.target, targetLabel: m.targetLabel });
    }
    $('vitSeg').addEventListener('click', function (e) {
      var b = e.target.closest('[data-v]'); if (!b) return;
      this.querySelectorAll('[data-v]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      renderVit(b.getAttribute('data-v'));
    });
    renderVit('bp');

    var form = $('readingForm'), val = $('rd-val');
    var LIM = { bp: [70, 250], sugar: [40, 500], weight: [20, 250] };
    form.addEventListener('submit', function (e) {
      var k = form.elements.measure.value, n = parseFloat(val.value), msg = '';
      if (val.value && (!/^\d+(\.\d)?$/.test(val.value.trim()) || (k && (n < LIM[k][0] || n > LIM[k][1])))) msg = k ? 'Enter a number between ' + LIM[k][0] + ' and ' + LIM[k][1] + '.' : 'Enter a number.';
      $('rd-val-error').textContent = msg;
      if (msg) { e.preventDefault(); e.stopImmediatePropagation(); val.setAttribute('aria-invalid', 'true'); val.focus(); }
    }, true);
    form.addEventListener('form:success', function () {
      /* the shared validator resets the form after this event, so read the values first */
      var k = form.elements.measure.value || cur, n = parseFloat(val.value), all = D.read('northcrest-readings') || {};
      all[k] = (all[k] || []).concat(n); D.write('northcrest-readings', all);
      T.closeModal('m-reading');
      $('vitSeg').querySelectorAll('[data-v]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-v') === k)); });
      renderVit(k);
      T.toast('Reading of ' + n + ' ' + D.VITALS[k].unit + ' saved to your health trends', 'ok');
    });
  });
})();
