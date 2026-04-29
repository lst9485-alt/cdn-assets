// Variant 3: Data Story — chart-led, serious tone
const V3Data = () => {
  // Build a simple SVG comparison chart
  const years = [2006, 2011, 2016, 2021, 2026];
  const bundang = [7, 9, 12, 16, 19];
  const ilsan = [10, 11, 10, 8, 6];

  const W = 760, H = 320, P = 40;
  const xs = years.map((_, i) => P + (i / (years.length - 1)) * (W - 2 * P));
  const yScale = (v) => H - P - (v / 20) * (H - 2 * P);
  const path = (arr) => arr.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xs[i]} ${yScale(v)}`).join(' ');

  return (
    <div style={{ width: 1280, background: '#FAFAF7', fontFamily: "'Pretendard', sans-serif", color: '#0E1729' }}>
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 56px', borderBottom: '1px solid rgba(14,23,41,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 18 }}>
          <div style={{ width: 28, height: 28, background: '#0E1729', display: 'grid', placeItems: 'center', color: '#F4C430', fontSize: 14, fontWeight: 900 }}>동</div>
          우리동네재테크
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
          <span style={{ background: '#0E1729', color: '#FAFAF7', padding: '4px 10px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>LIVE</span>
          <span>오늘 상담 가능: <strong>1자리</strong></span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: '64px 56px 32px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 3, opacity: 0.5, marginBottom: 16 }}>DATA-DRIVEN HOME BUYING</div>
        <h1 style={{ fontSize: 88, fontWeight: 800, margin: 0, lineHeight: 1, letterSpacing: '-0.03em', maxWidth: 1000 }}>
          추측 그만.<br/>
          <span style={{ color: '#0E1729', borderBottom: '8px solid #F4C430' }}>데이터로</span> 내집마련.
        </h1>
        <p style={{ fontSize: 19, marginTop: 24, opacity: 0.65, maxWidth: 720, lineHeight: 1.6 }}>
          ETF로 종잣돈, 부동산으로 자산. 100건+ 상담 데이터를 기반으로 직장인이 따라할 수 있는 단계별 내집마련 로드맵을 설계합니다.
        </p>
      </div>

      {/* Big chart card */}
      <div style={{ padding: '0 56px 64px' }}>
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,41,0.1)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(14,23,41,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: 2, opacity: 0.5, fontWeight: 700 }}>FIG. 01 · 매매가 추이 (단위: 억)</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>분당 vs 일산 — 2006 → 2026</div>
            </div>
            <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, background: '#FF6B5B', borderRadius: '50%' }}></span>분당</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, background: '#6B8CAE', borderRadius: '50%' }}></span>일산</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px' }}>
            <div style={{ padding: 24 }}>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
                {/* grid lines */}
                {[0, 5, 10, 15, 20].map(v => (
                  <g key={v}>
                    <line x1={P} y1={yScale(v)} x2={W - P} y2={yScale(v)} stroke="#0E1729" strokeOpacity="0.06" />
                    <text x={P - 8} y={yScale(v) + 4} fontSize="10" fill="#0E1729" opacity="0.5" textAnchor="end">{v}억</text>
                  </g>
                ))}
                {years.map((y, i) => (
                  <text key={y} x={xs[i]} y={H - P + 20} fontSize="10" fill="#0E1729" opacity="0.5" textAnchor="middle">{y}</text>
                ))}
                <path d={path(ilsan)} fill="none" stroke="#6B8CAE" strokeWidth="2.5" />
                <path d={path(bundang)} fill="none" stroke="#FF6B5B" strokeWidth="3" />
                {bundang.map((v, i) => <circle key={i} cx={xs[i]} cy={yScale(v)} r="4" fill="#FF6B5B" />)}
                {ilsan.map((v, i) => <circle key={i} cx={xs[i]} cy={yScale(v)} r="4" fill="#6B8CAE" />)}
                {/* annotation */}
                <line x1={xs[4]} y1={yScale(19)} x2={xs[4]} y2={yScale(6)} stroke="#0E1729" strokeDasharray="3 3" strokeOpacity="0.4" />
                <text x={xs[4] + 8} y={yScale(12.5)} fontSize="11" fontWeight="700" fill="#0E1729">13억 차이</text>
              </svg>
            </div>
            <div style={{ borderLeft: '1px solid rgba(14,23,41,0.08)', padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.5, fontWeight: 700, marginBottom: 12 }}>핵심 인사이트</div>
                <p style={{ fontSize: 15, lineHeight: 1.55, margin: 0 }}>
                  중소기업 김과장은 <strong>분당 7억</strong>을, 고소득 의사 강씨는 <strong>일산 10억</strong>을 샀습니다. 20년 뒤 격차는 <strong style={{ color: '#FF6B5B' }}>13억</strong>.
                </p>
              </div>
              <div style={{ borderTop: '1px solid rgba(14,23,41,0.08)', paddingTop: 16, marginTop: 24 }}>
                <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>SOURCE</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>KB부동산 시계열 · 2006-2026</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics row */}
      <div style={{ padding: '0 56px 64px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          ['100++', '1:1 상담', '+12 이번달'],
          ['4.97', '만족도 / 5.0', '실 후기 기반'],
          ['25%', '"매수 보류" 비율', '단호한 진단'],
          ['90일', '코칭 후 케어', '카톡 무제한'],
        ].map(([n, l, s], i) => (
          <div key={i} style={{ background: '#FFFFFF', border: '1px solid rgba(14,23,41,0.08)', borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em' }}>{n}</div>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>{l}</div>
            <div style={{ fontSize: 11, color: '#4ECDC4', marginTop: 12, fontWeight: 700 }}>↑ {s}</div>
          </div>
        ))}
      </div>

      {/* Process */}
      <div style={{ background: '#0E1729', color: '#FAFAF7', padding: '64px 56px' }}>
        <div style={{ fontSize: 12, letterSpacing: 3, opacity: 0.5, fontWeight: 700, marginBottom: 12 }}>METHODOLOGY</div>
        <h2 style={{ fontSize: 48, fontWeight: 800, margin: 0, lineHeight: 1.05, letterSpacing: '-0.02em', maxWidth: 800 }}>
          50분 안에, 기준과 다음 행동을 명확히.
        </h2>

        <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(255,255,255,0.1)' }}>
          {[
            ['01', '현재 상황 진단', '예산·대출, 거주 우선순위, 지금 사도 되는지 1차 판단까지 사전 질문지를 바탕으로 같이 점검합니다.'],
            ['02', '후보 지역·단지 압축', '지역과 단지 후보를 무작정 넓히지 않고, 실제로 비교할 기준과 현장 확인 포인트까지 함께 정리합니다.'],
            ['03', '실행 플랜 + 90일', '살지 보류할지 결론, 당장 해야 할 일, 이후 질문이 생겼을 때 확인할 기준까지 남겨드립니다.'],
          ].map(([n, t, d]) => (
            <div key={n} style={{ background: '#0E1729', padding: 32 }}>
              <div style={{ fontSize: 14, color: '#F4C430', fontWeight: 700, marginBottom: 16 }}>STEP {n}</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>{t}</div>
              <div style={{ fontSize: 14, opacity: 0.7, lineHeight: 1.6 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '64px 56px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(14,23,41,0.1)' }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: 3, opacity: 0.5, fontWeight: 700, marginBottom: 8 }}>READY?</div>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em' }}>지금 여기, 사도 될까요?</div>
        </div>
        <button style={{ background: '#0E1729', color: '#F4C430', border: 'none', padding: '22px 36px', fontSize: 16, fontWeight: 800, borderRadius: 8, cursor: 'pointer' }}>무료 상담 신청 →</button>
      </div>
    </div>
  );
};
window.V3Data = V3Data;
