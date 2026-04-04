// 오른쪽 고정 사이드바 — 페이지 이동만 (카테고리 그룹)
(function() {
  var pathAfterAssets = location.pathname.split('cdn-assets/')[1] || '';
  var segments = pathAfterAssets.split('/').filter(Boolean);
  if (segments.length > 0 && segments[segments.length-1].includes('.html') && segments[segments.length-1] !== 'index.html') segments.pop();
  if (segments.length > 0 && segments[segments.length-1] === 'index.html') segments.pop();
  var root = segments.length === 0 ? './' : '../'.repeat(segments.length);
  var cur = location.pathname;

  function isActive(kw) { return cur.indexOf(kw) !== -1; }
  // 브랜드 아이콘 (14x14 inline SVG)
  var ic = {
    dash: '<svg width="14" height="14" viewBox="0 0 16 16" style="vertical-align:-2px"><rect rx="2" width="16" height="16" fill="#1F2937"/><rect x="2" y="8" width="3" height="6" rx="1" fill="#fff"/><rect x="6.5" y="4" width="3" height="10" rx="1" fill="#fff"/><rect x="11" y="6" width="3" height="8" rx="1" fill="#fff"/></svg>',
    yt: '<svg width="14" height="14" viewBox="0 0 16 16" style="vertical-align:-2px"><rect rx="3" width="16" height="16" fill="#FF0000"/><path d="M6.5 4.5L11.5 8L6.5 11.5Z" fill="#fff"/></svg>',
    crm: '<svg width="14" height="14" viewBox="0 0 16 16" style="vertical-align:-2px"><circle cx="5" cy="5.5" r="2.5" fill="#64748B"/><circle cx="11" cy="5.5" r="2.5" fill="#64748B"/><path d="M0 14c0-3 1.5-4.5 5-4.5s5 1.5 5 4.5" fill="#64748B" opacity=".8"/><path d="M6 14c0-3 1.5-4.5 5-4.5s5 1.5 5 4.5" fill="#64748B" opacity=".8"/></svg>',
    n8n: '<svg width="14" height="14" viewBox="0 0 16 16" style="vertical-align:-2px"><rect rx="2" width="16" height="16" fill="#EA4B71"/><text x="8" y="11.5" text-anchor="middle" fill="#fff" font-size="8" font-weight="800" font-family="sans-serif">n8n</text></svg>',
    money: '<svg width="14" height="14" viewBox="0 0 16 16" style="vertical-align:-2px"><rect rx="2" width="16" height="16" fill="#1F2937"/><text x="8" y="12" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" font-family="sans-serif">₩</text></svg>',
    web: '<svg width="14" height="14" viewBox="0 0 16 16" style="vertical-align:-2px"><rect rx="2" width="16" height="16" fill="#0077C8"/><circle cx="8" cy="8" r="5" fill="none" stroke="#fff" stroke-width="1.5"/><ellipse cx="8" cy="8" rx="2.5" ry="5" fill="none" stroke="#fff" stroke-width="1.2"/><line x1="3" y1="8" x2="13" y2="8" stroke="#fff" stroke-width="1.2"/></svg>',
    content: '<svg width="14" height="14" viewBox="0 0 16 16" style="vertical-align:-2px"><rect rx="2" width="16" height="16" fill="#1F2937"/><path d="M4 10L8 4L9 7L12 6L8 12L7 9Z" fill="#fff"/></svg>',
    doc: '<svg width="14" height="14" viewBox="0 0 16 16" style="vertical-align:-2px"><rect rx="2" width="16" height="16" fill="#1F2937"/><rect x="4" y="3" width="8" height="10" rx="1" fill="#fff"/><rect x="5.5" y="5" width="5" height="1" rx=".5" fill="#1F2937"/><rect x="5.5" y="7.5" width="5" height="1" rx=".5" fill="#1F2937"/><rect x="5.5" y="10" width="3" height="1" rx=".5" fill="#1F2937"/></svg>'
  };
  function link(href, icon, label, kw) {
    var active = isActive(kw) && kw !== 'index' ? ' sb-active' : '';
    if (kw === 'index' && (cur.endsWith('/cdn-assets/') || cur.endsWith('/cdn-assets/index.html'))) active = ' sb-active';
    return '<a href="' + href + '" class="sb-link' + active + '">' + icon + ' ' + label + '</a>';
  }

  var sidebar = document.createElement('aside');
  sidebar.id = 'sidebar';
  sidebar.innerHTML = ''
    + link(root + 'dashboard/', ic.dash, '대시보드', 'dashboard')
    + '<a href="' + root + 'dashboard/#todo" class="sb-sub">투두리스트</a>'
    + '<a href="' + root + 'dashboard/#projects" class="sb-sub">프로젝트</a>'
    + '<a href="' + root + 'dashboard/#okr" class="sb-sub">OKR·루틴</a>'
    + '<a href="' + root + 'dashboard/sales.html" class="sb-sub">' + ic.money + ' 매출</a>'
    + '<div class="sb-cat">프로세스</div>'
    + link(root + 'process/youtube.html', ic.yt, '유튜브', 'youtube')
    + link(root + 'process/crm.html', ic.crm, 'CRM', 'crm')
    + link(root + 'process/n8n.html', ic.n8n, 'n8n', 'n8n')
    + link(root + 'process/homepage.html', ic.web, '홈페이지', 'homepage')
    + link(root + 'process/content-marketing.html', ic.content, '콘텐츠 마케팅', 'content-marketing')
    + link(root + 'process/settlement.html', ic.money, '회사정산', 'settlement')
    + '<div class="sb-cat">상담·템플릿</div>'
    + link(root + 'consult/', ic.doc, '회원 맞춤 페이지', 'consult')
    + '<a class="sb-sub sb-disabled">상담 준비 자료</a>'
;

  var style = document.createElement('style');
  style.textContent = ''
    + '#sidebar { position: fixed; top: 48px; right: max(16px, calc(50% - 640px)); width: 140px; height: calc(100vh - 48px); padding: 16px 0; z-index: 90; }'
    + '.sb-cat { font-size: 10px; font-weight: 800; color: #B0B8C4; letter-spacing: 1px; padding: 14px 10px 4px; text-transform: uppercase; }'
    + '.sb-link { display: block; padding: 6px 10px; font-size: 13px; font-weight: 600; color: #64748B; text-decoration: none; border-radius: 6px; transition: all 0.15s; white-space: nowrap; }'
    + '.sb-link:hover { color: #0077C8; background: #F1F5F9; }'
    + '.sb-link.sb-active { color: #0077C8; background: #E8F3FF; font-weight: 700; }'
    + '.sb-sub { display: block; padding: 3px 10px 3px 28px; font-size: 12px; font-weight: 500; color: #94A3B8; text-decoration: none; border-radius: 4px; transition: all 0.15s; }'
    + '.sb-sub:hover { color: #0077C8; background: #F1F5F9; }'
    + '.sb-disabled { opacity: 0.4; pointer-events: none; cursor: default; }'
    + '@media (max-width: 1200px) { #sidebar { display: none; } }';

  // 대시보드 페이지에서는 사이드바 숨김 (3열 레이아웃과 겹침)
  if (cur.indexOf('/dashboard') !== -1) return;

  document.head.appendChild(style);
  document.body.appendChild(sidebar);
})();
