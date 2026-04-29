// Variant 6: Risograph zine — playful, print-feel, big chunky type
const V6Zine = () => {
  return (
    <div style={{ width: 1280, background: '#FFE9C8', fontFamily: "'Pretendard', sans-serif", color: '#2A1F1A', position: 'relative' }}>
      {/* Paper texture overlay */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(42,31,26,0.08) 1px, transparent 1px)', backgroundSize: '4px 4px', mixBlendMode: 'multiply', pointerEvents: 'none' }}></div>

      {/* Top */}
      <div style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', borderBottom: '4px solid #2A1F1A', position: 'relative' }}>
        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Courier New', monospace" }}>VOL.01 · 직장인 내집마련 메뉴얼</div>
        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Courier New', monospace" }}>· 우리동네재테크 ·</div>
        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Courier New', monospace" }}>₩0 무료 상담</div>
      </div>

      {/* Hero — huge poster type */}
      <div style={{ padding: '40px 40px 0', position: 'relative' }}>
        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Courier New', monospace", marginBottom: 16 }}>※ 100건++ 상담 · 만족도 4.97 ※</div>
        <div style={{ position: 'relative' }}>
          <h1 style={{ fontSize: 220, fontWeight: 900, margin: 0, lineHeight: 0.85, letterSpacing: '-0.06em', color: '#FF4D2D' }}>
            추측<br/>그만,
          </h1>
          <div style={{ position: 'absolute', top: 40, right: 40, transform: 'rotate(8deg)', background: '#1A2B47', color: '#FFE9C8', padding: '20px 28px', fontSize: 24, fontWeight: 900, fontFamily: "'Courier New', monospace", boxShadow: '8px 8px 0 #FF4D2D' }}>
            DATA<br/>OVER VIBES
          </div>
        </div>
        <h1 style={{ fontSize: 220, fontWeight: 900, margin: '-20px 0 0', lineHeight: 0.85, letterSpacing: '-0.06em', color: '#2A1F1A', textAlign: 'right' }}>
          내집,<br/>마련.
        </h1>
      </div>

      {/* Sub-hero */}
      <div style={{ padding: '40px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32, alignItems: 'end' }}>
        <p style={{ fontSize: 24, lineHeight: 1.4, fontWeight: 600, margin: 0, maxWidth: 640 }}>
          "지금 안 사면 못 산다"는 패닉, "내년에 사면 되지"라는 미루기.
          그 사이에서 매번 지는 직장인을 위한 <span style={{ background: '#FCEE21', padding: '0 6px' }}>현실적인 가이드</span>.
        </p>
        <div style={{ background: '#1A2B47', color: '#FFE9C8', padding: 24, fontFamily: "'Courier New', monospace", fontSize: 14, lineHeight: 1.7 }}>
          <div style={{ borderBottom: '1px dashed #FFE9C8', paddingBottom: 8, marginBottom: 12, fontWeight: 800 }}>이 책에는</div>
          <div>→ ETF 종잣돈 만들기</div>
          <div>→ 진짜 사도 되는 집 고르기</div>
          <div>→ 갈아타기 타이밍</div>
          <div>→ 90일 카톡 케어</div>
        </div>
      </div>

      {/* Bold CTA banner */}
      <div style={{ background: '#FF4D2D', color: '#FFE9C8', padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '4px solid #2A1F1A', borderBottom: '4px solid #2A1F1A' }}>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em' }}>★ 무료 상담 — 50분 1:1 화상 + 90일 카톡 케어</div>
        <button style={{ background: '#FCEE21', color: '#2A1F1A', border: '3px solid #2A1F1A', padding: '14px 24px', fontSize: 16, fontWeight: 900, cursor: 'pointer', fontFamily: "'Courier New', monospace" }}>신청 →</button>
      </div>

      {/* Story panel — comic style */}
      <div style={{ padding: '56px 40px' }}>
        <div style={{ fontFamily: "'Courier New', monospace", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>CHAPTER 01</div>
        <h2 style={{ fontSize: 64, fontWeight: 900, margin: 0, lineHeight: 0.95, letterSpacing: '-0.04em' }}>
          분당 vs 일산.<br/><span style={{ color: '#FF4D2D' }}>13억 차이</span>의 이유.
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 40 }}>
          {[
            { who: '김과장', sub: '중소기업 · 2006', city: '분당', start: '7억', end: '19억', diff: '+12억', tone: 'win' },
            { who: '강씨', sub: '의사 · 2006', city: '일산', start: '10억', end: '6억', diff: '-4억', tone: 'lose' },
          ].map((p, i) => (
            <div key={p.who} style={{ background: p.tone === 'win' ? '#FCEE21' : '#B0C4DE', border: '4px solid #2A1F1A', padding: 28, position: 'relative' }}>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Courier New', monospace" }}>FIG.0{i+1}</div>
              <div style={{ fontSize: 36, fontWeight: 900, marginTop: 8 }}>{p.who}</div>
              <div style={{ fontSize: 14, opacity: 0.7 }}>{p.sub}</div>
              <div style={{ fontSize: 80, fontWeight: 900, lineHeight: 1, margin: '20px 0 8px', letterSpacing: '-0.05em' }}>{p.city}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, fontSize: 18, fontWeight: 700 }}>
                <span>{p.start}</span><span>→</span><span style={{ fontSize: 28 }}>{p.end}</span>
                <span style={{ marginLeft: 'auto', background: p.tone === 'win' ? '#FF4D2D' : '#2A1F1A', color: '#FFE9C8', padding: '4px 12px', fontSize: 18, fontWeight: 900 }}>{p.diff}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: '#2A1F1A', color: '#FFE9C8', padding: 32, marginTop: 24, fontSize: 22, lineHeight: 1.5, fontWeight: 600 }}>
          고소득이라고 안전하지 않습니다. <span style={{ color: '#FCEE21' }}>잘못 사면 10년 이상 후회합니다.</span> 우리는 그래서 데이터로 답을 드립니다.
        </div>
      </div>

      {/* 3 step */}
      <div style={{ background: '#FCEE21', padding: '56px 40px', borderTop: '4px solid #2A1F1A', borderBottom: '4px solid #2A1F1A' }}>
        <div style={{ fontFamily: "'Courier New', monospace", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>CHAPTER 02</div>
        <h2 style={{ fontSize: 64, fontWeight: 900, margin: 0, lineHeight: 0.95, letterSpacing: '-0.04em' }}>3단계로 끝.</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 40 }}>
          {[
            ['ETF로 종잣돈', '잃지 않는 자산배분으로 시드를 만든다'],
            ['살 수 있는 가장 좋은 집', '예산 진단부터 계약까지'],
            ['갈아타기로 자산 늘리기', '1주택자가 더 좋은 자산으로'],
          ].map(([t, d], i) => (
            <div key={i} style={{ background: '#FFE9C8', border: '4px solid #2A1F1A', padding: 24 }}>
              <div style={{ fontSize: 88, fontWeight: 900, lineHeight: 1, color: '#FF4D2D', letterSpacing: '-0.05em' }}>0{i+1}</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 12, lineHeight: 1.2 }}>{t}</div>
              <div style={{ fontSize: 14, opacity: 0.7, marginTop: 8, lineHeight: 1.5 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div style={{ padding: '56px 40px' }}>
        <div style={{ fontFamily: "'Courier New', monospace", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>CHAPTER 03 · 가격</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ border: '4px solid #2A1F1A', padding: 28, background: '#FFE9C8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: 32, fontWeight: 900 }}>코칭 A</div>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: 12, fontWeight: 700 }}>20% OFF</div>
            </div>
            <div style={{ fontSize: 56, fontWeight: 900, marginTop: 12, letterSpacing: '-0.03em' }}>40만원 <span style={{ fontSize: 22, opacity: 0.4, textDecoration: 'line-through', fontWeight: 600 }}>50만원</span></div>
            <ul style={{ fontSize: 15, lineHeight: 1.7, padding: 0, listStyle: 'none', marginTop: 16 }}>
              <li>· 온라인 화상회의 50분</li>
              <li>· 90일 카톡 질의응답</li>
              <li>· 부부동반 가능</li>
              <li>· 상담 리포트 + 자산관리시트</li>
            </ul>
          </div>
          <div style={{ border: '4px solid #2A1F1A', padding: 28, background: '#FF4D2D', color: '#FFE9C8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: 32, fontWeight: 900 }}>코칭 B</div>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: 12, fontWeight: 700 }}>매월 2명만</div>
            </div>
            <div style={{ fontSize: 56, fontWeight: 900, marginTop: 12, letterSpacing: '-0.03em' }}>96만원</div>
            <ul style={{ fontSize: 15, lineHeight: 1.7, padding: 0, listStyle: 'none', marginTop: 16 }}>
              <li>· 코칭 A 전체 포함</li>
              <li>· + 동행임장 1회</li>
              <li>· 현장에서 직접 비교</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div style={{ background: '#2A1F1A', color: '#FFE9C8', padding: '64px 40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 96, fontWeight: 900, margin: 0, lineHeight: 0.9, letterSpacing: '-0.05em' }}>
          사고 후회 NO.<br/><span style={{ color: '#FCEE21' }}>사기 전에.</span>
        </h2>
        <button style={{ marginTop: 32, background: '#FCEE21', color: '#2A1F1A', border: '4px solid #FFE9C8', padding: '24px 48px', fontSize: 20, fontWeight: 900, cursor: 'pointer', fontFamily: "'Courier New', monospace" }}>무료 상담 신청 →</button>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 24, fontFamily: "'Courier New', monospace" }}>© 2026 우리동네재테크 · VOL.01</div>
      </div>
    </div>
  );
};
window.V6Zine = V6Zine;
