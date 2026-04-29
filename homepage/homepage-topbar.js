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
      'font-family:Pretendard,-apple-system,BlinkMacSystemFont,system-ui,sans-serif'
    ].join(';');

    bar.innerHTML = [
      '<div style="max-width:1160px;margin:0 auto;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;gap:24px">',
      '  <a href="' + new URL('main-page.html', base).href + '" style="color:#0a0a0a;font-family:GmarketSans,Pretendard,sans-serif;font-size:26px;font-weight:900;letter-spacing:-.02em;text-decoration:none;white-space:nowrap">우리동네재테크</a>',
      '  <nav style="display:flex;align-items:center;justify-content:center;gap:30px;flex:1;overflow-x:auto">',
      '    <a href="' + new URL('coaching-all.html', base).href + '" style="color:#0a0a0a;font-size:14px;font-weight:800;text-decoration:none;white-space:nowrap">1:1 코칭</a>',
      '    <a href="' + new URL('lecture-allinone.html', base).href + '" style="color:#0a0a0a;font-size:14px;font-weight:800;text-decoration:none;white-space:nowrap">올인원 강의</a>',
      '    <a href="' + new URL('lecture-bookclub.html', base).href + '" style="color:#0a0a0a;font-size:14px;font-weight:800;text-decoration:none;white-space:nowrap">독서모임</a>',
      '    <a href="' + new URL('curriculum.html', base).href + '" style="color:#0a0a0a;font-size:14px;font-weight:800;text-decoration:none;white-space:nowrap">커리큘럼</a>',
      '    <a href="' + new URL('refund-policy.html', base).href + '" style="color:#0a0a0a;font-size:14px;font-weight:800;text-decoration:none;white-space:nowrap">환불 규정</a>',
      '  </nav>',
      '  <a href="#" style="color:#0a0a0a;font-size:14px;font-weight:800;text-decoration:none;white-space:nowrap">로그인</a>',
      '</div>'
    ].join('');

    if (switcher && switcher.parentNode) {
      switcher.parentNode.insertBefore(bar, switcher.nextSibling);
    } else {
      document.body.insertBefore(bar, document.body.firstChild);
    }
  });
})();
