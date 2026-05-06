(function () {
  var GA_ID = 'G-L89MYRXFG3';
  var CLARITY_ID = 'w3oagjscnh';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  function appendScript(src, onload) {
    if (document.querySelector('script[src="' + src + '"]')) return;
    var script = document.createElement('script');
    script.async = true;
    script.src = src;
    if (onload) script.onload = onload;
    document.head.appendChild(script);
  }

  function initGa() {
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, {
      linker: {
        domains: ['lst9485-alt.github.io', 'ourdongne.com']
      }
    });
  }

  function initClarity() {
    if (window.clarity) return;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r);
      t.async = 1;
      t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_ID);
  }

  function trackSections() {
    if (!('IntersectionObserver' in window)) return;
    var seen = {};
    var sections = document.querySelectorAll('[data-section]');
    if (!sections.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var name = entry.target.getAttribute('data-section');
        if (!name || seen[name]) return;
        seen[name] = true;
        window.gtag('event', 'section_view', {
          section_name: name,
          page_path: window.location.pathname
        });
      });
    }, { threshold: 0.45 });

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  appendScript('https://www.googletagmanager.com/gtag/js?id=' + GA_ID, initGa);
  initClarity();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackSections, { once: true });
  } else {
    trackSections();
  }
})();
