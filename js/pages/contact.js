/* contact: the department choice fills the optional doctor list (validation is wired by js/validation.js) */
(function () {
  var dept = document.getElementById('ap-dept');
  var doc = document.getElementById('ap-doctor');
  if (!dept || !doc) return;
  var docs = (window.Northcrest && Northcrest.doctors) || window.NORTHCREST_DOCTORS || [];
  function fill() {
    var d = dept.value;
    var list = docs.filter(function (x) { return !d || x.department === d; });
    doc.innerHTML = '<option value="">' + (d && !list.length ? 'Any available doctor in this department' : 'Any available doctor') + '</option>' +
      list.map(function (x) { return '<option value="' + x.id + '">' + x.name + '</option>'; }).join('');
  }
  dept.addEventListener('change', fill);
  fill();
  /* deep links like contact.html?department=cardiology or ?doctor=doc-3 preselect the form */
  var q = new URLSearchParams(location.search);
  var qd = q.get('dept') || q.get('department') || q.get('d');
  var qdoc = q.get('doctor');
  if (qdoc) { var hit = docs.filter(function (x) { return x.id === qdoc; })[0]; if (hit) qd = hit.department; }
  if (qd && dept.querySelector('option[value="' + qd + '"]')) { dept.value = qd; fill(); }
  if (qdoc) doc.value = qdoc;
  var form = document.getElementById('apptForm');
  if (form) form.addEventListener('reset', function () { setTimeout(fill, 0); });
})();
