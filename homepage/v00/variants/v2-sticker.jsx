// Variant 2: Friendly Sticker / Postit collage
const V2Sticker = () => {
  const stickerStyle = (rotate, bg, color = '#1A2B47') => ({
    background: bg,
    color,
    transform: `rotate(${rotate}deg)`,
    boxShadow: '0 8px 24px rgba(26,43,71,0.12)',
    borderRadius: 4,
  });

  return (
    <div style={{ width: 1280, background: '#FFF8E7', fontFamily: "'Pretendard', sans-serif", color: '#1A2B47', position: 'relative', overflow: 'hidden' }}>
      {/* Subtle dot grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#1A2B47 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.05, pointerEvents: 'none' }}></div>

      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 48px', position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-block', width: 36, height: 36, background: '#FF6B5B', borderRadius: '50% 50% 50% 0', transform: 'rotate(-10deg)' }}></span>
          우리동네재테크
        </div>
        <button style={{ background: '#1A2B47', color: '#FFF8E7', border: 'none', padding: '14px 24px', borderRadius: 999, fontWeight: 700, cursor: 'pointer' }}>무료 상담 →</button>
      </div>

      {/* Hero collage */}
      <div style={{ padding: '40px 48px 80px', position: 'relative', minHeight: 720 }}>
        <h1 style={{ fontSize: 110, fontWeight: 900, margin: 0, lineHeight: 0.95, letterSpacing: '-0.04em', maxWidth: 900, position: 'relative', zIndex: 2 }}>
          데이터로<br />
          <span style={{ position: 'relative', display: 'inline-block' }}>
            내집마련<br />
          </span>
          <span style={{ fontSize: 60, fontWeight: 700, color: '#FF6B5B' }}>해볼까요?</span>
        </h1>

        {/* Stickers floating */}
        <div style={{ ...stickerStyle(-6, '#F4C430'), position: 'absolute', top: 80, right: 120, padding: '20px 28px', fontSize: 18, fontWeight: 800, zIndex: 3 }}>
          ⭐ 100건+ 상담<br/>4.97/5 만족
        </div>

        <div style={{ ...stickerStyle(8, '#4ECDC4'), color: '#FFF8E7', position: 'absolute', top: 280, right: 60, padding: '24px 32px', maxWidth: 280, zIndex: 3 }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85, marginBottom: 6 }}>박*현님 · 송파 30대</div>
          <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.4 }}>"우재님 상담은 처음이었는데 너무 만족스러웠습니다!"</div>
        </div>

        <div style={{ ...stickerStyle(-4, '#FFFFFF'), position: 'absolute', top: 460, right: 200, padding: '18px 24px', fontSize: 15, fontWeight: 600, zIndex: 3, border: '2px dashed #1A2B47' }}>
          📌 50분 1:1 화상코칭<br/>+ 90일 카톡 케어
        </div>

        <div style={{ ...stickerStyle(3, '#FF6B5B'), color: '#FFF8E7', position: 'absolute', top: 540, right: 460, padding: '14px 22px', fontSize: 14, fontWeight: 700, zIndex: 3 }}>
          하루 1명만!
        </div>

        <div style={{ marginTop: 60, display: 'flex', gap: 16, position: 'relative', zIndex: 2 }}>
          <button style={{ background: '#1A2B47', color: '#FFF8E7', border: 'none', padding: '20px 36px', fontSize: 17, fontWeight: 800, borderRadius: 999, cursor: 'pointer' }}>상담 신청하기 →</button>
          <button style={{ background: 'transparent', color: '#1A2B47', border: '2px solid #1A2B47', padding: '20px 36px', fontSize: 17, fontWeight: 800, borderRadius: 999, cursor: 'pointer' }}>유튜브로 먼저 보기</button>
        </div>
      </div>

      {/* Pinned cards section */}
      <div style={{ background: '#1A2B47', color: '#FFF8E7', padding: '80px 48px', position: 'relative' }}>
        <h2 style={{ fontSize: 48, fontWeight: 900, margin: 0, lineHeight: 1.1, letterSpacing: '-0.03em', maxWidth: 800 }}>
          이런 분들께 <span style={{ background: '#F4C430', color: '#1A2B47', padding: '0 12px', display: 'inline-block', transform: 'rotate(-1deg)' }}>딱</span>입니다
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28, marginTop: 56 }}>
          {[
            ['🏠', '"지금 여기 사도 될까?"', '더 많이 오르는 지역과 단지가 궁금하신 분', '#F4C430'],
            ['📊', '현명한 내집마련', '잠깐의 결정이 10년을 좌우합니다', '#4ECDC4'],
            ['🔄', '똑똑한 갈아타기', '실거주와 자산 가치를 동시에', '#FF6B5B'],
          ].map(([icon, title, desc, c], i) => (
            <div key={i} style={{ background: '#FFF8E7', color: '#1A2B47', padding: '32px 28px', borderRadius: 16, position: 'relative', transform: `rotate(${(i-1) * 1.5}deg)` }}>
              <div style={{ position: 'absolute', top: -12, left: '50%', marginLeft: -12, width: 24, height: 24, background: c, borderRadius: '50%', boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.15)' }}></div>
              <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 14, opacity: 0.7, lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Steps as polaroid stack */}
      <div style={{ padding: '80px 48px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: '#FF6B5B', marginBottom: 12 }}>HOW IT WORKS</div>
        <h2 style={{ fontSize: 56, fontWeight: 900, margin: 0, lineHeight: 1, letterSpacing: '-0.03em' }}>이렇게 진행돼요</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, marginTop: 56 }}>
          {[
            ['01', '진단', '예산·대출, 우선순위, 지금 사도 되는지 사전 질문지로 점검', '#F4C430'],
            ['02', '후보 압축', '내 예산에 맞는 지역·단지 후보를 좁히고 비교 기준 정리', '#4ECDC4'],
            ['03', '실행 + 90일', '액션플랜 + 90일 카톡 질의응답으로 실행까지 연결', '#FF6B5B'],
          ].map(([n, t, d, c], i) => (
            <div key={n} style={{ background: '#FFFFFF', padding: 24, borderRadius: 4, boxShadow: '0 12px 32px rgba(26,43,71,0.1)', transform: `rotate(${(i-1)*-1.5}deg)` }}>
              <div style={{ height: 160, background: c, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, fontWeight: 900, color: '#1A2B47', opacity: 0.85 }}>{n}</div>
              <div style={{ padding: '20px 8px 8px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, fontFamily: "'Pretendard'" }}>{t}</div>
                <div style={{ fontSize: 14, opacity: 0.7, lineHeight: 1.5 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '80px 48px', background: '#F4C430', textAlign: 'center', position: 'relative' }}>
        <div style={{ ...stickerStyle(-3, '#FF6B5B'), color: '#FFF8E7', display: 'inline-block', padding: '8px 16px', fontSize: 14, fontWeight: 700, marginBottom: 24 }}>오픈기념 20% 할인</div>
        <h2 style={{ fontSize: 64, fontWeight: 900, margin: 0, lineHeight: 1, letterSpacing: '-0.03em' }}>
          혼자 고민하지 마세요.<br/>같이 봐요.
        </h2>
        <button style={{ marginTop: 32, background: '#1A2B47', color: '#FFF8E7', border: 'none', padding: '22px 48px', fontSize: 18, fontWeight: 800, borderRadius: 999, cursor: 'pointer' }}>무료 상담 신청 →</button>
      </div>
    </div>
  );
};
window.V2Sticker = V2Sticker;
