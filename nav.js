// 글로벌 네비게이션 바 — 모든 페이지에서 동일하게 동작
(function() {
  // 현재 페이지 기준 루트 경로 계산
  var depth = (location.pathname.match(/cdn-assets\/(.+)/)||['',''])[1].split('/').filter(Boolean).length;
  // index.html이면 해당 폴더 레벨, 그 외 파일이면 파일 레벨
  if (location.pathname.endsWith('/') || location.pathname.endsWith('index.html')) {
    depth = Math.max(0, depth - 0);
  }
  var root = depth === 0 ? './' : '../'.repeat(depth);
  // process/settlement.html 같은 경우 depth=2이지만 실제로는 ../만 필요
  var pathAfterAssets = location.pathname.split('cdn-assets/')[1] || '';
  var segments = pathAfterAssets.split('/').filter(Boolean);
  // 파일명이 .html이면 폴더 깊이에서 제외
  if (segments.length > 0 && segments[segments.length-1].includes('.html') && segments[segments.length-1] !== 'index.html') {
    segments.pop();
  }
  if (segments.length > 0 && segments[segments.length-1] === 'index.html') {
    segments.pop();
  }
  root = segments.length === 0 ? './' : '../'.repeat(segments.length);

  var currentPath = location.pathname;

  function isActive(keyword) {
    return currentPath.indexOf(keyword) !== -1;
  }

  var nav = document.createElement('nav');
  nav.id = 'global-nav';
  nav.innerHTML = ''
    + '<div class="nav-inner">'
    + '<a href="' + root + '" class="nav-brand">운영 대시보드</a>'
    + '<div class="nav-links">'
    + '<a href="' + root + 'dashboard/" class="nav-link' + (isActive('/dashboard') ? ' active' : '') + '">대시보드</a>'
    + '<div class="nav-dropdown">'
    + '<a class="nav-link' + (isActive('/process') ? ' active' : '') + '">프로세스 ▾</a>'
    + '<div class="nav-dropdown-menu">'
    + '<a href="' + root + 'process/youtube.html">유튜브 제작</a>'
    + '<a href="' + root + 'process/crm.html">CRM 상담</a>'
    + '<a href="' + root + 'process/n8n.html">n8n</a>'
    + '<a href="' + root + 'process/homepage.html">홈페이지 제작</a>'
    + '<a href="' + root + 'process/content-marketing.html">콘텐츠 마케팅</a>'
    + '<a href="' + root + 'process/telegram-alerts.html">텔레그램 알림</a>'
    + '<a href="' + root + 'process/settlement.html">회사정산</a>'
    + '</div></div>'
    + '<a href="' + root + 'consult/" class="nav-link' + (isActive('/consult') ? ' active' : '') + '">상담·템플릿</a>'
    + '</div></div>';

  var style = document.createElement('style');
  style.textContent = ''
    + '#global-nav { background: white; border-bottom: 2px solid #E2E8F0; padding: 0 20px; position: sticky; top: 0; z-index: 100; }'
    + '.nav-inner { max-width: 800px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; height: 48px; }'
    + '.nav-brand { font-size: 15px; font-weight: 800; color: #051C2C; text-decoration: none; letter-spacing: -0.3px; }'
    + '.nav-brand:hover { color: #0077C8; }'
    + '.nav-links { display: flex; align-items: center; gap: 4px; }'
    + '.nav-link { font-size: 13px; font-weight: 600; color: #64748B; text-decoration: none; padding: 6px 12px; border-radius: 6px; transition: all 0.15s; cursor: pointer; }'
    + '.nav-link:hover { color: #0077C8; background: #F1F5F9; }'
    + '.nav-link.active { color: #0077C8; background: #E8F3FF; }'
    + '.nav-dropdown { position: relative; }'
    + '.nav-dropdown-menu { display: none; position: absolute; top: 100%; right: 0; background: white; border: 2px solid #E2E8F0; border-radius: 10px; padding: 6px; min-width: 160px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); margin-top: 4px; }'
    + '.nav-dropdown:hover .nav-dropdown-menu { display: block; }'
    + '.nav-dropdown-menu a { display: block; padding: 8px 12px; font-size: 13px; font-weight: 600; color: #334155; text-decoration: none; border-radius: 6px; }'
    + '.nav-dropdown-menu a:hover { background: #F1F5F9; color: #0077C8; }'
    + '@media (max-width: 480px) { .nav-brand { font-size: 13px; } .nav-link { font-size: 12px; padding: 6px 8px; } }';

  // 대시보드 페이지에서는 네비게이션 숨김 (3열 레이아웃과 겹김) — business, branding 제외
  if (currentPath.indexOf('/dashboard') !== -1 && currentPath.indexOf('business.html') === -1 && currentPath.indexOf('branding.html') === -1) return;

  document.head.appendChild(style);
  document.body.insertBefore(nav, document.body.firstChild);
})();
