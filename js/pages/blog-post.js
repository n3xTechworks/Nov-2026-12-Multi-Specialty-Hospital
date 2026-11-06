/* blog article: copy-link button with toast feedback */
(function () {
  var b = document.querySelector('[data-copy-link]');
  if (!b) return;
  b.addEventListener('click', function () {
    var url = location.href.split('#')[0];
    var ok = function () { window.Northcrest && Northcrest.toast('Link copied. Share it with family or friends.', 'ok'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, ok); else ok();
  });
})();
