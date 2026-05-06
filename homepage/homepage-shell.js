(function () {
  var script = document.currentScript;
  var base = script ? new URL('.', script.src).href : './';
  var version = '20260506d';

  function getFlag(name, defaultValue) {
    if (!script) return defaultValue;
    var value = script.getAttribute('data-' + name);
    if (value == null) return defaultValue;
    return value !== 'false';
  }

  function appendScript(src) {
    if (document.querySelector('script[src="' + src + '"]')) return;
    var el = document.createElement('script');
    el.src = src;
    document.body.appendChild(el);
  }

  appendScript(new URL('homepage-analytics.js?v=' + version, base).href);

  if (getFlag('header', true)) {
    appendScript(new URL('homepage-topbar.js?v=' + version, base).href);
  }

  if (getFlag('footer', true)) {
    appendScript(new URL('site-footer.js?v=' + version, base).href);
  }
})();
