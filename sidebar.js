// 오른쪽 고정 사이드바 — site-config.js 기준 렌더링
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

    var sidebar = document.createElement('aside');
    sidebar.id = 'sidebar';
    sidebar.innerHTML = site.sections.map(renderSection).join('');

    var style = document.createElement('style');
    style.textContent = ''
      + '#sidebar { position: fixed; top: 48px; right: max(16px, calc(50% - 640px)); width: 150px; height: calc(100vh - 48px); padding: 16px 0; z-index: 90; }'
      + '.sb-cat { font-size: 10px; font-weight: 800; color: #B0B8C4; letter-spacing: 1px; padding: 14px 10px 4px; text-transform: uppercase; }'
      + '.sb-link { display: flex; align-items: center; gap: 6px; padding: 6px 10px; font-size: 13px; font-weight: 600; color: #64748B; text-decoration: none; border-radius: 6px; transition: all 0.15s; white-space: nowrap; }'
      + '.sb-link svg { flex-shrink: 0; width: 16px; height: 16px; max-width: 16px; max-height: 16px; }'
      + '.sb-link:hover { color: #0077C8; background: #F1F5F9; }'
      + '.sb-link.sb-active { color: #0077C8; background: #E8F3FF; font-weight: 700; }'
      + '.sb-sub { display: flex; align-items: center; gap: 6px; padding: 4px 10px; font-size: 13px; font-weight: 600; color: #64748B; text-decoration: none; border-radius: 6px; transition: all 0.15s; white-space: nowrap; }'
      + '.sb-sub svg { flex-shrink: 0; width: 16px; height: 16px; max-width: 16px; max-height: 16px; }'
      + '.sb-sub:hover { color: #0077C8; background: #F1F5F9; }'
      + '.sb-sub.sb-active { color: #0077C8; background: #E8F3FF; font-weight: 700; }'
      + '.sb-sub-icon { display: inline-flex; width: 16px; height: 16px; vertical-align: -1px; }'
      + '@media (max-width: 1200px) { #sidebar { display: none; } }';

    document.head.appendChild(style);
    document.body.appendChild(sidebar);
  }

  function renderSection(section) {
    var html = '';
    var items = section.items || [];

    if (section.sidebar && section.sidebar.title) {
      html += '<div class="sb-cat">' + escapeHtml(section.sidebar.title) + '</div>';
    }

    items.forEach(function(item) {
      if (!item.sidebarType) {
        return;
      }
      if (item.sidebarType === 'root') {
        html += renderRootItem(item);
      } else {
        html += renderSubItem(item);
      }

      if (item.id === 'dashboard-main' && section.sidebar && section.sidebar.anchors) {
        html += section.sidebar.anchors.map(renderAnchor).join('');
      }
    });

    return html;
  }

  function resolveHref(href) {
    return href.indexOf('http') === 0 ? href : root + href;
  }

  function renderRootItem(item) {
    var active = isActive(item.activeMatch) ? ' sb-active' : '';
    return '<a href="' + resolveHref(item.href) + '" class="sb-link' + active + '">' + iconFor(item.iconKey) + ' ' + escapeHtml(item.sidebarLabel || item.title) + '</a>';
  }

  function renderSubItem(item) {
    var active = isActive(item.activeMatch) ? ' sb-active' : '';
    var icon = item.sidebarIconKey || item.iconKey;
    var iconHtml = icon ? '<span class="sb-sub-icon">' + iconFor(icon) + '</span>' : '';
    return '<a href="' + resolveHref(item.href) + '" class="sb-sub' + active + '">' + iconHtml + escapeHtml(item.sidebarLabel || item.title) + '</a>';
  }

  function renderAnchor(anchor) {
    return '<a href="' + resolveHref(anchor.href) + '" class="sb-sub">' + escapeHtml(anchor.label) + '</a>';
  }

  function iconFor(key, small) {
    var html = (window.DASHBOARD_SITE.icons[key] || '');
    if (!small) {
      return html;
    }
    return html
      .replace('width="20"', 'width="12"')
      .replace('height="20"', 'height="12"')
      .replace('vertical-align:-2px', 'vertical-align:-1px');
  }

  function isActive(matchers) {
    if (!matchers) {
      return false;
    }
    return matchers.some(function(matcher) {
      if (matcher === 'index') {
        return currentPath.endsWith('/cdn-assets/') || currentPath.endsWith('/cdn-assets/index.html');
      }
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
