/* Departments: ?cat=<category> preselects a filter chip */
(function () {
  var cat = new URLSearchParams(location.search).get('cat');
  if (!cat) return;
  var chip = document.querySelector('[data-filter-group="#deptGrid"] [data-filter="' + cat.replace(/[^a-z-]/g, '') + '"]');
  if (chip) chip.click();
})();
