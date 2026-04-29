// Variant 4: Neighborhood Map metaphor
const V4Map = () => {
  return (
    <div style={{ width: 1280, background: '#E8F4EE', fontFamily: "'Pretendard', sans-serif", color: '#1A2B47' }}>
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 48px', background: '#FFF8E7', borderBottom: '3px solid #1A2B47' }}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>🏘️ 우리동네재테크</div>
        <button style={{ background: '#FF6B5B', color: '#FFF8E7', border: '3px solid #1A2B47', padding: '12px 22px', fontWeight: 800, cursor: 'pointer', boxShadow: '4px 4px 0 #1A2B47' }}>상담 신청 →</button>
      </div>

      {/* Hero with map */}
      <div style={{ padding: '48px 48px 0', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-block', background: '#F4C430', border: '2px solid #1A2B47', padding: '6px 12px', fontSize: 13, fontWeight: 800, marginBottom: 24, transform: 'rotate(-1deg)' }}>
              📍 동네 친구처럼 편하게
            </div>
            <h1 style={{ fontSize: 92, fontWeight: 900, margin: 0, lineHeight: 0.95, letterSpacing: '-0.04em' }}>
              어디에<br/>
              <span style={{ background: '#FF6B5B', color: '#FFF8E7', padding: '0 12px' }}>집</span>을<br/>
              살까요?
            </h1>
            <p style={{ fontSize: 17, marginTop: 24, lineHeight: 1.6, maxWidth: 480 }}>
              전국 어디든 OK. 서울·경기·인천부터 지방까지, 100건+ 상담 데이터로 <strong>내 예산에 맞는 동네</strong>를 함께 찾아드려요.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <button style={{ background: '#1A2B47', color: '#FFF8E7', border: 'none', padding: '18px 32px', fontWeight: 800, borderRadius: 999, cursor: 'pointer', fontSize: 16 }}>무료 상담 →</button>
              <button style={{ background: '#FFF8E7', color: '#1A2B47', border: '2px solid #1A2B47', padding: '16px 30px', fontWeight: 800, borderRadius: 999, cursor: 'pointer', fontSize: 16 }}>유튜브 보기</button>
            </div>
          </div>

          {/* Stylized map */}
          <div style={{ position: 'relative', height: 480 }}>
            <svg viewBox="0 0 480 480" style={{ width: '100%', height: '100%' }}>
              {/* Roads */}
              <path d="M 0 240 Q 240 200 480 260" stroke="#FFF8E7" strokeWidth="40" fill="none" />
              <path d="M 240 0 Q 200 240 260 480" stroke="#FFF8E7" strokeWidth="32" fill="none" />
              <path d="M 0 240 Q 240 200 480 260" stroke="#1A2B47" strokeWidth="2" strokeDasharray="6 6" fill="none" />
              <path d="M 240 0 Q 200 240 260 480" stroke="#1A2B47" strokeWidth="2" strokeDasharray="6 6" fill="none" />

              {/* Park */}
              <circle cx="120" cy="120" r="60" fill="#A8DEC3" />
              <text x="120" y="125" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1A2B47">🌳 공원</text>

              {/* Buildings clusters */}
              <g>
                <rect x="320" y="80" width="40" height="60" fill="#FF6B5B" stroke="#1A2B47" strokeWidth="2" />
                <rect x="370" y="60" width="40" height="80" fill="#F4C430" stroke="#1A2B47" strokeWidth="2" />
                <rect x="420" y="90" width="36" height="50" fill="#4ECDC4" stroke="#1A2B47" strokeWidth="2" />
                <text x="380" y="40" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1A2B47">강남구</text>
              </g>
              <g>
                <rect x="60" y="340" width="40" height="50" fill="#4ECDC4" stroke="#1A2B47" strokeWidth="2" />
                <rect x="110" y="320" width="40" height="70" fill="#FF6B5B" stroke="#1A2B47" strokeWidth="2" />
                <rect x="160" y="350" width="36" height="40" fill="#F4C430" stroke="#1A2B47" strokeWidth="2" />
                <text x="120" y="420" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1A2B47">송파구</text>
              </g>
              <g>
                <rect x="350" y="350" width="40" height="60" fill="#F4C430" stroke="#1A2B47" strokeWidth="2" />
                <rect x="400" y="330" width="36" height="80" fill="#FF6B5B" stroke="#1A2B47" strokeWidth="2" />
                <text x="395" y="430" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1A2B47">분당</text>
              </g>

              {/* Pin */}
              <g transform="translate(230, 220)">
                <circle r="36" fill="#1A2B47" />
                <circle r="36" fill="none" stroke="#1A2B47" strokeWidth="2" strokeDasharray="4 4" opacity="0.4" transform="scale(1.6)" />
                <text textAnchor="middle" y="6" fontSize="32">📍</text>
              </g>
              <text x="230" y="290" textAnchor="middle" fontSize="14" fontWeight="800" fill="#1A2B47">YOU ARE HERE</text>
            </svg>
          </div>
        </div>
      </div>

      {/* Region pills */}
      <div style={{ padding: '40px 48px', display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {['서울 강남', '송파', '마포', '성북', '경기 분당', '판교', '광교', '인천', '대구', '부산', '광주', '대전', '세종', '청주', '전주', '제주'].map((r, i) => (
          <div key={r} style={{
            background: ['#FFF8E7', '#F4C430', '#4ECDC4', '#FFD3CC'][i % 4],
            border: '2px solid #1A2B47', padding: '8px 18px', borderRadius: 999, fontWeight: 700, fontSize: 14
          }}>📍 {r}</div>
        ))}
      </div>

      {/* Three districts as roadmap */}
      <div style={{ padding: '64px 48px', background: '#FFF8E7', borderTop: '3px solid #1A2B47', borderBottom: '3px solid #1A2B47' }}>
        <h2 style={{ fontSize: 48, fontWeight: 900, margin: 0, lineHeight: 1.05, letterSpacing: '-0.03em', textAlign: 'center' }}>
          내집마련, <span style={{ color: '#FF6B5B' }}>3정거장</span>이면 도착 🚉
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginTop: 56, position: 'relative' }}>
          {/* connecting line */}
          <div style={{ position: 'absolute', top: 32, left: '15%', right: '15%', height: 4, background: '#1A2B47', borderRadius: 2 }}></div>

          {[
            ['ETF 정거장', '잃지 않는 자산배분으로 시드를 만든다', '#4ECDC4'],
            ['집 정거장', '내가 살 수 있는 가장 좋은 집을 산다', '#F4C430'],
            ['갈아타기 정거장', '더 좋은 자산으로 옮기는 순서', '#FF6B5B'],
          ].map(([t, d, c], i) => (
            <div key={i} style={{ position: 'relative', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, background: c, border: '3px solid #1A2B47', borderRadius: '50%', margin: '0 auto', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 22, position: 'relative', zIndex: 1 }}>
                {i + 1}
              </div>
              <div style={{ marginTop: 24, background: '#FFFFFF', border: '2px solid #1A2B47', borderRadius: 12, padding: 20, boxShadow: '4px 4px 0 #1A2B47' }}>
                <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>{t}</div>
                <div style={{ fontSize: 14, opacity: 0.75, lineHeight: 1.5 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews mini-cards */}
      <div style={{ padding: '64px 48px' }}>
        <h2 style={{ fontSize: 36, fontWeight: 900, margin: 0, marginBottom: 32, letterSpacing: '-0.02em' }}>
          전국 동네에서 온 후기 ⭐ 4.97/5.0
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            ['송파 30대 박*현', '맞벌이', '"부동산 상담은 우재님이 처음이었는데 너무 만족!"'],
            ['분당 20대 원*호', '사회초년생', '"앞으로 어떻게 해야 할지 자세하게 알려주셨어요"'],
            ['전주 30대 김*영', '신혼부부', '"예산에 맞는 최적의 지역을 추천받았습니다"'],
          ].map(([who, tag, q], i) => (
            <div key={i} style={{ background: '#FFFFFF', border: '2px solid #1A2B47', borderRadius: 12, padding: 24, boxShadow: '4px 4px 0 #1A2B47' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#FF6B5B', marginBottom: 8 }}>★★★★★</div>
              <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.5, marginBottom: 16 }}>{q}</div>
              <div style={{ fontSize: 13, opacity: 0.6, borderTop: '1px dashed #1A2B47', paddingTop: 12 }}>📍 {who} · {tag}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: '#1A2B47', color: '#FFF8E7', padding: '64px 48px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 56, fontWeight: 900, margin: 0, lineHeight: 1.05, letterSpacing: '-0.03em' }}>
          우리 동네에서 만나요 👋
        </h2>
        <p style={{ fontSize: 17, opacity: 0.7, marginTop: 16 }}>온라인 50분 + 90일 카톡 케어 · 부부동반 가능</p>
        <button style={{ marginTop: 28, background: '#F4C430', color: '#1A2B47', border: 'none', padding: '20px 40px', fontSize: 17, fontWeight: 900, borderRadius: 999, cursor: 'pointer' }}>무료 상담 신청 →</button>
      </div>
    </div>
  );
};
window.V4Map = V4Map;
