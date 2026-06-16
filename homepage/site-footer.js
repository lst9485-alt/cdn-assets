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
    document.querySelectorAll('footer').forEach(function (footer) {
      if (!footer.hasAttribute('data-homepage-footer')) footer.remove();
    });
    if (document.querySelector('[data-homepage-footer]')) return;

    var footer = document.createElement('footer');
    footer.setAttribute('data-homepage-footer', 'true');
    footer.style.cssText = [
      'background:#111111',
      'color:#9a9a9a',
      'font-family:Pretendard,-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
      'padding:12px 24px 12px',
      'font-size:13px',
      'line-height:2'
    ].join(';');

    footer.innerHTML = [
      '<div style="max-width:1100px;margin:0 auto">',
      '  <div data-footer-grid="true" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,260px);grid-template-areas:\'brand menu\' \'info menu\';gap:0 44px;align-items:start;margin-bottom:0">',
      '    <div style="grid-area:brand;margin-left:-18px;display:flex;align-items:center;justify-content:space-between;gap:12px">',
      '      <strong style="font-size:22px;font-weight:800;color:#f3f4f6;letter-spacing:-0.02em">우리동네 재테크</strong>',
      '      <a href="https://www.youtube.com/@우리동네재테크" target="_blank" rel="noreferrer" style="display:inline-flex;align-items:center;gap:6px;flex-shrink:0;color:#ededed;text-decoration:none;font-size:14px;font-weight:600"><span>유튜브</span><span aria-hidden="true" style="display:inline-flex;align-items:center"><svg width="17" height="12" viewBox="0 0 17 12" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="17" height="12" rx="3" fill="#FF0000"/><path d="M7 3.5L11.5 6L7 8.5V3.5Z" fill="white"/></svg></span></a>',
      '    </div>',
      '    <div data-footer-info="true" style="grid-area:info;margin-left:-18px;color:#888888;font-size:13px;line-height:2.15;margin-top:18px">',
      '        <p style="margin:0">(주)우리동네사람들 | 대표자 : 홍윤지 | 서울특별시 영등포구 당산로 92, 301-이3호(당산동1가, 호서빌딩)</p>',
      '        <p style="margin:0">사업자 등록번호 : 386-86-03832 | 통신판매신고번호 : 제 2026-서울영등포-0991 호</p>',
      '        <p style="margin:0">개인정보 보호책임자 : 홍윤지 | 호스팅제공자 : (주)아임웹</p>',
      '        <p style="margin:0">대표번호 070-4517-9400 | 문의 : contact@ourdongne.com</p>',
      '        <p style="margin:6px 0 0">Ⓒ2026 주식회사 우리동네사람들. All rights reserved.</p>',
      '      </div>',
      '    <div style="grid-area:menu;margin-left:-8px">',
      '      <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px">',
      '        <a href="' + link('coaching-all-v3.html', '/counsel') + '" style="display:inline-flex;align-items:center;gap:6px;color:#ededed;text-decoration:none;font-size:14px;font-weight:600"><span aria-hidden="true">🏠</span><span>1:1 코칭</span></a>',
      '        <a href="' + link('curriculum.html', '/curriculum') + '" style="color:#ededed;text-decoration:none;font-size:14px;font-weight:600">커리큘럼</a>',
      '        <a href="' + link('refund-policy.html', '/refund') + '" style="color:#ededed;text-decoration:none;font-size:14px;font-weight:600">환불규정</a>',
      '        <a href="' + link('privacy-policy.html', '/privacy-policy') + '" style="color:#ededed;text-decoration:none;font-size:14px;font-weight:600">개인정보 처리방침</a>',
      '        <a href="' + link('terms-of-service.html', '/terms-of-service') + '" style="color:#ededed;text-decoration:none;font-size:14px;font-weight:600">이용약관</a>',
      '      </div>',
      '    </div>',
      '</div>'
    ].join('');

    document.body.appendChild(footer);

    var style = document.createElement('style');
    style.textContent = [
      '@media (max-width: 768px) {',
      '  footer[data-homepage-footer] [data-footer-grid="true"] {',
      '    grid-template-columns: 1fr !important;',
      '    grid-template-areas: \'brand\' \'menu\' \'info\' !important;',
      '    gap: 18px !important;',
      '    margin-bottom: 0 !important;',
      '  }',
      '  footer[data-homepage-footer] [data-footer-info="true"] { margin-top: 0 !important; }',
      '}'
    ].join('');
    document.head.appendChild(style);
  });
})();
