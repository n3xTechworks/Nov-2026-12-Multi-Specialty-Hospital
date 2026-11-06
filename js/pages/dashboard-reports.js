/* dashboard-reports: filters (type, search, period, flagged), report viewer (values + flags + mini trend), download/share/ask feedback */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var D = window.NorthcrestData, T = window.Northcrest;
    if (!D || !T) return;
    var E = D.esc, $ = function (id) { return document.getElementById(id); };
    var f = { type: 'all', q: '', days: 0, flag: false }, cur = null;
    var ICON = { lab: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 14h9"/>', radiology: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 7v10M8 9h8M8 12h8M9 15h6"/>', discharge: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h4"/>' };

    var all = D.REPORTS.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var flagged = all.filter(function (r) { return D.flagCount(r) > 0; }).length;
    $('repStats').innerHTML = [['Total reports', all.length, 'Across ' + new Set(all.map(function (r) { return r.doctor; })).size + ' doctors'], ['Lab tests', all.filter(function (r) { return r.type === 'lab'; }).length, 'Blood and urine'],
      ['Need attention', flagged, 'Have flagged values'], ['Processing', all.filter(function (r) { return r.status !== 'ready'; }).length, 'Results due soon']]
      .map(function (s) { return '<div class="stat-card"><span class="stat-label">' + s[0] + '</span><span class="stat-value">' + s[1] + '</span><span class="stat-hint">' + s[2] + '</span></div>'; }).join('');

    function match(r) {
      if (f.type !== 'all' && r.type !== f.type) return false;
      if (f.flag && !D.flagCount(r)) return false;
      if (f.days && r.date < D.addDays(-f.days)) return false;
      if (f.q) { var hay = (r.name + ' ' + D.doctor(r.doctor).name + ' ' + D.TYPE_LABEL[r.type]).toLowerCase(); if (hay.indexOf(f.q) < 0) return false; }
      return true;
    }
    function render() {
      var list = all.filter(match);
      $('repNote').textContent = 'Showing ' + list.length + ' of ' + all.length;
      $('repRows').innerHTML = list.map(function (r) {
        var n = D.flagCount(r), doc = D.doctor(r.doctor), ready = r.status === 'ready';
        return '<tr><td><div class="row-lead"><span class="doc-ico" aria-hidden="true"><svg viewBox="0 0 24 24">' + ICON[r.type] + '</svg></span><div class="row-main"><strong>' + E(r.name) + '</strong><span>' + E(D.TYPE_LABEL[r.type]) + ' · ' + E(r.lab) + '</span></div></div></td>' +
          '<td class="num">' + D.fmt(r.date) + '</td><td>' + E(doc.name) + '<span class="cell-sub">' + E(D.deptName(doc.department)) + '</span></td>' +
          '<td>' + (!ready ? D.statusHtml('processing') : n ? D.statusHtml('high', n + ' flagged') : D.statusHtml('ok', 'All normal')) + '</td>' +
          '<td><div class="cell-actions">' + (ready ? '<button class="btn btn-primary btn-sm" type="button" data-view="' + r.id + '">View</button><button class="btn btn-secondary btn-sm btn-icon" type="button" data-dl="' + r.id + '" aria-label="Download ' + E(r.name) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg></button>'
            : '<button class="btn btn-secondary btn-sm" type="button" data-notify="' + r.id + '">Notify me</button>') + '</div></td></tr>';
      }).join('') || '<tr><td colspan="5"><div class="empty empty--slim"><p>No reports match these filters.</p><button class="btn btn-secondary btn-sm" type="button" id="clearF">Clear filters</button></div></td></tr>';
      var c = $('clearF'); if (c) c.addEventListener('click', clearFilters);
    }
    function clearFilters() {
      f = { type: 'all', q: '', days: 0, flag: false };
      $('repSearch').value = ''; $('repPeriod').value = '0'; $('repFlag').checked = false;
      $('typeSeg').querySelectorAll('[data-t]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-t') === 'all')); });
      render(); T.toast('Filters cleared', 'info');
    }
    $('typeSeg').addEventListener('click', function (e) {
      var b = e.target.closest('[data-t]'); if (!b) return;
      this.querySelectorAll('[data-t]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      f.type = b.getAttribute('data-t'); render();
    });
    $('repSearch').addEventListener('input', function () { f.q = this.value.trim().toLowerCase(); render(); });
    $('repPeriod').addEventListener('change', function () { f.days = +this.value; render(); });
    $('repFlag').addEventListener('change', function () { f.flag = this.checked; render(); });

    function fileText(r) {
      var p = D.profile(), doc = D.doctor(r.doctor);
      return ['Northcrest Multispeciality Hospital', r.name + ' (' + D.TYPE_LABEL[r.type] + ')', 'Patient: ' + p.first + ' ' + p.last + ' · ' + p.patientId, 'Date: ' + D.fmt(r.date) + ' · ' + r.lab, 'Ordered by: ' + doc.name, '']
        .concat(r.values.map(function (v) { return v[0] + ': ' + v[1] + (v[2] ? ' ' + v[2] : '') + (v[3] ? ' (normal ' + v[3] + ')' : '') + (v[4] !== 'ok' ? ' [' + (v[4] === 'high' ? 'HIGH' : 'BORDERLINE') + ']' : ''); }))
        .concat(['', 'Comment: ' + r.comment]).join('\n');
    }
    function download(r, btn) {
      if (btn) { btn.classList.add('is-busy'); }
      setTimeout(function () {
        if (btn) btn.classList.remove('is-busy');
        D.download('northcrest-' + r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + r.date + '.txt', fileText(r));
        T.toast(r.name + ' downloaded', 'ok');
      }, 400);
    }

    $('repRows').addEventListener('click', function (e) {
      var v = e.target.closest('[data-view]'), d = e.target.closest('[data-dl]'), n = e.target.closest('[data-notify]');
      if (v) openReport(D.report(v.getAttribute('data-view')), v);
      if (d) download(D.report(d.getAttribute('data-dl')), d);
      if (n) { n.disabled = true; n.textContent = 'We will notify you'; T.toast('We will SMS you as soon as ' + D.report(n.getAttribute('data-notify')).name + ' is ready.', 'ok'); }
    });

    var FLAG = { high: ['pill--bad', 'High'], low: ['pill--warn', 'Borderline'], ok: ['pill--ok', 'Normal'] };
    function openReport(r, opener) {
      if (!r || r.status !== 'ready') return;
      cur = r;
      var doc = D.doctor(r.doctor), discharge = r.type === 'discharge';
      $('rvKicker').textContent = D.TYPE_LABEL[r.type];
      $('m-report-title').textContent = r.name;
      $('rvMeta').textContent = D.fmt(r.date) + ' · ' + r.lab + ' · Ordered by ' + doc.name;
      document.querySelector('.rv-table thead').innerHTML = discharge ? '<tr><th scope="col">Item</th><th scope="col" colspan="3">Details</th></tr>' : '<tr><th scope="col">Test</th><th scope="col">Result</th><th scope="col">Normal range</th><th scope="col">Flag</th></tr>';
      $('rvRows').innerHTML = r.values.map(function (v) {
        if (discharge) return '<tr><th scope="row">' + E(v[0]) + '</th><td colspan="3">' + E(v[1]) + '</td></tr>';
        var fl = FLAG[v[4]] || FLAG.ok;
        return '<tr class="' + (v[4] !== 'ok' ? 'is-flag' : '') + '"><th scope="row">' + E(v[0]) + '</th><td class="cell-strong">' + E(typeof v[1] === 'number' ? v[1].toLocaleString('en-IN') : v[1]) + (v[2] ? ' <small>' + E(v[2]) + '</small>' : '') + '</td><td>' + E(v[3]) + '</td><td><span class="pill ' + fl[0] + '">' + fl[1] + '</span></td></tr>';
      }).join('');
      if (r.trend) { $('rvTrendBox').hidden = false; T.lineChart($('rvTrend'), r.trend); } else $('rvTrendBox').hidden = true;
      $('rvComment').textContent = r.comment + ' (' + doc.name + ')';
      T.openModal('m-report', opener);
    }
    $('rvDownload').addEventListener('click', function () { if (cur) download(cur, this); });
    $('rvShare').addEventListener('click', function () { $('shText').textContent = 'Send a secure link to "' + cur.name + '". It expires in 7 days.'; T.openModal('m-share', this); });
    $('rvAsk').addEventListener('click', function () { $('askText').textContent = 'Your question goes to ' + D.doctor(cur.doctor).name + ', who usually replies within one working day.'; T.openModal('m-ask', this); });
    $('shCopy').addEventListener('click', function () {
      var link = 'https://portal.northcrest.example/r/' + D.hash(cur.id + Date.now()).toString(36);
      if (navigator.clipboard) navigator.clipboard.writeText(link).catch(function () {});
      this.textContent = 'Link copied';
      T.toast('Secure link copied. It expires in 7 days.', 'ok');
    });
    $('shareForm').addEventListener('form:success', function () {
      var to = $('sh-email').value; T.closeModal('m-share'); $('shCopy').textContent = 'Copy secure link';
      T.toast('Secure link to ' + cur.name + ' sent to ' + to, 'ok');
    });
    $('askForm').addEventListener('form:success', function () { T.closeModal('m-ask'); T.toast('Question sent to ' + D.doctor(cur.doctor).name + '. You will get an SMS when they reply.', 'ok'); });
    $('dlAll').addEventListener('click', function () {
      var b = this; b.classList.add('is-busy'); b.textContent = 'Preparing...';
      setTimeout(function () {
        b.classList.remove('is-busy'); b.textContent = 'Download all (ZIP)';
        D.download('northcrest-reports-' + D.today() + '.txt', all.filter(function (r) { return r.status === 'ready'; }).map(fileText).join('\n\n----------\n\n'));
        T.toast(all.filter(function (r) { return r.status === 'ready'; }).length + ' reports downloaded in one file', 'ok');
      }, 700);
    });

    render();
    var q = new URLSearchParams(location.search).get('report');
    if (q && D.report(q)) openReport(D.report(q));
  });
})();
