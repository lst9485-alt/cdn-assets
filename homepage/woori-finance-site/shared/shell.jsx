// 공통 Shell — 버전 스위처(상단), 페이지 네비, 풋터
// version: 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6'
// page: 'main' | 'coaching' | 'curriculum' | 'lecture' | 'bookclub' | 'refund'

const VersionSwitcher = ({ version, page }) => {
  const ds = window.DS[version];
  const versions = window.CONTENT.versions;
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: ds.ink, color: ds.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 24px', fontFamily: ds.fontBody, fontSize: 13
    }}>
      <span style={{ opacity: 0.7, fontWeight: 600 }}>버전 전환:</span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {versions.map(v => (
          <a key={v.id} href={v.href || `../${v.id}/${page}.html`} style={{
            padding: '6px 14px',
            background: v.id === version ? ds.accent : 'transparent',
            color: v.id === version ? (v.id === 'v5' ? ds.ink : ds.bg) : ds.bg,
            border: `1px solid ${v.id === version ? ds.accent : 'rgba(255,255,255,0.25)'}`,
            borderRadius: 999, textDecoration: 'none',
            fontWeight: 700, fontSize: 12
          }}>
            {(v.displayId || v.id).toUpperCase()} · {v.label}
          </a>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <a href="../index.html" style={{ color: ds.bg, textDecoration: 'none', opacity: 0.75, fontSize: 12 }}>← 시안 목록</a>
        <a href="../../../index.html" style={{ color: ds.bg, textDecoration: 'none', opacity: 0.75, fontSize: 12 }}>대시보드</a>
      </div>
    </div>
  );
};

const PageNav = ({ version, page }) => {
  const ds = window.DS[version];
  const pages = window.CONTENT.pages;
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '20px 40px', background: ds.bg, borderBottom: `1px solid ${ds.muted}`,
      fontFamily: ds.fontBody
    }}>
      <a href="main.html" style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 20, color: ds.ink, textDecoration: 'none' }}>
        <div style={{ width: 32, height: 32, borderRadius: version === 'v6' ? 0 : '50%', background: ds.accent, display: 'grid', placeItems: 'center', color: ds.bg, fontSize: 14, fontWeight: 900 }}>동</div>
        {window.CONTENT.brand}
      </a>
      <nav style={{ display: 'flex', gap: 24 }}>
        {pages.map(p => (
          <a key={p.id} href={p.file} style={{
            color: p.id === page ? ds.accent : ds.ink,
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: p.id === page ? 800 : 500,
            borderBottom: p.id === page ? `2px solid ${ds.accent}` : 'none',
            paddingBottom: 4
          }}>{p.label}</a>
        ))}
      </nav>
      <a href="coaching.html" style={{
        background: ds.ink, color: ds.bg, textDecoration: 'none',
        padding: '10px 18px', borderRadius: version === 'v6' ? 0 : 999,
        fontSize: 13, fontWeight: 700
      }}>상담 신청 →</a>
    </div>
  );
};

const PageFooter = ({ version }) => {
  const ds = window.DS[version];
  return (
    <footer style={{ background: ds.ink, color: ds.bg, padding: '48px 40px 32px', fontFamily: ds.fontBody }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 32, paddingBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>{window.CONTENT.brand}</div>
          <div style={{ fontSize: 14, opacity: 0.7, lineHeight: 1.6, maxWidth: 400 }}>
            직장인을 위한 내집마련 로드맵.<br/>잃지 않는 투자, 따라할 수 있는 순서.
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.5, marginBottom: 12, letterSpacing: 1 }}>SERVICE</div>
          {window.CONTENT.pages.map(p => (
            <a key={p.id} href={p.file} style={{ display: 'block', color: ds.bg, textDecoration: 'none', fontSize: 13, opacity: 0.8, marginBottom: 8 }}>{p.label}</a>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.5, marginBottom: 12, letterSpacing: 1 }}>CONTACT</div>
          <a href="https://www.youtube.com/" style={{ display: 'block', color: ds.bg, textDecoration: 'none', fontSize: 13, opacity: 0.8, marginBottom: 8 }}>유튜브 채널</a>
          <a href="https://pf.kakao.com/" style={{ display: 'block', color: ds.bg, textDecoration: 'none', fontSize: 13, opacity: 0.8, marginBottom: 8 }}>카카오 채널</a>
          <a href="refund.html" style={{ display: 'block', color: ds.bg, textDecoration: 'none', fontSize: 13, opacity: 0.8, marginBottom: 8 }}>환불 규정</a>
        </div>
      </div>
      <div style={{ paddingTop: 24, fontSize: 12, opacity: 0.5, display: 'flex', justifyContent: 'space-between' }}>
        <span>© 2026 우리동네재테크 · 주식회사 우리동네사람들</span>
        <span>{(window.CONTENT.versions.find(v => v.id === version) || {}).displayName || ds.name}</span>
      </div>
    </footer>
  );
};

window.VersionSwitcher = VersionSwitcher;
window.PageNav = PageNav;
window.PageFooter = PageFooter;
