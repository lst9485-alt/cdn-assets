// 글로벌 네비게이션 바 — site-config.js 기준 렌더링
(function() {
  var currentPath = location.pathname;
  var root = getRootPath();

  if (currentPath.indexOf('/dashboard') !== -1 &&
      currentPath.indexOf('business.html') === -1 &&
      currentPath.indexOf('branding.html') === -1) {
    return;
  }

  loadSiteConfig(render);

  function render(site) {
    if (!site) {
      return;
    }

    var nav = document.createElement('nav');
    nav.id = 'global-nav';
    nav.innerHTML = ''
      + '<div class="nav-inner">'
      + '<a href="' + root + '" class="nav-brand">운영 대시보드</a>'
      + '<div class="nav-links">'
      + site.sections.map(renderSection).join('')
      + '</div></div>';

    var style = document.createElement('style');
    style.textContent = ''
      + '#global-nav { background: white; border-bottom: 2px solid #E2E8F0; padding: 0 20px; position: sticky; top: 0; z-index: 100; }'
      + '.nav-inner { max-width: 800px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; height: 48px; }'
      + '.nav-brand { font-size: 15px; font-weight: 800; color: #051C2C; text-decoration: none; letter-spacing: -0.3px; }'
      + '.nav-brand:hover { color: #0077C8; }'
      + '.nav-links { display: flex; align-items: center; gap: 4px; }'
      + '.nav-link { font-size: 13px; font-weight: 600; color: #64748B; text-decoration: none; padding: 6px 12px; border-radius: 6px; transition: all 0.15s; cursor: pointer; }'
      + '.nav-link:hover { color: #0077C8; background: #F1F5F9; }'
      + '.nav-link.active { color: #0077C8; background: #E8F3FF; }'
      + '.nav-dropdown { position: relative; }'
      + '.nav-dropdown-menu { display: none; position: absolute; top: 100%; right: 0; background: white; border: 2px solid #E2E8F0; border-radius: 10px; padding: 6px; min-width: 160px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); margin-top: 4px; }'
      + '.nav-dropdown:hover .nav-dropdown-menu { display: block; }'
      + '.nav-dropdown-menu a { display: block; padding: 8px 12px; font-size: 13px; font-weight: 600; color: #334155; text-decoration: none; border-radius: 6px; }'
      + '.nav-dropdown-menu a:hover { background: #F1F5F9; color: #0077C8; }'
      + '@media (max-width: 480px) { .nav-brand { font-size: 13px; } .nav-link { font-size: 12px; padding: 6px 8px; } }';

    document.head.appendChild(style);
    document.body.insertBefore(nav, document.body.firstChild);
  }

  function renderSection(section) {
    var navConfig = section.nav || {};
    var active = isActive(navConfig.activeMatch) ? ' active' : '';

    if (navConfig.type === 'dropdown') {
      var items = section.items.filter(function(item) { return item.navVisible; });
      return ''
        + '<div class="nav-dropdown">'
        + '<a class="nav-link' + active + '">' + escapeHtml(navConfig.label) + ' ▾</a>'
        + '<div class="nav-dropdown-menu">'
        + items.map(function(item) {
          var h = item.href.indexOf('http') === 0 ? item.href : root + item.href;
          return '<a href="' + h + '">' + escapeHtml(item.navLabel || item.title) + '</a>';
        }).join('')
        + '</div></div>';
    }

    var navHref = navConfig.href.indexOf('http') === 0 ? navConfig.href : root + navConfig.href;
    return '<a href="' + navHref + '" class="nav-link' + active + '">' + escapeHtml(navConfig.label) + '</a>';
  }

  function isActive(matchers) {
    if (!matchers) {
      return false;
    }
    return matchers.some(function(matcher) {
      return currentPath.indexOf(matcher) !== -1;
    });
  }

  function loadSiteConfig(callback) {
    if (window.DASHBOARD_SITE) {
      callback(window.DASHBOARD_SITE);
      return;
    }

    var existing = document.getElementById('dashboard-site-config');
    if (existing) {
      existing.addEventListener('load', function() {
        callback(window.DASHBOARD_SITE);
      }, { once: true });
      return;
    }

    var script = document.createElement('script');
    script.id = 'dashboard-site-config';
    script.src = root + 'site-config.js';
    script.onload = function() {
      callback(window.DASHBOARD_SITE);
    };
    script.onerror = function() {};
    document.head.appendChild(script);
  }

  function getRootPath() {
    var split = location.pathname.split('cdn-assets/');
    var pathAfterAssets = split.length > 1 ? split[1] : location.pathname.replace(/^\//, '');
    var segments = pathAfterAssets.split('/').filter(Boolean);
    if (segments.length > 0 && segments[segments.length - 1].includes('.html') && segments[segments.length - 1] !== 'index.html') {
      segments.pop();
    }
    if (segments.length > 0 && segments[segments.length - 1] === 'index.html') {
      segments.pop();
    }
    return segments.length === 0 ? './' : '../'.repeat(segments.length);
  }

  function escapeHtml(value) {
    var el = document.createElement('span');
    el.textContent = value;
    return el.innerHTML;
  }
})();
