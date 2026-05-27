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
      '<div data-homepage-topbar-inner style="max-width:1160px;margin:0 auto;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:24px">',
      '  <a data-homepage-topbar-logo href="' + link('main-page.html', '/') + '" style="color:#0a0a0a;font-family:GmarketSans,Pretendard,sans-serif;font-size:24px;font-weight:900;letter-spacing:0;text-decoration:none;white-space:nowrap;line-height:1.1">우리동네재테크</a>',
      '  <nav data-homepage-topbar-nav style="display:flex;align-items:center;justify-content:center;gap:28px;flex:1;overflow-x:auto">',
      '    <a href="' + link('coaching-all-v3.html', '/counsel') + '" style="color:#0a0a0a;font-size:15px;font-weight:800;text-decoration:none;white-space:nowrap;line-height:1.2">내집마련 1:1 코칭</a>',
      '    <a href="' + link('curriculum.html', '/curriculum') + '" style="color:#0a0a0a;font-size:15px;font-weight:800;text-decoration:none;white-space:nowrap;line-height:1.2">커리큘럼</a>',
      '    <a href="' + link('refund-policy.html', '/refund') + '" style="color:#0a0a0a;font-size:15px;font-weight:800;text-decoration:none;white-space:nowrap;line-height:1.2">환불 규정</a>',
      '  </nav>',
      '</div>'
    ].join('');

    var style = document.createElement('style');
    style.textContent = [
      '@media (max-width: 768px) {',
      '  [data-homepage-topbar-inner] {',
      '    padding: 12px 14px 10px !important;',
      '    flex-wrap: wrap !important;',
      '    align-items: flex-start !important;',
      '    gap: 8px !important;',
      '  }',
      '  [data-homepage-topbar-logo] {',
      '    width: 100% !important;',
      '    font-size: 20px !important;',
      '    line-height: 1.1 !important;',
      '  }',
      '  [data-homepage-topbar-nav] {',
      '    width: 100% !important;',
      '    justify-content: flex-start !important;',
      '    gap: 16px !important;',
      '    flex: 0 0 100% !important;',
      '    padding-bottom: 4px !important;',
      '    -webkit-overflow-scrolling: touch !important;',
      '  }',
      '  [data-homepage-topbar-nav] a {',
      '    font-size: 13px !important;',
      '    line-height: 1.2 !important;',
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
