// 버전별 공통 섹션 (Hero, Stats, Story, Roadmap, Reviews, Pricing, Process, FAQ, CTA)
// 각 페이지에서 조립해서 사용

// === HERO === buttons는 [{label, href}], stats는 [{n,l}]
const Hero = ({ version, eyebrow, title, subtitle, buttons = [], stats }) => {
  const ds = window.DS[version];
  const v = version;

  if (v === 'v1') return (
    <section style={{ padding: '40px 56px 80px', background: ds.bg, borderTop: `1px solid ${ds.ink}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 24px', fontSize: 12, fontWeight: 600, letterSpacing: 2, color: ds.ink }}>
        <span>ISSUE Nº 042</span><span>우리동네재테크 매거진</span><span>WINTER 2026</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 56, alignItems: 'end' }}>
        <div>
          {eyebrow && <div style={{ display: 'inline-block', background: ds.accent2, padding: '6px 14px', fontSize: 13, fontWeight: 700, marginBottom: 32 }}>{eyebrow}</div>}
          <h1 style={{ fontSize: 124, lineHeight: 0.95, fontWeight: 900, margin: 0, letterSpacing: '-0.04em', color: ds.ink }}>{title}</h1>
        </div>
        <div>
          <div style={{ width: '100%', height: 280, background: 'repeating-linear-gradient(45deg, #F4C430, #F4C430 8px, #FFE066 8px, #FFE066 16px)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', color: ds.ink, fontSize: 13, marginBottom: 16 }}>[ 운영자 사진 ]</div>
          {subtitle && <p style={{ fontSize: 16, lineHeight: 1.6, fontWeight: 500, margin: 0, color: ds.ink }}>{subtitle}</p>}
          {buttons[0] && <a href={buttons[0].href} style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 20, background: ds.accent, color: ds.bg, padding: '20px', fontSize: 17, fontWeight: 800, borderRadius: 12 }}>{buttons[0].label}</a>}
        </div>
      </div>
      {stats && <Stats version={version} stats={stats} />}
    </section>
  );

  if (v === 'v2') return (
    <section style={{ padding: '40px 48px 80px', background: ds.bg, position: 'relative', minHeight: 600 }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#1A2B47 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.05, pointerEvents: 'none' }}></div>
      <h1 style={{ fontSize: 110, fontWeight: 900, margin: 0, lineHeight: 0.95, letterSpacing: '-0.04em', maxWidth: 900, position: 'relative', zIndex: 2, color: ds.ink }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 19, marginTop: 24, lineHeight: 1.6, maxWidth: 520, color: ds.ink, position: 'relative', zIndex: 2 }}>{subtitle}</p>}
      <div style={{ transform: 'rotate(-6deg)', background: ds.accent2, color: ds.ink, position: 'absolute', top: 60, right: 80, padding: '20px 28px', fontSize: 18, fontWeight: 800, boxShadow: '0 8px 24px rgba(26,43,71,0.12)', zIndex: 3, borderRadius: 4 }}>{eyebrow || '⭐ 100건+ 상담\n4.97/5 만족'}</div>
      <div style={{ marginTop: 40, display: 'flex', gap: 12, flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
        {buttons.map((b, i) => (
          <a key={i} href={b.href} style={{ background: i === 0 ? ds.ink : 'transparent', color: i === 0 ? ds.bg : ds.ink, border: i === 0 ? 'none' : `2px solid ${ds.ink}`, padding: '18px 32px', fontSize: 16, fontWeight: 800, borderRadius: 999, textDecoration: 'none' }}>{b.label}</a>
        ))}
      </div>
      {stats && <Stats version={version} stats={stats} />}
    </section>
  );

  if (v === 'v3') return (
    <section style={{ padding: '64px 56px 32px', background: ds.bg }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 3, opacity: 0.5, marginBottom: 16, color: ds.ink }}>{eyebrow || 'DATA-DRIVEN HOME BUYING'}</div>
      <h1 style={{ fontSize: 88, fontWeight: 800, margin: 0, lineHeight: 1, letterSpacing: '-0.03em', maxWidth: 1000, color: ds.ink }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 19, marginTop: 24, opacity: 0.65, maxWidth: 720, lineHeight: 1.6, color: ds.ink }}>{subtitle}</p>}
      <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
        {buttons.map((b, i) => (
          <a key={i} href={b.href} style={{ background: i === 0 ? ds.ink : 'transparent', color: i === 0 ? ds.accent2 : ds.ink, border: i === 0 ? 'none' : `1px solid ${ds.ink}`, padding: '16px 28px', fontSize: 15, fontWeight: 800, borderRadius: 8, textDecoration: 'none' }}>{b.label}</a>
        ))}
      </div>
      {stats && <Stats version={version} stats={stats} />}
    </section>
  );

  if (v === 'v4') return (
    <section style={{ padding: '48px 48px', background: ds.bg }}>
      {eyebrow && <div style={{ display: 'inline-block', background: ds.accent2, border: `2px solid ${ds.ink}`, padding: '6px 12px', fontSize: 13, fontWeight: 800, marginBottom: 24, transform: 'rotate(-1deg)', color: ds.ink }}>{eyebrow}</div>}
      <h1 style={{ fontSize: 92, fontWeight: 900, margin: 0, lineHeight: 0.95, letterSpacing: '-0.04em', color: ds.ink }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 17, marginTop: 24, lineHeight: 1.6, maxWidth: 520, color: ds.ink }}>{subtitle}</p>}
      <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
        {buttons.map((b, i) => (
          <a key={i} href={b.href} style={{ background: i === 0 ? ds.ink : ds.surface, color: i === 0 ? ds.bg : ds.ink, border: i === 0 ? 'none' : `2px solid ${ds.ink}`, padding: '16px 30px', fontSize: 16, fontWeight: 800, borderRadius: 999, textDecoration: 'none' }}>{b.label}</a>
        ))}
      </div>
      {stats && <Stats version={version} stats={stats} />}
    </section>
  );

  if (v === 'v5') return (
    <section style={{ padding: '64px 48px', background: 'linear-gradient(180deg, #FFF8E7 0%, #FFE9C8 100%)' }}>
      {eyebrow && <div style={{ display: 'inline-block', background: ds.accent, padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 800, marginBottom: 24, color: ds.ink }}>{eyebrow}</div>}
      <h1 style={{ fontSize: 96, fontWeight: 900, margin: 0, lineHeight: 0.95, letterSpacing: '-0.04em', color: ds.ink, maxWidth: 900 }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 18, marginTop: 24, lineHeight: 1.6, color: ds.ink, maxWidth: 600 }}>{subtitle}</p>}
      <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
        {buttons.map((b, i) => (
          <a key={i} href={b.href} style={{ background: i === 0 ? ds.accent : 'transparent', color: ds.ink, border: i === 0 ? 'none' : `2px solid ${ds.ink}`, padding: '16px 30px', fontSize: 16, fontWeight: 800, borderRadius: 12, textDecoration: 'none' }}>{b.label}</a>
        ))}
      </div>
      {stats && <Stats version={version} stats={stats} />}
    </section>
  );

  // v6
  return (
    <section style={{ padding: '40px 40px 0', background: ds.bg, position: 'relative' }}>
      {eyebrow && <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Courier New', monospace", marginBottom: 16, color: ds.ink }}>{eyebrow}</div>}
      <h1 style={{ fontSize: 180, fontWeight: 900, margin: 0, lineHeight: 0.85, letterSpacing: '-0.06em', color: ds.accent }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 22, lineHeight: 1.4, fontWeight: 600, marginTop: 32, maxWidth: 800, color: ds.ink }}>{subtitle}</p>}
      <div style={{ display: 'flex', gap: 12, marginTop: 32, paddingBottom: 40 }}>
        {buttons.map((b, i) => (
          <a key={i} href={b.href} style={{ background: i === 0 ? ds.ink : ds.accent2, color: i === 0 ? ds.accent2 : ds.ink, border: `4px solid ${ds.ink}`, padding: '18px 32px', fontSize: 18, fontWeight: 900, fontFamily: "'Courier New', monospace", textDecoration: 'none' }}>{b.label}</a>
        ))}
      </div>
      {stats && <Stats version={version} stats={stats} />}
    </section>
  );
};

// === STATS ===
const Stats = ({ version, stats }) => {
  const ds = window.DS[version];
  if (version === 'v3') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 16, marginTop: 48 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: ds.surface, border: `1px solid rgba(14,23,41,0.08)`, borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', color: ds.ink }}>{s.n}</div>
            <div style={{ fontSize: 13, color: ds.muted, marginTop: 4 }}>{s.l}</div>
          </div>
        ))}
      </div>
    );
  }
  if (version === 'v6') {
    return (
      <div style={{ background: ds.accent, color: ds.bg, padding: '24px 40px', display: 'flex', justifyContent: 'space-around', borderTop: `4px solid ${ds.ink}`, borderBottom: `4px solid ${ds.ink}`, marginTop: 0, marginLeft: -40, marginRight: -40 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ textAlign: 'center', fontFamily: "'Courier New', monospace" }}>
            <div style={{ fontSize: 32, fontWeight: 900 }}>{s.n}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{s.l}</div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ background: ds.ink, color: ds.bg, padding: '40px', display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 32, marginTop: 48, borderRadius: ds.radius }}>
      {stats.map((s, i) => (
        <div key={i}>
          <div style={{ fontSize: 48, fontWeight: 900, lineHeight: 1, color: ds.accent2 }}>{s.n}</div>
          <div style={{ fontSize: 13, marginTop: 8, opacity: 0.8 }}>{s.l}</div>
        </div>
      ))}
    </div>
  );
};

// === SECTION HEADER ===
const SectionHead = ({ version, eyebrow, title, subtitle }) => {
  const ds = window.DS[version];
  if (version === 'v6') return (
    <div>
      {eyebrow && <div style={{ fontFamily: "'Courier New', monospace", fontSize: 14, fontWeight: 700, marginBottom: 8, color: ds.ink }}>{eyebrow}</div>}
      <h2 style={{ fontSize: 64, fontWeight: 900, margin: 0, lineHeight: 0.95, letterSpacing: '-0.04em', color: ds.ink }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 18, marginTop: 16, opacity: 0.7, color: ds.ink }}>{subtitle}</p>}
    </div>
  );
  return (
    <div>
      {eyebrow && <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: ds.accent, marginBottom: 12 }}>{eyebrow}</div>}
      <h2 style={{ fontSize: 56, fontWeight: 900, margin: 0, lineHeight: 1.05, letterSpacing: '-0.03em', color: ds.ink }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 18, marginTop: 16, opacity: 0.7, color: ds.ink }}>{subtitle}</p>}
    </div>
  );
};

// === STEPS / ROADMAP ===
const Steps = ({ version, steps, dark = false }) => {
  const ds = window.DS[version];
  const colors = [ds.accent3, ds.accent2, ds.accent];
  if (version === 'v6') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${steps.length}, 1fr)`, gap: 16 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ background: ds.bg, border: `4px solid ${ds.ink}`, padding: 24 }}>
            <div style={{ fontSize: 88, fontWeight: 900, lineHeight: 1, color: ds.accent, letterSpacing: '-0.05em' }}>{String(i+1).padStart(2,'0')}</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 12, lineHeight: 1.2, color: ds.ink }}>{s.title}</div>
            <div style={{ fontSize: 14, opacity: 0.75, marginTop: 8, lineHeight: 1.5, color: ds.ink }}>{s.desc}</div>
          </div>
        ))}
      </div>
    );
  }
  if (version === 'v4') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${steps.length}, 1fr)`, gap: 24, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 32, left: '15%', right: '15%', height: 4, background: ds.ink, borderRadius: 2 }}></div>
        {steps.map((s, i) => (
          <div key={i} style={{ position: 'relative', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: colors[i % 3], border: `3px solid ${ds.ink}`, borderRadius: '50%', margin: '0 auto', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 22, position: 'relative', zIndex: 1, color: ds.ink }}>{i + 1}</div>
            <div style={{ marginTop: 24, background: '#FFFFFF', border: `2px solid ${ds.ink}`, borderRadius: 12, padding: 20, boxShadow: `4px 4px 0 ${ds.ink}` }}>
              <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8, color: ds.ink }}>{s.title}</div>
              <div style={{ fontSize: 14, opacity: 0.75, lineHeight: 1.5, color: ds.ink }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  // default v1/v2/v3/v5: 검정 배경 카드
  const bg = dark ? ds.ink : ds.surface;
  const fg = dark ? ds.bg : ds.ink;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${steps.length}, 1fr)`, gap: 24 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ borderTop: `3px solid ${colors[i % 3]}`, paddingTop: 20, color: fg }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: colors[i % 3], marginBottom: 12 }}>STEP {String(i+1).padStart(2,'0')}</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, lineHeight: 1.2 }}>{s.title}</div>
          <div style={{ fontSize: 15, opacity: 0.7, lineHeight: 1.5 }}>{s.desc}</div>
          {s.bullets && <ul style={{ marginTop: 16, paddingLeft: 16, fontSize: 14, lineHeight: 1.7, opacity: 0.75 }}>{s.bullets.map(b => <li key={b}>{b}</li>)}</ul>}
        </div>
      ))}
    </div>
  );
};

// === REVIEWS ===
const Reviews = ({ version, reviews, count = 6 }) => {
  const ds = window.DS[version];
  const list = reviews.slice(0, count);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: version === 'v4' ? 16 : 12 }}>
      {list.map((r, i) => (
        <div key={i} style={{
          background: ds.surface,
          border: version === 'v4' ? `2px solid ${ds.ink}` : version === 'v6' ? `4px solid ${ds.ink}` : `1px solid ${ds.muted}`,
          boxShadow: version === 'v4' ? `4px 4px 0 ${ds.ink}` : 'none',
          borderRadius: version === 'v6' ? 0 : 12, padding: 24
        }}>
          <div style={{ fontSize: 14, color: ds.accent, marginBottom: 8 }}>★★★★★</div>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.4, marginBottom: 8, color: ds.ink }}>"{r.quote}"</div>
          <div style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.5, color: ds.ink }}>{r.detail}</div>
          <div style={{ fontSize: 12, opacity: 0.55, marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${ds.muted}`, color: ds.ink }}>{r.region} · {r.who}</div>
        </div>
      ))}
    </div>
  );
};

// === PRICING ===
const Pricing = ({ version, pricing }) => {
  const ds = window.DS[version];
  const fmt = (n) => new Intl.NumberFormat('ko-KR').format(n);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{
        background: ds.surface,
        border: version === 'v6' ? `4px solid ${ds.ink}` : `2px solid ${ds.ink}`,
        borderRadius: version === 'v6' ? 0 : 16, padding: 28, color: ds.ink
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 32, fontWeight: 900 }}>{pricing.a.name}</div>
          <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Courier New', monospace" }}>20% OFF</div>
        </div>
        <div style={{ fontSize: 48, fontWeight: 900, marginTop: 12, letterSpacing: '-0.03em' }}>
          {fmt(pricing.a.price)}원 <span style={{ fontSize: 18, opacity: 0.4, textDecoration: 'line-through', fontWeight: 600 }}>{fmt(pricing.a.original)}원</span>
        </div>
        <ul style={{ fontSize: 15, lineHeight: 1.7, padding: 0, listStyle: 'none', marginTop: 16 }}>
          {pricing.a.items.map(it => <li key={it} style={{ display: 'flex', gap: 8 }}><span style={{ color: ds.accent3 }}>✓</span>{it}</li>)}
        </ul>
      </div>
      <div style={{
        background: version === 'v6' ? ds.accent : ds.surface,
        color: version === 'v6' ? ds.bg : ds.ink,
        border: version === 'v6' ? `4px solid ${ds.ink}` : `2px solid ${ds.accent}`,
        borderRadius: version === 'v6' ? 0 : 16, padding: 28
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 32, fontWeight: 900 }}>{pricing.b.name}</div>
          <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Courier New', monospace" }}>매월 2명만</div>
        </div>
        <div style={{ fontSize: 48, fontWeight: 900, marginTop: 12, letterSpacing: '-0.03em' }}>
          {fmt(pricing.b.price)}원 <span style={{ fontSize: 18, opacity: 0.5, textDecoration: 'line-through', fontWeight: 600 }}>{fmt(pricing.b.original)}원</span>
        </div>
        <ul style={{ fontSize: 15, lineHeight: 1.7, padding: 0, listStyle: 'none', marginTop: 16 }}>
          {pricing.b.items.map(it => <li key={it} style={{ display: 'flex', gap: 8 }}><span>★</span>{it}</li>)}
        </ul>
      </div>
    </div>
  );
};

// === FAQ ===
const FAQ = ({ version, faqs }) => {
  const ds = window.DS[version];
  const [open, setOpen] = React.useState(0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {faqs.map((f, i) => (
        <div key={i} style={{
          background: ds.surface,
          border: version === 'v6' ? `4px solid ${ds.ink}` : `1px solid ${ds.muted}`,
          borderRadius: version === 'v6' ? 0 : 12,
          padding: '16px 20px', cursor: 'pointer'
        }} onClick={() => setOpen(open === i ? -1 : i)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 16, fontWeight: 700, color: ds.ink }}>
            <span>Q. {f.q}</span><span style={{ color: ds.accent, fontSize: 22 }}>{open === i ? '−' : '+'}</span>
          </div>
          {open === i && <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.7, color: ds.ink, opacity: 0.85, whiteSpace: 'pre-line' }}>{f.a}</div>}
        </div>
      ))}
    </div>
  );
};

// === CTA ===
const CTA = ({ version, title, subtitle, button }) => {
  const ds = window.DS[version];
  if (version === 'v6') return (
    <section style={{ background: ds.ink, color: ds.bg, padding: '64px 40px', textAlign: 'center' }}>
      <h2 style={{ fontSize: 88, fontWeight: 900, margin: 0, lineHeight: 0.9, letterSpacing: '-0.05em' }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 18, opacity: 0.7, marginTop: 16 }}>{subtitle}</p>}
      <a href={button.href} style={{ display: 'inline-block', marginTop: 32, background: ds.accent2, color: ds.ink, border: `4px solid ${ds.bg}`, padding: '20px 40px', fontSize: 18, fontWeight: 900, fontFamily: "'Courier New', monospace", textDecoration: 'none' }}>{button.label}</a>
    </section>
  );
  return (
    <section style={{ background: version === 'v5' ? ds.accent : version === 'v1' ? ds.accent2 : ds.ink, color: version === 'v5' || version === 'v1' ? ds.ink : ds.bg, padding: '80px 48px', textAlign: 'center' }}>
      <h2 style={{ fontSize: 64, fontWeight: 900, margin: 0, lineHeight: 1.05, letterSpacing: '-0.03em' }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 17, opacity: 0.7, marginTop: 16 }}>{subtitle}</p>}
      <a href={button.href} style={{ display: 'inline-block', marginTop: 28, background: version === 'v5' ? ds.ink : version === 'v1' ? ds.ink : ds.accent2, color: version === 'v5' ? ds.accent : version === 'v1' ? ds.bg : ds.ink, border: 'none', padding: '20px 40px', fontSize: 17, fontWeight: 900, borderRadius: 999, textDecoration: 'none' }}>{button.label}</a>
    </section>
  );
};

window.Hero = Hero;
window.Stats = Stats;
window.SectionHead = SectionHead;
window.Steps = Steps;
window.Reviews = Reviews;
window.Pricing = Pricing;
window.FAQ = FAQ;
window.CTA = CTA;
