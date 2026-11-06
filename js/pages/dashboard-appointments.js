/* dashboard-appointments: department -> doctor -> date -> slot -> visit type -> confirm modal; ?doctor=id preselects;
   upcoming list with calendar / reschedule / cancel; past visits with summaries */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var D = window.NorthcrestData, T = window.Northcrest;
    if (!D || !T) return;
    var E = D.esc, $ = function (id) { return document.getElementById(id); };
    var MAX_WEEK = 3;
    var st = { dept: null, doc: null, week: 0, date: null, time: null, type: 'in-person' };

    function fee(doc, type) { return type === 'video' ? Math.round(doc.fee * 0.9 / 10) * 10 : doc.fee; }
    function weekStart(off) { return D.addDays(1 + off * 7); }
    function weekLabel(off) { var s = weekStart(off), e = D.addDays(6, s); return D.parse(s).getDate() + ' ' + D.fmt(s, 'month') + ' to ' + D.parse(e).getDate() + ' ' + D.fmt(e, 'month'); }
    function scrollTo(id) { var el = $(id); if (!el) return; el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }

    /* 1. departments */
    var depts = D.bookableDepts();
    function renderDepts() {
      $('deptGrid').innerHTML = depts.map(function (d) {
        return '<label class="option-card dept-opt"><input type="radio" name="dept" value="' + d.slug + '"' + (st.dept === d.slug ? ' checked' : '') + '>' +
          '<span class="oc-body"><strong>' + E(d.name) + '</strong><span>' + d.count + ' doctor' + (d.count > 1 ? 's' : '') + ' available</span></span></label>';
      }).join('');
    }
    $('deptGrid').addEventListener('change', function (e) {
      st.dept = e.target.value; st.doc = null; st.date = null; st.time = null;
      renderDocs(); renderDays(); renderSlots(); renderSummary();
    });

    /* 2. doctors */
    var AV = { available: ['pill--ok', 'Available'], busy: ['pill--warn', 'Few slots left'], away: ['pill--bad', 'On leave this week'] };
    function renderDocs() {
      if (!st.dept) { $('docGrid').innerHTML = '<div class="empty empty--slim"><p>Choose a department first.</p></div>'; return; }
      $('docGrid').innerHTML = D.doctorsIn(st.dept).map(function (d) {
        var av = AV[d.status] || AV.available;
        return '<label class="option-card doc-opt"><input type="radio" name="doctor" value="' + d.id + '"' + (st.doc === d.id ? ' checked' : '') + '>' +
          '<span class="oc-body"><span class="doc-top"><span class="initials" aria-hidden="true">' + E(D.initials(d.name)) + '</span><span class="doc-id"><strong>' + E(d.name) + '</strong><span>' + E(d.title) + '</span></span></span>' +
          '<span class="doc-chips">' + (d.chips || []).map(function (c) { return '<span class="badge badge--neutral">' + E(c) + '</span>'; }).join('') + '</span>' +
          '<span class="doc-meta"><span>OPD ' + E((d.opd || []).join(', ')) + ' · ' + E(d.opdTime) + '</span><span>' + d.experience + ' years · ' + D.inr(d.fee) + ' fee</span></span>' +
          '<span class="pill ' + av[0] + '">' + av[1] + '</span></span></label>';
      }).join('');
    }
    $('docGrid').addEventListener('change', function (e) {
      st.doc = e.target.value; st.date = null; st.time = null; st.week = 0;
      renderDays(); renderSlots(); renderSummary();
      var d = D.doctor(st.doc);
      if (d.status === 'away') T.toast(d.name + ' is on leave this week. Dates from next week are open.', 'info');
    });

    /* 3. dates */
    function pills(docId, off, selected, ignoreId) {
      var s = weekStart(off), html = '';
      for (var i = 0; i < 7; i++) {
        var d = D.addDays(i, s), doc = docId ? D.doctor(docId) : null;
        var works = doc && D.worksOn(doc, d), leave = doc && D.onLeave(doc, d), free = works && !leave ? D.freeCount(docId, d, ignoreId) : 0;
        var note = !doc ? '' : !works ? 'No OPD' : leave ? 'On leave' : free ? free + ' free' : 'Full';
        var dis = !doc || !free;
        html += '<button class="day-pill" type="button" data-date="' + d + '" aria-pressed="' + (d === selected) + '"' + (dis ? ' disabled' : '') +
          ' aria-label="' + D.fmt(d, 'long') + (note ? ', ' + note : '') + '"><small>' + D.DAYS[D.dow(d)] + '</small><strong>' + D.parse(d).getDate() + '</strong><small>' + (note || D.fmt(d, 'month')) + '</small></button>';
      }
      return html;
    }
    function renderDays() {
      $('dayPills').innerHTML = pills(st.doc, st.week, st.date);
      $('wkLabel').textContent = weekLabel(st.week);
      $('wkPrev').disabled = st.week <= 0; $('wkNext').disabled = st.week >= MAX_WEEK;
      var d = st.doc ? D.doctor(st.doc) : null;
      $('opdHint').textContent = d ? d.name + ' sees patients on ' + (d.opd || []).join(', ') + ', ' + d.opdTime + '.' : 'Choose a doctor to see their OPD days.';
    }
    $('dayPills').addEventListener('click', function (e) {
      var b = e.target.closest('[data-date]'); if (!b || b.disabled) return;
      st.date = b.getAttribute('data-date'); st.time = null; renderDays(); renderSlots(); renderSummary();
    });
    $('wkPrev').addEventListener('click', function () { if (st.week > 0) { st.week--; renderDays(); } });
    $('wkNext').addEventListener('click', function () { if (st.week < MAX_WEEK) { st.week++; renderDays(); } });

    /* 4. slots */
    function slotHtml(docId, date, selected, ignoreId) {
      var groups = {}, order = [];
      D.slots(docId, date, ignoreId).forEach(function (s) { if (!groups[s.part]) { groups[s.part] = []; order.push(s.part); } groups[s.part].push(s); });
      if (!order.length) return '<div class="empty empty--slim"><p>No slots on this day.</p></div>';
      return order.map(function (p) {
        return '<div class="slot-group"><p class="slot-part">' + p + '</p><div class="slot-grid">' + groups[p].map(function (s) {
          return '<button class="slot' + (s.taken ? ' is-taken' : '') + '" type="button" data-time="' + s.time + '" aria-pressed="' + (s.time === selected) + '"' + (s.taken ? ' aria-disabled="true"' : '') +
            ' aria-label="' + D.t12(s.time) + (s.taken ? ', booked' : ', available') + '">' + D.t12(s.time) + '</button>';
        }).join('') + '</div></div>';
      }).join('');
    }
    function renderSlots() {
      $('slotBox').innerHTML = st.doc && st.date ? '<p class="slot-day">' + D.fmt(st.date, 'long') + ' with ' + E(D.doctor(st.doc).name) + '</p>' + slotHtml(st.doc, st.date, st.time)
        : '<div class="empty empty--slim"><p>Choose a doctor and a date to see open 30-minute slots.</p></div>';
    }
    $('slotBox').addEventListener('click', function (e) {
      var b = e.target.closest('[data-time]'); if (!b) return;
      if (b.classList.contains('is-taken')) { T.toast(D.t12(b.getAttribute('data-time')) + ' is already booked. Please pick another slot.', 'info'); return; }
      st.time = b.getAttribute('data-time'); renderSlots(); renderSummary();
    });

    /* 5. type */
    $('typeGrid').addEventListener('change', function (e) { st.type = e.target.value; renderSummary(); });

    /* summary */
    function rows() {
      var d = st.doc ? D.doctor(st.doc) : null;
      return [['Department', st.dept ? D.deptName(st.dept) : 'Not chosen'], ['Doctor', d ? d.name : 'Not chosen'], ['Date', st.date ? D.fmt(st.date, 'long') : 'Not chosen'],
        ['Time', st.time ? D.t12(st.time) : 'Not chosen'], ['Visit', st.type === 'video' ? 'Video consultation' : 'In person'], ['Fee', d ? D.inr(fee(d, st.type)) + ' (pay at visit)' : '-']];
    }
    function renderSummary() {
      $('sumList').innerHTML = rows().map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + E(r[1]) + '</dd></div>'; }).join('');
      $('bookError').textContent = '';
    }
    $('reviewBtn').addEventListener('click', function () {
      var miss = !st.dept ? ['a department', 'stepDoctor', 'deptGrid'] : !st.doc ? ['a doctor', 'stepDoctor', 'docGrid'] : !st.date ? ['a date', 'stepDate', 'dayPills'] : !st.time ? ['a time slot', 'stepSlot', 'slotBox'] : null;
      if (miss) {
        $('bookError').textContent = 'Please choose ' + miss[0] + ' to continue.';
        T.toast('Please choose ' + miss[0] + '.', 'error');
        var g = $(miss[2]); g.classList.remove('is-flash'); void g.offsetWidth; g.classList.add('is-flash');
        g.closest('.widget').scrollIntoView({ block: 'center' });
        return;
      }
      $('cfList').innerHTML = rows().map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + E(r[1]) + '</dd></div>'; }).join('') +
        ($('bkReason').value.trim() ? '<div><dt>Reason</dt><dd>' + E($('bkReason').value.trim()) + '</dd></div>' : '');
      $('cfAgree').checked = false; $('cfError').textContent = '';
      T.openModal('m-confirm', this);
    });
    $('cfAgree').addEventListener('change', function () { if (this.checked) $('cfError').textContent = ''; });
    $('cfBtn').addEventListener('click', function () {
      if (!$('cfAgree').checked) { $('cfError').textContent = 'Please tick the box to confirm.'; $('cfAgree').focus(); return; }
      var btn = this; btn.classList.add('is-busy'); btn.textContent = 'Booking...';
      setTimeout(function () {
        btn.classList.remove('is-busy'); btn.textContent = 'Confirm appointment';
        var a = D.addAppt({ doctor: st.doc, date: st.date, time: st.time, type: st.type, reason: $('bkReason').value.trim() });
        T.closeModal('m-confirm');
        T.toast('Booked with ' + D.doctor(a.doctor).name + ' on ' + D.fmt(a.date, 'day') + ' at ' + D.t12(a.time) + '. Ref ' + a.ref + '.', 'ok', 5000);
        st = { dept: null, doc: null, week: 0, date: null, time: null, type: st.type };
        $('bkReason').value = '';
        renderAll();
        var item = document.querySelector('[data-up="' + a.id + '"]');
        if (item) { item.scrollIntoView({ block: 'center' }); item.classList.add('is-flash'); }
      }, 700);
    });
    $('clearBtn').addEventListener('click', function () {
      st = { dept: null, doc: null, week: 0, date: null, time: null, type: 'in-person' };
      document.querySelector('#typeGrid input[value="in-person"]').checked = true; $('bkReason').value = '';
      renderAll(); T.toast('Booking cleared', 'info');
    });

    /* upcoming */
    function renderUpcoming() {
      var list = D.upcoming();
      $('upCount').textContent = list.length; $('upCountTop').textContent = list.length;
      $('upList').innerHTML = list.map(function (a) {
        var d = D.parse(a.date), doc = D.doctor(a.doctor), video = a.type === 'video';
        return '<article class="up-item" data-up="' + a.id + '"><div class="up-date"><small>' + D.DAYS[d.getDay()] + '</small><strong>' + d.getDate() + '</strong><small>' + D.MONTHS[d.getMonth()] + '</small></div>' +
          '<div class="up-body"><h3>' + E(doc.name) + '</h3><p>' + D.t12(a.time) + ' · ' + E(D.deptName(doc.department)) + (a.reason ? ' · ' + E(a.reason) : '') + '</p>' +
          '<div class="up-badges"><span class="badge' + (video ? ' badge--solid' : '') + '">' + (video ? 'Video' : 'In person') + '</span><span class="badge badge--neutral">Ref ' + E(a.ref) + '</span>' + D.statusHtml('confirmed') + '</div></div>' +
          '<div class="up-acts"><button class="btn btn-secondary btn-sm" type="button" data-cal="' + a.id + '">Add to calendar</button>' +
          (video ? '<button class="btn btn-secondary btn-sm" type="button" data-join="' + a.id + '">Join video</button>' : '') +
          '<button class="btn btn-secondary btn-sm" type="button" data-rs="' + a.id + '">Reschedule</button><button class="btn btn-secondary btn-sm btn-quiet-danger" type="button" data-cn="' + a.id + '">Cancel</button></div></article>';
      }).join('') || '<div class="empty empty--slim"><h3>No upcoming appointments</h3><p>Use the steps above to book one.</p></div>';
    }
    var curId = null;
    $('upList').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var id = b.getAttribute('data-cal') || b.getAttribute('data-join') || b.getAttribute('data-rs') || b.getAttribute('data-cn'), a = D.findAppt(id); if (!a) return;
      if (b.hasAttribute('data-cal')) { D.downloadIcs(a); T.toast('Calendar file for ' + D.fmt(a.date, 'day') + ' downloaded', 'ok'); }
      if (b.hasAttribute('data-join')) {
        var mins = Math.round((new Date(a.date + 'T' + a.time + ':00') - new Date()) / 60000);
        T.toast(mins > 15 ? 'The video room opens 15 minutes before your slot (' + D.fmt(a.date, 'day') + ', ' + D.t12(a.time) + '). We will SMS the link.' : 'Opening the video room...', 'info', 4500);
      }
      if (b.hasAttribute('data-rs')) openResched(a, b);
      if (b.hasAttribute('data-cn')) {
        curId = a.id;
        $('cnText').textContent = D.doctor(a.doctor).name + ', ' + D.fmt(a.date, 'long') + ' at ' + D.t12(a.time) + '. The slot will be released to another patient.';
        $('cnReason').value = ''; $('cnError').textContent = '';
        T.openModal('m-cancel', b);
      }
    });
    $('cnReason').addEventListener('change', function () { if (this.value) $('cnError').textContent = ''; });
    $('cnConfirm').addEventListener('click', function () {
      if (!$('cnReason').value) { $('cnError').textContent = 'Please choose a reason.'; $('cnReason').setAttribute('aria-invalid', 'true'); $('cnReason').focus(); return; }
      $('cnReason').removeAttribute('aria-invalid');
      var a = D.findAppt(curId); D.updateAppt(curId, { status: 'cancelled', cancelReason: $('cnReason').value });
      T.closeModal('m-cancel'); renderUpcoming(); renderPast();
      T.toast('Appointment with ' + D.doctor(a.doctor).name + ' cancelled. No charge applies.', 'info');
    });

    /* reschedule */
    var rs = { id: null, week: 0, date: null, time: null };
    function rsRender() {
      var a = D.findAppt(rs.id);
      $('rsDays').innerHTML = pills(a.doctor, rs.week, rs.date, a.id);
      $('rsWk').textContent = weekLabel(rs.week);
      $('rsPrev').disabled = rs.week <= 0; $('rsNext').disabled = rs.week >= MAX_WEEK;
      $('rsTimes').innerHTML = rs.date ? slotHtml(a.doctor, rs.date, rs.time, a.id) : '<p class="field-hint">Pick a date first.</p>';
      var ok = rs.date && rs.time;
      $('rsConfirm').disabled = !ok;
      $('rsConfirm').textContent = ok ? 'Move to ' + D.fmt(rs.date, 'day') + ', ' + D.t12(rs.time) : 'Pick a date and time';
    }
    function openResched(a, opener) {
      rs = { id: a.id, week: 0, date: null, time: null };
      $('rsCurrent').textContent = 'Currently ' + D.fmt(a.date, 'long') + ' at ' + D.t12(a.time) + ' with ' + D.doctor(a.doctor).name + '.';
      rsRender(); T.openModal('m-resched', opener);
    }
    $('rsDays').addEventListener('click', function (e) { var b = e.target.closest('[data-date]'); if (!b || b.disabled) return; rs.date = b.getAttribute('data-date'); rs.time = null; rsRender(); });
    $('rsTimes').addEventListener('click', function (e) {
      var b = e.target.closest('[data-time]'); if (!b) return;
      if (b.classList.contains('is-taken')) { T.toast('That slot is booked. Pick another.', 'info'); return; }
      rs.time = b.getAttribute('data-time'); rsRender();
    });
    $('rsPrev').addEventListener('click', function () { if (rs.week > 0) { rs.week--; rsRender(); } });
    $('rsNext').addEventListener('click', function () { if (rs.week < MAX_WEEK) { rs.week++; rsRender(); } });
    $('rsConfirm').addEventListener('click', function () {
      if (!rs.date || !rs.time) return;
      D.updateAppt(rs.id, { date: rs.date, time: rs.time });
      T.closeModal('m-resched'); renderUpcoming();
      T.toast('Rescheduled to ' + D.fmt(rs.date, 'day') + ' at ' + D.t12(rs.time) + '. A new SMS confirmation is on its way.', 'ok');
    });

    /* past visits */
    var pf = 'all';
    function renderPast() {
      var list = D.past().filter(function (a) { return pf === 'all' || a.status === pf || (pf === 'completed' && a.status === 'confirmed'); });
      $('pastRows').innerHTML = list.map(function (a) {
        var doc = D.doctor(a.doctor), stt = a.status === 'confirmed' ? 'completed' : a.status;
        return '<tr><td class="num">' + D.fmt(a.date) + '<span class="cell-sub">' + D.t12(a.time) + '</span></td><td><span class="cell-strong">' + E(doc.name) + '</span><span class="cell-sub">' + E(D.deptName(doc.department)) + '</span></td>' +
          '<td>' + (a.type === 'video' ? 'Video' : 'In person') + '<span class="cell-sub">' + E(a.reason || '') + '</span></td><td>' + D.statusHtml(stt) + '</td>' +
          '<td><div class="cell-actions">' + (stt === 'completed' ? '<button class="btn btn-secondary btn-sm" type="button" data-notes="' + a.id + '">Summary</button>' : '') +
          '<a class="btn btn-secondary btn-sm" href="dashboard-appointments.html?doctor=' + doc.id + '">Book again</a></div></td></tr>';
      }).join('') || '<tr><td colspan="5"><div class="empty empty--slim"><p>No visits match this filter.</p></div></td></tr>';
    }
    $('pastSeg').addEventListener('click', function (e) {
      var b = e.target.closest('[data-f]'); if (!b) return;
      this.querySelectorAll('[data-f]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      pf = b.getAttribute('data-f'); renderPast();
    });
    var noteAppt = null;
    $('pastRows').addEventListener('click', function (e) {
      var b = e.target.closest('[data-notes]'); if (!b) return;
      var a = D.findAppt(b.getAttribute('data-notes')), doc = D.doctor(a.doctor); noteAppt = a;
      $('m-notes-title').textContent = 'Visit summary, ' + D.fmt(a.date);
      $('ntMeta').textContent = doc.name + ', ' + doc.title + '.';
      $('ntList').innerHTML = [['Reason', a.reason || '-'], ['Visit', a.type === 'video' ? 'Video consultation' : 'In person'], ['Reference', a.ref], ['Doctor\'s notes', a.notes || 'No notes recorded.']]
        .map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + E(r[1]) + '</dd></div>'; }).join('');
      $('ntFollow').href = 'dashboard-appointments.html?doctor=' + doc.id;
      T.openModal('m-notes', b);
    });
    $('ntDownload').addEventListener('click', function () {
      if (!noteAppt) return; var doc = D.doctor(noteAppt.doctor), p = D.profile();
      D.download('northcrest-visit-' + noteAppt.ref + '.txt', ['Northcrest Multispeciality Hospital: visit summary', 'Patient: ' + p.first + ' ' + p.last + ' (' + p.patientId + ')', 'Date: ' + D.fmt(noteAppt.date) + ' ' + D.t12(noteAppt.time),
        'Doctor: ' + doc.name + ', ' + D.deptName(doc.department), 'Reason: ' + (noteAppt.reason || '-'), 'Notes: ' + (noteAppt.notes || '-')].join('\n'));
      T.toast('Visit summary downloaded', 'ok');
    });

    function renderAll() { renderDepts(); renderDocs(); renderDays(); renderSlots(); renderSummary(); renderUpcoming(); renderPast(); }

    /* ?doctor=doc-3 preselects department + doctor */
    var q = new URLSearchParams(location.search).get('doctor'), pre = q ? D.DOCTORS.filter(function (d) { return d.id === q; })[0] : null;
    if (pre) { st.dept = pre.department; st.doc = pre.id; if (pre.status === 'away') st.week = 1; }
    renderAll();
    if (pre) {
      T.toast('Booking with ' + pre.name + '. Pick a date and time.', 'info');
      setTimeout(function () { scrollTo('stepDate'); }, 150);
    } else if (location.hash === '#upcoming' || location.hash === '#past') {
      setTimeout(function () { scrollTo(location.hash.slice(1)); }, 150);
    }
  });
})();
