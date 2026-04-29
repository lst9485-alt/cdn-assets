(function () {
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
      'background:#2d2d2d',
      'color:#fff',
      'font-family:Pretendard,-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
      'padding:42px 24px 38px',
      'font-size:13px',
      'line-height:1.85'
    ].join(';');

    footer.innerHTML = [
      '<div style="max-width:1100px;margin:0 auto">',
      '  <div style="display:flex;flex-wrap:wrap;align-items:center;gap:18px 26px;margin-bottom:22px">',
      '    <strong style="font-size:20px;font-weight:900;color:#fff">우리동네 재테크</strong>',
      '    <a href="https://ourdongne.com/" style="color:#d1d5db;text-decoration:none;font-weight:700">우리동네 클래스</a>',
      '    <a href="https://ourdongne.com/refund" style="color:#d1d5db;text-decoration:none;font-weight:700">환불규정</a>',
      '    <a href="https://ourdongne.com/privacy" style="color:#d1d5db;text-decoration:none;font-weight:700">개인정보 처리방침</a>',
      '    <a href="https://ourdongne.com/terms" style="color:#d1d5db;text-decoration:none;font-weight:700">이용약관</a>',
      '  </div>',
      '  <div style="color:#909090">',
      '    <p style="margin:0">(주)우리동네사람들 | 대표자 : 홍윤지 | 소재지 : 당산로 92, 301-이3호(당산동1가, 호서빌딩)</p>',
      '    <p style="margin:0">사업자 등록번호 : 386-86-03832 | 통신판매신고번호 : 제 2026-서울영등포-0991 호</p>',
      '    <p style="margin:0">개인정보관리책임자 : 홍윤지 | 호스팅제공자 : (주)아임웹</p>',
      '    <p style="margin:0">대표번호 070-4517-9400</p>',
      '    <p style="margin:0">문의 : contact@ourdongne.com</p>',
      '    <p style="margin:18px 0 0">2026 주식회사 우리동네사람들 . All rights reserved.</p>',
      '    <p style="margin:0">Copyright ⓒ 2026 우리동네재테크 All rights reserved.</p>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(footer);
  });
})();
