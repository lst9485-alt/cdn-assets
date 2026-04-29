// Variant 5: KakaoTalk-style conversational landing
const V5Chat = () => {
  const Bubble = ({ from = 'me', children, time, name }) => {
    const isMe = from === 'me';
    return (
      <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
        {!isMe && <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FF6B5B', display: 'grid', placeItems: 'center', color: '#FFF8E7', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>우재</div>}
        <div style={{ maxWidth: '70%' }}>
          {!isMe && name && <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>{name}</div>}
          <div style={{
            background: isMe ? '#FEE500' : '#FFFFFF',
            color: '#1A2B47',
            padding: '12px 16px',
            borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
            fontSize: 15, lineHeight: 1.5,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>{children}</div>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4, textAlign: isMe ? 'right' : 'left' }}>{time}</div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: 1280, background: '#1A2B47', fontFamily: "'Pretendard', sans-serif", color: '#1A2B47' }}>
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 48px', background: '#FFF8E7' }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#1A2B47' }}>💬 우리동네재테크</div>
        <button style={{ background: '#FEE500', color: '#1A2B47', border: 'none', padding: '12px 22px', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>카톡 상담 →</button>
      </div>

      {/* Hero split */}
      <div style={{ padding: '64px 48px', background: 'linear-gradient(180deg, #FFF8E7 0%, #FFE9C8 100%)', display: 'grid', gridTemplateColumns: '1fr 420px', gap: 48, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-block', background: '#FEE500', padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 800, marginBottom: 24 }}>
            💬 친한 형, 누나처럼 편하게
          </div>
          <h1 style={{ fontSize: 96, fontWeight: 900, margin: 0, lineHeight: 0.95, letterSpacing: '-0.04em', color: '#1A2B47' }}>
            물어봐요,<br/>
            <span style={{ color: '#FF6B5B' }}>편하게.</span>
          </h1>
          <p style={{ fontSize: 18, marginTop: 24, lineHeight: 1.6, color: '#1A2B47', maxWidth: 480 }}>
            "지금 사도 될까요?" 한 줄로 시작하세요. 100건+ 상담의 경험으로, <strong>내 상황에 딱 맞는 답</strong>을 드립니다.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <button style={{ background: '#FEE500', color: '#1A2B47', border: 'none', padding: '18px 32px', fontWeight: 800, borderRadius: 12, cursor: 'pointer', fontSize: 16 }}>카톡으로 상담 신청 →</button>
            <button style={{ background: 'transparent', color: '#1A2B47', border: '2px solid #1A2B47', padding: '16px 30px', fontWeight: 800, borderRadius: 12, cursor: 'pointer', fontSize: 16 }}>요금 보기</button>
          </div>
          <div style={{ marginTop: 32, display: 'flex', gap: 24, fontSize: 14 }}>
            <div><strong style={{ fontSize: 22 }}>100건+</strong><div style={{ opacity: 0.6 }}>상담 진행</div></div>
            <div><strong style={{ fontSize: 22 }}>4.97/5</strong><div style={{ opacity: 0.6 }}>만족도</div></div>
            <div><strong style={{ fontSize: 22 }}>90일</strong><div style={{ opacity: 0.6 }}>케어</div></div>
          </div>
        </div>

        {/* Phone chat mockup */}
        <div style={{ background: '#1A2B47', padding: 12, borderRadius: 36, boxShadow: '0 24px 48px rgba(0,0,0,0.25)' }}>
          <div style={{ background: '#B0C4DE', borderRadius: 28, overflow: 'hidden', height: 600, position: 'relative' }}>
            <div style={{ background: '#1A2B47', color: '#FFF8E7', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
              <span>← 우재 코치</span>
              <span style={{ fontSize: 11, opacity: 0.7 }}>● 온라인</span>
            </div>
            <div style={{ padding: 16, height: 'calc(100% - 41px)', overflow: 'hidden' }}>
              <div style={{ textAlign: 'center', fontSize: 11, opacity: 0.5, margin: '8px 0 16px' }}>2026년 4월 28일</div>
              <Bubble from="me" time="오후 8:42">안녕하세요! 분당쪽 매물 보고 있는데 지금 사도 될까요?</Bubble>
              <Bubble from="them" name="우재 코치" time="오후 8:43">안녕하세요 :) 어떤 단지 보고 계셨어요?</Bubble>
              <Bubble from="me" time="오후 8:44">정자동 OO마을이요. 12억 정도</Bubble>
              <Bubble from="them" name="우재 코치" time="오후 8:45">예산이랑 대출 어떻게 잡으셨어요? 사전 질문지 보내드릴게요 📋</Bubble>
              <div style={{ background: '#FFFFFF', borderRadius: 12, padding: 12, margin: '8px 0 8px 44px', maxWidth: '70%' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#FF6B5B' }}>📋 사전 질문지</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>예산·대출·우선순위 1분 체크</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conversation flow as how-it-works */}
      <div style={{ background: '#FFF8E7', padding: '64px 48px' }}>
        <div style={{ fontSize: 13, letterSpacing: 2, fontWeight: 800, color: '#FF6B5B', marginBottom: 12 }}>HOW IT WORKS</div>
        <h2 style={{ fontSize: 48, fontWeight: 900, margin: 0, lineHeight: 1.05, letterSpacing: '-0.03em' }}>
          이렇게 대화해요 💬
        </h2>

        <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#FF6B5B', marginBottom: 12 }}>STEP 01 · 신청</div>
            <Bubble from="me" time="화 19:32">상담 신청합니다!</Bubble>
            <Bubble from="them" name="우재 코치" time="화 19:35">네 안녕하세요 :) 사전질문지 12시간 내로 보내드려요</Bubble>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#4ECDC4', marginBottom: 12 }}>STEP 02 · 진단</div>
            <Bubble from="them" name="우재 코치" time="목 14:20">예산이랑 대출, 우선순위 같이 정리해볼게요</Bubble>
            <Bubble from="me" time="목 14:22">네 부탁드려요!</Bubble>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#F4C430', marginBottom: 12 }}>STEP 03 · 코칭</div>
            <Bubble from="them" name="우재 코치" time="토 10:00">구글미트 입장해주세요. 50분 화상 코칭 시작합니다</Bubble>
            <Bubble from="me" time="토 10:01">들어갑니다 :)</Bubble>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1A2B47', marginBottom: 12 }}>STEP 04 · 90일 케어</div>
            <Bubble from="me" time="3주 후">계약하기 전에 한 번만 더 봐주세요!</Bubble>
            <Bubble from="them" name="우재 코치" time="3주 후">물론이죠 :) 계약서 보내주세요</Bubble>
          </div>
        </div>
      </div>

      {/* Real reviews */}
      <div style={{ padding: '64px 48px', background: '#FFFFFF' }}>
        <h2 style={{ fontSize: 36, fontWeight: 900, margin: 0, marginBottom: 32, letterSpacing: '-0.02em', color: '#1A2B47' }}>
          실제 후기 ⭐ 4.97/5.0
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[
            ['파주 30대 조*민 · 맞벌이', '"상담 끝나고도 카톡으로 계속 물어볼 수 있어서 안심"'],
            ['울산 30대 노*정 · 맞벌이', '"왠지 친한 지인처럼 상담해주셨습니다"'],
            ['수도권 30대 원*희 · 부부', '"실행하면서 다시 물어볼 수 있어 든든했습니다"'],
            ['부산 30대 윤*아 · 싱글', '"반신반의했는데, 코칭 후 확신이 생겼습니다"'],
          ].map(([who, q], i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: 16, borderRadius: 12, background: i % 2 ? '#FFF8E7' : '#F0F8FF' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: ['#FF6B5B', '#4ECDC4', '#F4C430', '#6B8CAE'][i], color: '#FFF8E7', display: 'grid', placeItems: 'center', fontWeight: 800, flexShrink: 0 }}>{['조','노','원','윤'][i]}</div>
              <div>
                <div style={{ fontSize: 13, color: '#FF6B5B', marginBottom: 4 }}>★★★★★</div>
                <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: '#1A2B47' }}>{q}</div>
                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6, color: '#1A2B47' }}>{who}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: '#FEE500', padding: '64px 48px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 56, fontWeight: 900, margin: 0, lineHeight: 1.05, letterSpacing: '-0.03em', color: '#1A2B47' }}>
          한 줄만 적어보세요.
        </h2>
        <p style={{ fontSize: 18, marginTop: 12, color: '#1A2B47', opacity: 0.7 }}>"지금 여기 사도 될까요?" — 시작은 그걸로 충분해요.</p>
        <button style={{ marginTop: 24, background: '#1A2B47', color: '#FEE500', border: 'none', padding: '20px 40px', fontSize: 17, fontWeight: 900, borderRadius: 12, cursor: 'pointer' }}>카톡으로 상담 신청 →</button>
      </div>
    </div>
  );
};
window.V5Chat = V5Chat;
