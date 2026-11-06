/* dashboard-profile: personal, medical (BMI), family members, emergency contact; notifications; security; delete account */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var D = window.NorthcrestData, T = window.Northcrest;
    if (!D || !T) return;
    var $ = function (id) { return document.getElementById(id); }, E = D.esc;
    $('pf-dob').max = D.today(); $('fm-dob').max = D.today();

    var MAP = {
      personalForm: { 'pf-first': 'first', 'pf-last': 'last', 'pf-email': 'email', 'pf-phone': 'phone', 'pf-dob': 'dob', 'pf-gender': 'gender', 'pf-addr': 'address' },
      medForm: { 'md-blood': 'bloodGroup', 'md-height': 'height', 'md-weight': 'weight', 'md-allergy': 'allergies', 'md-cond': 'conditions' },
      emForm: { 'em-name': 'emName', 'em-rel': 'emRelation', 'em-phone': 'emPhone' }
    };
    function bmi() { var h = parseFloat($('md-height').value) / 100, w = parseFloat($('md-weight').value); $('md-bmi').value = h > 0.5 && w > 10 ? (w / (h * h)).toFixed(1) + (w / (h * h) < 18.5 ? ' (under)' : w / (h * h) < 25 ? ' (healthy)' : w / (h * h) < 30 ? ' (over)' : ' (high)') : ''; }
    function fill(fid) { var p = D.profile(), m = MAP[fid]; Object.keys(m).forEach(function (id) { $(id).value = p[m[id]] || ''; $(id).removeAttribute('aria-invalid'); }); if (fid === 'medForm') bmi(); }
    function age(dob) { if (!dob) return ''; var d = D.parse(dob), n = new Date(), a = n.getFullYear() - d.getFullYear(); if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--; return a; }
    function paintHero() {
      var p = D.profile();
      $('profName').textContent = p.first + ' ' + p.last; $('profPhoto').alt = p.first + ' ' + p.last;
      $('profMeta').textContent = 'Patient ID ' + (p.patientId || 'pending') + (p.uhid ? ' · ' + p.uhid : '') + (p.dob ? ' · ' + age(p.dob) + ' years' : '');
      $('profBadges').innerHTML = [p.bloodGroup ? 'Blood group ' + p.bloodGroup : '', p.allergies ? 'Allergy: ' + p.allergies : '', p.insurer ? 'Insured: ' + p.insurer : '']
        .filter(Boolean).map(function (t, i) { return '<span class="badge' + (i === 1 ? ' badge--warn' : i ? ' badge--neutral' : '') + '">' + E(t) + '</span>'; }).join('');
      document.querySelectorAll('.avatar-name').forEach(function (n) { n.textContent = p.first; });
    }
    Object.keys(MAP).forEach(function (fid) {
      fill(fid);
      $(fid).addEventListener('form:success', function () {
        var p = D.profile(), m = MAP[fid];
        Object.keys(m).forEach(function (id) { p[m[id]] = $(id).value.trim(); });
        D.saveProfile(p); paintHero();
        T.toast($(fid).getAttribute('data-success-message'), 'ok');
      });
    });
    document.querySelectorAll('[data-discard]').forEach(function (b) {
      b.addEventListener('click', function () {
        var fid = b.getAttribute('data-discard'); fill(fid);
        $(fid).querySelectorAll('.field-error').forEach(function (e) { e.textContent = ''; });
        var ok = $(fid).querySelector('[data-form-success]'); if (ok) ok.hidden = true;
        T.toast('Changes discarded', 'info');
      });
    });
    ['md-height', 'md-weight'].forEach(function (id) { $(id).addEventListener('input', bmi); });
    $('medForm').addEventListener('submit', function (e) {
      var h = $('md-height').value.trim(), w = $('md-weight').value.trim(), bad = null;
      $('md-height-error').textContent = ''; $('md-weight-error').textContent = '';
      if (w && !(/^\d{1,3}(\.\d)?$/.test(w) && +w >= 2 && +w <= 300)) { $('md-weight-error').textContent = 'Enter your weight in kg, for example 68.'; bad = $('md-weight'); }
      if (h && !(/^\d{2,3}$/.test(h) && +h >= 40 && +h <= 250)) { $('md-height-error').textContent = 'Enter your height in cm, for example 163.'; bad = $('md-height'); }
      if (bad) { e.preventDefault(); e.stopImmediatePropagation(); bad.setAttribute('aria-invalid', 'true'); bad.focus(); }
    }, true);
    $('photoBtn').addEventListener('click', function () { $('photoInput').click(); });
    $('photoInput').addEventListener('change', function () {
      var f = this.files && this.files[0]; if (!f) return;
      if (f.size > 5e6) { T.toast('Please choose a photo under 5 MB.', 'error'); return; }
      var url = URL.createObjectURL(f); $('profPhoto').src = url; $('profPhoto').removeAttribute('srcset');
      T.toast('Photo updated for this session. The front desk will confirm it at your next visit.', 'ok');
    });
    $('cardBtn').addEventListener('click', function () {
      var p = D.profile();
      D.download('northcrest-health-card.txt', ['Northcrest Multispeciality Hospital: patient health card', 'Name: ' + p.first + ' ' + p.last, 'Patient ID: ' + p.patientId, p.uhid || '', 'Blood group: ' + (p.bloodGroup || '-'), 'Allergies: ' + (p.allergies || 'None recorded'),
        'Emergency contact: ' + (p.emName || '-') + ' (' + (p.emRelation || '-') + ') ' + (p.emPhone || ''), 'Emergency 24/7: 1066'].join('\n'));
      T.toast('Health card downloaded', 'ok');
    });
    paintHero();

    /* family */
    var ulId = null;
    function renderFam() {
      $('famList').innerHTML = D.family().map(function (m) {
        return '<div class="row-item"><div class="row-lead"><span class="initials" aria-hidden="true">' + E(D.initials(m.name)) + '</span><div class="row-main"><strong>' + E(m.name) + '</strong><span>' + E(m.relation) + ' · ' + age(m.dob) + ' years' + (m.phone ? ' · ' + E(m.phone) : '') + '</span></div></div>' +
          '<div class="row-end"><a class="btn btn-secondary btn-sm" href="dashboard-appointments.html#book">Book for ' + E(m.name.split(' ')[0]) + '</a><button class="btn btn-secondary btn-sm btn-quiet-danger" type="button" data-unlink="' + m.id + '">Remove</button></div></div>';
      }).join('') || '<div class="empty empty--slim"><p>No family members linked yet.</p></div>';
    }
    $('addFam').addEventListener('click', function () { T.openModal('m-family', this); });
    $('famForm').addEventListener('submit', function (e) {
      var d = $('fm-dob'); if (d.value && d.value > D.today()) { e.preventDefault(); e.stopImmediatePropagation(); d.setAttribute('aria-invalid', 'true'); T.toast('Date of birth cannot be in the future.', 'error'); d.focus(); }
    }, true);
    $('famForm').addEventListener('form:success', function () {
      var l = D.family(), m = { id: 'f' + Date.now(), name: $('fm-name').value.trim(), relation: $('fm-rel').value, dob: $('fm-dob').value, phone: $('fm-phone').value.trim() };
      l.push(m); D.saveFamily(l); T.closeModal('m-family'); renderFam();
      T.toast(m.name + ' added. Their UHID will be created at the first visit.', 'ok');
    });
    $('famList').addEventListener('click', function (e) {
      var b = e.target.closest('[data-unlink]'); if (!b) return;
      ulId = b.getAttribute('data-unlink'); var m = D.family().filter(function (x) { return x.id === ulId; })[0];
      $('m-unlink-title').textContent = 'Remove ' + m.name + '?'; T.openModal('m-unlink', b);
    });
    $('ulConfirm').addEventListener('click', function () {
      var l = D.family(), m = l.filter(function (x) { return x.id === ulId; })[0];
      D.saveFamily(l.filter(function (x) { return x.id !== ulId; })); T.closeModal('m-unlink'); renderFam();
      T.toast(m.name + ' removed from your account', 'info');
    });
    renderFam();

    /* notifications */
    var n = D.notify(), NAMES = { apptSms: 'SMS appointment reminders', apptEmail: 'Email appointment reminders', reports: 'Report alerts', meds: 'Medicine reminders', bills: 'Bill and claim updates', whatsapp: 'WhatsApp updates', news: 'Health tips' };
    document.querySelectorAll('[data-notify]').forEach(function (sw) {
      var k = sw.getAttribute('data-notify'); sw.checked = !!n[k];
      sw.addEventListener('change', function () { var cur = D.notify(); cur[k] = sw.checked; D.saveNotify(cur); T.toast(NAMES[k] + (sw.checked ? ' turned on' : ' turned off'), sw.checked ? 'ok' : 'info'); });
    });

    /* security */
    var p = D.profile();
    $('pwChanged').textContent = 'Last changed ' + D.fmt(p.passwordChanged);
    $('tfaSwitch').checked = !!p.tfa; $('tfaText').textContent = p.tfa ? 'On, codes sent to your mobile' : 'Off';
    $('tfaSwitch').addEventListener('change', function () {
      var pr = D.profile(); pr.tfa = this.checked; D.saveProfile(pr);
      $('tfaText').textContent = this.checked ? 'On, codes sent to your mobile' : 'Off';
      T.toast(this.checked ? 'Two-step sign-in is on. We will text a code each time you log in.' : 'Two-step sign-in turned off', this.checked ? 'ok' : 'info');
    });
    $('signoutBtn').addEventListener('click', function () { this.disabled = true; this.textContent = 'Done'; $('devText').textContent = 'Only this browser'; T.toast('Signed out of 1 other device', 'ok'); });
    $('dataBtn').addEventListener('click', function () {
      var data = { profile: D.profile(), family: D.family(), appointments: D.appointments(), reports: D.REPORTS, prescriptions: D.PRESCRIPTIONS, bills: D.bills(), claims: D.claims() };
      D.download('northcrest-my-data.json', JSON.stringify(data, null, 2), 'application/json');
      T.toast('Your data has been downloaded', 'ok');
    });
    $('pwForm').addEventListener('form:success', function () {
      var pr = D.profile(); pr.passwordChanged = D.today(); D.saveProfile(pr);
      $('pwChanged').textContent = 'Last changed ' + D.fmt(pr.passwordChanged);
      T.closeModal('m-pw'); T.toast('Password updated', 'ok');
    });

    /* delete */
    $('delForm').addEventListener('submit', function (e) {
      var v = $('del-confirm').value.trim();
      if (v && v !== 'DELETE') { e.preventDefault(); e.stopImmediatePropagation(); $('del-confirm-error').textContent = 'Type DELETE in capital letters to confirm.'; $('del-confirm').setAttribute('aria-invalid', 'true'); $('del-confirm').focus(); }
    }, true);
    $('delForm').addEventListener('form:success', function () {
      T.closeModal('m-delete');
      T.toast('Your account has been deleted. Taking you to the home page.', 'info');
      D.reset(); T.session.logout();
      setTimeout(function () { location.href = 'index.html'; }, 1400);
    });
  });
})();
