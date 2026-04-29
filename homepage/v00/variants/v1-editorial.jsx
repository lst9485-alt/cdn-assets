// Variant 1: Bold Editorial Magazine
const V1Editorial = () => {
  return (
    <div style={{ width: 1280, background: '#FFF8E7', fontFamily: "'Pretendard', sans-serif", color: '#1A2B47' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 56px', borderBottom: '2px solid #1A2B47' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FF6B5B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF8E7', fontSize: 16 }}>동</div>
          우리동네재테크
        </div>
        <nav style={{ display: 'flex', gap: 28, fontSize: 14, fontWeight: 500 }}>
          <span>로드맵</span><span>코칭</span><span>후기</span><span>가격</span><span>FAQ</span>
        </nav>
        <button style={{ background: '#1A2B47', color: '#FFF8E7', border: 'none', padding: '12px 22px', borderRadius: 999, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>무료 상담 →</button>
      </div>

      {/* Issue marker */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 56px', fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase' }}>
        <span>ISSUE Nº 042</span>
        <span>내집마련 매거진</span>
        <span>WINTER 2026</span>
      </div>

      {/* Hero */}
      <div style={{ padding: '40px 56px 80px', borderTop: '1px solid #1A2B47' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 56, alignItems: 'end' }}>
          <div>
            <div style={{ display: 'inline-block', background: '#F4C430', padding: '6px 14px', fontSize: 13, fontWeight: 700, marginBottom: 32 }}>★ 100건+ 상담 · 만족도 4.97/5</div>
            <h1 style={{ fontSize: 124, lineHeight: 0.95, fontWeight: 900, margin: 0, letterSpacing: '-0.04em' }}>
              지금<br />
              <span style={{ color: '#FF6B5B' }}>여기,</span><br />
              사도<br />
              될까요?
            </h1>
          </div>
          <div>
            <div style={{ width: '100%', height: 280, background: 'repeating-linear-gradient(45deg, #F4C430, #F4C430 8px, #FFE066 8px, #FFE066 16px)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', color: '#1A2B47', fontSize: 13, marginBottom: 16 }}>[ 운영자 사진 ]</div>
            <p style={{ fontSize: 16, lineHeight: 1.6, fontWeight: 500, margin: 0 }}>
              막연한 추측 대신 <strong>데이터 기반</strong>으로 답을 드립니다. ETF로 종잣돈, 부동산으로 자산. 직장인이 따라할 수 있는 단계별 내집마련 로드맵.
            </p>
            <button style={{ marginTop: 20, width: '100%', background: '#FF6B5B', color: '#FFF8E7', border: 'none', padding: '20px', fontSize: 17, fontWeight: 800, borderRadius: 12, cursor: 'pointer' }}>무료 상담 신청하기 →</button>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ background: '#1A2B47', color: '#FFF8E7', padding: '40px 56px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32 }}>
        {[
          ['100++', '1:1 상담 진행'],
          ['4.97', '5점 만점 만족도'],
          ['10년+', '투자업계 경력'],
          ['90일', '코칭 후 케어'],
        ].map(([n, l]) => (
          <div key={l}>
            <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1, color: '#F4C430' }}>{n}</div>
            <div style={{ fontSize: 14, marginTop: 8, opacity: 0.8 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Story split */}
      <div style={{ padding: '80px 56px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: '#FF6B5B', marginBottom: 12 }}>THE STORY</div>
        <h2 style={{ fontSize: 56, fontWeight: 900, margin: 0, lineHeight: 1.05, letterSpacing: '-0.03em', maxWidth: 900 }}>
          분당과 일산, <span style={{ background: '#F4C430', padding: '0 8px' }}>어디를 사야</span> 됐을까요?
        </h2>
        <p style={{ fontSize: 18, marginTop: 16, opacity: 0.7 }}>2006년의 두 선택. 20년 뒤 결과는 13억 차이.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 40 }}>
          <div style={{ background: '#FFFFFF', border: '2px solid #1A2B47', padding: 32, borderRadius: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#4ECDC4', marginBottom: 8 }}>김과장 (중소기업)</div>
            <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 4 }}>분당</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 14, opacity: 0.6 }}>2006</span>
              <span style={{ fontSize: 28, fontWeight: 800 }}>7억</span>
              <span style={{ fontSize: 20, opacity: 0.4 }}>→</span>
              <span style={{ fontSize: 14, opacity: 0.6 }}>2026</span>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#FF6B5B' }}>19억</span>
            </div>
            <div style={{ height: 80, background: 'linear-gradient(to top right, #FFE5E0, #FF6B5B)', borderRadius: 8, position: 'relative' }}>
              <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 14, fontWeight: 700, color: '#FFF8E7' }}>+12억 ↑</div>
            </div>
          </div>
          <div style={{ background: '#FFFFFF', border: '2px solid #1A2B47', padding: 32, borderRadius: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#4ECDC4', marginBottom: 8 }}>강씨 (고소득 의사)</div>
            <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 4 }}>일산</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 14, opacity: 0.6 }}>2006</span>
              <span style={{ fontSize: 28, fontWeight: 800 }}>10억</span>
              <span style={{ fontSize: 20, opacity: 0.4 }}>→</span>
              <span style={{ fontSize: 14, opacity: 0.6 }}>2026</span>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#1A2B47' }}>6억</span>
            </div>
            <div style={{ height: 80, background: 'linear-gradient(to bottom right, #C8DDF0, #6B8CAE)', borderRadius: 8, position: 'relative' }}>
              <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 14, fontWeight: 700, color: '#FFF8E7' }}>-4억 ↓</div>
            </div>
          </div>
        </div>
      </div>

      {/* Roadmap */}
      <div style={{ background: '#1A2B47', color: '#FFF8E7', padding: '80px 56px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: '#F4C430', marginBottom: 12 }}>THE ROADMAP</div>
        <h2 style={{ fontSize: 56, fontWeight: 900, margin: 0, lineHeight: 1.05, letterSpacing: '-0.03em' }}>
          내집마련, <span style={{ color: '#F4C430' }}>3단계</span>로 끝.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginTop: 48 }}>
          {[
            ['01', 'ETF로 종잣돈 모으기', '잃지 않는 자산배분으로 시드를 만든다.', '#4ECDC4'],
            ['02', '내가 살 수 있는 가장 좋은 집', '예산 진단부터 계약까지 100건+ 데이터.', '#F4C430'],
            ['03', '갈아타기로 자산 늘리기', '1주택자가 더 좋은 자산으로 옮기는 순서.', '#FF6B5B'],
          ].map(([n, t, d, c]) => (
            <div key={n} style={{ borderTop: `3px solid ${c}`, paddingTop: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: c, marginBottom: 12 }}>STEP {n}</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, lineHeight: 1.2 }}>{t}</div>
              <div style={{ fontSize: 15, opacity: 0.7, lineHeight: 1.5 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '80px 56px', textAlign: 'center', background: '#F4C430' }}>
        <h2 style={{ fontSize: 72, fontWeight: 900, margin: 0, lineHeight: 1, letterSpacing: '-0.03em' }}>사고 후회 말고,<br />사기 전에.</h2>
        <button style={{ marginTop: 32, background: '#1A2B47', color: '#FFF8E7', border: 'none', padding: '22px 48px', fontSize: 18, fontWeight: 800, borderRadius: 999, cursor: 'pointer' }}>무료 상담 신청 →</button>
      </div>
    </div>
  );
};
window.V1Editorial = V1Editorial;
