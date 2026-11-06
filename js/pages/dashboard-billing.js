/* dashboard-billing: outstanding total, policy, bills (filter, pay, receipt), TPA claims (progress, upload), payment methods,
   Pay now modal with validated card form (Luhn, expiry, CVV), EMI request */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var D = window.NorthcrestData, T = window.Northcrest;
    if (!D || !T) return;
    var E = D.esc, $ = function (id) { return document.getElementById(id); }, filter = 'all', paying = [], mode = 'pay';
    var you = D.youPay, open = D.isOpen;
    function label(m) { return m.type === 'card' ? m.brand + ' ending ' + m.last4 : 'UPI ' + m.label; }

    function renderBalance() {
      var list = D.bills().filter(open), amt = list.reduce(function (s, b) { return s + you(b); }, 0), over = list.filter(function (b) { return D.billStatus(b) === 'overdue'; });
      $('balAmt').textContent = D.inr(amt);
      $('balStatus').innerHTML = !list.length ? D.statusHtml('paid') : over.length ? D.statusHtml('overdue') : D.statusHtml('due');
      $('balSub').textContent = !list.length ? 'You are all paid up. Thank you.' : list.length + ' bill' + (list.length > 1 ? 's' : '') + ' to pay after insurance' +
        (over.length ? ', ' + over.length + ' past the due date.' : ', next due ' + D.fmt(list.map(function (b) { return b.due; }).sort()[0], 'day') + '.');
      $('payAllBtn').disabled = !list.length;
      var paid = D.bills().filter(function (b) { return b.paidOn; }).sort(function (a, b) { return a.paidOn < b.paidOn ? 1 : -1; })[0], pm = D.methods().filter(function (m) { return m.primary; })[0];
      $('balFoot').innerHTML = (paid ? '<div><dt>Last payment</dt><dd>' + D.inr(you(paid)) + ' on ' + D.fmt(paid.paidOn) + '</dd></div>' : '') +
        '<div><dt>Default method</dt><dd>' + (pm ? E(label(pm)) : 'None saved') + '</dd></div><div><dt>Covered by insurance this year</dt><dd>' + D.inr(D.bills().reduce(function (s, b) { return s + b.insurance; }, 0)) + '</dd></div>';
    }

    var p = D.profile();
    $('policyBox').innerHTML = '<div class="policy-top"><strong>' + E(p.insurer || 'Suraksha Health Insurance') + '</strong><span>Policy ' + E(p.policy || 'SHI-44-918275') + ' · TPA: CareLink Health TPA</span></div>' +
      '<div class="meter" role="progressbar" aria-label="Sum insured used this year" aria-valuemin="0" aria-valuemax="100" aria-valuenow="39"><span style="--v:39%"></span></div>' +
      '<p>₹1,96,000 of ₹5,00,000 sum insured used · Family floater (3 members) · Renews 1 April 2027</p>' +
      '<dl class="policy-kv"><div><dt>Cashless at Northcrest</dt><dd>Yes</dd></div><div><dt>Room rent limit</dt><dd>₹6,000 / day</dd></div><div><dt>Co-pay</dt><dd>None</dd></div><div><dt>OPD cover</dt><dd>Reimbursement</dd></div></dl>' +
      '<button class="btn btn-secondary btn-sm" type="button" id="ecardBtn">Download e-card</button>';
    $('ecardBtn').addEventListener('click', function () {
      D.download('northcrest-insurance-ecard.txt', ['Suraksha Health Insurance e-card', 'Member: ' + p.first + ' ' + p.last, 'Policy: ' + (p.policy || 'SHI-44-918275'), 'TPA: CareLink Health TPA', 'Valid to: 31 March 2027'].join('\n'));
      T.toast('Insurance e-card downloaded', 'ok');
    });

    function renderBills() {
      var list = D.bills().filter(function (b) { return filter === 'all' || (filter === 'open' ? open(b) : !open(b)); });
      $('billRows').innerHTML = list.map(function (b) {
        var s = D.billStatus(b);
        return '<tr><td class="cell-strong">' + E(b.id) + '</td><td class="num">' + D.fmt(b.date) + '</td><td>' + E(b.desc) + '</td><td class="num">' + D.inr(b.total) + '</td><td class="num">' + (b.insurance ? D.inr(b.insurance) : '-') + '</td>' +
          '<td class="num cell-strong">' + D.inr(you(b)) + '</td><td>' + D.statusHtml(s) + (open(b) ? '<span class="cell-sub">Due ' + D.fmt(b.due, 'day') + '</span>' : '') + '</td>' +
          '<td><div class="cell-actions">' + (open(b) ? '<button class="btn btn-primary btn-sm" type="button" data-pay="' + b.id + '">Pay</button>' : '<button class="btn btn-secondary btn-sm" type="button" data-receipt="' + b.id + '">Receipt</button>') +
          '<button class="btn btn-secondary btn-sm btn-icon" type="button" data-invoice="' + b.id + '" aria-label="Download itemised bill ' + E(b.id) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg></button></div></td></tr>';
      }).join('') || '<tr><td colspan="8"><div class="empty empty--slim"><p>No bills here.</p></div></td></tr>';
    }
    $('billSeg').addEventListener('click', function (e) {
      var c = e.target.closest('[data-f]'); if (!c) return;
      this.querySelectorAll('[data-f]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
      filter = c.getAttribute('data-f'); renderBills();
    });
    function billFile(b, kind) {
      var pr = D.profile();
      D.download('northcrest-' + kind + '-' + b.id + '.txt', ['Northcrest Multispeciality Hospital: ' + (kind === 'receipt' ? 'payment receipt' : 'itemised bill'), 'Bill: ' + b.id + ' · ' + D.fmt(b.date),
        'Patient: ' + pr.first + ' ' + pr.last + ' (' + pr.patientId + ')', 'Description: ' + b.desc, 'Total: ' + D.inr(b.total), 'Insurance: ' + D.inr(b.insurance), 'Patient share: ' + D.inr(you(b)),
        'Status: ' + D.billStatus(b) + (b.paidOn ? ' on ' + D.fmt(b.paidOn) : '')].join('\n'));
      T.toast((kind === 'receipt' ? 'Receipt' : 'Itemised bill') + ' for ' + b.id + ' downloaded', 'ok');
    }
    $('billRows').addEventListener('click', function (e) {
      var pb = e.target.closest('[data-pay]'), r = e.target.closest('[data-receipt]'), inv = e.target.closest('[data-invoice]'), find = function (id) { return D.bills().filter(function (b) { return b.id === id; })[0]; };
      if (pb) openPay([pb.getAttribute('data-pay')], pb);
      if (r) billFile(find(r.getAttribute('data-receipt')), 'receipt');
      if (inv) billFile(find(inv.getAttribute('data-invoice')), 'bill');
    });

    /* claims */
    var STEPS = ['Submitted', 'Under review', 'Approved', 'Settled'];
    function renderClaims() {
      $('claimList').innerHTML = D.claims().map(function (c) {
        var steps = STEPS.map(function (s, i) { var cls = i < c.step || (i === c.step && c.status !== 'query') ? 'is-done' : i === c.step ? 'is-current' : ''; if (c.status === 'settled') cls = 'is-done'; return '<li class="' + cls + '"><span>' + s + '</span></li>'; }).join('');
        return '<article class="claim"><div class="claim-top"><div class="claim-id"><h3>' + E(c.what) + '</h3><p>' + E(c.id) + ' · ' + E(c.type) + ' · Bill ' + E(c.bill) + '</p></div>' + D.statusHtml(c.status) + '</div>' +
          '<ol class="claim-steps" aria-label="Claim progress">' + steps + '</ol>' +
          '<div class="claim-foot"><dl class="claim-kv"><div><dt>Claimed</dt><dd>' + D.inr(c.claimed) + '</dd></div><div><dt>Approved</dt><dd>' + (c.approved ? D.inr(c.approved) : '-') + '</dd></div><div><dt>Updated</dt><dd>' + D.fmt(c.updated, 'day') + '</dd></div></dl>' +
          (c.status === 'query' ? '<button class="btn btn-primary btn-sm" type="button" data-upload="' + c.id + '">Upload documents</button>' : '<button class="btn btn-secondary btn-sm" type="button" data-track="' + c.id + '">Track with TPA</button>') + '</div>' +
          '<p class="claim-note">' + E(c.note) + '</p></article>';
      }).join('');
    }
    var clId = null;
    $('claimList').addEventListener('click', function (e) {
      var u = e.target.closest('[data-upload]'), t = e.target.closest('[data-track]');
      if (u) { clId = u.getAttribute('data-upload'); var c = D.claims().filter(function (x) { return x.id === clId; })[0]; openClaim(c, u); }
      if (t) T.toast('Claim ' + t.getAttribute('data-track') + ': ' + D.claims().filter(function (x) { return x.id === t.getAttribute('data-track'); })[0].note, 'info', 5000);
    });
    function openClaim(c, opener) {
      $('m-claim-title').textContent = c ? 'Upload documents' : 'Start a reimbursement claim';
      $('clText').textContent = c ? c.note : 'Choose a paid bill and upload the doctor\'s prescription and payment receipt. We forward it to CareLink Health TPA.';
      $('clBillField').hidden = !!c; $('cl-bill').disabled = !!c;
      $('cl-bill').innerHTML = '<option value="">Choose a bill</option>' + D.bills().filter(function (b) { return !b.insurance; }).map(function (b) { return '<option value="' + b.id + '">' + E(b.id + ' · ' + b.desc + ' · ' + D.inr(b.total)) + '</option>'; }).join('');
      T.openModal('m-claim', opener);
    }
    $('newClaim').addEventListener('click', function () { clId = null; openClaim(null, this); });
    $('claimForm').addEventListener('form:success', function () {
      var cl = D.claims();
      if (clId) { cl.forEach(function (c) { if (c.id === clId) { c.status = 'review'; c.step = 1; c.updated = D.today(); c.note = 'Documents received. The TPA usually decides within 7 working days.'; } }); T.toast('Documents uploaded. Claim ' + clId + ' is back under review.', 'ok'); }
      else {
        var billId = $('cl-bill').value, b = D.bills().filter(function (x) { return x.id === billId; })[0];
        var nc = { id: 'CLM-2026-' + Math.floor(78000 + Math.random() * 900), bill: b.id, what: b.desc, type: 'Reimbursement', claimed: b.total, approved: 0, status: 'review', step: 1, updated: D.today(), note: 'Submitted to CareLink Health TPA. Decision expected within 7 working days.' };
        cl.unshift(nc); T.toast('Claim ' + nc.id + ' submitted for ' + D.inr(b.total), 'ok');
      }
      D.saveClaims(cl); T.closeModal('m-claim'); renderClaims();
    });

    /* payment methods */
    var rmId = null;
    function renderMethods() {
      var ms = D.methods();
      $('pmList').innerHTML = ms.map(function (m) {
        return '<div class="pm' + (m.primary ? ' is-primary' : '') + '"><div class="pm-top"><span class="pm-logo' + (m.type === 'upi' ? ' pm-logo--upi' : '') + '" aria-hidden="true">' + (m.type === 'card' ? E(m.brand.toUpperCase()) : 'UPI') + '</span>' +
          '<div><strong>' + E(m.type === 'card' ? m.brand + ' •••• ' + m.last4 : m.label) + '</strong><span>' + (m.type === 'card' ? 'Expires ' + E(m.exp) : 'Linked UPI ID') + '</span></div>' + (m.primary ? '<span class="pm-default">Default</span>' : '') + '</div>' +
          '<div class="pm-acts">' + (m.primary ? '' : '<button class="btn btn-secondary btn-sm" type="button" data-default="' + m.id + '">Make default</button>') + '<button class="btn btn-secondary btn-sm btn-quiet-danger" type="button" data-remove="' + m.id + '">Remove</button></div></div>';
      }).join('') || '<div class="empty empty--slim"><p>No saved payment methods. Add a card to pay faster.</p></div>';
    }
    $('pmList').addEventListener('click', function (e) {
      var d = e.target.closest('[data-default]'), r = e.target.closest('[data-remove]'), ms = D.methods();
      if (d) { ms.forEach(function (m) { m.primary = m.id === d.getAttribute('data-default'); }); D.saveMethods(ms); renderMethods(); renderBalance(); T.toast(label(ms.filter(function (m) { return m.primary; })[0]) + ' is now your default', 'ok'); }
      if (r) {
        rmId = r.getAttribute('data-remove'); var m = ms.filter(function (x) { return x.id === rmId; })[0];
        $('m-remove-title').textContent = 'Remove ' + label(m) + '?';
        $('rmText').textContent = (m.primary ? 'This is your default method. ' : '') + 'You can add it again at any time.';
        T.openModal('m-remove', r);
      }
    });
    $('rmConfirm').addEventListener('click', function () {
      var ms = D.methods(), gone = ms.filter(function (m) { return m.id === rmId; })[0]; if (!gone) return;
      ms = ms.filter(function (m) { return m !== gone; }); if (gone.primary && ms[0]) ms[0].primary = true;
      D.saveMethods(ms); T.closeModal('m-remove'); renderMethods(); renderBalance(); T.toast(label(gone) + ' removed', 'info');
    });

    /* pay modal */
    var form = $('payForm'), cardFields = $('cardFields');
    function setNew(on) { cardFields.hidden = !on; cardFields.querySelectorAll('input').forEach(function (i) { i.disabled = !on; }); }
    function openPay(ids, opener) {
      mode = ids ? 'pay' : 'add'; paying = ids || [];
      var inv = D.bills().filter(function (b) { return paying.indexOf(b.id) > -1; }), total = inv.reduce(function (s, b) { return s + you(b); }, 0);
      $('m-pay-title').textContent = mode === 'pay' ? 'Pay ' + D.inr(total) : 'Add a card';
      $('payLead').textContent = mode === 'pay' ? 'Secure demo payment. No money will move. Try card 4111 1111 1111 1111.' : 'Save a card for faster payments. We store only the last four digits.';
      $('paySum').hidden = mode !== 'pay';
      $('paySum').innerHTML = inv.map(function (b) { return '<div><dt>' + E(b.id + ' · ' + b.desc) + '</dt><dd>' + D.inr(you(b)) + '</dd></div>'; }).join('') + '<div><dt><strong>Total</strong></dt><dd>' + D.inr(total) + '</dd></div>';
      var ms = mode === 'pay' ? D.methods() : [];
      $('payMethods').hidden = !ms.length;
      $('payMethods').innerHTML = ms.map(function (m) { return '<label class="pay-opt"><input type="radio" name="method" value="' + m.id + '"' + (m.primary ? ' checked' : '') + '><span>' + E(label(m)) + '</span></label>'; }).join('') +
        (ms.length ? '<label class="pay-opt"><input type="radio" name="method" value="new"><span>A new card</span></label>' : '');
      setNew(!ms.length);
      $('paySave').checked = mode === 'add'; $('paySave').closest('.field').hidden = mode === 'add';
      ['pay-name', 'pay-num', 'pay-exp', 'pay-cvv'].forEach(function (id) { $(id).value = ''; $(id).removeAttribute('aria-invalid'); var er = $(id + '-error'); if (er) er.textContent = ''; });
      $('paySubmit').textContent = mode === 'pay' ? 'Pay ' + D.inr(total) : 'Save card';
      T.openModal('m-pay', opener);
    }
    $('payMethods').addEventListener('change', function (e) { setNew(e.target.value === 'new'); if (e.target.value === 'new') $('pay-name').focus(); });
    $('payAllBtn').addEventListener('click', function () { openPay(D.bills().filter(open).map(function (b) { return b.id; }), this); });
    $('addMethodBtn').addEventListener('click', function () { openPay(null, this); });

    $('pay-num').addEventListener('input', function () { var d = this.value.replace(/\D/g, '').slice(0, 16); this.value = d.replace(/(.{4})/g, '$1 ').trim(); });
    $('pay-exp').addEventListener('input', function (e) { var d = this.value.replace(/\D/g, '').slice(0, 4); this.value = d.length > 2 || (d.length === 2 && e.inputType !== 'deleteContentBackward') ? d.slice(0, 2) + '/' + d.slice(2) : d; });
    $('pay-cvv').addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 4); });
    function luhn(n) { var s = 0, alt = false; for (var i = n.length - 1; i >= 0; i--) { var d = +n[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; } return s % 10 === 0; }
    function cardErrors() {
      var errs = {}, num = $('pay-num').value.replace(/\s/g, ''), exp = $('pay-exp').value, cvv = $('pay-cvv').value;
      if (num && (num.length < 13 || !luhn(num))) errs['pay-num'] = 'Enter a valid card number (try 4111 1111 1111 1111).';
      if (exp) {
        var m = exp.match(/^(\d{2})\/(\d{2})$/), now = new Date();
        if (!m || +m[1] < 1 || +m[1] > 12) errs['pay-exp'] = 'Use the format MM/YY.';
        else if (2000 + +m[2] < now.getFullYear() || (2000 + +m[2] === now.getFullYear() && +m[1] < now.getMonth() + 1)) errs['pay-exp'] = 'This card has expired.';
      }
      if (cvv && !/^\d{3,4}$/.test(cvv)) errs['pay-cvv'] = 'The CVV is the 3 or 4 digits on the back of the card.';
      return errs;
    }
    form.addEventListener('submit', function (e) {
      if (cardFields.hidden) return;
      var errs = cardErrors(), first = null;
      ['pay-num', 'pay-exp', 'pay-cvv'].forEach(function (id) { var msg = errs[id] || ''; $(id + '-error').textContent = msg; if (msg) { $(id).setAttribute('aria-invalid', 'true'); if (!first) first = $(id); } });
      var empty = Array.prototype.some.call(cardFields.querySelectorAll('input[required]'), function (i) { return !i.value.trim(); });
      if (first && !empty) { e.preventDefault(); e.stopImmediatePropagation(); first.focus(); }
    }, true);
    form.addEventListener('form:success', function () {
      var btn = $('paySubmit'), isNew = !cardFields.hidden, num = $('pay-num').value.replace(/\s/g, '');
      btn.classList.add('is-busy'); btn.textContent = mode === 'pay' ? 'Processing...' : 'Saving...';
      setTimeout(function () {
        btn.classList.remove('is-busy');
        if (isNew && (mode === 'add' || $('paySave').checked)) {
          var ms = D.methods(); ms.push({ id: 'pm' + Date.now(), type: 'card', brand: num[0] === '4' ? 'Visa' : num[0] === '5' ? 'Mastercard' : 'RuPay', last4: num.slice(-4), exp: $('pay-exp').value, primary: !ms.length }); D.saveMethods(ms);
        }
        T.closeModal('m-pay');
        if (mode === 'pay') {
          var all = D.bills(), total = 0;
          all.forEach(function (b) { if (paying.indexOf(b.id) > -1) { total += you(b); b.status = 'paid'; b.paidOn = D.today(); } });
          D.saveBills(all);
          T.toast('Payment of ' + D.inr(total) + ' received. Receipt RCPT-' + Math.floor(100000 + Math.random() * 899999) + ' is ready in your bills.', 'ok', 5000);
        } else T.toast('Card ending ' + num.slice(-4) + ' saved', 'ok');
        renderBalance(); renderBills(); renderMethods();
      }, 900);
    });

    $('emiBtn').addEventListener('click', function () { T.openModal('m-emi', this); });
    $('emiForm').addEventListener('form:success', function () { T.closeModal('m-emi'); T.toast('EMI request sent. Our billing team will call you within one working day.', 'ok'); });

    renderBalance(); renderBills(); renderClaims(); renderMethods();
    var q = new URLSearchParams(location.search).get('pay');
    if (q === 'all' && D.bills().some(open)) openPay(D.bills().filter(open).map(function (b) { return b.id; }));
    else if (q && D.bills().some(function (b) { return b.id === q && open(b); })) openPay([q]);
    if (location.hash === '#claims') setTimeout(function () { $('claims').scrollIntoView(); }, 100);
  });
})();
