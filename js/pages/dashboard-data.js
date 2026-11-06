/* Northcrest: shared mock data for the patient dashboard. Seeded into localStorage on first use; nothing leaves the browser.
   window.NorthcrestData  (doctors come from data/site-data.js, generated from data/doctors.json by scripts/build.py) */
(function () {
  'use strict';
  var P = 'northcrest-';
  var K = { appts: P + 'appointments', profile: P + 'profile', notify: P + 'notify', bills: P + 'bills', methods: P + 'methods',
    claims: P + 'claims', refills: P + 'refills', family: P + 'family', accounts: P + 'accounts' };
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function rd(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function wr(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var p = String(s).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
  function addDays(n, from) { var d = from ? parse(from) : new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return iso(d); }
  function today() { return iso(new Date()); }
  function dow(s) { return parse(s).getDay(); }
  function fmt(s, style) {
    var d = parse(s);
    if (style === 'long') return DAYS_LONG[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS_LONG[d.getMonth()];
    if (style === 'day') return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
    if (style === 'month') return MONTHS[d.getMonth()];
    if (style === 'monthyear') return MONTHS_LONG[d.getMonth()] + ' ' + d.getFullYear();
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function inr(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
  function hash(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function ref(prefix) { return (prefix || 'NC') + '-' + Math.floor(10000 + Math.random() * 89999); }
  function t12(t) { var h = +t.slice(0, 2), m = t.slice(3, 5); return (h % 12 || 12) + ':' + m + (h < 12 ? ' am' : ' pm'); }

  /* ---------- doctors + departments (from the generated site data) ---------- */
  var DOCTORS = (window.NORTHCREST_DOCTORS || []).slice();
  var DEPT_NAMES = {};
  (window.NORTHCREST_DEPARTMENTS || []).forEach(function (d) { DEPT_NAMES[d.slug] = d.name; });
  var FALLBACK_DEPT = { cardiology: 'Cardiology', neurology: 'Neurology & Neurosurgery', orthopaedics: 'Orthopaedics', oncology: 'Oncology', paediatrics: 'Paediatrics & Neonatology',
    gynaecology: 'Obstetrics & Gynaecology', gastroenterology: 'Gastroenterology', pulmonology: 'Pulmonology' };
  function deptName(slug) { return DEPT_NAMES[slug] || FALLBACK_DEPT[slug] || slug; }
  function doctor(id) { for (var i = 0; i < DOCTORS.length; i++) if (DOCTORS[i].id === id) return DOCTORS[i]; return { id: id, name: 'Northcrest doctor', department: 'cardiology', chips: [], opd: [], opdTime: '9:00 to 14:00', fee: 1000, title: 'Consultant' }; }
  function bookableDepts() {
    var seen = {}, out = [];
    DOCTORS.forEach(function (d) { if (!seen[d.department]) { seen[d.department] = 1; out.push({ slug: d.department, name: deptName(d.department), count: 0 }); } out.filter(function (x) { return x.slug === d.department; })[0].count++; });
    return out;
  }
  function doctorsIn(slug) { return DOCTORS.filter(function (d) { return d.department === slug; }); }
  function initials(name) { return name.replace(/^Dr\.?\s+/, '').split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(); }

  /* ---------- slots: 30-minute OPD slots on the doctor's OPD days ---------- */
  function opdRange(doc) {
    var m = String(doc.opdTime || '9:00 to 14:00').match(/(\d{1,2}):(\d{2})\D+(\d{1,2}):(\d{2})/);
    return m ? [+m[1] * 60 + +m[2], +m[3] * 60 + +m[4]] : [540, 840];
  }
  function worksOn(doc, date) { return (doc.opd || []).indexOf(DAYS[dow(date)]) > -1; }
  function onLeave(doc, date) { return doc.status === 'away' && date <= addDays(6); }
  function slots(docId, date, ignoreId) {
    var doc = doctor(docId), r = opdRange(doc), out = [];
    if (!worksOn(doc, date) || onLeave(doc, date)) return out;
    var mine = appointments().filter(function (a) { return a.status === 'confirmed' && a.date === date && a.id !== ignoreId; }).map(function (a) { return a.time; });
    for (var m = r[0]; m < r[1]; m += 30) {
      var t = pad(Math.floor(m / 60)) + ':' + pad(m % 60), h = hash(docId + date + t);
      var past = date === today() && m <= new Date().getHours() * 60 + new Date().getMinutes() + 60;
      out.push({ time: t, taken: past || mine.indexOf(t) > -1 || h % 3 === 0 || (doc.status === 'busy' && h % 5 < 2), part: m < 720 ? 'Morning' : m < 960 ? 'Afternoon' : 'Evening' });
    }
    return out;
  }
  function freeCount(docId, date, ignoreId) { return slots(docId, date, ignoreId).filter(function (s) { return !s.taken; }).length; }

  /* ---------- seeds ---------- */
  var SEED_PROFILE = {
    first: 'Priya', last: 'Raman', email: 'priya.raman@example.com', phone: '9845012345', dob: '1990-06-14', gender: 'Female', patientId: 'NC-48213', uhid: 'UHID 7720-4481',
    address: '18 Palm Grove Road, Indiranagar, Bengaluru 560038', bloodGroup: 'B+', height: '163', weight: '68', allergies: 'Penicillin (rash)', conditions: 'Mild hypertension, prediabetes (PCOS)',
    emName: 'Arjun Raman', emRelation: 'Spouse', emPhone: '9845098765', insurer: 'Suraksha Health Insurance', policy: 'SHI-44-918275'
  };
  var SEED_NOTIFY = { apptSms: true, apptEmail: true, reports: true, meds: true, bills: true, whatsapp: false, news: false };
  var SEED_FAMILY = [
    { id: 'f1', name: 'Arjun Raman', relation: 'Spouse', dob: '1987-02-03', phone: '9845098765' },
    { id: 'f2', name: 'Diya Raman', relation: 'Daughter', dob: '2018-09-21', phone: '' },
    { id: 'f3', name: 'Kamala Iyer', relation: 'Mother', dob: '1961-11-08', phone: '9845011122' }
  ];
  function seedAppts() {
    return [
      { id: 'a1', ref: 'NC-48210', doctor: 'doc-2', date: nextOpd('doc-2', 2), time: '11:30', type: 'in-person', status: 'confirmed', reason: 'Cardiology follow-up after echo' },
      { id: 'a2', ref: 'NC-48377', doctor: 'doc-12', date: nextOpd('doc-12', 8), time: '11:00', type: 'video', status: 'confirmed', reason: 'Review of seasonal wheeze' },
      { id: 'a3', ref: 'NC-47102', doctor: 'doc-2', date: addDays(-24), time: '09:30', type: 'in-person', status: 'completed', reason: 'Palpitations and chest discomfort on exertion',
        notes: 'ECG normal. Echo booked, statin started for raised LDL. Walk 30 minutes daily; review in 4 weeks.' },
      { id: 'a4', ref: 'NC-46655', doctor: 'doc-5', date: addDays(-38), time: '15:00', type: 'in-person', status: 'cancelled', reason: 'Ankle physiotherapy review' },
      { id: 'a5', ref: 'NC-46118', doctor: 'doc-5', date: addDays(-52), time: '11:30', type: 'in-person', status: 'completed', reason: 'Left ankle sprain while running',
        notes: 'Grade II lateral ligament sprain, no fracture on X-ray. Ankle brace for 3 weeks, physiotherapy for 6 weeks.' },
      { id: 'a6', ref: 'NC-45320', doctor: 'doc-11', date: addDays(-80), time: '10:00', type: 'video', status: 'completed', reason: 'Acidity and bloating',
        notes: 'Likely reflux. Pantoprazole for 2 weeks, smaller late meals, avoid lying down for 2 hours after dinner.' },
      { id: 'a7', ref: 'NC-44071', doctor: 'doc-12', date: addDays(-112), time: '12:00', type: 'in-person', status: 'completed', reason: 'Fever and cough for 5 days',
        notes: 'Right lower lobe pneumonia. Admitted for 4 days, IV antibiotics, discharged stable.' }
    ];
  }
  function nextOpd(id, minAhead) {
    var d = addDays(minAhead), doc = doctor(id), g = 0;
    while (!worksOn(doc, d) && g++ < 14) d = addDays(1, d);
    return d;
  }
  function seedBills() {
    return [
      { id: 'NCH-INV-58214', date: addDays(-24), desc: 'Cardiology OPD consultation and 2D echocardiogram', dept: 'cardiology', total: 4500, insurance: 0, status: 'due', due: addDays(6) },
      { id: 'NCH-INV-58190', date: addDays(-25), desc: 'Lab tests: lipid profile, HbA1c, CBC, thyroid', dept: 'laboratory', total: 2850, insurance: 0, status: 'due', due: addDays(-1) },
      { id: 'NCH-INV-57742', date: addDays(-66), desc: 'In-patient stay, 3 days (viral fever, low platelets)', dept: 'medicine', total: 72400, insurance: 61000, status: 'due', due: addDays(12) },
      { id: 'NCH-INV-57610', date: addDays(-52), desc: 'Ankle X-ray and sports medicine consultation', dept: 'orthopaedics', total: 2350, insurance: 0, status: 'paid', due: addDays(-38), paidOn: addDays(-52) },
      { id: 'NCH-INV-57455', date: addDays(-24), desc: 'Pharmacy: 30-day medicines', dept: 'pharmacy', total: 1640, insurance: 0, status: 'paid', due: addDays(-10), paidOn: addDays(-24) },
      { id: 'NCH-INV-56021', date: addDays(-108), desc: 'In-patient stay, 4 days (pneumonia)', dept: 'pulmonology', total: 86400, insurance: 78000, status: 'paid', due: addDays(-94), paidOn: addDays(-108) }
    ];
  }
  function seedClaims() {
    return [
      { id: 'CLM-2026-77104', bill: 'NCH-INV-57742', what: 'In-patient stay, viral fever', type: 'Cashless', claimed: 72400, approved: 61000, status: 'approved', step: 2, updated: addDays(-6), note: 'Approved. ₹11,400 is not covered (room upgrade and consumables).' },
      { id: 'CLM-2026-77251', bill: 'NCH-INV-58214', what: 'Cardiology OPD and echocardiogram', type: 'Reimbursement', claimed: 4500, approved: 0, status: 'query', step: 1, updated: addDays(-3), note: 'TPA asked for the doctor\'s prescription for the echo. Upload it to continue.' },
      { id: 'CLM-2026-70388', bill: 'NCH-INV-56021', what: 'In-patient stay, pneumonia', type: 'Cashless', claimed: 86400, approved: 78000, status: 'settled', step: 3, updated: addDays(-100), note: 'Settled directly with the hospital.' }
    ];
  }
  function seedMethods() {
    return [
      { id: 'pm1', type: 'card', brand: 'Visa', last4: '4821', exp: '09/28', primary: true },
      { id: 'pm2', type: 'upi', label: 'priya.raman@okhdfc', primary: false }
    ];
  }

  /* ---------- reports (static, dates relative to today) ---------- */
  function months(n) { var out = []; for (var i = n - 1; i >= 0; i--) { var d = new Date(); d.setDate(5); d.setMonth(d.getMonth() - i); out.push(MONTHS[d.getMonth()]); } return out; }
  var REPORTS = [
    { id: 'r1', type: 'lab', name: 'Lipid profile', date: addDays(-25), doctor: 'doc-2', lab: 'Northcrest Central Laboratory', status: 'ready',
      values: [['Total cholesterol', 214, 'mg/dL', 'Below 200', 'high'], ['LDL cholesterol', 138, 'mg/dL', 'Below 100', 'high'], ['HDL cholesterol', 42, 'mg/dL', 'Above 40', 'ok'], ['Triglycerides', 168, 'mg/dL', 'Below 150', 'high'], ['VLDL', 34, 'mg/dL', '5 to 40', 'ok']],
      trend: { label: 'LDL cholesterol', unit: 'mg/dL', values: [172, 165, 158, 151, 144, 138], target: 100, targetLabel: 'Goal under' },
      comment: 'LDL is coming down on diet changes; statin started on ' + fmt(addDays(-24)) + '. Repeat in 3 months.' },
    { id: 'r2', type: 'lab', name: 'HbA1c and fasting glucose', date: addDays(-25), doctor: 'doc-2', lab: 'Northcrest Central Laboratory', status: 'ready',
      values: [['HbA1c', 6.4, '%', 'Below 5.7', 'high'], ['Fasting blood glucose', 112, 'mg/dL', '70 to 100', 'high'], ['Estimated average glucose', 137, 'mg/dL', 'Below 117', 'high']],
      trend: { label: 'HbA1c', unit: '%', values: [6.9, 6.8, 6.7, 6.6, 6.5, 6.4], target: 5.7, targetLabel: 'Normal under' },
      comment: 'Prediabetes range, improving. Keep up the walking and lower refined carbs.' },
    { id: 'r3', type: 'lab', name: 'Complete blood count (CBC)', date: addDays(-25), doctor: 'doc-2', lab: 'Northcrest Central Laboratory', status: 'ready',
      values: [['Haemoglobin', 12.6, 'g/dL', '12.0 to 15.5', 'ok'], ['Total WBC count', 7200, '/µL', '4,000 to 11,000', 'ok'], ['Platelets', 2.4, 'lakh/µL', '1.5 to 4.5', 'ok'], ['ESR', 18, 'mm/hr', '0 to 15', 'high'], ['MCV', 86, 'fL', '80 to 100', 'ok']],
      trend: { label: 'Haemoglobin', unit: 'g/dL', values: [11.6, 11.9, 12.1, 12.0, 12.4, 12.6], target: 12, targetLabel: 'Normal from' },
      comment: 'Blood count normal. ESR slightly high, likely after the recent viral fever.' },
    { id: 'r4', type: 'lab', name: 'Thyroid profile (T3, T4, TSH)', date: addDays(-25), doctor: 'doc-2', lab: 'Northcrest Central Laboratory', status: 'ready',
      values: [['TSH', 2.1, 'µIU/mL', '0.4 to 4.0', 'ok'], ['Free T3', 3.2, 'pg/mL', '2.3 to 4.2', 'ok'], ['Free T4', 1.2, 'ng/dL', '0.9 to 1.7', 'ok']],
      trend: { label: 'TSH', unit: 'µIU/mL', values: [2.6, 2.4, 2.5, 2.2, 2.3, 2.1], target: 4, targetLabel: 'Upper limit' },
      comment: 'Thyroid function normal.' },
    { id: 'r5', type: 'radiology', name: '2D echocardiogram', date: addDays(-22), doctor: 'doc-2', lab: 'Northcrest Heart Institute', status: 'ready',
      values: [['Ejection fraction (LVEF)', 60, '%', '55 to 70', 'ok'], ['Left ventricle size', 'Normal', '', 'Normal', 'ok'], ['Valves', 'Trace mitral regurgitation', '', 'None to trace', 'ok'], ['Wall motion', 'No regional abnormality', '', 'Normal', 'ok'], ['Diastolic function', 'Grade I dysfunction', '', 'Normal', 'low']],
      trend: { label: 'LVEF', unit: '%', values: [58, 59, 59, 60, 60, 60], target: 55, targetLabel: 'Normal from' },
      comment: 'Heart pumps normally. Mild stiffness of the heart muscle, common with raised blood pressure.' },
    { id: 'r6', type: 'radiology', name: 'X-ray left ankle (AP and lateral)', date: addDays(-52), doctor: 'doc-5', lab: 'Northcrest Imaging Centre', status: 'ready',
      values: [['Fracture', 'None seen', '', 'None', 'ok'], ['Joint alignment', 'Normal mortise', '', 'Normal', 'ok'], ['Soft tissue', 'Swelling over the lateral malleolus', '', 'None', 'high'], ['Bone density', 'Normal for age', '', 'Normal', 'ok']],
      trend: null,
      comment: 'No fracture. Soft-tissue swelling fits a lateral ligament sprain.' },
    { id: 'r7', type: 'radiology', name: 'Chest X-ray (PA view)', date: addDays(-104), doctor: 'doc-12', lab: 'Northcrest Imaging Centre', status: 'ready',
      values: [['Lung fields', 'Clear, earlier right lower zone patch resolved', '', 'Clear', 'ok'], ['Heart size', 'Normal', '', 'Normal', 'ok'], ['Costophrenic angles', 'Sharp', '', 'Sharp', 'ok']],
      trend: null,
      comment: 'Follow-up film after pneumonia: fully cleared.' },
    { id: 'r8', type: 'discharge', name: 'Discharge summary: community-acquired pneumonia', date: addDays(-108), doctor: 'doc-12', lab: 'Ward 4B, Pulmonology', status: 'ready',
      values: [['Admitted', fmt(addDays(-112)), '', '', 'ok'], ['Discharged', fmt(addDays(-108)), '', '', 'ok'], ['Diagnosis', 'Right lower lobe pneumonia', '', '', 'ok'], ['Treatment', 'IV antibiotics 3 days, oral 5 days, nebulisation', '', '', 'ok'], ['Condition at discharge', 'Stable, oxygen saturation 98% on room air', '', '', 'ok']],
      trend: { label: 'Oxygen saturation', unit: '%', values: [91, 94, 96, 98], labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4'], target: 95, targetLabel: 'Normal from' },
      comment: 'Finish the oral antibiotics, rest for one week, chest X-ray in 2 weeks.' },
    { id: 'r9', type: 'discharge', name: 'Discharge summary: viral fever with low platelets', date: addDays(-63), doctor: 'doc-12', lab: 'Ward 3A, Internal Medicine', status: 'ready',
      values: [['Admitted', fmt(addDays(-66)), '', '', 'ok'], ['Discharged', fmt(addDays(-63)), '', '', 'ok'], ['Diagnosis', 'Viral fever with thrombocytopenia (dengue NS1 negative)', '', '', 'ok'], ['Treatment', 'IV fluids, paracetamol, daily platelet monitoring', '', '', 'ok'], ['Condition at discharge', 'Afebrile, platelets 1.6 lakh and rising', '', '', 'ok']],
      trend: { label: 'Platelets', unit: 'lakh/µL', values: [0.9, 1.1, 1.3, 1.6], labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4'], target: 1.5, targetLabel: 'Normal from' },
      comment: 'Drink plenty of fluids, avoid painkillers other than paracetamol, repeat CBC in one week.' },
    { id: 'r10', type: 'lab', name: 'Vitamin D and vitamin B12', date: addDays(-1), doctor: 'doc-2', lab: 'Northcrest Central Laboratory', status: 'processing', values: [], trend: null,
      comment: 'Sample received. Results expected by ' + fmt(addDays(1), 'day') + '.' }
  ];
  REPORTS.forEach(function (r) { if (r.trend && !r.trend.labels) r.trend.labels = months(r.trend.values.length); });
  var TYPE_LABEL = { lab: 'Lab test', radiology: 'Radiology', discharge: 'Discharge summary' };
  function report(id) { for (var i = 0; i < REPORTS.length; i++) if (REPORTS[i].id === id) return REPORTS[i]; return null; }
  function flagCount(r) { return r.values.filter(function (v) { return v[4] !== 'ok'; }).length; }

  /* ---------- prescriptions ---------- */
  var PRESCRIPTIONS = [
    { id: 'rx1', name: 'Atorvastatin', strength: '20 mg tablet', dose: [0, 0, 1], food: 'After dinner', purpose: 'Lowers LDL cholesterol', doctor: 'doc-2', start: addDays(-24), days: 90, refills: 2, qty: 30, status: 'active' },
    { id: 'rx2', name: 'Telmisartan', strength: '40 mg tablet', dose: [1, 0, 0], food: 'Before breakfast', purpose: 'Blood pressure', doctor: 'doc-2', start: addDays(-24), days: 90, refills: 2, qty: 30, status: 'active' },
    { id: 'rx3', name: 'Metformin SR', strength: '500 mg tablet', dose: [1, 0, 1], food: 'With meals', purpose: 'Blood sugar (prediabetes, PCOS)', doctor: 'doc-2', start: addDays(-24), days: 90, refills: 2, qty: 60, status: 'active' },
    { id: 'rx4', name: 'Montelukast', strength: '10 mg tablet', dose: [0, 0, 1], food: 'At bedtime', purpose: 'Seasonal wheeze', doctor: 'doc-12', start: addDays(-20), days: 30, refills: 0, qty: 30, status: 'active' },
    { id: 'rx5', name: 'Vitamin D3', strength: '60,000 IU sachet', dose: [1, 0, 0], food: 'Once a week, Sunday, with milk', purpose: 'Vitamin D top-up', doctor: 'doc-2', start: addDays(-24), days: 56, refills: 1, qty: 8, status: 'active', weekly: true },
    { id: 'rx6', name: 'Amoxicillin + clavulanate', strength: '625 mg tablet', dose: [1, 0, 1], food: 'After food', purpose: 'Pneumonia (course completed)', doctor: 'doc-12', start: addDays(-108), days: 5, refills: 0, qty: 10, status: 'past' },
    { id: 'rx7', name: 'Etoricoxib', strength: '90 mg tablet', dose: [0, 0, 1], food: 'After dinner', purpose: 'Ankle sprain pain and swelling', doctor: 'doc-5', start: addDays(-52), days: 7, refills: 0, qty: 7, status: 'past' },
    { id: 'rx8', name: 'Pantoprazole', strength: '40 mg tablet', dose: [1, 0, 0], food: '30 minutes before breakfast', purpose: 'Acidity', doctor: 'doc-11', start: addDays(-80), days: 14, refills: 0, qty: 14, status: 'past' }
  ];
  function rx(id) { for (var i = 0; i < PRESCRIPTIONS.length; i++) if (PRESCRIPTIONS[i].id === id) return PRESCRIPTIONS[i]; return null; }
  function rxEnd(r) { return addDays(r.days, r.start); }
  function rxDaysLeft(r) { return Math.max(0, Math.round((parse(rxEnd(r)) - parse(today())) / 864e5)); }

  /* ---------- vitals (home readings + clinic) ---------- */
  var VITALS = {
    bp: { label: 'Systolic blood pressure', unit: 'mmHg', values: [146, 142, 139, 136, 132, 128], target: 130, targetLabel: 'Goal under', range: 'Under 130' },
    sugar: { label: 'Fasting glucose', unit: 'mg/dL', values: [128, 124, 121, 118, 115, 112], target: 100, targetLabel: 'Normal under', range: '70 to 100' },
    weight: { label: 'Weight', unit: 'kg', values: [72.4, 71.6, 70.8, 69.9, 68.8, 68.0], target: 64, targetLabel: 'Goal', range: 'Goal 64 kg' }
  };
  Object.keys(VITALS).forEach(function (k) { VITALS[k].labels = months(6); });

  /* ---------- accessors ---------- */
  function list(key, seed) { var v = rd(key); if (!Array.isArray(v)) { v = seed(); wr(key, v); } return v; }
  function obj(key, seed) { var v = rd(key); if (!v || typeof v !== 'object' || Array.isArray(v)) { v = JSON.parse(JSON.stringify(seed)); wr(key, v); } return v; }
  function appointments() { return list(K.appts, seedAppts); }
  function saveAppointments(v) { wr(K.appts, v); }
  function upcoming() { return appointments().filter(function (a) { return a.status === 'confirmed' && a.date >= today(); }).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; }); }
  function past() { return appointments().filter(function (a) { return a.status !== 'confirmed' || a.date < today(); }).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? 1 : -1; }); }
  function findAppt(id) { return appointments().filter(function (a) { return a.id === id; })[0] || null; }
  function updateAppt(id, patch) { var l = appointments(); l.forEach(function (a) { if (a.id === id) for (var k in patch) a[k] = patch[k]; }); saveAppointments(l); }
  function addAppt(a) { var l = appointments(); a.id = 'a' + Date.now(); a.ref = ref('NC'); a.status = 'confirmed'; l.push(a); saveAppointments(l); return a; }
  function profile() {
    var p = obj(K.profile, SEED_PROFILE), ch = false;
    Object.keys(SEED_PROFILE).forEach(function (k) { if (p[k] === undefined) { p[k] = p.email === SEED_PROFILE.email ? SEED_PROFILE[k] : ''; ch = true; } });
    if (!p.passwordChanged) { p.passwordChanged = addDays(-64); ch = true; }
    if (ch) wr(K.profile, p);
    return p;
  }
  function saveProfile(p) { wr(K.profile, p); }
  function notify() { return obj(K.notify, SEED_NOTIFY); }
  function saveNotify(n) { wr(K.notify, n); }
  function family() { return list(K.family, function () { return JSON.parse(JSON.stringify(SEED_FAMILY)); }); }
  function saveFamily(v) { wr(K.family, v); }
  function bills() { return list(K.bills, seedBills); }
  function saveBills(v) { wr(K.bills, v); }
  function claims() { return list(K.claims, seedClaims); }
  function saveClaims(v) { wr(K.claims, v); }
  function methods() { return list(K.methods, seedMethods); }
  function saveMethods(v) { wr(K.methods, v); }
  function refills() { return list(K.refills, function () { return []; }); }
  function saveRefills(v) { wr(K.refills, v); }
  function billStatus(b) { if (b.status === 'due' && b.due < today()) return 'overdue'; return b.status; }
  function youPay(b) { return b.total - b.insurance; }
  function isOpen(b) { var s = billStatus(b); return s === 'due' || s === 'overdue'; }
  function outstanding() { return bills().filter(isOpen).reduce(function (s, b) { return s + youPay(b); }, 0); }
  function reset() { Object.keys(K).forEach(function (k) { if (k !== 'accounts') try { localStorage.removeItem(K[k]); } catch (e) { /* noop */ } }); }

  var STATUS = {
    confirmed: ['pill--ok', 'Confirmed'], completed: ['pill--ok', 'Completed'], cancelled: ['pill--bad', 'Cancelled'], 'no-show': ['pill--bad', 'Missed'],
    paid: ['pill--ok', 'Paid'], due: ['pill--warn', 'Due'], overdue: ['pill--bad', 'Overdue'], ready: ['pill--ok', 'Ready'], processing: ['pill--info', 'Processing'],
    approved: ['pill--ok', 'Approved'], settled: ['pill--ok', 'Settled'], query: ['pill--warn', 'Query raised'], review: ['pill--info', 'Under review'],
    active: ['pill--ok', 'Active'], past: ['pill--info', 'Completed'], requested: ['pill--info', 'Refill requested'],
    high: ['pill--bad', 'High'], low: ['pill--warn', 'Borderline'], ok: ['pill--ok', 'Normal']
  };
  function statusHtml(s, label) { var m = STATUS[s] || ['pill--info', s]; return '<span class="pill ' + m[0] + '">' + (label || m[1]) + '</span>'; }

  /* ---------- files ---------- */
  function download(name, text, type) {
    try {
      var blob = new Blob([text], { type: type || 'text/plain' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      return true;
    } catch (e) { return false; }
  }
  function endTime(t, mins) { var m = +t.slice(0, 2) * 60 + +t.slice(3, 5) + (mins || 20); return pad(Math.floor(m / 60)) + pad(m % 60); }
  function downloadIcs(a) {
    var doc = doctor(a.doctor), d = a.date.replace(/-/g, ''), t = a.time.replace(':', '') + '00';
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Northcrest//Appointment//EN', 'BEGIN:VEVENT', 'UID:' + a.ref + '@northcrest.example', 'DTSTAMP:' + d + 'T' + t,
      'DTSTART:' + d + 'T' + t, 'DTEND:' + d + 'T' + endTime(a.time) + '00', 'SUMMARY:' + (a.type === 'video' ? 'Video consultation' : 'Appointment') + ' with ' + doc.name,
      'LOCATION:' + (a.type === 'video' ? 'Online (link sent by SMS 15 minutes before)' : 'Northcrest Multispeciality Hospital, ' + deptName(doc.department)),
      'DESCRIPTION:Reference ' + a.ref + '. Please arrive 15 minutes early with your ID and old reports.', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    download('northcrest-appointment-' + a.ref + '.ics', ics, 'text/calendar');
  }

  /* paint the patient's name + avatar alt in the app header */
  function paintShell() {
    var p = profile();
    document.querySelectorAll('.avatar-name').forEach(function (n) { n.textContent = p.first; });
    document.querySelectorAll('.avatar-btn img').forEach(function (i) { i.alt = p.first + ' ' + p.last; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paintShell); else paintShell();

  window.NorthcrestData = {
    KEYS: K, DAYS: DAYS, MONTHS: MONTHS, DOCTORS: DOCTORS, REPORTS: REPORTS, TYPE_LABEL: TYPE_LABEL, PRESCRIPTIONS: PRESCRIPTIONS, VITALS: VITALS,
    esc: esc, iso: iso, parse: parse, addDays: addDays, today: today, dow: dow, fmt: fmt, inr: inr, hash: hash, ref: ref, t12: t12, initials: initials,
    doctor: doctor, deptName: deptName, bookableDepts: bookableDepts, doctorsIn: doctorsIn, worksOn: worksOn, onLeave: onLeave, slots: slots, freeCount: freeCount,
    appointments: appointments, saveAppointments: saveAppointments, upcoming: upcoming, past: past, findAppt: findAppt, updateAppt: updateAppt, addAppt: addAppt,
    report: report, flagCount: flagCount, rx: rx, rxEnd: rxEnd, rxDaysLeft: rxDaysLeft, refills: refills, saveRefills: saveRefills,
    profile: profile, saveProfile: saveProfile, notify: notify, saveNotify: saveNotify, family: family, saveFamily: saveFamily,
    bills: bills, saveBills: saveBills, billStatus: billStatus, youPay: youPay, isOpen: isOpen, outstanding: outstanding, claims: claims, saveClaims: saveClaims,
    methods: methods, saveMethods: saveMethods, reset: reset, statusHtml: statusHtml, download: download, downloadIcs: downloadIcs, read: rd, write: wr
  };
})();
