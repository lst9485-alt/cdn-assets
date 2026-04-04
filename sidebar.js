// 오른쪽 고정 사이드바 — 페이지 이동만 (카테고리 그룹)
(function() {
  var pathAfterAssets = location.pathname.split('cdn-assets/')[1] || '';
  var segments = pathAfterAssets.split('/').filter(Boolean);
  if (segments.length > 0 && segments[segments.length-1].includes('.html') && segments[segments.length-1] !== 'index.html') segments.pop();
  if (segments.length > 0 && segments[segments.length-1] === 'index.html') segments.pop();
  var root = segments.length === 0 ? './' : '../'.repeat(segments.length);
  var cur = location.pathname;

  function isActive(kw) { return cur.indexOf(kw) !== -1; }
  function link(href, icon, label, kw) {
    var active = isActive(kw) && kw !== 'index' ? ' sb-active' : '';
    if (kw === 'index' && (cur.endsWith('/cdn-assets/') || cur.endsWith('/cdn-assets/index.html'))) active = ' sb-active';
    return '<a href="' + href + '" class="sb-link' + active + '">' + icon + ' ' + label + '</a>';
  }

  var sidebar = document.createElement('aside');
  sidebar.id = 'sidebar';
  sidebar.innerHTML = ''
    + link(root + 'dashboard/', '📊', '대시보드', 'dashboard')
    + '<div class="sb-cat">프로세스</div>'
    + link(root + 'process/youtube.html', '🎬', '유튜브', 'youtube')
    + link(root + 'process/crm.html', '🤝', 'CRM', 'crm')
    + link(root + 'process/n8n.html', '⚙️', 'n8n', 'n8n')
    + link(root + 'process/settlement.html', '💰', '정산', 'settlement')
    + '<div class="sb-cat">상담·템플릿</div>'
    + link(root + 'consult/', '📋', '상담자료', 'consult');

  var style = document.createElement('style');
  style.textContent = ''
    + '#sidebar { position: fixed; top: 48px; right: max(16px, calc(50% - 560px)); width: 140px; height: calc(100vh - 48px); padding: 16px 0; z-index: 90; }'
    + '.sb-cat { font-size: 10px; font-weight: 800; color: #B0B8C4; letter-spacing: 1px; padding: 14px 10px 4px; text-transform: uppercase; }'
    + '.sb-link { display: block; padding: 6px 10px; font-size: 13px; font-weight: 600; color: #64748B; text-decoration: none; border-radius: 6px; transition: all 0.15s; white-space: nowrap; }'
    + '.sb-link:hover { color: #0077C8; background: #F1F5F9; }'
    + '.sb-link.sb-active { color: #0077C8; background: #E8F3FF; font-weight: 700; }'
    + '@media (max-width: 1200px) { #sidebar { display: none; } }';

  document.head.appendChild(style);
  document.body.appendChild(sidebar);
})();
