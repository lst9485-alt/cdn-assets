(function () {
  var script = document.currentScript;
  var base = script ? new URL('.', script.src).href : './';
  var items = [
    { id: 'original', label: '원본 · 메인', href: 'main-page.html', match: /\/homepage\/main-page\.html$/ },
    { id: 'v00', label: 'V00 · 시안비교', href: 'v00/index.html', match: /\/homepage\/v00\/index\.html$/ },
    { id: 'v2', label: 'V2 · WBF', href: 'main-page-test2.html', match: /\/homepage\/main-page-test2\.html$/ },
    { id: 'v3', label: 'V3 · Editorial', href: 'woori-finance-site/v1/main.html', match: /\/homepage\/woori-finance-site\/v1\// },
    { id: 'v4', label: 'V4 · Sticker', href: 'woori-finance-site/v2/main.html', match: /\/homepage\/woori-finance-site\/v2\// },
    { id: 'v5', label: 'V5 · Data', href: 'woori-finance-site/v3/main.html', match: /\/homepage\/woori-finance-site\/v3\// },
    { id: 'v6', label: 'V6 · Map', href: 'woori-finance-site/v4/main.html', match: /\/homepage\/woori-finance-site\/v4\// },
    { id: 'v7', label: 'V7 · Chat', href: 'woori-finance-site/v5/main.html', match: /\/homepage\/woori-finance-site\/v5\// },
    { id: 'v8', label: 'V8 · Zine', href: 'woori-finance-site/v6/main.html', match: /\/homepage\/woori-finance-site\/v6\// }
  ];

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  ready(function () {
    if (document.querySelector('[data-draft-switcher]')) return;
    var path = window.location.pathname;
    var bar = document.createElement('div');
    bar.setAttribute('data-draft-switcher', 'true');
    bar.style.cssText = [
      'position:sticky',
      'top:0',
      'z-index:9999',
      'display:flex',
      'align-items:center',
      'justify-content:space-between',
      'gap:16px',
      'padding:9px 20px',
      'background:#0a0a0a',
      'color:#fff',
      'font-family:Pretendard,-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
      'font-size:13px',
      'box-shadow:0 8px 24px rgba(0,0,0,.14)'
    ].join(';');

    var nav = document.createElement('div');
    nav.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap';

    var label = document.createElement('span');
    label.textContent = '버전 전환:';
    label.style.cssText = 'opacity:.68;font-weight:800;margin-right:4px;white-space:nowrap';
    nav.appendChild(label);

    items.forEach(function (item) {
      var active = item.match.test(path);
      var a = document.createElement('a');
      a.href = new URL(item.href, base).href;
      a.textContent = item.label;
      a.style.cssText = [
        'display:inline-flex',
        'align-items:center',
        'min-height:28px',
        'padding:6px 11px',
        'border-radius:999px',
        'border:1px solid ' + (active ? '#ff6b00' : 'rgba(255,255,255,.28)'),
        'background:' + (active ? '#ff6b00' : 'transparent'),
        'color:#fff',
        'text-decoration:none',
        'font-size:12px',
        'font-weight:800',
        'white-space:nowrap'
      ].join(';');
      nav.appendChild(a);
    });

    var links = document.createElement('div');
    links.style.cssText = 'display:flex;align-items:center;gap:12px;white-space:nowrap';
    links.innerHTML = '<a href="' + new URL('index.html', base).href + '" style="color:#fff;text-decoration:none;opacity:.78;font-size:12px;font-weight:800">시안 목록</a><a href="' + new URL('../index.html', base).href + '" style="color:#fff;text-decoration:none;opacity:.78;font-size:12px;font-weight:800">대시보드</a>';

    bar.appendChild(nav);
    bar.appendChild(links);
    document.body.insertBefore(bar, document.body.firstChild);
  });
})();
