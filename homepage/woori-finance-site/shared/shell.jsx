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
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <a href="../../../index.html" style={{ color: ds.accent, textDecoration: 'none', fontSize: 13, fontWeight: 800 }}>대시보드</a>
        <a href="coaching.html" style={{
          background: ds.ink, color: ds.bg, textDecoration: 'none',
          padding: '10px 18px', borderRadius: version === 'v6' ? 0 : 999,
          fontSize: 13, fontWeight: 700
        }}>상담 신청 →</a>
      </div>
    </div>
  );
};

const PageFooter = ({ version }) => {
  const ds = window.DS[version];
  return (
    <footer data-homepage-footer="true" style={{ background: '#2d2d2d', color: '#fff', padding: '42px 24px 38px', fontFamily: ds.fontBody, fontSize: 13, lineHeight: 1.85 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '18px 26px', marginBottom: 22 }}>
          <strong style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>우리동네 재테크</strong>
          <a href="https://ourdongne.com/" style={{ color: '#d1d5db', textDecoration: 'none', fontWeight: 700 }}>우리동네 클래스</a>
          <a href="https://ourdongne.com/refund" style={{ color: '#d1d5db', textDecoration: 'none', fontWeight: 700 }}>환불규정</a>
          <a href="https://ourdongne.com/privacy" style={{ color: '#d1d5db', textDecoration: 'none', fontWeight: 700 }}>개인정보 처리방침</a>
          <a href="https://ourdongne.com/terms" style={{ color: '#d1d5db', textDecoration: 'none', fontWeight: 700 }}>이용약관</a>
        </div>
        <div style={{ color: '#909090' }}>
          <p style={{ margin: 0 }}>(주)우리동네사람들 | 대표자 : 홍윤지 | 소재지 : 당산로 92, 301-이3호(당산동1가, 호서빌딩)</p>
          <p style={{ margin: 0 }}>사업자 등록번호 : 386-86-03832 | 통신판매신고번호 : 제 2026-서울영등포-0991 호</p>
          <p style={{ margin: 0 }}>개인정보관리책임자 : 홍윤지 | 호스팅제공자 : (주)아임웹</p>
          <p style={{ margin: 0 }}>대표번호 070-4517-9400</p>
          <p style={{ margin: 0 }}>문의 : contact@ourdongne.com</p>
          <p style={{ margin: '18px 0 0' }}>2026 주식회사 우리동네사람들 . All rights reserved.</p>
          <p style={{ margin: 0 }}>Copyright ⓒ 2026 우리동네재테크 All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

window.VersionSwitcher = VersionSwitcher;
window.PageNav = PageNav;
window.PageFooter = PageFooter;
