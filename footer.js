// 페이지 하단 최근 수정일 표시 — page-dates.json 기반
(function() {
  var pathAfterAssets = location.pathname.split('cdn-assets/')[1] || '';
  var segments = pathAfterAssets.split('/').filter(Boolean);
  if (segments.length > 0 && segments[segments.length-1] === '') segments.pop();
  var root = segments.length === 0 ? './' : '../'.repeat(segments.length > 1 && !segments[segments.length-1].includes('.html') ? segments.length : segments.length - (segments[segments.length-1].includes('.html') ? 1 : 0));

  // 페이지 키: cdn-assets/ 이후 경로
  var pageKey = pathAfterAssets;
  if (!pageKey || pageKey === '' || pageKey.endsWith('/')) pageKey += 'index.html';

  // root 경로 계산 (nav.js 방식)
  var segs = pathAfterAssets.split('/').filter(Boolean);
  if (segs.length > 0 && segs[segs.length-1].includes('.html') && segs[segs.length-1] !== 'index.html') segs.pop();
  if (segs.length > 0 && segs[segs.length-1] === 'index.html') segs.pop();
  var dataRoot = segs.length === 0 ? './' : '../'.repeat(segs.length);

  fetch(dataRoot + 'data/page-dates.json')
    .then(function(r) { if (!r.ok) throw 0; return r.json(); })
    .then(function(dates) {
      var date = dates[pageKey];
      if (!date) return;
      var d = new Date(date);
      var text = '마지막 수정: ' + d.getFullYear() + '.' + (d.getMonth()+1) + '.' + d.getDate();
      var footer = document.createElement('div');
      footer.style.cssText = 'text-align:center;padding:16px 0 24px;font-size:11px;color:#94A3B8;';
      footer.textContent = text;
      document.body.appendChild(footer);
    })
    .catch(function() {});
})();
