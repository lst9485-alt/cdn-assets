// 오른쪽 고정 사이드바 — 목차 + 페이지 이동
(function() {
  var pathAfterAssets = location.pathname.split('cdn-assets/')[1] || '';
  var segments = pathAfterAssets.split('/').filter(Boolean);
  if (segments.length > 0 && segments[segments.length-1].includes('.html') && segments[segments.length-1] !== 'index.html') segments.pop();
  if (segments.length > 0 && segments[segments.length-1] === 'index.html') segments.pop();
  var root = segments.length === 0 ? './' : '../'.repeat(segments.length);
  var cur = location.pathname;

  function isActive(kw) { return cur.indexOf(kw) !== -1; }

  var pages = [
    { href: root, icon: '🏠', label: '메인', kw: 'index' },
    { href: root + 'process/settlement.html', icon: '💰', label: '정산', kw: 'settlement' },
    { href: root + 'process/youtube.html', icon: '🎬', label: '유튜브', kw: 'youtube' },
    { href: root + 'process/crm.html', icon: '🤝', label: 'CRM', kw: 'crm' },
    { href: root + 'process/n8n.html', icon: '⚙️', label: 'n8n', kw: 'n8n' },
    { href: root + 'dashboard/', icon: '📊', label: '대시보드', kw: 'dashboard' },
    { href: root + 'consult/', icon: '📋', label: '상담자료', kw: 'consult' }
  ];

  // 현재 페이지 섹션 수집 — details summary만 (탭/h1/section-label 제외)
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

  var sidebar = document.createElement('aside');
  sidebar.id = 'sidebar';

  var pagesHtml = pages.map(function(p) {
    var active = isActive(p.kw) && p.kw !== 'index' ? ' sb-active' : '';
    if (p.kw === 'index' && (cur.endsWith('/cdn-assets/') || cur.endsWith('/cdn-assets/index.html'))) active = ' sb-active';
    return '<a href="' + p.href + '" class="sb-link' + active + '"><span class="sb-icon">' + p.icon + '</span>' + p.label + '</a>';
  }).join('');

  var sectionsHtml = '';
  if (sections.length > 0) {
    sectionsHtml = '<div class="sb-divider"></div><div class="sb-section-title">이 페이지</div>'
      + sections.map(function(s) {
        return '<a href="#' + s.id + '" class="sb-anchor">' + s.text + '</a>';
      }).join('');
  }

  sidebar.innerHTML = '<div class="sb-inner">'
    + '<div class="sb-section-title">바로가기</div>'
    + pagesHtml
    + sectionsHtml
    + '</div>';

  var style = document.createElement('style');
  style.textContent = ''
    + '#sidebar { position: fixed; top: 48px; width: 170px; height: calc(100vh - 48px); overflow-y: auto; padding: 16px 10px; z-index: 90; }'
    + '#sidebar { left: calc(50% + 420px); }'
    + '.sb-inner { display: flex; flex-direction: column; gap: 1px; }'
    + '.sb-section-title { font-size: 11px; font-weight: 700; color: #94A3B8; letter-spacing: 0.5px; padding: 6px 8px 4px; }'
    + '.sb-link { display: flex; align-items: center; gap: 6px; padding: 5px 8px; font-size: 13px; font-weight: 600; color: #64748B; text-decoration: none; border-radius: 6px; transition: all 0.15s; white-space: nowrap; }'
    + '.sb-link:hover { color: #0077C8; background: #F1F5F9; }'
    + '.sb-link.sb-active { color: #0077C8; background: #E8F3FF; }'
    + '.sb-icon { font-size: 15px; }'
    + '.sb-divider { height: 1px; background: #E2E8F0; margin: 8px 4px; }'
    + '.sb-anchor { display: block; padding: 4px 8px; font-size: 12px; font-weight: 600; color: #94A3B8; text-decoration: none; border-radius: 4px; transition: all 0.15s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }'
    + '.sb-anchor:hover { color: #0077C8; background: #F1F5F9; }'
    + '@media (max-width: 1200px) { #sidebar { display: none; } }';

  document.head.appendChild(style);
  document.body.appendChild(sidebar);
})();
