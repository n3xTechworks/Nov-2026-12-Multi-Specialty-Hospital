/* dashboard-prescriptions: dosage schedule, active cards, refill modal (pickup/delivery, validated), refill requests, past list, downloads */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var D = window.NorthcrestData, T = window.Northcrest;
    if (!D || !T) return;
    var E = D.esc, $ = function (id) { return document.getElementById(id); };
    var active = D.PRESCRIPTIONS.filter(function (r) { return r.status === 'active'; }), past = D.PRESCRIPTIONS.filter(function (r) { return r.status === 'past'; });
    var PRICE = { rx1: 186, rx2: 142, rx3: 96, rx4: 210, rx5: 168 };

    function cell(n) { return n ? '<span class="dose-on">' + n + '</span>' : '<span class="dose-off" aria-label="none">-</span>'; }
    $('doseRows').innerHTML = active.map(function (r) {
      return '<tr><th scope="row"><span class="cell-strong">' + E(r.name) + '</span><span class="cell-sub">' + E(r.strength) + '</span></th>' +
        (r.weekly ? '<td colspan="3" class="dose-week">Once a week (Sunday morning)</td>' : r.dose.map(function (n) { return '<td class="dose-col">' + cell(n) + '</td>'; }).join('')) + '<td>' + E(r.food) + '</td></tr>';
    }).join('');

    function refillState(id) { var l = D.refills().filter(function (x) { return x.rx.indexOf(id) > -1 && x.status !== 'collected'; }); return l[0] || null; }
    function renderActive() {
      $('actCount').textContent = active.length;
      $('rxActive').innerHTML = active.map(function (r) {
        var doc = D.doctor(r.doctor), left = D.rxDaysLeft(r), pct = Math.round(left / r.days * 100), req = refillState(r.id);
        var when = r.weekly ? 'Weekly' : ['Morning', 'Afternoon', 'Night'].filter(function (s, i) { return r.dose[i]; }).join(' · ');
        return '<article class="rx-card"><div class="rx-top"><span class="doc-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-45 12 12)"/><path d="m9.5 9.5 5 5"/></svg></span>' +
          '<div class="rx-id"><h3>' + E(r.name) + '</h3><p>' + E(r.strength) + ' · ' + E(r.purpose) + '</p></div>' + (req ? D.statusHtml('requested') : left <= 7 ? D.statusHtml('due', 'Refill soon') : D.statusHtml('active')) + '</div>' +
          '<dl class="rx-kv"><div><dt>When</dt><dd>' + E(when) + '</dd></div><div><dt>How</dt><dd>' + E(r.food) + '</dd></div><div><dt>Doctor</dt><dd>' + E(doc.name) + '</dd></div><div><dt>Refills left</dt><dd>' + r.refills + '</dd></div></dl>' +
          '<div class="rx-left"><div class="meter" role="progressbar" aria-label="Days of medicine left" aria-valuemin="0" aria-valuemax="' + r.days + '" aria-valuenow="' + left + '"><span style="--v:' + pct + '%"></span></div><span>' + left + ' of ' + r.days + ' days left · ends ' + D.fmt(D.rxEnd(r), 'day') + '</span></div>' +
          '<div class="rx-acts"><button class="btn btn-primary btn-sm" type="button" data-refill="' + r.id + '"' + (r.refills ? '' : ' data-norefill') + '>' + (req ? 'Refill requested' : 'Request refill') + '</button><button class="btn btn-secondary btn-sm" type="button" data-dl="' + r.id + '">Download</button></div></article>';
      }).join('');
    }
    function renderPast() {
      $('rxPast').innerHTML = past.map(function (r) {
        var doc = D.doctor(r.doctor);
        return '<tr><td><span class="cell-strong">' + E(r.name + ' ' + r.strength) + '</span><span class="cell-sub">' + E(r.purpose) + '</span></td><td>' + E(doc.name) + '<span class="cell-sub">' + E(D.deptName(doc.department)) + '</span></td>' +
          '<td class="num">' + D.fmt(r.start) + '<span class="cell-sub">' + r.days + ' days</span></td><td>' + D.statusHtml('past') + '</td>' +
          '<td><div class="cell-actions"><button class="btn btn-secondary btn-sm" type="button" data-dl="' + r.id + '">Download</button></div></td></tr>';
      }).join('');
    }
    function renderRefills() {
      var l = D.refills().slice().reverse();
      $('refillList').innerHTML = l.map(function (x) {
        return '<div class="row-item"><div class="row-main"><strong>' + E(x.rx.map(function (id) { return D.rx(id).name; }).join(', ')) + '</strong><span>' + E(x.ref) + ' · ' + D.fmt(x.date) + ' · ' + (x.mode === 'delivery' ? 'Home delivery' : 'Pickup at ' + x.where.split(',')[0]) + '</span></div>' +
          '<div class="row-end">' + D.statusHtml(x.status === 'ready' ? 'ok' : 'processing', x.status === 'ready' ? (x.mode === 'delivery' ? 'Out for delivery' : 'Ready to collect') : 'Doctor approving') +
          (x.status !== 'ready' ? '<button class="btn btn-secondary btn-sm" type="button" data-cancel-rf="' + x.ref + '">Cancel</button>' : '') + '</div></div>';
      }).join('') || '<div class="empty empty--slim"><p>No refill requests yet. Use "Request refill" on any active medicine.</p></div>';
    }

    function rxText(r) {
      var p = D.profile(), doc = D.doctor(r.doctor);
      return ['Northcrest Multispeciality Hospital: prescription', 'Patient: ' + p.first + ' ' + p.last + ' (' + p.patientId + ')', 'Doctor: ' + doc.name + ', ' + doc.title, 'Date: ' + D.fmt(r.start), '',
        'Rx: ' + r.name + ' ' + r.strength, 'Dose: ' + (r.weekly ? 'once weekly' : r.dose.join('-')) + ' (morning-afternoon-night), ' + r.food, 'Duration: ' + r.days + ' days · Quantity: ' + r.qty, 'Purpose: ' + r.purpose].join('\n');
    }
    document.addEventListener('click', function (e) {
      var d = e.target.closest('[data-dl]'), rf = e.target.closest('[data-refill]'), cn = e.target.closest('[data-cancel-rf]');
      if (d) { var r = D.rx(d.getAttribute('data-dl')); D.download('northcrest-prescription-' + r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.txt', rxText(r)); T.toast('Prescription for ' + r.name + ' downloaded', 'ok'); }
      if (rf) {
        var x = D.rx(rf.getAttribute('data-refill'));
        if (refillState(x.id)) { T.toast('A refill for ' + x.name + ' is already being processed.', 'info'); return; }
        if (rf.hasAttribute('data-norefill')) { T.toast('No refills left for ' + x.name + '. Book a review with ' + D.doctor(x.doctor).name + ' to renew it.', 'info', 5000); return; }
        openRefill([x.id], rf);
      }
      if (cn) {
        var l = D.refills().filter(function (y) { return y.ref !== cn.getAttribute('data-cancel-rf'); }); D.saveRefills(l);
        renderRefills(); renderActive(); T.toast('Refill request ' + cn.getAttribute('data-cancel-rf') + ' cancelled', 'info');
      }
    });

    /* refill modal */
    var form = $('refillForm');
    function setMode(m) {
      var del = m === 'delivery';
      $('rfPickup').hidden = del; $('rf-pharmacy').disabled = del;
      $('rfDelivery').hidden = !del; $('rfDelivery').querySelectorAll('input').forEach(function (i) { i.disabled = !del; });
      if (del) { var p = D.profile(); if (!$('rf-addr').value) $('rf-addr').value = p.address || ''; if (!$('rf-phone').value) $('rf-phone').value = p.phone || ''; }
      sum();
    }
    function chosen() { return Array.prototype.map.call($('rfMeds').querySelectorAll('input:checked'), function (i) { return i.value; }); }
    function sum() {
      var ids = chosen(), total = ids.reduce(function (s, id) { return s + (PRICE[id] || 0); }, 0), del = form.elements.mode.value === 'delivery', fee = del && total < 500 ? 50 : 0;
      $('rfSum').innerHTML = '<div><dt>Medicines (' + ids.length + ')</dt><dd>' + D.inr(total) + '</dd></div>' + (del ? '<div><dt>Delivery</dt><dd>' + (fee ? D.inr(fee) : 'Free') + '</dd></div>' : '') + '<div><dt><strong>Estimated total</strong></dt><dd>' + D.inr(total + fee) + '</dd></div>';
    }
    function openRefill(ids, opener) {
      var avail = active.filter(function (r) { return r.refills > 0 && !refillState(r.id); });
      if (!avail.length) { T.toast('All active medicines already have a refill in progress or need a doctor review.', 'info'); return; }
      $('rfMeds').innerHTML = avail.map(function (r) {
        return '<label class="check rf-med"><input type="checkbox" name="rx" value="' + r.id + '"' + (ids.indexOf(r.id) > -1 || !ids.length ? ' checked' : '') + '> <span><strong>' + E(r.name + ' ' + r.strength) + '</strong> · ' + r.qty + ' units · ' + D.inr(PRICE[r.id]) + '</span></label>';
      }).join('');
      $('rfMedsError').textContent = '';
      form.querySelector('input[value="pickup"]').checked = true; setMode('pickup');
      T.openModal('m-refill', opener);
    }
    $('rfMeds').addEventListener('change', function () { if (chosen().length) $('rfMedsError').textContent = ''; sum(); });
    form.addEventListener('change', function (e) { if (e.target.name === 'mode') setMode(e.target.value); });
    $('rf-pin').addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 6); });
    form.addEventListener('submit', function (e) {
      var bad = false;
      if (!chosen().length) { $('rfMedsError').textContent = 'Choose at least one medicine.'; bad = true; }
      var pin = $('rf-pin');
      if (!pin.disabled && pin.value && !/^[1-9]\d{5}$/.test(pin.value)) { e.preventDefault(); e.stopImmediatePropagation(); $('rf-pin-error').textContent = 'Enter a valid 6-digit PIN code.'; pin.setAttribute('aria-invalid', 'true'); pin.focus(); return; }
      if (bad) { e.preventDefault(); e.stopImmediatePropagation(); $('rfMeds').querySelector('input').focus(); }
    }, true);
    form.addEventListener('form:success', function () {
      var btn = $('rfSubmit'), ids = chosen(), del = form.elements.mode.value === 'delivery';
      btn.classList.add('is-busy'); btn.textContent = 'Sending...';
      setTimeout(function () {
        btn.classList.remove('is-busy'); btn.textContent = 'Send request';
        var x = { ref: D.ref('RF'), rx: ids, mode: del ? 'delivery' : 'pickup', where: del ? $('rf-addr').value.trim() : $('rf-pharmacy').value, date: D.today(), status: 'pending' };
        var l = D.refills(); l.push(x); D.saveRefills(l);
        T.closeModal('m-refill'); renderActive(); renderRefills();
        T.toast('Refill ' + x.ref + ' sent. ' + (del ? 'Delivery expected tomorrow.' : 'We will SMS you when it is ready to collect.'), 'ok', 5000);
        setTimeout(function () { var m = D.refills(); m.forEach(function (y) { if (y.ref === x.ref) y.status = 'ready'; }); D.saveRefills(m); renderRefills(); T.toast('Refill ' + x.ref + ' approved by your doctor', 'ok'); }, 6000);
      }, 700);
    });
    $('refillAll').addEventListener('click', function () { openRefill([], this); });
    $('remindBtn').addEventListener('click', function () {
      var on = this.getAttribute('aria-pressed') === 'true';
      this.setAttribute('aria-pressed', String(!on)); this.textContent = on ? 'Set reminders' : 'Reminders on';
      T.toast(on ? 'Medicine reminders turned off' : 'You will get SMS reminders at 8 am, 2 pm and 9 pm on dose days', on ? 'info' : 'ok');
    });

    renderActive(); renderPast(); renderRefills();
  });
})();
