// 각 페이지의 본문 — 버전 무관, 공통 섹션 컴포넌트로 조립

const PageMain = ({ version }) => {
  const ds = window.DS[version];
  const c = window.PAGE_CONTENT.main;
  const C = window.CONTENT;
  return (
    <main>
      <Hero version={version} {...c.hero} stats={c.stats} />

      <section style={{ padding: '80px 48px', background: ds.surface }}>
        <SectionHead version={version} eyebrow="SERVICES" title="네 가지 방법으로 함께합니다" subtitle="당신의 단계와 예산에 맞춰 선택하세요." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 40 }}>
          {c.services.map((s, i) => (
            <a key={i} href={s.href} style={{
              background: ds.bg,
              border: version === 'v6' ? `4px solid ${ds.ink}` : `2px solid ${ds.ink}`,
              boxShadow: version === 'v4' ? `6px 6px 0 ${ds.ink}` : 'none',
              borderRadius: version === 'v6' ? 0 : 16,
              padding: 28, textDecoration: 'none', color: ds.ink,
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 200
            }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 15, opacity: 0.7, lineHeight: 1.5 }}>{s.desc}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: ds.accent }}>{s.price}</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>자세히 →</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section style={{ padding: '80px 48px', background: ds.bg }}>
        <SectionHead version={version} eyebrow="REVIEWS" title="100건+ 상담, 4.97/5 만족도" />
        <div style={{ marginTop: 40 }}><Reviews version={version} reviews={C.reviews} count={6} /></div>
      </section>

      <CTA version={version} title={"당신의 다음 한 걸음,\n함께 정합시다"} subtitle="50분 코칭으로 6개월 시행착오를 줄입니다." button={{ label: "1:1 코칭 신청 →", href: "coaching.html" }} />
    </main>
  );
};

const PageCoaching = ({ version }) => {
  const ds = window.DS[version];
  const c = window.PAGE_CONTENT.coaching;
  const C = window.CONTENT;
  return (
    <main>
      <Hero version={version} {...c.hero} />

      <section style={{ padding: '80px 48px', background: ds.surface }}>
        <SectionHead version={version} eyebrow="PROCESS" title="6단계로 진행됩니다" subtitle="신청부터 90일 케어까지." />
        <div style={{ marginTop: 40 }}><Steps version={version} steps={c.process} /></div>
      </section>

      <section style={{ padding: '80px 48px', background: ds.bg }} id="apply">
        <SectionHead version={version} eyebrow="PRICING" title="두 가지 코칭 옵션" />
        <div style={{ marginTop: 40 }}><Pricing version={version} pricing={C.pricing} /></div>
        <p style={{ fontSize: 13, opacity: 0.55, marginTop: 16, textAlign: 'center', color: ds.ink }}>* 환불 규정은 환불 페이지를 참고해 주세요.</p>
      </section>

      <section style={{ padding: '80px 48px', background: ds.surface }}>
        <SectionHead version={version} eyebrow="REVIEWS" title="실제 신청자 후기" />
        <div style={{ marginTop: 40 }}><Reviews version={version} reviews={C.reviews} count={6} /></div>
      </section>

      <section style={{ padding: '80px 48px', background: ds.bg }}>
        <SectionHead version={version} eyebrow="FAQ" title="자주 묻는 질문" />
        <div style={{ marginTop: 40, maxWidth: 800 }}><FAQ version={version} faqs={C.faqs} /></div>
      </section>

      <CTA version={version} title={"\"이 매물 사도 될까?\"\n50분이면 답이 나옵니다"} button={{ label: "지금 코칭 신청 →", href: "#apply" }} />
    </main>
  );
};

const PageCurriculum = ({ version }) => {
  const ds = window.DS[version];
  const c = window.PAGE_CONTENT.curriculum;
  return (
    <main>
      <Hero version={version} {...c.hero} />

      <section style={{ padding: '80px 48px', background: ds.surface }}>
        <SectionHead version={version} eyebrow="STEPS" title="순서대로만 따라오세요" subtitle="처음 보는 분도 4단계만 따라오면 됩니다." />
        <div style={{ marginTop: 40 }}><Steps version={version} steps={c.steps} /></div>
      </section>

      <section style={{ padding: '80px 48px', background: ds.bg }}>
        <SectionHead version={version} eyebrow="FREE" title="모든 자료는 무료로 공개됩니다" subtitle="유튜브 + 블로그 + 뉴스레터에서 학습할 수 있습니다." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 40 }}>
          {[
            { title: "유튜브 채널", desc: "주 2회 업로드 · 단계별 영상 정리", cta: "구독하기" },
            { title: "블로그", desc: "심화 글 · 사례 연구 · 케이스 분석", cta: "글 읽기" },
            { title: "뉴스레터", desc: "주 1회 · 시장 동향 + 인사이트", cta: "구독하기" }
          ].map((x, i) => (
            <div key={i} style={{
              background: ds.surface,
              border: version === 'v6' ? `4px solid ${ds.ink}` : `2px solid ${ds.ink}`,
              borderRadius: version === 'v6' ? 0 : 12, padding: 28
            }}>
              <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, color: ds.ink }}>{x.title}</div>
              <div style={{ fontSize: 15, opacity: 0.7, lineHeight: 1.5, color: ds.ink, marginBottom: 24 }}>{x.desc}</div>
              <a href="#" style={{ color: ds.accent, fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>{x.cta} →</a>
            </div>
          ))}
        </div>
      </section>

      <CTA version={version} title={"기초가 끝났다면\n1:1 코칭으로 실전을"} subtitle="내 상황 맞춤 답변이 필요할 때." button={{ label: "코칭 신청 →", href: "coaching.html" }} />
    </main>
  );
};

const PageLecture = ({ version }) => {
  const ds = window.DS[version];
  const c = window.PAGE_CONTENT.lecture;
  return (
    <main>
      <Hero version={version} {...c.hero} stats={[{ n: "32강", l: "총 강의 수" }, { n: "14시간", l: "총 분량" }, { n: "평생", l: "다시보기" }, { n: "월1회", l: "라이브 Q&A" }]} />

      <section style={{ padding: '80px 48px', background: ds.surface }}>
        <SectionHead version={version} eyebrow="CURRICULUM" title="7개 챕터, 32개 강의" />
        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {c.chapters.map((ch, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: ds.bg,
              border: version === 'v6' ? `3px solid ${ds.ink}` : `1px solid ${ds.muted}`,
              borderRadius: version === 'v6' ? 0 : 12, padding: '16px 20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: ds.ink }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: ds.accent, fontFamily: "'Courier New', monospace" }}>{ch.ch}</span>
                <span style={{ fontSize: 17, fontWeight: 700 }}>{ch.title}</span>
              </div>
              <span style={{ fontSize: 13, opacity: 0.55, color: ds.ink }}>{ch.time}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '80px 48px', background: ds.bg }}>
        <SectionHead version={version} eyebrow="WHAT'S INCLUDED" title="강의에 포함된 모든 것" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 40 }}>
          {c.perks.map((p, i) => (
            <div key={i} style={{
              background: ds.surface,
              border: version === 'v6' ? `4px solid ${ds.ink}` : `2px solid ${ds.ink}`,
              borderRadius: version === 'v6' ? 0 : 12, padding: 24
            }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: ds.ink, marginBottom: 8 }}>✓ {p.title}</div>
              <div style={{ fontSize: 14, opacity: 0.7, color: ds.ink, lineHeight: 1.5 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '80px 48px', background: ds.surface }} id="buy">
        <SectionHead version={version} eyebrow="PRICE" title="29만원 · 평생 1회 결제" subtitle="1:1 코칭(40만원) 1회보다 저렴 · 평생 다시보기" />
        <div style={{ marginTop: 40, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
          <div style={{
            background: ds.accent, color: ds.ink,
            border: `4px solid ${ds.ink}`,
            borderRadius: version === 'v6' ? 0 : 16, padding: 32, textAlign: 'center'
          }}>
            <div style={{ fontSize: 80, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>290,000원</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8, opacity: 0.7 }}>월 24,166원 × 12개월 무이자 가능</div>
            <a href="#" style={{ display: 'block', background: ds.ink, color: ds.bg, padding: '16px', borderRadius: version === 'v6' ? 0 : 999, fontSize: 16, fontWeight: 900, textDecoration: 'none', marginTop: 24 }}>지금 결제하기 →</a>
          </div>
        </div>
      </section>

      <CTA version={version} title="평생 보면서 평생 써먹기" button={{ label: "강의 시작하기 →", href: "#buy" }} />
    </main>
  );
};

const PageBookclub = ({ version }) => {
  const ds = window.DS[version];
  const c = window.PAGE_CONTENT.bookclub;
  return (
    <main>
      <Hero version={version} {...c.hero} />

      <section style={{ padding: '80px 48px', background: ds.surface }}>
        <SectionHead version={version} eyebrow="HOW IT WORKS" title="한 달, 4주 구성" />
        <div style={{ marginTop: 40 }}><Steps version={version} steps={c.schedule.map(s => ({ title: `${s.week} · ${s.title}`, desc: s.desc }))} /></div>
      </section>

      <section style={{ padding: '80px 48px', background: ds.bg }}>
        <SectionHead version={version} eyebrow="THIS YEAR" title="2026 선정 도서 (일부)" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 40 }}>
          {c.books.map((b, i) => (
            <div key={i} style={{
              background: ds.surface,
              border: version === 'v6' ? `4px solid ${ds.ink}` : `2px solid ${ds.ink}`,
              borderRadius: version === 'v6' ? 0 : 12,
              padding: 20, textAlign: 'center'
            }}>
              <div style={{
                width: '100%', aspectRatio: '3/4',
                background: i % 4 === 0 ? ds.accent : i % 4 === 1 ? ds.accent2 : i % 4 === 2 ? ds.accent3 : ds.ink,
                borderRadius: version === 'v6' ? 0 : 6, marginBottom: 16,
                display: 'grid', placeItems: 'center', color: ds.bg, fontSize: 11, fontFamily: 'monospace'
              }}>[ 책 표지 ]</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: ds.accent, marginBottom: 4 }}>{b.month}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: ds.ink, marginBottom: 4 }}>{b.title}</div>
              <div style={{ fontSize: 12, opacity: 0.65, color: ds.ink, lineHeight: 1.4 }}>{b.note}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '80px 48px', background: ds.surface }} id="join">
        <SectionHead version={version} eyebrow="MEMBERSHIP" title="월 5만원 · 언제든 시작" />
        <div style={{ marginTop: 40, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
          <div style={{
            background: ds.bg, border: version === 'v6' ? `4px solid ${ds.ink}` : `2px solid ${ds.ink}`,
            borderRadius: version === 'v6' ? 0 : 16, padding: 32, color: ds.ink
          }}>
            <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: '-0.03em' }}>50,000원<span style={{ fontSize: 18, fontWeight: 600, opacity: 0.55 }}> / 월</span></div>
            <ul style={{ fontSize: 15, lineHeight: 1.8, padding: 0, listStyle: 'none', marginTop: 16 }}>
              <li>✓ 매월 도서 1권 (별도 구매)</li>
              <li>✓ 월 1회 90분 토론 모임 (Zoom)</li>
              <li>✓ 인사이트 노트 공유 플랫폼</li>
              <li>✓ 큐레이션 자료 (영상·기사·차트)</li>
              <li>✓ 모임원 전용 카카오톡방</li>
            </ul>
            <a href="#" style={{ display: 'block', textAlign: 'center', background: ds.ink, color: ds.bg, padding: '16px', borderRadius: version === 'v6' ? 0 : 999, fontSize: 16, fontWeight: 900, textDecoration: 'none', marginTop: 24 }}>이번 달 가입하기 →</a>
          </div>
        </div>
      </section>

      <CTA version={version} title="혼자 읽지 마세요. 함께 읽으면 다릅니다." button={{ label: "독서모임 가입 →", href: "#join" }} />
    </main>
  );
};

const PageRefund = ({ version }) => {
  const ds = window.DS[version];
  const c = window.PAGE_CONTENT.refund;
  return (
    <main>
      <Hero version={version} {...c.hero} />

      <section style={{ padding: '80px 48px', background: ds.surface }}>
        <SectionHead version={version} eyebrow="POLICY" title="서비스별 환불 규정" />
        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {c.rules.map((r, i) => (
            <div key={i} style={{
              background: ds.bg,
              border: version === 'v6' ? `4px solid ${ds.ink}` : `2px solid ${ds.ink}`,
              borderRadius: version === 'v6' ? 0 : 12, padding: 28
            }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: ds.ink, marginBottom: 16 }}>{r.service}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { k: "100% 환불", v: r.before, c: ds.accent3 },
                  { k: "50% 환불", v: r.during, c: ds.accent2 },
                  { k: "환불 불가", v: r.after, c: ds.accent }
                ].map((x, j) => (
                  <div key={j} style={{ borderTop: `4px solid ${x.c}`, paddingTop: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: x.c, marginBottom: 6 }}>{x.k}</div>
                    <div style={{ fontSize: 14, color: ds.ink, lineHeight: 1.5, opacity: 0.85 }}>{x.v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '80px 48px', background: ds.bg }}>
        <SectionHead version={version} eyebrow="NOTES" title="추가 안내사항" />
        <ul style={{ marginTop: 40, padding: 0, listStyle: 'none', maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {c.notes.map((n, i) => (
            <li key={i} style={{ display: 'flex', gap: 12, fontSize: 15, lineHeight: 1.6, color: ds.ink }}>
              <span style={{ color: ds.accent, fontWeight: 800 }}>0{i+1}</span>{n}
            </li>
          ))}
        </ul>
      </section>

      <CTA version={version} title="질문이 있으신가요?" subtitle="카카오 채널로 문의 주세요." button={{ label: "카카오 채널 →", href: "#" }} />
    </main>
  );
};

window.PageMain = PageMain;
window.PageCoaching = PageCoaching;
window.PageCurriculum = PageCurriculum;
window.PageLecture = PageLecture;
window.PageBookclub = PageBookclub;
window.PageRefund = PageRefund;
