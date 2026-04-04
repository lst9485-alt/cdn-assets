// 오른쪽 고정 사이드바 — 카테고리별 그룹 + 현재 페이지 목차
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
    return '<a href="' + href + '" class="sb-link' + active + '"><span class="sb-icon">' + icon + '</span>' + label + '</a>';
  }

  // 현재 페이지 섹션 — details summary만
  var sections = [];
  var seen = {};
  document.querySelectorAll('details > summary').forEach(function(el, i) {
    var text = el.textContent.trim().replace(/^▸\s*/, '');
    if (!text || seen[text]) return;
    seen[text] = true;
    var id = 'sec-' + i;
    el.id = id;
    sections.push({ id: id, text: text });
  });

  var sectionsHtml = '';
  if (sections.length > 0) {
    sectionsHtml = '<div class="sb-group">'
      + '<div class="sb-cat">이 페이지</div>'
      + sections.map(function(s) {
        return '<a href="#' + s.id + '" class="sb-anchor">' + s.text + '</a>';
      }).join('')
      + '</div>';
  }

  var sidebar = document.createElement('aside');
  sidebar.id = 'sidebar';
  sidebar.innerHTML = '<div class="sb-inner">'
    + link(root, '🏠', '메인', 'index')
    + '<div class="sb-group">'
    + '<div class="sb-cat">프로세스</div>'
    + link(root + 'process/settlement.html', '💰', '정산', 'settlement')
    + link(root + 'process/youtube.html', '🎬', '유튜브', 'youtube')
    + link(root + 'process/crm.html', '🤝', 'CRM', 'crm')
    + link(root + 'process/n8n.html', '⚙️', 'n8n', 'n8n')
    + '</div>'
    + '<div class="sb-group">'
    + '<div class="sb-cat">도구</div>'
    + link(root + 'dashboard/', '📊', '대시보드', 'dashboard')
    + link(root + 'consult/', '📋', '상담자료', 'consult')
    + '</div>'
    + sectionsHtml
    + '</div>';

  var style = document.createElement('style');
  style.textContent = ''
    + '#sidebar { position: fixed; top: 48px; width: 160px; height: calc(100vh - 48px); overflow-y: auto; padding: 14px 8px; z-index: 90; left: calc(50% + 420px); }'
    + '.sb-inner { display: flex; flex-direction: column; gap: 2px; }'
    + '.sb-group { margin-top: 12px; }'
    + '.sb-cat { font-size: 11px; font-weight: 800; color: #B0B8C4; letter-spacing: 0.8px; padding: 0 8px 4px; text-transform: uppercase; }'
    + '.sb-link { display: flex; align-items: center; gap: 7px; padding: 5px 8px; font-size: 13px; font-weight: 600; color: #475569; text-decoration: none; border-radius: 6px; transition: all 0.15s; white-space: nowrap; }'
    + '.sb-link:hover { color: #0077C8; background: #F1F5F9; }'
    + '.sb-link.sb-active { color: #0077C8; background: #E8F3FF; font-weight: 700; }'
    + '.sb-icon { font-size: 14px; width: 18px; text-align: center; }'
    + '.sb-anchor { display: block; padding: 3px 8px 3px 12px; font-size: 12px; font-weight: 500; color: #94A3B8; text-decoration: none; border-radius: 4px; border-left: 2px solid #E2E8F0; margin-left: 6px; transition: all 0.15s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }'
    + '.sb-anchor:hover { color: #0077C8; border-left-color: #0077C8; background: #F8FAFC; }'
    + '@media (max-width: 1200px) { #sidebar { display: none; } }';

  document.head.appendChild(style);
  document.body.appendChild(sidebar);
})();
