(function () {
  var script = document.currentScript;
  var base = script ? new URL('.', script.src).href : './';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  ready(function () {
    if (document.querySelector('[data-homepage-topbar]')) return;

    var bar = document.createElement('header');
    bar.setAttribute('data-homepage-topbar', 'true');
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
      '<div data-homepage-topbar-inner style="max-width:1160px;margin:0 auto;padding:20px 20px;display:flex;align-items:center;justify-content:space-between;gap:28px">',
      '  <a data-homepage-topbar-logo href="' + new URL('main-page.html', base).href + '" style="color:#0a0a0a;font-family:GmarketSans,Pretendard,sans-serif;font-size:28px;font-weight:900;letter-spacing:-.02em;text-decoration:none;white-space:nowrap">우리동네재테크</a>',
      '  <nav data-homepage-topbar-nav style="display:flex;align-items:center;justify-content:center;gap:34px;flex:1;overflow-x:auto">',
      '    <a href="' + new URL('coaching-all-v3.html', base).href + '" style="color:#0a0a0a;font-size:16px;font-weight:800;text-decoration:none;white-space:nowrap">내집마련 1:1 코칭</a>',
      '    <a href="' + new URL('curriculum.html', base).href + '" style="color:#0a0a0a;font-size:16px;font-weight:800;text-decoration:none;white-space:nowrap">커리큘럼</a>',
      '    <a href="' + new URL('refund-policy.html', base).href + '" style="color:#0a0a0a;font-size:16px;font-weight:800;text-decoration:none;white-space:nowrap">환불 규정</a>',
      '  </nav>',
      '</div>'
    ].join('');

    var style = document.createElement('style');
    style.textContent = [
      '@media (max-width: 768px) {',
      '  [data-homepage-topbar-inner] {',
      '    padding: 16px 14px 12px !important;',
      '    flex-wrap: wrap !important;',
      '    align-items: flex-start !important;',
      '    gap: 10px !important;',
      '  }',
      '  [data-homepage-topbar-logo] {',
      '    width: 100% !important;',
      '    font-size: 24px !important;',
      '  }',
      '  [data-homepage-topbar-nav] {',
      '    width: 100% !important;',
      '    justify-content: flex-start !important;',
      '    gap: 18px !important;',
      '    flex: 0 0 100% !important;',
      '    padding-bottom: 4px !important;',
      '    -webkit-overflow-scrolling: touch !important;',
      '  }',
      '  [data-homepage-topbar-nav] a {',
      '    font-size: 14px !important;',
      '  }',
      '}'
    ].join('');
    document.head.appendChild(style);

    if (switcher && switcher.parentNode) {
      switcher.parentNode.insertBefore(bar, switcher.nextSibling);
    } else {
      document.body.insertBefore(bar, document.body.firstChild);
    }
  });
})();
