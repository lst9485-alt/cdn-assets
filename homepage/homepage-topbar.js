(function () {
  var script = document.currentScript;
  var base = script ? new URL('.', script.src).href : './';
  var isImweb = (location.hostname === 'ourdongne.com');
  function link(githubFile, imwebPath) {
    return isImweb ? imwebPath : new URL(githubFile, base).href;
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function isMainPage() {
    var path = location.pathname.replace(/\/+$/, '');
    return path === '' || path === '/' || /\/main-page(?:\.html)?$/.test(path) || /\/index(?:\.html)?$/.test(path);
  }

  ready(function () {
    if (document.querySelector('[data-homepage-topbar]')) return;

    var bar = document.createElement('header');
    bar.setAttribute('data-homepage-topbar', 'true');
    if (isMainPage()) {
      bar.setAttribute('data-main-page', 'true');
    }
    var switcher = document.querySelector('[data-draft-switcher]');
    var stickyTop = switcher ? switcher.offsetHeight : 0;

    bar.style.cssText = [
      'position:sticky',
      'top:' + stickyTop + 'px',
      'z-index:9000',
      'background:#fff',
      'border-bottom:1px solid #e5e7eb',
      'font-family:Pretendard,-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
      'box-shadow:0 1px 0 rgba(15,23,42,0.03)'
    ].join(';');

    bar.innerHTML = [
      '<div data-homepage-topbar-inner style="max-width:1160px;margin:0 auto;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:24px">',
      '  <button data-homepage-topbar-back type="button" aria-label="뒤로가기" style="display:none;appearance:none;border:0;background:transparent;color:#0f172a;padding:0;width:44px;height:44px;align-items:center;justify-content:center;cursor:pointer">',
      '    <svg width="31" height="31" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 19 8 12l7-7" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      '  </button>',
      '  <a data-homepage-topbar-logo href="' + link('main-page.html', '/') + '" style="color:#0a0a0a;font-family:GmarketSans,Pretendard,sans-serif;font-size:24px;font-weight:900;letter-spacing:0;text-decoration:none;white-space:nowrap;line-height:1.1">우리동네재테크</a>',
      '  <nav data-homepage-topbar-nav style="display:flex;align-items:center;justify-content:center;gap:28px;flex:1;overflow-x:auto">',
      '    <a href="' + link('coaching-all-v3.html', '/counsel') + '" style="color:#0a0a0a;font-size:15px;font-weight:800;text-decoration:none;white-space:nowrap;line-height:1.2">내집마련 1:1 코칭</a>',
      '    <a href="' + link('curriculum.html', '/curriculum') + '" style="color:#0a0a0a;font-size:15px;font-weight:800;text-decoration:none;white-space:nowrap;line-height:1.2">커리큘럼</a>',
      '    <a href="' + link('refund-policy.html', '/refund') + '" style="color:#0a0a0a;font-size:15px;font-weight:800;text-decoration:none;white-space:nowrap;line-height:1.2">환불 규정</a>',
      '  </nav>',
      '  <a data-homepage-topbar-home href="' + link('main-page.html', '/') + '" aria-label="홈으로" style="display:none;color:#0f172a;text-decoration:none;width:44px;height:44px;align-items:center;justify-content:center">',
      '    <svg width="31" height="31" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m3 10.5 9-7 9 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 9.5V20h13V9.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 20v-6h5v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      '  </a>',
      '</div>'
    ].join('');

    var style = document.createElement('style');
    style.textContent = [
      '@media (max-width: 768px) {',
	      '  [data-homepage-topbar-inner] {',
	      '    min-height: 56px !important;',
	      '    padding: 10px 22px !important;',
	      '    flex-wrap: nowrap !important;',
	      '    align-items: center !important;',
	      '    justify-content: space-between !important;',
	      '    gap: 16px !important;',
	      '  }',
	      '  [data-homepage-topbar]:not([data-main-page]) [data-homepage-topbar-back], [data-homepage-topbar]:not([data-main-page]) [data-homepage-topbar-home] {',
	      '    display: inline-flex !important;',
	      '    width: 36px !important;',
	      '    height: 36px !important;',
	      '  }',
	      '  [data-homepage-topbar]:not([data-main-page]) [data-homepage-topbar-back] svg, [data-homepage-topbar]:not([data-main-page]) [data-homepage-topbar-home] svg {',
	      '    width: 24px !important;',
	      '    height: 24px !important;',
	      '  }',
      '  [data-homepage-topbar]:not([data-main-page]) [data-homepage-topbar-logo] {',
      '    display: none !important;',
      '  }',
      '  [data-homepage-topbar]:not([data-main-page]) [data-homepage-topbar-nav] {',
      '    display: none !important;',
      '  }',
      '  [data-homepage-topbar][data-main-page] [data-homepage-topbar-logo] {',
      '    font-size: 20px !important;',
      '    line-height: 1.1 !important;',
      '  }',
      '  [data-homepage-topbar][data-main-page] [data-homepage-topbar-nav] {',
      '    justify-content: flex-start !important;',
      '    gap: 16px !important;',
      '    -webkit-overflow-scrolling: touch !important;',
      '  }',
      '  [data-homepage-topbar][data-main-page] [data-homepage-topbar-nav] a {',
      '    font-size: 13px !important;',
      '    line-height: 1.2 !important;',
      '  }',
      '}'
    ].join('');
    document.head.appendChild(style);

    var back = bar.querySelector('[data-homepage-topbar-back]');
    if (back) {
      back.addEventListener('click', function () {
        if (history.length > 1) history.back();
        else location.href = link('main-page.html', '/');
      });
    }

    if (switcher && switcher.parentNode) {
      switcher.parentNode.insertBefore(bar, switcher.nextSibling);
    } else {
      document.body.insertBefore(bar, document.body.firstChild);
    }
  });
})();
