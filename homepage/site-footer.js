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
      'padding:0 24px 12px',
      'font-size:13px',
      'line-height:2'
    ].join(';');

    footer.innerHTML = [
      '<div style="max-width:1100px;margin:0 auto">',
      '  <div data-footer-grid="true" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,260px);gap:8px 96px;align-items:start;margin-bottom:0">',
      '    <div>',
      '      <strong style="display:block;font-size:20px;font-weight:800;color:#f3f4f6;letter-spacing:-0.02em">우리동네 재테크</strong>',
      '      <a href="https://www.youtube.com/@우리동네재테크" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:6px;color:#ededed;text-decoration:none;font-size:14px;font-weight:600">유튜브↖</a>',
      '      <div style="color:#888888;font-size:13px;line-height:2.15;margin-top:18px">',
      '        <p style="margin:0">(주)우리동네사람들 | 대표자 : 홍윤지 | 소재지 : 당산로 92, 301-이3호(당산동1가, 호서빌딩)</p>',
      '        <p style="margin:0">사업자 등록번호 : 386-86-03832 | 통신판매신고번호 : 제 2026-서울영등포-0991 호</p>',
      '        <p style="margin:0">개인정보 보호책임자 : 홍윤지 | 호스팅제공자 : (주)아임웹</p>',
      '        <p style="margin:0">대표번호 070-4517-9400</p>',
      '        <p style="margin:0">문의 : contact@ourdongne.com</p>',
      '        <p style="margin:6px 0 0">Ⓒ2026 주식회사 우리동네사람들. All rights reserved.</p>',
      '      </div>',
      '    </div>',
      '    <div>',
      '      <strong style="display:block;font-size:20px;font-weight:800;color:#f3f4f6;letter-spacing:-0.02em">우리동네 클래스</strong>',
      '      <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px">',
      '        <a href="' + new URL('coaching-all-v3.html', base).href + '" style="color:#ededed;text-decoration:none;font-size:14px;font-weight:600">1:1 코칭</a>',
      '        <a href="' + new URL('curriculum.html', base).href + '" style="color:#ededed;text-decoration:none;font-size:14px;font-weight:600">커리큘럼</a>',
      '        <a href="' + new URL('refund-policy.html', base).href + '" style="color:#ededed;text-decoration:none;font-size:14px;font-weight:600">환불규정</a>',
      '        <a href="' + new URL('privacy-policy.html', base).href + '" style="color:#ededed;text-decoration:none;font-size:14px;font-weight:600">개인정보 처리방침</a>',
      '        <a href="' + new URL('terms-of-service.html', base).href + '" style="color:#ededed;text-decoration:none;font-size:14px;font-weight:600">이용약관</a>',
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
      '    gap: 18px !important;',
      '    margin-bottom: 0 !important;',
      '  }',
      '}'
    ].join('');
    document.head.appendChild(style);
  });
})();
