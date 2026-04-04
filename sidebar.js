// 오른쪽 고정 사이드바 — 목차 + 페이지 이동
(function() {
  var pathAfterAssets = location.pathname.split('cdn-assets/')[1] || '';
  var segments = pathAfterAssets.split('/').filter(Boolean);
  if (segments.length > 0 && segments[segments.length-1].includes('.html') && segments[segments.length-1] !== 'index.html') segments.pop();
  if (segments.length > 0 && segments[segments.length-1] === 'index.html') segments.pop();
  var root = segments.length === 0 ? './' : '../'.repeat(segments.length);
  var cur = location.pathname;

  function isActive(kw) { return cur.indexOf(kw) !== -1; }

  // 페이지 링크
  var pages = [
    { href: root, icon: '🏠', label: '메인', kw: 'index' },
    { href: root + 'process/settlement.html', icon: '💰', label: '정산', kw: 'settlement' },
    { href: root + 'process/youtube.html', icon: '🎬', label: '유튜브', kw: 'youtube' },
    { href: root + 'process/crm.html', icon: '🤝', label: 'CRM', kw: 'crm' },
    { href: root + 'process/n8n.html', icon: '⚙️', label: 'n8n', kw: 'n8n' },
    { href: root + 'dashboard/', icon: '📊', label: '대시보드', kw: 'dashboard' },
    { href: root + 'consult/', icon: '📋', label: '상담자료', kw: 'consult' }
  ];

  // 현재 페이지 섹션 수집
  var sections = [];
  document.querySelectorAll('.section-label, .tab, details summary, .phase-divider .phase-label, h1').forEach(function(el, i) {
    var text = el.textContent.trim();
    if (!text || text.length > 30) return;
    var id = 'sec-' + i;
    el.id = id;
    sections.push({ id: id, text: text });
  });

  var sidebar = document.createElement('aside');
  sidebar.id = 'sidebar';

  var pagesHtml = pages.map(function(p) {
    var active = isActive(p.kw) && p.kw !== 'index' ? ' sb-active' : '';
    // 메인은 루트일 때만 active
    if (p.kw === 'index' && (cur.endsWith('/cdn-assets/') || cur.endsWith('/cdn-assets/index.html'))) active = ' sb-active';
    return '<a href="' + p.href + '" class="sb-link' + active + '"><span class="sb-icon">' + p.icon + '</span>' + p.label + '</a>';
  }).join('');

  var sectionsHtml = '';
  if (sections.length > 1) {
    sectionsHtml = '<div class="sb-divider"></div><div class="sb-section-title">이 페이지</div>'
      + sections.map(function(s) {
        return '<a href="#' + s.id + '" class="sb-anchor">' + s.text + '</a>';
      }).join('');
  }

  sidebar.innerHTML = '<div class="sb-inner">'
    + '<div class="sb-section-title">페이지 이동</div>'
    + pagesHtml
    + sectionsHtml
    + '</div>';

  var style = document.createElement('style');
  style.textContent = ''
    + '#sidebar { position: fixed; right: 0; top: 48px; width: 180px; height: calc(100vh - 48px); overflow-y: auto; padding: 16px 12px; background: white; border-left: 1px solid #E2E8F0; z-index: 90; }'
    + '.sb-inner { display: flex; flex-direction: column; gap: 2px; }'
    + '.sb-section-title { font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 8px 4px; }'
    + '.sb-link, .sb-anchor { display: flex; align-items: center; gap: 6px; padding: 6px 8px; font-size: 12px; font-weight: 600; color: #64748B; text-decoration: none; border-radius: 6px; transition: all 0.15s; }'
    + '.sb-link:hover, .sb-anchor:hover { color: #0077C8; background: #F1F5F9; }'
    + '.sb-link.sb-active { color: #0077C8; background: #E8F3FF; }'
    + '.sb-icon { font-size: 14px; }'
    + '.sb-divider { height: 1px; background: #E2E8F0; margin: 8px 0; }'
    + '.sb-anchor { font-size: 11px; color: #94A3B8; padding: 4px 8px; }'
    + '.sb-anchor:hover { color: #0077C8; }'
    + '@media (max-width: 1100px) { #sidebar { display: none; } }';

  document.head.appendChild(style);
  document.body.appendChild(sidebar);

  // 메인 콘텐츠 영역 여백 추가 (사이드바 겹침 방지)
  var mainStyle = document.createElement('style');
  mainStyle.textContent = '@media (min-width: 1101px) { body { margin-right: 180px; } }';
  document.head.appendChild(mainStyle);
})();
