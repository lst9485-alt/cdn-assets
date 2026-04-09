  // 스케일
  function scaleStage() {
    const isEdit = document.body.classList.contains('edit-mode');
    const filmstripH = 0;
    const toolbarH = 0;
    const availH = window.innerHeight - filmstripH - toolbarH;
    const availW = window.innerWidth;
    const baseScale = Math.min(availW / 1920, availH / 1080);
    const scale = baseScale * (isEdit ? userZoom : 1);
    const cx = availW / 2;
    const cy = toolbarH + availH / 2;
    const x = cx - 960 * scale + (isEdit ? panX : 0);
    const y = cy - 540 * scale + (isEdit ? panY : 0);
    document.getElementById('stage').style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }
  scaleStage();
  window.addEventListener('resize', scaleStage);

  // Ctrl+휠 줌
  document.addEventListener('wheel', e => {
    if (!editMode || !e.ctrlKey) return;
    e.preventDefault();
    const oldZoom = userZoom;
    const delta = -e.deltaY * 0.002;
    userZoom = Math.max(0.2, Math.min(5, userZoom * (1 + delta)));
    const toolbarH = 48, filmstripH = 96;
    const availH = window.innerHeight - filmstripH - toolbarH;
    const cx = window.innerWidth / 2;
    const cy = toolbarH + availH / 2;
    const ratio = userZoom / oldZoom;
    const dx = e.clientX - (cx + panX);
    const dy = e.clientY - (cy + panY);
    panX -= dx * (ratio - 1);
    panY -= dy * (ratio - 1);
    scaleStage();
  }, { passive: false });

  // Space 키 상태 추적
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && editMode && !isEditing) { spaceHeld = true; e.preventDefault(); }
  });
  document.addEventListener('keyup', e => {
    if (e.code === 'Space') spaceHeld = false;
  });

  // 외부 영역 드래그 팬 (Space+좌클릭 또는 미들버튼)
  document.addEventListener('mousedown', e => {
    if (!editMode) return;
    const canPan = e.button === 1 || (e.button === 0 && spaceHeld);
    if (!canPan) return;
    if (e.target.closest('#toolbar, #layer-panel, #filmstrip')) return;
    isPanning = true;
    panStartX = e.clientX; panStartY = e.clientY;
    panAnchorX = panX; panAnchorY = panY;
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!isPanning) return;
    panX = panAnchorX + (e.clientX - panStartX);
    panY = panAnchorY + (e.clientY - panStartY);
    scaleStage();
  });
  document.addEventListener('mouseup', () => {
    if (isPanning) { isPanning = false; document.body.style.cursor = ''; }
  });

  // ── 필름스트립 ──
  function buildFilmstrip() {
    const inner = document.getElementById('filmstrip-inner');
    inner.innerHTML = '';
    slides.forEach((slide, idx) => {
      const item = document.createElement('div');
      item.className = 'fs-item' + (idx === currentSlide ? ' current' : '');
      const fsInner = document.createElement('div');
      fsInner.className = 'fs-inner';
      const clone = slide.cloneNode(true);
      clone.style.cssText = 'position:relative;width:1920px;height:1080px;opacity:1;transform:none;pointer-events:none;';
      applyStepState(clone, getSteps(slide) - 1);
      fsInner.appendChild(clone);
      const num = document.createElement('div');
      num.className = 'fs-num';
      // Variant slides: show "3A" instead of sequential number
      const pg = slide.dataset.pageGroup;
      const vl = slide.dataset.variant;
      if (pg && vl) {
        num.textContent = pg + vl;
        // Color-code variant groups (cycle 4 colors)
        item.setAttribute('data-group-color', parseInt(pg) % 4);
      } else {
        num.textContent = idx + 1;
      }
      item.appendChild(fsInner);
      item.appendChild(num);
      item.addEventListener('click', () => { if (!fsDragItem && !fsDragDone) goToSlide(idx); });
      item.addEventListener('mousedown', ev => {
        if (ev.button !== 0) return;
        const capturedIdx = idx;
        fsDragPending = setTimeout(() => {
          fsDragPending = null;
          fsDragItem = item;
          fsDragFromIdx = capturedIdx;
          fsDragStartX = ev.clientX;
          item.style.opacity = '0.5';
          fsDragGhost = item.cloneNode(true);
          fsDragGhost.style.cssText = 'position:fixed;pointer-events:none;z-index:9999;opacity:0.7;width:136px;height:76px;overflow:hidden;border-radius:4px;';
          fsDragGhost.style.left = (ev.clientX - 68) + 'px';
          fsDragGhost.style.top  = (ev.clientY - 38) + 'px';
          document.body.appendChild(fsDragGhost);
        }, 200);
      });
      inner.appendChild(item);
    });
    scrollFilmstripToCurrent();
  }
  function scrollFilmstripToCurrent() {
    const cur = document.querySelector('#filmstrip-inner .fs-item.current');
    if (cur) cur.scrollIntoView({ inline: 'nearest', behavior: 'smooth', block: 'nearest' });
  }
  function updateFilmstripCurrent() {
    document.querySelectorAll('#filmstrip-inner .fs-item').forEach((item, idx) => {
      item.classList.toggle('current', idx === currentSlide);
    });
    scrollFilmstripToCurrent();
  }

  function reorderSlide(fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    pushUndo();
    const container = document.getElementById('stage');
    const slideEls = [...container.querySelectorAll(':scope > .slide')];
    const moved = slideEls[fromIdx];
    if (toIdx >= slideEls.length) {
      container.appendChild(moved);
    } else if (toIdx > fromIdx) {
      container.insertBefore(moved, slideEls[toIdx].nextSibling);
    } else {
      container.insertBefore(moved, slideEls[toIdx]);
    }
    slides = [...container.querySelectorAll(':scope > .slide')];
    buildFilmstrip();
    goToSlide(toIdx);
  }

  function deleteSlide(idx) {
    if (slides.length <= 1) return;
    pushUndo();
    const container = document.getElementById('stage');
    container.removeChild(slides[idx]);
    slides = [...container.querySelectorAll(':scope > .slide')];
    const newIdx = Math.min(idx, slides.length - 1);
    buildFilmstrip();
    currentSlide = -1;
    goToSlide(newIdx);
  }

  let userZoom = 1, panX = 0, panY = 0;
  let isPanning = false, panStartX = 0, panStartY = 0, panAnchorX = 0, panAnchorY = 0;
  let spaceHeld = false;

  // 로드 시 가이드 상태 초기화 (기존 저장 파일에 남아있을 수 있는 show-guide 제거)
  document.body.className = document.body.className.replace(/\bshow-guide[\w-]*/g, '').trim();
  document.querySelectorAll('#guide-toolbar .guide-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.target !== 'title') btn.textContent = btn.dataset.target;
  });

  let slides = document.querySelectorAll('#stage > .slide');
  let currentSlide = 0;
  let currentStep = 0;
  let currentOrder = 0;
  let animating = false;
  const sessionId = crypto.randomUUID();
  const presenterChannel = new BroadcastChannel('slide-presenter-' + sessionId);
  let presenterWindow = null;
  window.addEventListener('beforeunload', () => {
    if (presenterWindow && !presenterWindow.closed) presenterWindow.close();
  });

  // 효과음
  const sndSlide = new Audio('./assets/sounds/slide.mp3');
  const sndStep  = new Audio('./assets/sounds/step.mp3');
  const sndClick      = new Audio('./assets/sounds/딸깍.mp3');
  const sndDing       = new Audio('./assets/sounds/띠링(구독좋아요).mp3');
  const sndTransition = new Audio('./assets/sounds/장면전환.mp3');
  const sndMoney      = new Audio('./assets/sounds/금액.mp3');
  const sndBuzz       = new Audio('./assets/sounds/삐삑.mp3');
  function playSndChart() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const t = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      gain.connect(ctx.destination);
      [523, 659, 784].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        osc.connect(gain);
        osc.start(t + i * 0.15);
        osc.stop(t + i * 0.15 + 0.2);
      });
    } catch(e) {}
  }
  function playSound(type) {
    if (!document.fullscreenElement) return;
    if (type === 'chart') { playSndChart(); return; }
    if (type === 'draw') { playSndDraw(); return; }
    if (type === 'pop') { playSndPop(); return; }
    if (type === 'click') { playSndClick(); return; }
    if (type === 'ding') { playSndDing(); return; }
    if (type === 'timeline') { playSndTimeline(); return; }
    if (type === 'transition') { sndTransition.currentTime = 0; sndTransition.play().catch(() => {}); return; }
    if (type === 'money') { sndMoney.currentTime = 0; sndMoney.play().catch(() => {}); return; }
    if (type === 'buzz') { sndBuzz.currentTime = 0; sndBuzz.play().catch(() => {}); return; }
    const snd = (type === 'slide') ? sndSlide : sndStep;
    snd.currentTime = 0;
    snd.play().catch(() => {});
  }

  // CTA 버튼 직접 클릭 효과음 (풀스크린 전용)
  document.addEventListener('click', e => {
    if (!document.fullscreenElement) return;
    const cta = e.target.closest('.cta-btn');
    if (!cta) return;
    e.stopImmediatePropagation(); // goNext 방지 — CTA 클릭은 슬라이드 전환 없이 효과음만
    if (cta.classList.contains('like')) playSndClick();
    else if (cta.classList.contains('subscribe')) playSndDing();
  });

  // click: 딸깍 소리
  function playSndClick() {
    sndClick.currentTime = 0;
    sndClick.play().catch(() => {});
  }

  // ding: 띠링(구독좋아요) 소리
  function playSndDing() {
    sndDing.currentTime = 0;
    sndDing.play().catch(() => {});
  }

  // draw: 선 드로우용
  function playSndDraw() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch(e) {}
  }

  // timeline: 틱톡 2음 연속
  function playSndTimeline() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 1200;
      const g1 = ctx.createGain();
      g1.gain.setValueAtTime(0.3, ctx.currentTime);
      g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      o1.connect(g1); g1.connect(ctx.destination);
      o1.start(ctx.currentTime); o1.stop(ctx.currentTime + 0.08);
      const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 900;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.25, ctx.currentTime + 0.12);
      g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      o2.connect(g2); g2.connect(ctx.destination);
      o2.start(ctx.currentTime + 0.12); o2.stop(ctx.currentTime + 0.2);
    } catch(e) {}
  }

  // pop: 배지/칩 팝인용
  function playSndPop() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.15);
    } catch(e) {}
  }

  function animateBarChart(el) {
    const fills = el.querySelectorAll('.bar-fill, .hbar-bar');
    fills.forEach((f, i) => {
      const target = f.style.getPropertyValue('--bar-w').trim();
      if (!target) return;
      f.style.transition = 'none';
      f.style.width = '0';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        f.style.transition = '';
        setTimeout(() => { f.style.width = target; }, i * 720);
      }));
    });
    animateCountValues(el, 3200);
    playSound('chart');
  }

  function animateBtnGrid(el) {
    const pills = el.querySelectorAll('.btn-pill');
    pills.forEach((p, i) => {
      p.style.transitionDelay = (i * 0.2) + 's';
    });
  }

  function animateTimeline(el) {
    const lines = el.querySelectorAll('svg line');
    lines.forEach((line, i) => {
      const len = Math.sqrt(
        Math.pow(line.x2.baseVal.value - line.x1.baseVal.value, 2) +
        Math.pow(line.y2.baseVal.value - line.y1.baseVal.value, 2)
      );
      line.style.transition = 'none';
      line.style.strokeDasharray = len;
      line.style.strokeDashoffset = len;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        line.style.transition = `stroke-dashoffset 3.2s ease ${i * 1.6}s`;
        line.style.strokeDashoffset = '0';
      }));
    });
    const items = el.querySelectorAll('.tl-circle, .tl-box');
    items.forEach((item, i) => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(20px)';
      item.style.transition = 'none';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        item.style.transition = `opacity 2.2s ease ${i * 0.8}s, transform 2.2s ease ${i * 0.8}s`;
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
      }));
    });
  }

  function isChartEl(el) {
    return ['bar-chart','hbar-chart','big-stat','stat-circle','multi-stat']
      .some(c => el.classList.contains(c));
  }

  function animateCountValues(container, duration = 6400) {
    const start = performance.now();
    const targets = [];
    container.querySelectorAll('.bar-value, .hbar-val, .stat-num, .lc-end-val').forEach(el => {
      const text = el.textContent.trim();
      const match = text.match(/^([\D]*)([\d,]+\.?\d*)([\D]*)$/);
      if (match) {
        const num = parseFloat(match[2].replace(/,/g, ''));
        targets.push({ el, prefix: match[1], num, suffix: match[3], original: text });
      }
    });
    if (!targets.length) return;
    function update(now) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      targets.forEach(({ el, prefix, num, suffix }) => {
        const cur = num * ease;
        const disp = num < 10 ? cur.toFixed(1) : Math.round(cur).toLocaleString();
        el.textContent = prefix + disp + suffix;
      });
      if (t < 1) requestAnimationFrame(update);
      else {
        targets.forEach(({ el, original }) => {
          el.textContent = original;
          el.classList.add('count-bounce');
          el.addEventListener('animationend', () => el.classList.remove('count-bounce'), { once: true });
        });
      }
    }
    requestAnimationFrame(update);
  }

  function animateTagChips(el) {
    const chips = el.querySelectorAll('.tag-chip');
    chips.forEach((chip, i) => {
      chip.style.transitionDelay = (i * 0.1) + 's';
    });
  }

  function animateCardsInLayer(layer) {
    const cards = layer.querySelectorAll('.slide-el.card, .slide-el.grid-card');
    if (cards.length < 2) return;
    cards.forEach((card, i) => {
      card.style.transitionDelay = (0.3 + i * 0.15) + 's';
    });
  }

  function buildLineChart(el) {
    const vals = (el.dataset.values || '').split(',').map(Number).filter(n => !isNaN(n));
    const labels = (el.dataset.labels || '').split(',').map(s => s.trim());
    const title = el.dataset.title || '';
    const unit = el.dataset.unit || '';
    if (vals.length < 2) return;
    const W = parseInt(el.style.width) || 800;
    const H = parseInt(el.style.height) || 400;
    const pad = { top: 60, right: 80, bottom: 60, left: 100 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    const minV = Math.min(...vals), maxV = Math.max(...vals);
    const range = maxV - minV || 1;
    const pts = vals.map((v, i) => ({
      x: pad.left + (i / (vals.length - 1)) * chartW,
      y: pad.top + (1 - (v - minV) / range) * chartH,
      v
    }));
    const polyPts = pts.map(p => `${p.x},${p.y}`).join(' ');
    const areaPts = `${pts[0].x},${pad.top + chartH} ${polyPts} ${pts[pts.length-1].x},${pad.top + chartH}`;
    const lastPt = pts[pts.length - 1];
    const YTICKS = 5;
    let yTicksHTML = '';
    for (let i = 0; i <= YTICKS; i++) {
      const v = minV + (range * i / YTICKS);
      const y = pad.top + (1 - i / YTICKS) * chartH;
      const label = Number.isInteger(v) ? v : v.toFixed(1);
      yTicksHTML += `<line stroke="#ddd" stroke-width="1" x1="${pad.left}" y1="${y}" x2="${pad.left + chartW}" y2="${y}"/>`;
      yTicksHTML += `<text class="chart-label" x="${pad.left - 8}" y="${y + 8}" text-anchor="end">${label}${unit}</text>`;
    }
    const pathD = 'M' + pts.map(p => `${p.x} ${p.y}`).join(' L');
    const svgHTML = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      ${title ? `<text class="chart-title" x="${pad.left}" y="40">${title}</text>` : ''}
      ${yTicksHTML}
      <line class="chart-axis" x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + chartH}"/>
      <line class="chart-axis" x1="${pad.left}" y1="${pad.top + chartH}" x2="${pad.left + chartW}" y2="${pad.top + chartH}"/>
      ${labels.map((lb, i) => i < vals.length ? `<text class="chart-label" x="${pts[i].x}" y="${pad.top + chartH + 30}" text-anchor="middle">${lb}</text>` : '').join('')}
      <polygon class="chart-area" points="${areaPts}"/>
      <polyline class="chart-line lc-line" points="${polyPts}"/>
      <circle cx="${lastPt.x}" cy="${lastPt.y}" r="6" fill="#FF6B00"/>
      <text class="chart-val lc-end-val" x="${lastPt.x + 12}" y="${lastPt.y + 10}">${vals[vals.length-1]}${unit}</text>
      <defs><filter id="lcGlow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <circle class="lc-travel-dot" r="8" fill="#FF6B00" filter="url(#lcGlow)"><animateMotion dur="4s" repeatCount="indefinite" path="${pathD}" begin="5.5s"/></circle>
    </svg>`;
    el.innerHTML = svgHTML;
    const line = el.querySelector('.lc-line');
    if (line) {
      const len = line.getTotalLength ? line.getTotalLength() : 1000;
      line.style.strokeDasharray = len;
      line.style.strokeDashoffset = len;
      line._lcLen = len;
    }
  }

  function animateLineChart(el) {
    const line = el.querySelector('.lc-line');
    if (line && line._lcLen) {
      line.style.transition = 'none';
      line.style.strokeDashoffset = line._lcLen;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        line.style.transition = 'stroke-dashoffset 5.2s ease';
        line.style.strokeDashoffset = '0';
      }));
    }
    animateCountValues(el, 5600);
  }

  function getSteps(slide) {
    return parseInt(slide.dataset.steps || '1');
  }

  function getOrderedEls(layer) {
    if (parseInt(layer.dataset.step) === 0) return [];
    return Array.from(layer.children).filter(el => el.matches(EDITABLE_SEL) && !el.classList.contains('step-title') && !el.classList.contains('step-dim'));
  }

  // 비연속 스텝 지원: 실제 존재하는 다음/이전 스텝 탐색
  function getNextExistingStep(slide, current) {
    const totalSteps = getSteps(slide);
    for (let s = current + 1; s < totalSteps; s++) {
      if (slide.querySelector(`.step-layer[data-step="${s}"]`)) return s;
    }
    return -1;
  }

  function getPrevExistingStep(slide, current) {
    for (let s = current - 1; s > 0; s--) {
      if (slide.querySelector(`.step-layer[data-step="${s}"]`)) return s;
    }
    return 0;
  }

  // 부모 .slide-el 입장 transition 완료 후 anim-ready 추가
  // (자식 애니메이션이 부모 transition과 충돌하지 않도록)
  function addAnimReady(el) {
    if (!el.classList.contains('slide-el')) return;
    const layer = el.closest('.step-layer[data-step]');
    if (layer && layer.dataset.step === '0') {
      el.classList.add('anim-ready');
      return;
    }
    const handler = function(e) {
      if (e.target === el && e.propertyName === 'opacity') {
        el.classList.add('anim-ready');
        el.removeEventListener('transitionend', handler);
        clearTimeout(fallback);
      }
    };
    el.addEventListener('transitionend', handler);
    const fallback = setTimeout(function() {
      el.removeEventListener('transitionend', handler);
      el.classList.add('anim-ready');
    }, 1200);
  }

  function removeAnimReady(el) {
    el.classList.remove('anim-ready');
  }

  function addAnimReadyImmediate(el) {
    if (!el.classList.contains('slide-el')) return;
    el.classList.add('anim-ready');
  }

  const dimOuter = document.getElementById('dim-outer');

  function setDim(on) {
    dimOuter.classList.toggle('on', on);
  }

  function syncDimOuter(slide) {
    const on = !!slide.querySelector('.step-layer.visible .step-dim.anim-shown');
    setDim(on);
  }

  // step 내 레이어 표시 (revealAll=true: 현재 step ordered 요소 전부 표시)
  function showStep(slide, step, revealAll) {
    let hasDim = false;
    slide.querySelectorAll('.step-layer[data-step]').forEach(layer => {
      const s = parseInt(layer.dataset.step);
      const isPushup = layer.dataset.transition === 'pushup';
      const noDim = layer.hasAttribute('data-no-dim');
      if (s <= step) {
        layer.classList.add('visible');
        // pushup 레이어: 현재 step이면 보이고, 이전 pushup은 push-exit 상태
        if (isPushup) {
          layer.classList.remove('push-enter', 'push-exit');
          if (s < step) {
            // 이 pushup 레이어 위에 다른 pushup이 있으면 밀려난 상태
            const nextPushup = slide.querySelector(`.step-layer[data-transition="pushup"][data-step="${s + 1}"]`);
            if (nextPushup) layer.classList.add('push-exit');
          }
        }
        if (s > 0) {
          if (!noDim && !isPushup) hasDim = true;
          if (s === step && !revealAll) {
            getOrderedEls(layer).forEach(el => { el.classList.remove('anim-shown'); removeAnimReady(el); });
            layer.querySelectorAll(':scope > .step-content').forEach(sc => sc.classList.remove('anim-shown'));
            if (!noDim && !isPushup) {
              const dim = layer.querySelector('.step-dim');
              if (dim && !dim.dataset.group) {
                const hasUngrouped = getOrderedEls(layer).some(el => !el.dataset.group);
                if (hasUngrouped) dim.classList.add('anim-shown');
              } else if (dim) dim.classList.remove('anim-shown');
            }
          } else {
            getOrderedEls(layer).forEach(el => {
              el.classList.add('anim-shown');
              if (revealAll) addAnimReadyImmediate(el);
              else addAnimReady(el);
              if (el.classList.contains('tag-group')) animateTagChips(el);
            });
            animateCardsInLayer(layer);
            layer.querySelectorAll(':scope > .step-content').forEach(sc => sc.classList.add('anim-shown'));
            if (!noDim && !isPushup) {
              const dim = layer.querySelector('.step-dim');
              if (dim) dim.classList.add('anim-shown');
            }
          }
        }
      } else {
        layer.classList.remove('visible');
        if (isPushup) layer.classList.remove('push-enter', 'push-exit');
        getOrderedEls(layer).forEach(el => { el.classList.remove('anim-shown'); removeAnimReady(el); });
        layer.querySelectorAll(':scope > .step-content').forEach(sc => sc.classList.remove('anim-shown'));
      }
    });
    syncDimOuter(slide);
  }

  function triggerStep0Anims(slide) {
    const step0Layer = slide.querySelector('.step-layer[data-step="0"]');
    if (!step0Layer) return;
    step0Layer.querySelectorAll('.bar-chart, .hbar-chart').forEach(el => animateBarChart(el));
    step0Layer.querySelectorAll('.big-stat, .stat-circle').forEach(el => { animateCountValues(el); playSound('chart'); });
    step0Layer.querySelectorAll('.line-chart').forEach(el => { animateLineChart(el); playSound('chart'); });
    step0Layer.querySelectorAll('.multi-stat').forEach(el => { animateCountValues(el); playSound('chart'); });
    step0Layer.querySelectorAll('.btn-grid').forEach(el => animateBtnGrid(el));
    step0Layer.querySelectorAll('.step-timeline').forEach(el => { animateTimeline(el); playSound('timeline'); });
  }

  // 슬라이드 전환
  function goToSlide(idx, fromStep) {
    if (animating) return;
    const next = Math.max(0, Math.min(idx, slides.length - 1));
    if (next === currentSlide) return;
    animating = true;

    const forward = next > currentSlide;
    const outSlide = currentSlide >= 0 ? slides[currentSlide] : null;
    const inSlide = slides[next];

    // 들어오는 슬라이드 초기 위치
    inSlide.style.transition = 'none';
    inSlide.classList.remove('active', 'leave-left', 'enter-from-left');
    if (!forward) inSlide.classList.add('enter-from-left');
    inSlide.offsetHeight; // reflow

    // 나가는 슬라이드
    if (outSlide) {
      outSlide.style.transition = '';
      if (forward) {
        outSlide.classList.add('leave-left');
      } else {
        outSlide.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        outSlide.style.opacity = '0';
        outSlide.style.transform = 'translateX(80px)';
      }
    }

    // 들어오는 슬라이드 활성화
    inSlide.style.transition = '';
    inSlide.classList.add('active');

    // 편집 모드 선택 상태 초기화
    if (editMode) {
      clearSelection();
    }

    // step 초기화: 뒤로 가면 마지막 step, 앞으로 가면 0
    setDim(false);
    currentSlide = next;
    currentStep = forward ? 0 : getSteps(inSlide) - 1;
    currentOrder = 0;
    if (!forward) {
      const lastLayer = inSlide.querySelector(`.step-layer[data-step="${currentStep}"]`);
      if (lastLayer) currentOrder = getOrderedEls(lastLayer).length;
      showStep(inSlide, currentStep, true);
      triggerStep0Anims(inSlide);
    } else {
      showStep(inSlide, currentStep);
      triggerStep0Anims(inSlide);
    }

    if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
    document.getElementById('slideNum').textContent = `${currentSlide + 1} / ${slides.length}`;
    playSound('slide');
    updateFilmstripCurrent();
    syncPresenter();

    setTimeout(() => {
      if (outSlide) {
        outSlide.classList.remove('active', 'leave-left', 'enter-from-left');
        outSlide.style.opacity = '';
        outSlide.style.transform = '';
        outSlide.style.transition = '';
      }
      inSlide.classList.remove('enter-from-left');
      animating = false;
    }, 640);
  }

  function goNext() {
    const slide = slides[currentSlide];
    const totalSteps = getSteps(slide);
    const curLayer = slide.querySelector(`.step-layer[data-step="${currentStep}"]`);
    if (curLayer) {
      const ordered = getOrderedEls(curLayer);
      if (currentOrder < ordered.length) {
        const el = ordered[currentOrder];
        const group = el.dataset.group;
        if (group) {
          const dim = curLayer.querySelector('.step-dim');
          if (dim && (dim.dataset.group === group || !dim.dataset.group)) {
            dim.classList.add('anim-shown');
            setDim(true);
            playSound('pop');
          }
          while (currentOrder < ordered.length && ordered[currentOrder].dataset.group === group) {
            ordered[currentOrder].classList.add('anim-shown');
            addAnimReady(ordered[currentOrder]);
            currentOrder++;
          }
          curLayer.querySelectorAll('.slide-el[data-group="' + group + '"]').forEach(gel => {
            if (isChartEl(gel)) animateCountValues(gel);
            else if (gel.classList.contains('line-chart')) animateLineChart(gel);
          });
        } else {
          el.classList.add('anim-shown');
          addAnimReady(el);
          if (isChartEl(el)) { animateCountValues(el); playSound('chart'); }
          else if (el.classList.contains('line-chart')) { animateLineChart(el); playSound('chart'); }
          else if (el.classList.contains('btn-grid')) { animateBtnGrid(el); playSound('pop'); }
          else if (el.classList.contains('step-timeline')) { animateTimeline(el); playSound('timeline'); }
          else if (el.classList.contains('compare-box') || el.classList.contains('compare-col')) { playSound('pop'); }
          else if (el.classList.contains('num-item') || el.classList.contains('icon-item') || el.classList.contains('icon-flow-row') || el.classList.contains('tag-group')) {
            playSound('pop');
            if (el.classList.contains('tag-group')) animateTagChips(el);
          }
          else if (el.classList.contains('alert-banner') || el.classList.contains('quote-layout')) { playSound('draw'); }
          else if (el.dataset.sound) { playSound(el.dataset.sound); }
          else playSound('step');
          currentOrder++;
        }
        if (group) playSound('step');
        syncPresenter();
        return;
      }
    }
    const nextStep = getNextExistingStep(slide, currentStep);
    if (nextStep !== -1) {
      currentStep = nextStep;
      currentOrder = 0;
      showStep(slide, currentStep);
      // step 진입 시 dim 활성화 (no-dim/pushup 레이어는 건너뜀)
      const newLayer = slide.querySelector(`.step-layer[data-step="${currentStep}"]`);
      if (newLayer) {
        const noDim = newLayer.hasAttribute('data-no-dim') || newLayer.dataset.transition === 'pushup';
        const dim = newLayer.querySelector('.step-dim');
        if (dim && !noDim) { dim.classList.add('anim-shown'); setDim(true); playSound('pop'); }
        const ordered = getOrderedEls(newLayer);
        if (ordered.length > 0) {
          const firstEl = ordered[0];
          const firstGroup = firstEl.dataset.group;
          if (firstGroup) {
            if (dim && (!dim.dataset.group || dim.dataset.group === firstGroup)) {
              dim.classList.add('anim-shown');
              setDim(true);
            }
            while (currentOrder < ordered.length && ordered[currentOrder].dataset.group === firstGroup) {
              ordered[currentOrder].classList.add('anim-shown');
              addAnimReady(ordered[currentOrder]);
              currentOrder++;
            }
            newLayer.querySelectorAll('.slide-el[data-group="' + firstGroup + '"]').forEach(gel => {
              if (isChartEl(gel)) animateCountValues(gel);
              else if (gel.classList.contains('line-chart')) animateLineChart(gel);
            });
          } else {
            firstEl.classList.add('anim-shown');
            addAnimReady(firstEl);
            if (isChartEl(firstEl)) animateCountValues(firstEl);
            if (firstEl.classList.contains('line-chart')) animateLineChart(firstEl);
            currentOrder++;
            syncDimOuter(slide);
            const isChart = isChartEl(firstEl) || firstEl.classList.contains('line-chart');
            if (isChart) { playSound('chart'); syncPresenter(); return; }
            else if (firstEl.classList.contains('btn-grid')) { animateBtnGrid(firstEl); playSound('pop'); }
            else if (firstEl.classList.contains('step-timeline')) { animateTimeline(firstEl); playSound('timeline'); }
            else if (firstEl.classList.contains('compare-box') || firstEl.classList.contains('compare-col')) { playSound('pop'); }
            else if (firstEl.classList.contains('num-item') || firstEl.classList.contains('icon-item') || firstEl.classList.contains('icon-flow-row') || firstEl.classList.contains('tag-group')) {
              playSound('pop');
              if (firstEl.classList.contains('tag-group')) animateTagChips(firstEl);
            }
            else if (firstEl.classList.contains('alert-banner') || firstEl.classList.contains('quote-layout')) { playSound('draw'); }
            else if (firstEl.dataset.sound) { playSound(firstEl.dataset.sound); syncPresenter(); return; }
            animateCardsInLayer(newLayer);
          }
        }
      }
      playSound('step');
      syncPresenter();
    } else if (currentSlide < slides.length - 1) {
      goToSlide(currentSlide + 1);
    }
  }

  function goPrev() {
    const slide = slides[currentSlide];
    if (currentOrder > 0) {
      currentOrder--;
      const curLayer = slide.querySelector(`.step-layer[data-step="${currentStep}"]`);
      const ordered = getOrderedEls(curLayer);
      const el = ordered[currentOrder];
      const group = el.dataset.group;
      if (group) {
        const dim = curLayer.querySelector('.step-dim');
        if (dim && dim.dataset.group === group) {
          dim.classList.remove('anim-shown');
          syncDimOuter(slide);
        }
        while (currentOrder >= 0 && ordered[currentOrder]?.dataset.group === group) {
          ordered[currentOrder].classList.remove('anim-shown');
          removeAnimReady(ordered[currentOrder]);
          currentOrder--;
        }
        currentOrder++;
        // 모든 요소 숨김 완료 시 dim도 숨김 (dim에 group 없는 경우)
        if (currentOrder === 0 && dim && !dim.dataset.group) {
          dim.classList.remove('anim-shown');
          syncDimOuter(slide);
        }
      } else {
        el.classList.remove('anim-shown');
        removeAnimReady(el);
      }
      // 모든 요소 숨김 후 이전 step으로 즉시 이동 (goNext와 대칭)
      if (currentOrder === 0 && currentStep > 0) {
        const dim2 = curLayer.querySelector('.step-dim');
        if (dim2) { dim2.classList.remove('anim-shown'); syncDimOuter(slide); }
        currentStep = getPrevExistingStep(slide, currentStep);
        const prevLayer = slide.querySelector(`.step-layer[data-step="${currentStep}"]`);
        if (prevLayer) currentOrder = getOrderedEls(prevLayer).length;
        showStep(slide, currentStep, true);
        playSound('step');
        syncPresenter();
        return;
      }
      playSound('step');
      syncPresenter();
    } else if (currentStep > 0) {
      currentStep = getPrevExistingStep(slide, currentStep);
      const prevLayer = slide.querySelector(`.step-layer[data-step="${currentStep}"]`);
      if (prevLayer) currentOrder = getOrderedEls(prevLayer).length;
      showStep(slide, currentStep, true);
      playSound('step');
      syncPresenter();
    } else if (currentSlide > 0) {
      goToSlide(currentSlide - 1);
    }
  }

  function recalcSteps(slide) {
    let maxStep = 0;
    slide.querySelectorAll('.step-layer').forEach(l => {
      maxStep = Math.max(maxStep, parseInt(l.dataset.step));
    });
    slide.dataset.steps = String(maxStep + 1);
  }

  function toggleStepOverlay() {
    pushUndo();
    const slide = slides[currentSlide];
    let maxStep = 0;
    slide.querySelectorAll('.step-layer').forEach(l => {
      maxStep = Math.max(maxStep, parseInt(l.dataset.step));
    });
    const newStep = maxStep + 1;
    const newLayer = document.createElement('div');
    newLayer.className = 'step-layer';
    newLayer.dataset.step = String(newStep);
    newLayer.innerHTML = '<div class="step-dim"></div>';
    slide.appendChild(newLayer);
    slide.dataset.steps = String(newStep + 1);
    if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
  }

  document.addEventListener('keydown', e => {
    // Ctrl+S: 저장 (텍스트 편집 중에도 허용)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (isGitHubPages && !ghIsDirty()) { showToast('변경사항 없음', 2000); return; }
      saveToFile(true);
      return;
    }
    // Ctrl+Z / Ctrl+Shift+Z: 실행 취소 / 다시 실행
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      if (isEditing) return; // 텍스트 편집 중에는 element 핸들러가 처리
      e.preventDefault();
      if (isDragging || isResizing || pendingDrag) return; // EF6: 드래그/리사이즈/대기 중 Undo 무시
      e.shiftKey ? doRedo() : doUndo();
      return;
    }
    // Ctrl+C: 요소 복사 (편집 모드)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && editMode && !isEditing) {
      if (selectedEl) clipboardEl = selectedEl.outerHTML;
      return;
    }
    // Ctrl+G: 그룹화 / 해제 (편집 모드)
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyG' && editMode) {
      e.preventDefault();
      if (selectedEls.length < 2) return;
      const groups = [...new Set(selectedEls.map(el => el.dataset.group).filter(Boolean))];
      const allSameGroup = groups.length === 1 && selectedEls.every(el => el.dataset.group === groups[0]);
      pushUndo();
      if (allSameGroup) {
        // 전부 같은 그룹 → 해제 + step-0 복귀
        const els = [...selectedEls];
        selectedEls.forEach(el => delete el.dataset.group);
        slides[currentSlide].querySelectorAll('.step-dim[data-group]').forEach(d => delete d.dataset.group);
        els.forEach(el => {
          const srcLayer = el.closest('.step-layer');
          if (srcLayer && parseInt(srcLayer.dataset.step) !== 0) {
            const slide = slides[currentSlide];
            const layer0 = slide.querySelector('.step-layer[data-step="0"]');
            if (layer0) {
              srcLayer.removeChild(el);
              if (el.matches('.text-area')) { const sc = el.querySelector(':scope > .step-content'); if (sc) el.innerHTML = sc.innerHTML; }
              layer0.appendChild(el);
              if (!srcLayer.querySelector(EDITABLE_SEL + ':not(.step-dim)')) { srcLayer.remove(); recalcSteps(slide); }
            }
          }
        });
      } else {
        // 기존 그룹 해제 후 새 그룹 생성 (step 배치는 변경하지 않음)
        selectedEls.forEach(el => delete el.dataset.group);
        groupCounter++;
        const gid = 'g' + groupCounter;
        selectedEls.forEach(el => { el.dataset.group = gid; });
      }
      if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
      return;
    }
    // 텍스트 편집 중: 나머지 단축키 비활성화
    if (isEditing) return;
    // Delete: 슬라이드 삭제 (선택 요소 없을 때, 편집 모드)
    if (e.key === 'Delete' && editMode && !selectedEls.length) {
      e.preventDefault();
      deleteSlide(currentSlide);
      return;
    }
    // Delete/Backspace: 선택 요소 삭제 (편집 모드)
    if ((e.code === 'Delete' || e.code === 'Backspace') && editMode) {
      if (!selectedEls.length) return;
      pushUndo();
      const slide = slides[currentSlide];
      [...selectedEls].forEach(el => {
        const layer = el.closest('.step-layer');
        if (layer) {
          layer.removeChild(el);
          if (parseInt(layer.dataset.step) > 0 && !layer.querySelector(EDITABLE_SEL + ':not(.step-dim)')) {
            layer.remove();
            recalcSteps(slide);
          }
        } else if (el.parentElement) {
          el.parentElement.removeChild(el);
        }
      });
      selectedEl = null; selectedEls = [];
      isDragging = false;
      pendingDrag = false;
      isResizing = false;
      resizeCorner = null;
      resizeEdge = null;
      document.getElementById('coord-panel').style.display = 'none';
      document.getElementById('font-panel').classList.remove('visible');
      document.querySelectorAll('.resize-handle').forEach(h => h.classList.remove('visible'));
      if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
      return;
    }
// D키: 요소 선택 중이면 오버레이 추가, 미선택이면 dim 표시/숨김 토글 (편집 모드)
    if (e.code === 'KeyD' && editMode) {
      if (selectedEl) {
        toggleStepOverlay();
      } else {
        document.body.classList.toggle('hide-dims');
      }
      return;
    }
    // Alt+1: 레이어 패널 (편집 모드)
    if (e.altKey && e.code === 'Digit1' && editMode) {
      e.preventDefault();
      toggleLayerPanel();
      return;
    }
    // E키 (오버뷰/도움말 닫힌 상태에서만)
    if (e.code === 'KeyE') {
      if (!overview.classList.contains('visible') &&
          !document.getElementById('help').classList.contains('visible')) {
        toggleEditMode();
      }
      return;
    }
    // Escape: 텍스트 편집 중이면 패스 (blur가 처리)
    if (e.key === 'Escape' && isEditing) return;
    // Escape: 개별모드 → 그룹모드, 선택 해제, 편집 모드 종료 순
    if (e.key === 'Escape' && editMode) {
      if (drillParent) { exitDrill(); return; }
      if (groupEntered) { exitGroup(); return; }
      if (individualMode) {
        document.body.classList.remove('individual-mode');
        individualMode = false;
        selectedEls.forEach(s => {
          s.classList.remove('edit-selected');
          s.classList.add('edit-group-selected');
        });
        selectedEl = selectedEls[0];
        updateCoordPanel(selectedEl);
        updateGroupToolbar();
        if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
        return;
      }
      if (selectedEl || selectedEls.length > 0) {
        clearSelection();
      } else {
        toggleEditMode();
      }
      return;
    }
    if (e.key === '?' || e.key === '/') {
      document.getElementById('help').classList.toggle('visible');
      return;
    }
    if (e.code === 'KeyO') {
      toggleOverview();
      return;
    }
    if (e.key === 'Escape') {
      document.getElementById('overview').classList.remove('visible');
      document.getElementById('help').classList.remove('visible');
      return;
    }
    if (e.code === 'KeyF') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
      return;
    }
    if (e.code === 'KeyP') {
      if (presenterWindow && !presenterWindow.closed) {
        presenterWindow.close(); presenterWindow = null; return;
      }
      openPresenterView();
      return;
    }
    if (e.code === 'KeyG') {
      const b = document.body;
      if (b.classList.contains('show-guide')) {
        b.className = b.className.replace(/\bshow-guide[\w-]*/g, '').trim();
        document.querySelectorAll('#guide-toolbar .guide-btn').forEach(btn => { btn.classList.remove('active'); if (btn.dataset.target !== 'title') btn.textContent = btn.dataset.target; });
        for (let i = 1; i <= 5; i++) guideState[i] = 'off';
      } else {
        b.classList.add('show-guide');
        if (!dirHandle) ensureDirHandle();
      }
      return;
    }
    if (editMode) {
      if (['ArrowRight', 'ArrowDown'].includes(e.key)) goToSlide(currentSlide + 1);
      if (['ArrowLeft', 'ArrowUp'].includes(e.key)) goToSlide(currentSlide - 1);
    } else {
      if (['ArrowRight', 'ArrowDown', ' '].includes(e.key)) goNext();
      if (['ArrowLeft', 'ArrowUp'].includes(e.key)) goPrev();
    }
  });
  document.addEventListener('click', () => {
    if (editMode) return;
    if (document.body.classList.contains('show-guide')) return;
    if (!document.getElementById('overview').classList.contains('visible')) goNext();
  });

  // 가이드 툴바 클릭
  // 가이드 토글 상태: off → h → v → off
  const guideState = {};
  document.getElementById('guide-toolbar').addEventListener('click', e => {
    e.stopPropagation();
    const btn = e.target.closest('.guide-btn');
    if (!btn) return;
    const target = btn.dataset.target;
    const b = document.body;
    if (target === 'title') {
      b.classList.toggle('show-guide-title');
      btn.classList.toggle('active');
    } else {
      // 다른 숫자 버튼 초기화
      for (let i = 1; i <= 5; i++) {
        if (String(i) === target) continue;
        b.classList.remove('show-guide-' + i + '-h', 'show-guide-' + i + '-v');
        guideState[i] = 'off';
        const ob = document.querySelector('.guide-btn[data-target="' + i + '"]');
        if (ob) { ob.classList.remove('active'); ob.textContent = i; }
      }
      // 현재 버튼 3단계 순환
      const cur = guideState[target] || 'off';
      const next = cur === 'off' ? 'h' : cur === 'h' ? 'v' : 'off';
      guideState[target] = next;
      b.classList.remove('show-guide-' + target + '-h', 'show-guide-' + target + '-v');
      if (next === 'off') {
        btn.classList.remove('active');
        btn.textContent = target;
      } else {
        b.classList.add('show-guide-' + target + '-' + next);
        btn.classList.add('active');
        btn.textContent = target + (next === 'h' ? '가로' : '세로');
      }
    }
  });

  // 가이드 드래그 (클릭 선택 + 드래그 + Undo + 스냅 가이드라인)
  (function() {
    let dragGuide = null, gDragStart = null, gElStart = null;
    let gUndoPushed = false;
    const stage = document.getElementById('stage');
    const SNAP_THRESHOLD = 12;
    const DRAG_THRESHOLD = 5;
    const snapXEl = document.getElementById('snap-x');
    const snapYEl = document.getElementById('snap-y');

    // 빈 곳 클릭 시 선택 해제
    stage.addEventListener('mousedown', e => {
      if (!e.target.closest('.guide')) {
        stage.querySelectorAll('.guide.guide-selected').forEach(g => g.classList.remove('guide-selected'));
      }
    });

    stage.addEventListener('mousedown', e => {
      let g = e.target.closest('.guide');
      if (!g || g.style.display === 'none') return;
      if (editMode && !e.target.closest('.guide-label')) return;
      e.preventDefault();
      e.stopPropagation();

      // 선택 토글
      stage.querySelectorAll('.guide.guide-selected').forEach(s => { if (s !== g) s.classList.remove('guide-selected'); });
      g.classList.add('guide-selected');

      dragGuide = g;
      gUndoPushed = false;
      gDragStart = { x: e.clientX, y: e.clientY };
      gElStart = { left: parseInt(g.style.left), top: parseInt(g.style.top) };
    });

    document.addEventListener('mousemove', e => {
      if (!dragGuide) return;
      const rect = stage.getBoundingClientRect();
      const scale = rect.width / 1920;
      const dx = (e.clientX - gDragStart.x) / scale;
      const dy = (e.clientY - gDragStart.y) / scale;

      // Undo: DRAG_THRESHOLD 초과 시 1회만
      if (!gUndoPushed && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
        pushUndo();
        gUndoPushed = true;
      }

      let newLeft = gElStart.left + dx;
      let newTop = gElStart.top + dy;

      const count = dragGuide.dataset.count;
      const isVert = dragGuide.classList.contains('vert');
      const gW = parseInt(dragGuide.style.width) || 0;
      const gH = parseInt(dragGuide.style.height) || 0;
      const siblings = [...stage.querySelectorAll(
        `.guide[data-count="${count}"]${isVert ? '.vert' : ':not(.vert)'}`)
      ].filter(g => g !== dragGuide && g.style.display !== 'none');

      // 스냅 포인트 수집
      const xs = [960]; // 스테이지 중앙
      const ys = [540];
      siblings.forEach(s => {
        const sl = parseInt(s.style.left), st = parseInt(s.style.top);
        const sw = parseInt(s.style.width) || 0, sh = parseInt(s.style.height) || 0;
        xs.push(sl, sl + sw, sl + sw / 2);
        ys.push(st, st + sh, st + sh / 2);
      });
      // 대칭 스냅 포인트 (거리 라벨 표시하지 않음)
      const symXs = [], symYs = [];
      // 모든 보이는 가이드 엣지+중심도 수집 (다른 타입 포함)
      stage.querySelectorAll('.guide').forEach(g => {
        if (g === dragGuide || g.style.display === 'none') return;
        if (getComputedStyle(g).display === 'none') return;
        const gl = parseInt(g.style.left) || 0, gt = parseInt(g.style.top) || 0;
        const gw = parseInt(g.style.width) || 0, gh = parseInt(g.style.height) || 0;
        xs.push(gl, gl + gw, gl + gw / 2);
        ys.push(gt, gt + gh, gt + gh / 2);
        // 대칭 스냅: 별도 배열로 분리 (거리 라벨 방지)
        const symX1 = 1920 - gl, symX2 = 1920 - (gl + gw);
        const symY1 = 1080 - gt, symY2 = 1080 - (gt + gh);
        if (symX1 > 0 && symX1 < 1920) symXs.push(symX1);
        if (symX2 > 0 && symX2 < 1920) symXs.push(symX2);
        if (symY1 > 0 && symY1 < 1080) symYs.push(symY1);
        if (symY2 > 0 && symY2 < 1080) symYs.push(symY2);
      });

      // 가이드 엣지/중앙 → 스냅 매칭
      let snappedX = null, snappedY = null;
      let isSymSnapX = false, isSymSnapY = false;
      const gEdgesX = [newLeft, newLeft + gW / 2, newLeft + gW];
      const gEdgesY = [newTop, newTop + gH / 2, newTop + gH];

      for (const ex of gEdgesX) {
        for (const sx of xs) {
          if (Math.abs(ex - sx) < SNAP_THRESHOLD) {
            newLeft += sx - ex;
            snappedX = sx;
            break;
          }
        }
        if (snappedX !== null) break;
      }
      for (const ey of gEdgesY) {
        for (const sy of ys) {
          if (Math.abs(ey - sy) < SNAP_THRESHOLD) {
            newTop += sy - ey;
            snappedY = sy;
            break;
          }
        }
        if (snappedY !== null) break;
      }
      // 대칭 스냅 매칭 (일반 스냅 실패 시에만)
      if (snappedX === null) {
        const symEdgesX = [newLeft, newLeft + gW / 2, newLeft + gW];
        for (const ex of symEdgesX) {
          for (const sx of symXs) {
            if (Math.abs(ex - sx) < SNAP_THRESHOLD) {
              newLeft += sx - ex;
              snappedX = sx;
              isSymSnapX = true;
              break;
            }
          }
          if (snappedX !== null) break;
        }
      }
      if (snappedY === null) {
        const symEdgesY = [newTop, newTop + gH / 2, newTop + gH];
        for (const ey of symEdgesY) {
          for (const sy of symYs) {
            if (Math.abs(ey - sy) < SNAP_THRESHOLD) {
              newTop += sy - ey;
              snappedY = sy;
              isSymSnapY = true;
              break;
            }
          }
          if (snappedY !== null) break;
        }
      }

      // 등간격 스냅 (기존 로직)
      if (siblings.length >= 2) {
        const prop = isVert ? 'top' : 'left';
        const current = prop === 'top' ? newTop : newLeft;
        const positions = siblings.map(s => parseInt(s.style[prop])).sort((a,b) => a - b);
        for (let i = 0; i < positions.length - 1; i++) {
          const gap = positions[i+1] - positions[i];
          const snapBefore = positions[0] - gap;
          if (Math.abs(current - snapBefore) < SNAP_THRESHOLD) {
            if (prop === 'top') { newTop = snapBefore; snappedY = snapBefore; } else { newLeft = snapBefore; snappedX = snapBefore; }
          }
          const snapAfter = positions[positions.length-1] + gap;
          if (Math.abs(current - snapAfter) < SNAP_THRESHOLD) {
            if (prop === 'top') { newTop = snapAfter; snappedY = snapAfter; } else { newLeft = snapAfter; snappedX = snapAfter; }
          }
          for (let j = 0; j < positions.length; j++) {
            const snapMid = positions[j] + gap;
            if (Math.abs(current - snapMid) < SNAP_THRESHOLD) {
              if (prop === 'top') { newTop = snapMid; snappedY = snapMid; } else { newLeft = snapMid; snappedX = snapMid; }
            }
          }
        }
      }

      // 스냅 가이드라인 표시
      const overlay = document.getElementById('guide-snap-overlay');
      overlay.innerHTML = '';

      if (snappedX !== null) {
        snapXEl.style.left = snappedX + 'px';
        snapXEl.style.display = 'block';
        snapXEl.classList.toggle('center-snap', snappedX === 960);
      } else {
        snapXEl.style.display = 'none';
        snapXEl.classList.remove('center-snap');
      }
      if (snappedY !== null) {
        snapYEl.style.top = snappedY + 'px';
        snapYEl.style.display = 'block';
        snapYEl.classList.toggle('center-snap', snappedY === 540);
      } else {
        snapYEl.style.display = 'none';
        snapYEl.classList.remove('center-snap');
      }

      // 엣지 정렬 매칭 하이라이트
      if (snappedX !== null && snappedX !== 960) {
        siblings.forEach(s => {
          const sl = parseInt(s.style.left), sw = parseInt(s.style.width) || 0;
          [sl, sl + sw].forEach(edge => {
            if (edge === snappedX) {
              const st = parseInt(s.style.top), sh = parseInt(s.style.height) || 0;
              const mark = document.createElement('div');
              mark.className = 'gs-edge-mark';
              mark.style.cssText = `left:${edge - 1}px; top:${st}px; width:2px; height:${sh || 1080}px;`;
              overlay.appendChild(mark);
            }
          });
        });
      }
      if (snappedY !== null && snappedY !== 540) {
        siblings.forEach(s => {
          const st = parseInt(s.style.top), sh = parseInt(s.style.height) || 0;
          [st, st + sh].forEach(edge => {
            if (edge === snappedY) {
              const sl = parseInt(s.style.left), sw = parseInt(s.style.width) || 0;
              const mark = document.createElement('div');
              mark.className = 'gs-edge-mark';
              mark.style.cssText = `top:${edge - 1}px; left:${sl}px; height:2px; width:${sw || 1920}px;`;
              overlay.appendChild(mark);
            }
          });
        });
      }

      // 등간격 스냅 거리 표시
      let hasEqualSpacing = false;
      if (siblings.length >= 2) {
        const prop = isVert ? 'top' : 'left';
        const sizeProp = isVert ? 'height' : 'width';
        const current = prop === 'top' ? Math.round(newTop) : Math.round(newLeft);
        const allPos = [...siblings.map(s => parseInt(s.style[prop])), current].sort((a, b) => a - b);
        const gaps = [];
        for (let i = 0; i < allPos.length - 1; i++) gaps.push(allPos[i + 1] - allPos[i]);
        const isEqualSpacing = gaps.length >= 2 && gaps.every(g => Math.abs(g - gaps[0]) < 3);
        if (isEqualSpacing) {
          hasEqualSpacing = true;
          for (let i = 0; i < allPos.length - 1; i++) {
            const gap = allPos[i + 1] - allPos[i];
            const el = document.createElement('div');
            el.className = 'gs-spacing';
            if (isVert) {
              const lineEl = document.createElement('div');
              lineEl.className = 'gs-spacing-line';
              lineEl.style.cssText = `left:${Math.round(newLeft) + (gW / 2) - 10}px; top:${allPos[i]}px; width:0; height:${gap}px; border-left:1px dashed rgba(255,60,210,0.7);`;
              overlay.appendChild(lineEl);
              const label = document.createElement('div');
              label.className = 'gs-spacing-label';
              label.textContent = `${gap}px`;
              label.style.cssText = `left:${Math.round(newLeft) + (gW / 2) + 4}px; top:${allPos[i] + gap / 2 - 8}px;`;
              overlay.appendChild(label);
            } else {
              const lineEl = document.createElement('div');
              lineEl.className = 'gs-spacing-line';
              lineEl.style.cssText = `top:${Math.round(newTop) + (gH / 2) - 10}px; left:${allPos[i]}px; height:0; width:${gap}px; border-top:1px dashed rgba(255,60,210,0.7);`;
              overlay.appendChild(lineEl);
              const label = document.createElement('div');
              label.className = 'gs-spacing-label';
              label.textContent = `${gap}px`;
              label.style.cssText = `top:${Math.round(newTop) + (gH / 2) + 4}px; left:${allPos[i] + gap / 2 - 16}px;`;
              overlay.appendChild(label);
            }
          }
        }
      }

      // 일반 스냅 시 간격(px) 표시 (등간격이 아닐 때만)
      if (!hasEqualSpacing) {
        const rl = Math.round(newLeft), rt = Math.round(newTop);
        const allVisible = [...stage.querySelectorAll('.guide')].filter(g => g !== dragGuide && g.style.display !== 'none' && getComputedStyle(g).display !== 'none');
        if (snappedX !== null && snappedX !== 960 && !isSymSnapX) {
          // 드래그 가이드의 스냅 엣지와 매칭 가이드 사이 수직 거리
          const dragEdges = [rt, rt + gH];
          allVisible.forEach(g => {
            const gt = parseInt(g.style.top) || 0, gh = parseInt(g.style.height) || 0;
            const gl = parseInt(g.style.left) || 0, gw = parseInt(g.style.width) || 0;
            if ([gl, gl + gw, gl + gw / 2].some(x => Math.abs(x - snappedX) < 2)) {
              const targetEdges = [gt, gt + gh];
              for (const de of dragEdges) {
                for (const te of targetEdges) {
                  const dist = Math.abs(de - te);
                  if (dist > 0 && dist < 600) {
                    const minY = Math.min(de, te), maxY = Math.max(de, te);
                    const lineEl = document.createElement('div');
                    lineEl.className = 'gs-spacing-line';
                    lineEl.style.cssText = `left:${snappedX}px; top:${minY}px; width:0; height:${dist}px; border-left:1px dashed rgba(255,60,210,0.5);`;
                    overlay.appendChild(lineEl);
                    const label = document.createElement('div');
                    label.className = 'gs-spacing-label';
                    label.textContent = `${Math.round(dist)}px`;
                    label.style.cssText = `left:${snappedX + 6}px; top:${minY + dist / 2 - 8}px;`;
                    overlay.appendChild(label);
                    return; // 가장 가까운 하나만
                  }
                }
              }
            }
          });
        }
        if (snappedY !== null && snappedY !== 540 && !isSymSnapY) {
          const dragEdges = [rl, rl + gW];
          allVisible.forEach(g => {
            const gl = parseInt(g.style.left) || 0, gw = parseInt(g.style.width) || 0;
            const gt = parseInt(g.style.top) || 0, gh = parseInt(g.style.height) || 0;
            if ([gt, gt + gh, gt + gh / 2].some(y => Math.abs(y - snappedY) < 2)) {
              const targetEdges = [gl, gl + gw];
              for (const de of dragEdges) {
                for (const te of targetEdges) {
                  const dist = Math.abs(de - te);
                  if (dist > 0 && dist < 600) {
                    const minX = Math.min(de, te), maxX = Math.max(de, te);
                    const lineEl = document.createElement('div');
                    lineEl.className = 'gs-spacing-line';
                    lineEl.style.cssText = `top:${snappedY}px; left:${minX}px; height:0; width:${dist}px; border-top:1px dashed rgba(255,60,210,0.5);`;
                    overlay.appendChild(lineEl);
                    const label = document.createElement('div');
                    label.className = 'gs-spacing-label';
                    label.textContent = `${Math.round(dist)}px`;
                    label.style.cssText = `top:${snappedY + 6}px; left:${minX + dist / 2 - 16}px;`;
                    overlay.appendChild(label);
                    return;
                  }
                }
              }
            }
          });
        }
      }

      // 중앙선 거리 표시 (항상, 파란색 — 대칭 스냅 시 제외)
      if (!isSymSnapX && !isSymSnapY) {
        const rl = Math.round(newLeft), rt = Math.round(newTop);
        const midY = rt + gH / 2, midX = rl + gW / 2;
        const distLeft = 960 - rl, distRight = (rl + gW) - 960;
        const distTop = 540 - rt, distBottom = (rt + gH) - 540;
        if (distLeft > 0) {
          const ln = document.createElement('div');
          ln.className = 'gs-center-line';
          ln.style.cssText = `left:${rl}px; top:${midY}px; width:${distLeft}px; height:0; border-top:1px dashed rgba(0,120,255,0.6);`;
          overlay.appendChild(ln);
          const lb = document.createElement('div');
          lb.className = 'gs-center-label';
          lb.textContent = `${distLeft}px`;
          lb.style.cssText = `left:${rl + distLeft / 2 - 16}px; top:${midY - 16}px;`;
          overlay.appendChild(lb);
        }
        if (distRight > 0) {
          const ln = document.createElement('div');
          ln.className = 'gs-center-line';
          ln.style.cssText = `left:${960}px; top:${midY}px; width:${distRight}px; height:0; border-top:1px dashed rgba(0,120,255,0.6);`;
          overlay.appendChild(ln);
          const lb = document.createElement('div');
          lb.className = 'gs-center-label';
          lb.textContent = `${distRight}px`;
          lb.style.cssText = `left:${960 + distRight / 2 - 16}px; top:${midY - 16}px;`;
          overlay.appendChild(lb);
        }
        if (distTop > 0) {
          const ln = document.createElement('div');
          ln.className = 'gs-center-line';
          ln.style.cssText = `top:${rt}px; left:${midX}px; height:${distTop}px; width:0; border-left:1px dashed rgba(0,120,255,0.6);`;
          overlay.appendChild(ln);
          const lb = document.createElement('div');
          lb.className = 'gs-center-label';
          lb.textContent = `${distTop}px`;
          lb.style.cssText = `top:${rt + distTop / 2 - 8}px; left:${midX + 6}px;`;
          overlay.appendChild(lb);
        }
        if (distBottom > 0) {
          const ln = document.createElement('div');
          ln.className = 'gs-center-line';
          ln.style.cssText = `top:${540}px; left:${midX}px; height:${distBottom}px; width:0; border-left:1px dashed rgba(0,120,255,0.6);`;
          overlay.appendChild(ln);
          const lb = document.createElement('div');
          lb.className = 'gs-center-label';
          lb.textContent = `${distBottom}px`;
          lb.style.cssText = `top:${540 + distBottom / 2 - 8}px; left:${midX + 6}px;`;
          overlay.appendChild(lb);
        }
      }

      dragGuide.style.left = Math.round(newLeft) + 'px';
      dragGuide.style.top = Math.round(newTop) + 'px';

      // 드래그 중 가이드 십자선
      let chH = document.getElementById('gs-crosshair-h');
      let chV = document.getElementById('gs-crosshair-v');
      if (!chH) { chH = document.createElement('div'); chH.id = 'gs-crosshair-h'; chH.className = 'gs-crosshair-h'; stage.appendChild(chH); }
      if (!chV) { chV = document.createElement('div'); chV.id = 'gs-crosshair-v'; chV.className = 'gs-crosshair-v'; stage.appendChild(chV); }
      const centerX = Math.round(newLeft) + gW / 2;
      const centerY = Math.round(newTop) + gH / 2;
      chH.style.top = centerY + 'px'; chH.style.display = 'block';
      chV.style.left = centerX + 'px'; chV.style.display = 'block';
    });

    document.addEventListener('mouseup', () => {
      if (dragGuide && gUndoPushed) {
        // 가이드 위치가 변경됨 → 저장
        if (dirHandle) {
          saveToFile();
        } else {
          ensureDirHandle().then(ok => { if (ok) saveToFile(); });
        }
      }
      dragGuide = null;
      snapXEl.style.display = 'none';
      snapYEl.style.display = 'none';
      snapXEl.classList.remove('center-snap');
      snapYEl.classList.remove('center-snap');
      document.getElementById('guide-snap-overlay').innerHTML = '';
      const chH = document.getElementById('gs-crosshair-h');
      const chV = document.getElementById('gs-crosshair-v');
      if (chH) chH.style.display = 'none';
      if (chV) chV.style.display = 'none';
    });
  })();

  // 오버뷰
  const overview = document.getElementById('overview');
  const ovGrid = document.getElementById('overview-grid');

  let ovDragItem = null, ovDragFromIdx = -1, ovDragGhost = null, ovDragDropIdx = -1;

  function buildOverview() {
    ovGrid.innerHTML = '';
    slides.forEach((slide, slideIdx) => {
      const isCurrent = slideIdx === currentSlide;
      const item = document.createElement('div');
      item.className = 'ov-item' + (isCurrent ? ' current' : '');
      item._slideIdx = slideIdx;

      const thumb = document.createElement('div');
      thumb.className = 'ov-thumb';
      const clone = slide.cloneNode(true);
      clone.className = 'slide';
      clone.style.cssText = 'position:relative; width:1920px; height:1080px; opacity:1; transform:none; pointer-events:none;';
      applyStepState(clone, getSteps(slide) - 1);
      thumb.appendChild(clone);

      const num = document.createElement('div');
      num.className = 'ov-num';
      num.textContent = `${slideIdx + 1}`;

      item.appendChild(thumb);
      item.appendChild(num);
      item.addEventListener('click', (e) => {
        if (ovDragItem) return;
        e.stopPropagation();
        overview.classList.remove('visible');
        goToSlide(slideIdx);
      });
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showSlideContextMenu(e.clientX, e.clientY, slideIdx);
      });
      item.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        ovDragFromIdx = slideIdx;
        ovDragDropIdx = slideIdx;
        const startX = e.clientX, startY = e.clientY;
        let started = false;

        const onMove = (ev) => {
          const dx = ev.clientX - startX, dy = ev.clientY - startY;
          if (!started && Math.abs(dx) + Math.abs(dy) < 8) return;
          if (!started) {
            started = true;
            ovDragItem = item;
            item.style.opacity = '0.4';
            ovDragGhost = item.cloneNode(true);
            ovDragGhost.style.cssText = 'position:fixed;z-index:100000;pointer-events:none;opacity:0.8;width:' + item.offsetWidth + 'px;';
            document.body.appendChild(ovDragGhost);
          }
          ovDragGhost.style.left = (ev.clientX - item.offsetWidth / 2) + 'px';
          ovDragGhost.style.top = (ev.clientY - 40) + 'px';
          // drop 위치 계산
          const items = [...ovGrid.querySelectorAll('.ov-item')];
          let dropIdx = items.length;
          for (let i = 0; i < items.length; i++) {
            const r = items[i].getBoundingClientRect();
            const midX = r.left + r.width / 2;
            const midY = r.top + r.height / 2;
            if (ev.clientY < r.bottom && ev.clientY > r.top && ev.clientX < midX) { dropIdx = i; break; }
            if (ev.clientY < midY) { dropIdx = i; break; }
          }
          ovDragDropIdx = dropIdx;
          // 드롭 인디케이터
          items.forEach(it => it.classList.remove('ov-drop-before'));
          if (dropIdx < items.length) items[dropIdx].classList.add('ov-drop-before');
        };

        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          document.documentElement.removeEventListener('mouseleave', onUp);
          if (ovDragGhost) { ovDragGhost.remove(); ovDragGhost = null; }
          ovGrid.querySelectorAll('.ov-drop-before').forEach(it => it.classList.remove('ov-drop-before'));
          if (ovDragItem) {
            ovDragItem.style.opacity = '';
            const from = ovDragFromIdx;
            const to = ovDragDropIdx > from ? ovDragDropIdx - 1 : ovDragDropIdx;
            if (from !== to) {
              reorderSlide(from, to);
              buildOverview();
            }
            ovDragItem = null;
          }
          ovDragFromIdx = -1;
          ovDragDropIdx = -1;
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        document.documentElement.addEventListener('mouseleave', onUp);
      });
      ovGrid.appendChild(item);
    });
  }

  // ── 슬라이드 우클릭 메뉴 ──
  let _ctxMenu = null;
  function hideSlideContextMenu() { if (_ctxMenu) { _ctxMenu.remove(); _ctxMenu = null; } }
  function showSlideContextMenu(x, y, idx) {
    hideSlideContextMenu();
    const menu = document.createElement('div');
    menu.style.cssText = 'position:fixed;z-index:100000;background:#2a2a2a;border:1px solid #555;border-radius:6px;padding:4px 0;min-width:140px;box-shadow:0 4px 16px rgba(0,0,0,.5);font:14px/1 "Pretendard","Noto Sans KR",sans-serif;color:#eee;';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    const delBtn = document.createElement('div');
    delBtn.textContent = '슬라이드 삭제';
    delBtn.style.cssText = 'padding:8px 16px;cursor:pointer;';
    delBtn.addEventListener('mouseenter', () => delBtn.style.background = '#c0392b');
    delBtn.addEventListener('mouseleave', () => delBtn.style.background = 'none');
    delBtn.addEventListener('click', () => {
      hideSlideContextMenu();
      if (slides.length <= 1) return;
      deleteSlide(idx);
      buildOverview();
    });
    menu.appendChild(delBtn);
    document.body.appendChild(menu);
    _ctxMenu = menu;
    setTimeout(() => {
      const close = (e) => { if (!menu.contains(e.target)) { hideSlideContextMenu(); document.removeEventListener('mousedown', close); } };
      document.addEventListener('mousedown', close);
    }, 0);
  }

  function toggleOverview() {
    if (overview.classList.contains('visible')) {
      overview.classList.remove('visible');
    } else {
      buildOverview();
      overview.classList.add('visible');
    }
  }

  // ── 환경 감지 ──
  const isGitHubPages = location.hostname.endsWith('.github.io');

  // ── 토스트 알림 ──
  function showToast(msg, duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:999999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = 'background:#333;color:#fff;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:700;opacity:0;transition:opacity 0.3s;pointer-events:auto;';
    container.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ── 탭 잠금 (동시 편집 방지) ──
  const _tabId = Math.random().toString(36).slice(2);
  let _tabLockChannel = null;
  let _tabLockOwner = null;
  let _tabLockFallback = false;
  const _tabLockKey = 'slide-tab-lock-' + (location.pathname.split('/').pop() || 'slides');

  function _initTabLock() {
    if (typeof BroadcastChannel !== 'undefined') {
      _tabLockChannel = new BroadcastChannel(_tabLockKey);
      _tabLockChannel.onmessage = e => {
        if (e.data.tabId === _tabId) return;
        if (e.data.type === 'lock') _tabLockOwner = e.data.tabId;
        else if (e.data.type === 'unlock') { if (_tabLockOwner === e.data.tabId) _tabLockOwner = null; }
        else if (e.data.type === 'ping' && editMode) {
          _tabLockChannel.postMessage({ type: 'lock', tabId: _tabId });
        }
      };
    } else {
      _tabLockFallback = true;
      window.addEventListener('storage', e => {
        if (e.key !== _tabLockKey || !e.newValue) return;
        try {
          const val = JSON.parse(e.newValue);
          if (val.tabId === _tabId) return;
          _tabLockOwner = val.type === 'lock' ? val.tabId : null;
        } catch(_) {}
      });
    }
  }

  async function acquireTabLock() {
    // ping으로 다른 편집 중인 탭 확인 (150ms 대기)
    _tabLockOwner = null;
    if (_tabLockChannel) _tabLockChannel.postMessage({ type: 'ping', tabId: _tabId });
    await new Promise(r => setTimeout(r, 150));
    if (_tabLockOwner) return false;
    // 잠금 획득
    _tabLockOwner = _tabId;
    const msg = { type: 'lock', tabId: _tabId };
    if (_tabLockChannel) _tabLockChannel.postMessage(msg);
    else if (_tabLockFallback) localStorage.setItem(_tabLockKey, JSON.stringify(msg));
    return true;
  }

  function releaseTabLock() {
    const msg = { type: 'unlock', tabId: _tabId };
    if (_tabLockChannel) _tabLockChannel.postMessage(msg);
    else if (_tabLockFallback) localStorage.setItem(_tabLockKey, JSON.stringify(msg));
    _tabLockOwner = null;
  }

  _initTabLock();
  window.addEventListener('beforeunload', (e) => {
    if (editMode) {
      releaseTabLock();
      if (isGitHubPages && typeof ghIsDirty === 'function' && ghIsDirty()) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
  });

  // ── IndexedDB 핸들 저장 ──
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('slide-editor', 1);
      req.onupgradeneeded = e => e.target.result.createObjectStore('handles');
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  }
  async function storeHandle(handle) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put(handle, 'dir');
      tx.oncomplete = resolve;
      tx.onerror = e => reject(e.target.error);
    });
  }
  async function loadHandle() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('handles', 'readonly');
      const req = tx.objectStore('handles').get('dir');
      req.onsuccess = e => resolve(e.target.result || null);
      req.onerror = e => reject(e.target.error);
    });
  }

  // ── 파일 저장 ──
  let dirHandle = null;
  let imgDirHandle = null;
  let autoSaveTimer = null;
  let lastSaveTime = 0; // 마지막 저장 시각 (ms)
  let isSaving = false;

  async function ensureDirHandle() {
    if (isGitHubPages) return true;
    if (dirHandle) return true;
    // 1. IndexedDB에서 저장된 핸들 복원 시도
    try {
      const saved = await loadHandle();
      if (saved) {
        let perm = await saved.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') perm = await saved.requestPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          dirHandle = saved;
          imgDirHandle = await saved.getDirectoryHandle('images', { create: true });
          try {
            const f = await saved.getFileHandle(location.pathname.split('/').pop() || 'slides.html');
            lastSaveTime = (await f.getFile()).lastModified;
          } catch(e) {}
          return true;
        }
      }
    } catch(e) { /* fallthrough */ }
    // 2. showDirectoryPicker
    try {
      const h = await window.showDirectoryPicker({ mode: 'readwrite' });
      const htmlFileName = location.pathname.split('/').pop() || 'slides.html';
      await h.getFileHandle(htmlFileName);
      dirHandle = h;
      imgDirHandle = await h.getDirectoryHandle('images', { create: true });
      try {
        const f = await h.getFileHandle(htmlFileName);
        lastSaveTime = (await f.getFile()).lastModified;
      } catch(e) {}
      storeHandle(h).then(() => navigator.storage.persist().catch(() => {})).catch(() => {});
      return true;
    } catch(e) {
      return false;
    }
  }

  function escHTML(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getCleanHTML() {
    selectedEls.forEach(s => { s.classList.remove('edit-selected'); s.classList.remove('edit-group-selected'); });
    const backedUpChildSelected = [...document.querySelectorAll('.child-selected')];
    const backedUpGroupEntered = [...document.querySelectorAll('.group-entered-parent')];
    backedUpChildSelected.forEach(el => el.classList.remove('child-selected'));
    backedUpGroupEntered.forEach(el => el.classList.remove('group-entered-parent'));
    const backedUpDrillChild = [...document.querySelectorAll('.drill-child-selected')];
    backedUpDrillChild.forEach(el => el.classList.remove('drill-child-selected'));
    const backedUpAnimReady = [...document.querySelectorAll('.anim-ready')];
    backedUpAnimReady.forEach(el => el.classList.remove('anim-ready'));
    // pushup 일시 클래스 제거 (저장 시 불필요)
    const backedUpPushExit = [...document.querySelectorAll('.push-exit')];
    const backedUpPushEnter = [...document.querySelectorAll('.push-enter')];
    backedUpPushExit.forEach(el => el.classList.remove('push-exit'));
    backedUpPushEnter.forEach(el => el.classList.remove('push-enter'));
    const backedUpDrillActive = [...document.querySelectorAll('.drill-active')];
    backedUpDrillActive.forEach(el => el.classList.remove('drill-active'));
    const coordPanel = document.getElementById('coord-panel');
    const hadCoordDisplay = coordPanel.style.display;
    coordPanel.style.display = 'none';
    const fontPanel = document.getElementById('font-panel');
    const hadFontVisible = fontPanel.classList.contains('visible');
    fontPanel.classList.remove('visible');
    document.body.classList.remove('edit-mode');
    // show-guide 클래스 백업 & 제거
    const guideClasses = [...document.body.classList].filter(c => c.startsWith('show-guide'));
    guideClasses.forEach(c => document.body.classList.remove(c));
    // guide-btn active 상태 & 텍스트 백업 & 초기화
    const guideBtnBackup = [];
    document.querySelectorAll('#guide-toolbar .guide-btn').forEach(btn => {
      guideBtnBackup.push({ el: btn, hadActive: btn.classList.contains('active'), text: btn.textContent });
      btn.classList.remove('active');
      if (btn.dataset.target !== 'title') btn.textContent = btn.dataset.target;
    });

    // 슬라이드 상태 스냅샷 → 저장용 초기화 (slide1/step0만 active)
    const snapSlides = Array.from(slides).map(s => ({
      el: s,
      active: s.classList.contains('active'),
      leaveLeft: s.classList.contains('leave-left'),
      layers: Array.from(s.querySelectorAll('.step-layer')).map(l => ({
        el: l, visible: l.classList.contains('visible')
      }))
    }));
    const hadDim = dimOuter.classList.contains('on');

    slides.forEach(s => s.classList.remove('active', 'leave-left', 'enter-from-left'));
    slides[0].classList.add('active');
    document.querySelectorAll('.step-layer').forEach(l => l.classList.remove('visible'));
    dimOuter.classList.remove('on');
    document.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    const animShownEls = Array.from(document.querySelectorAll('.anim-shown'));
    animShownEls.forEach(el => el.classList.remove('anim-shown'));

    const ovGrid = document.getElementById('overview-grid');
    const ovChildren = [...ovGrid.childNodes];
    ovChildren.forEach(c => c.remove());
    const fsInner = document.getElementById('filmstrip-inner');
    const fsChildren = [...fsInner.childNodes];
    fsChildren.forEach(c => c.remove());

    // 빈 step-dim만 있는 step-layer 제거 + data-steps 재계산 (저장 시만, 복원됨)
    const removedLayers = [];
    const origSteps = [];
    slides.forEach(s => {
      origSteps.push({ el: s, steps: s.dataset.steps });
      s.querySelectorAll('.step-layer').forEach(l => {
        if (l.children.length === 1 && l.children[0].classList.contains('step-dim')) {
          removedLayers.push({ parent: s, layer: l, next: l.nextSibling });
          l.remove();
        }
      });
      let maxStep = 0;
      s.querySelectorAll('.step-layer').forEach(l => {
        maxStep = Math.max(maxStep, parseInt(l.dataset.step) || 0);
      });
      s.dataset.steps = String(maxStep + 1);
    });

    const html = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;

    // 제거한 레이어 복원
    removedLayers.forEach(r => r.parent.insertBefore(r.layer, r.next));
    origSteps.forEach(o => o.el.dataset.steps = o.steps);

    fsChildren.forEach(c => fsInner.appendChild(c));
    ovChildren.forEach(c => ovGrid.appendChild(c));

    // 원래 상태 복원
    slides.forEach(s => s.classList.remove('active', 'leave-left', 'enter-from-left'));
    snapSlides.forEach(snap => {
      if (snap.active) snap.el.classList.add('active');
      if (snap.leaveLeft) snap.el.classList.add('leave-left');
      snap.layers.forEach(lsnap => {
        lsnap.el.classList.remove('visible');
        if (lsnap.visible) lsnap.el.classList.add('visible');
      });
    });
    if (hadDim) dimOuter.classList.add('on');
    animShownEls.forEach(el => el.classList.add('anim-shown'));
    coordPanel.style.display = hadCoordDisplay;
    if (hadFontVisible) fontPanel.classList.add('visible');
    if (editMode) document.body.classList.add('edit-mode');
    guideClasses.forEach(c => document.body.classList.add(c));
    guideBtnBackup.forEach(b => { if (b.hadActive) b.el.classList.add('active'); b.el.textContent = b.text; });
    selectedEls.forEach(s => {
      if (individualMode && s === selectedEl) s.classList.add('edit-selected');
      else if (s.dataset.group && !individualMode) s.classList.add('edit-group-selected');
      else s.classList.add('edit-selected');
    });
    backedUpChildSelected.forEach(el => el.classList.add('child-selected'));
    backedUpGroupEntered.forEach(el => el.classList.add('group-entered-parent'));
    backedUpDrillChild.forEach(el => el.classList.add('drill-child-selected'));
    backedUpAnimReady.forEach(el => el.classList.add('anim-ready'));
    backedUpPushExit.forEach(el => el.classList.add('push-exit'));
    backedUpPushEnter.forEach(el => el.classList.add('push-enter'));
    backedUpDrillActive.forEach(el => el.classList.add('drill-active'));
    return html;
  }

  function showSaveStatus() {
    const el = document.getElementById('save-status');
    const now = new Date();
    const hhmm = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    el.textContent = '  ✓ 저장됨 ' + hhmm;
    setTimeout(() => { el.textContent = ''; }, 2000);
  }

  async function saveToFile(force) {
    if (isGitHubPages) { await ghSaveToFile(force); return; }
    if (!dirHandle || isSaving) return;
    isSaving = true;
    // EF11: 저장 전 외부 변경 감지
    try {
      const externallyChanged = await checkFileChanged();
      if (externallyChanged) {
        const choice = confirm('⚠️ 파일이 외부에서 변경되었습니다.\n\n확인 = 내 편집 유지 (덮어쓰기)\n취소 = 외부 변경 로드 (새로고침)');
        if (!choice) { isSaving = false; location.reload(); return; }
      }
    } catch(_) { /* 감지 실패 시 저장 진행 */ }
    let writable;
    try {
      const content = getCleanHTML();
      const htmlFileName = location.pathname.split('/').pop() || 'slides.html';
      const fileHandle = await dirHandle.getFileHandle(htmlFileName, { create: true });
      writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      showSaveStatus();
      lastSaveTime = Date.now();
    } catch(e) {
      console.error(e);
      if (writable) try { await writable.abort(); } catch(_) {}
    } finally {
      isSaving = false;
    }
  }

  async function checkFileChanged() {
    if (!dirHandle) return false;
    try {
      const htmlFileName = location.pathname.split('/').pop() || 'slides.html';
      const fileHandle = await dirHandle.getFileHandle(htmlFileName);
      const file = await fileHandle.getFile();
      if (lastSaveTime > 0 && file.lastModified > lastSaveTime) return true;
    } catch(e) { /* ignore */ }
    return false;
  }

  // ── GitHub 저장 (Contents API) ──
  const GH_REPO = 'lst9485-alt/cdn-assets';
  const GH_TOKEN_KEY = 'gh-save-token';
  const GH_AUTO_SAVE_INTERVAL = 30000;

  // GitHub Pages CDN 캐시(10분) 때문에 저장 직후 새로고침 시 이전 버전이 보임
  // document.write() 방식은 슬라이드 중복 위험 → 제거. 사용자에게 대기 안내.

  let _ghToken = null;
  let _ghFileSha = null;
  let _ghDirty = false;
  let _ghSaving = false;

  function ghGetToken() {
    if (_ghToken) return _ghToken;
    _ghToken = localStorage.getItem(GH_TOKEN_KEY);
    return _ghToken;
  }

  async function ghSetToken(token) {
    try {
      const res = await fetch(`https://api.github.com/repos/${GH_REPO}`, {
        headers: { 'Authorization': `token ${token}` }
      });
      if (!res.ok) return { ok: false, error: res.status === 401 ? '토큰이 유효하지 않습니다' : '레포 접근 실패 (' + res.status + ')' };
      _ghToken = token;
      localStorage.setItem(GH_TOKEN_KEY, token);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: '네트워크 오류' };
    }
  }

  function ghClearToken() {
    _ghToken = null;
    localStorage.removeItem(GH_TOKEN_KEY);
  }

  function _ghFilePath() {
    const filename = location.pathname.split('/').pop() || 'slides.html';
    // slide-viewer/ 하위 경로 추출
    const parts = location.pathname.split('/');
    const svIdx = parts.indexOf('slide-viewer');
    if (svIdx >= 0) return parts.slice(svIdx).join('/');
    return 'slide-viewer/' + filename;
  }

  async function ghFetchFileSha() {
    const token = ghGetToken();
    if (!token) return null;
    try {
      const res = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${_ghFilePath()}`, {
        headers: { 'Authorization': `token ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        _ghFileSha = data.sha;
        return data.sha;
      }
      if (res.status === 401) { ghHandleAuthError(); return null; }
      return null; // 404 = 새 파일
    } catch (e) {
      return null;
    }
  }

  async function ghSaveToFile(force) {
    if (_ghSaving) { if (force) showToast('저장 진행 중...', 2000); return; }
    if (!force && !_ghDirty) return;
    const token = ghGetToken();
    if (!token) { showToast('GitHub 토큰이 없습니다. ⚙ 아이콘을 눌러 설정하세요.', 4000); return; }
    _ghSaving = true;
    showToast('GitHub에 저장 중...', 2000);
    try {
      let content;
      try {
        content = getCleanHTML();
      } catch (htmlErr) {
        showToast('HTML 직렬화 오류: ' + htmlErr.message, 5000);
        return;
      }
      const encoded = btoa(unescape(encodeURIComponent(content)));
      const filename = location.pathname.split('/').pop() || 'slides.html';
      const filePath = _ghFilePath();

      // SHA가 없으면 먼저 조회
      if (!_ghFileSha) {
        await ghFetchFileSha();
      }

      const body = {
        message: `update: ${filename} via slide editor`,
        content: encoded,
        branch: 'main'
      };
      if (_ghFileSha) body.sha = _ghFileSha;

      const res = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${filePath}`, {
        method: 'PUT',
        headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();
        _ghFileSha = data.content.sha;
        _ghDirty = false;
        showToast('GitHub에 저장 완료! (반영까지 1~2분)', 3000);
        try { showSaveStatus(); } catch(_) {}
      } else if (res.status === 409 || res.status === 422) {
        await _ghHandleConflict(encoded, filePath);
      } else if (res.status === 401) {
        ghHandleAuthError();
      } else if (res.status === 403) {
        showToast('GitHub API 한도 초과 — 잠시 후 다시 시도됩니다', 4000);
      } else {
        const errBody = await res.text().catch(() => '');
        showToast('저장 실패 (' + res.status + '): ' + errBody.slice(0, 100), 5000);
      }
    } catch (e) {
      showToast('저장 오류: ' + e.message, 5000);
    } finally {
      _ghSaving = false;
    }
  }

  async function _ghHandleConflict(encoded, filePath) {
    // SHA 불일치 — 외부에서 수정됨
    const choice = confirm('⚠️ 파일이 외부에서 변경되었습니다.\n\n확인 = 내 편집 유지 (덮어쓰기)\n취소 = 외부 변경 로드 (새로고침)');
    if (!choice) { location.reload(); return; }
    // 최신 SHA로 직접 재시도 (ghSaveToFile 재호출 시 _ghSaving 잠금 문제 회피)
    await ghFetchFileSha();
    const token = ghGetToken();
    const body = {
      message: `update: ${filePath.split('/').pop()} via slide editor`,
      content: encoded,
      branch: 'main'
    };
    if (_ghFileSha) body.sha = _ghFileSha;
    try {
      const res = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${filePath}`, {
        method: 'PUT',
        headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json();
        _ghFileSha = data.content.sha;
        _ghDirty = false;
        showToast('GitHub에 저장 완료! (반영까지 1~2분)', 3000);
        try { showSaveStatus(); } catch(_) {}
      } else {
        showToast('재시도 실패 (' + res.status + ')', 4000);
      }
    } catch (e) {
      showToast('재시도 오류: ' + e.message, 4000);
    }
  }

  function ghHandleAuthError() {
    ghClearToken();
    showToast('GitHub 토큰이 만료되었습니다. 설정 아이콘을 눌러 다시 입력해주세요.', 5000);
  }

  function ghMarkDirty() { _ghDirty = true; }
  function ghIsDirty() { return _ghDirty; }

  // ── 텍스트 편집 시 dirty 감지 (contenteditable) ──
  if (isGitHubPages) {
    document.addEventListener('input', (e) => {
      if (e.target.closest && e.target.closest('[contenteditable]')) ghMarkDirty();
    });
  }

  // ── 토큰 설정 다이얼로그 ──
  function ghShowTokenDialog() {
    // 기존 다이얼로그 제거
    const old = document.getElementById('gh-token-dialog');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'gh-token-dialog';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:999999;display:flex;align-items:center;justify-content:center;';

    const box = document.createElement('div');
    box.style.cssText = 'background:#1a1a1a;color:#fff;padding:32px;border-radius:16px;max-width:480px;width:90%;font-family:sans-serif;';
    box.innerHTML = `
      <h2 style="margin:0 0 12px;font-size:20px;">GitHub 저장 설정</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#aaa;line-height:1.5;">
        슬라이드를 GitHub에 저장하려면 Personal Access Token이 필요합니다.<br>
        <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener"
           style="color:#FF6B00;">토큰 만들기</a>
        — lst9485-alt/cdn-assets 레포만 허용, Contents 읽기/쓰기 권한
      </p>
      <input id="gh-token-input" type="password" placeholder="ghp_xxxx 또는 github_pat_xxxx"
        style="width:100%;padding:12px;border:1px solid #444;border-radius:8px;background:#222;color:#fff;font-size:15px;box-sizing:border-box;margin-bottom:8px;">
      <div id="gh-token-error" style="color:#ff4444;font-size:13px;min-height:20px;margin-bottom:12px;"></div>
      <div style="display:flex;gap:12px;justify-content:flex-end;">
        <button id="gh-token-cancel" style="padding:10px 20px;border:1px solid #555;border-radius:8px;background:none;color:#aaa;cursor:pointer;font-size:14px;">취소</button>
        <button id="gh-token-save" style="padding:10px 20px;border:none;border-radius:8px;background:#FF6B00;color:#fff;cursor:pointer;font-size:14px;font-weight:700;">설정 완료</button>
      </div>
    `;
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // 이벤트
    overlay.addEventListener('click', (e) => { if (e.target === overlay) _ghCloseDialog(false); });
    document.getElementById('gh-token-cancel').addEventListener('click', () => _ghCloseDialog(false));
    document.getElementById('gh-token-save').addEventListener('click', async () => {
      const input = document.getElementById('gh-token-input');
      const errEl = document.getElementById('gh-token-error');
      const token = input.value.trim();
      if (!token) { errEl.textContent = '토큰을 입력해주세요'; return; }
      errEl.textContent = '확인 중...';
      errEl.style.color = '#aaa';
      const result = await ghSetToken(token);
      if (result.ok) {
        showToast('GitHub 토큰 설정 완료', 2000);
        _ghCloseDialog(true);
      } else {
        errEl.style.color = '#ff4444';
        errEl.textContent = result.error;
      }
    });
    // Enter 키
    document.getElementById('gh-token-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('gh-token-save').click();
    });
    document.getElementById('gh-token-input').focus();
  }

  function _ghCloseDialog(success) {
    const dialog = document.getElementById('gh-token-dialog');
    if (dialog) dialog.remove();
    document.dispatchEvent(new Event(success ? 'gh-token-set' : 'gh-token-cancel'));
  }

  // ── GitHub Pages에서 설정 아이콘 추가 ──
  if (isGitHubPages) {
    // DOM 준비 후 설정 아이콘 삽입
    const _ghAddSettingsIcon = () => {
      const saveBtn = document.getElementById('tb-save');
      if (!saveBtn) return;
      const icon = document.createElement('button');
      icon.className = 'tb-btn';
      icon.id = 'gh-settings';
      icon.title = 'GitHub 토큰 설정';
      icon.textContent = '⚙';
      icon.style.cssText = 'font-size:14px;min-width:28px;padding:0 4px;';
      icon.addEventListener('click', () => ghShowTokenDialog());
      saveBtn.after(icon);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _ghAddSettingsIcon);
    else _ghAddSettingsIcon();
  }

  // ── 편집 모드 ──
  const EDITABLE_SEL = '.bubble, .text-area, .bg-label, .slide-el, img, .emoji-icon, .section-badge, .corner-label, .step-dim, [data-type]';
  let editMode = false;
  let isEditing = false;
  let clipboardEl = null;
  let selectedEl = null;
  let selectedEls = [];
  let elAnchors = [];
  let isDragging = false;
  const CHILD_SEL = '.card-title, .card-desc, .card-num, .grid-title, .grid-desc, .grid-icon, .num-text, .num-badge, .check-text, .check-box, .bar-label, .bar-value, .bar-fill, .hbar-label, .hbar-val, .stat-num, .stat-label, .stat-detail-item, .icon-label, .icon-circle, .icon-flow-label, .flow-box, .flow-arrow, .alert-text, .alert-icon, .compare-header, .compare-item, .quote-text, .quote-source, .tag-chip, .tl-box, .tl-circle, .btn-pill, .cta-btn';
  let groupEntered = false;
  let groupParent = null;
  let pendingDrag = false;
  let pendingGroupEntry = null;
  let mouseDownPos = null;
  const DRAG_THRESHOLD = 5;
  let dragAnchor = null;
  let elAnchor = null;
  let layerDragPending = null;
  let layerDragStartY = 0;
  let layerDragItem = null;
  let layerOverItem = null;
  let fsDragItem = null, fsDragFromIdx = -1, fsDragStartX = 0, fsDragPending = null, fsDragDropIdx = -1;
  let fsDragGhost = null, fsDragDone = false;
  let layerOverPos = null;
  let layerDropLine = null;
  let layerTargetSection = 0;
  let isResizing = false;
  let resizeAnchorY = null;
  let resizeAnchorX = null;
  let resizeInitFontSizes = null;
  let resizeImgInit = null;
  let resizeCorner = null;
  let resizeEdge = null;
  let resizeImgInitRect = null;
  let resizeMultiInitRects = null;
  let groupCounter = 0;
  let individualMode = false;
  let layerActiveTab = 'animation'; // 'animation' | 'position'
  let expandedGroups = new Set();
  // ── 드래그 선택 박스 ──
  let selectBoxActive = false;
  let selectBoxOrigin = null;
  // ── Undo / Redo ──
  const undoStack = [];
  const redoStack = [];

  async function toggleEditMode() {
    // ── 진입 시 파일 변경 감지 ──
    if (!editMode && !isGitHubPages && dirHandle) {
      const changed = await checkFileChanged();
      if (changed) {
        const ok = confirm('⚠️ 파일이 외부에서 수정되었습니다.\n새로고침 후 다시 시도하세요.\n\n(확인 = 새로고침, 취소 = 무시하고 진입)');
        if (ok) { location.reload(); return; }
      }
    }
    // ── EF5: 동시 탭 편집 잠금 ──
    if (!editMode) {
      const locked = await acquireTabLock();
      if (!locked) {
        showToast('⚠️ 다른 탭에서 편집 중입니다. 편집 모드에 진입할 수 없습니다.', 4000);
        return;
      }
    }

    editMode = !editMode;
    document.body.classList.toggle('edit-mode', editMode);
    scaleStage();
    if (editMode) {
      // filmstrip이 stage 내부에 파싱될 수 있으므로 body 직속으로 이동
      const fs = document.getElementById('filmstrip');
      if (fs && fs.parentElement !== document.body) document.body.appendChild(fs);
      buildFilmstrip();
      buildLayerPanel();
      if (isGitHubPages) {
        // GitHub Pages: 토큰 확인 → 없으면 설정 다이얼로그
        if (!ghGetToken()) {
          ghShowTokenDialog();
          const tokenSet = await new Promise(resolve => {
            document.addEventListener('gh-token-set', () => resolve(true), { once: true });
            document.addEventListener('gh-token-cancel', () => resolve(false), { once: true });
          });
          if (!tokenSet) {
            editMode = false;
            document.body.classList.remove('edit-mode');
            document.getElementById('layer-panel').classList.remove('visible');
            return;
          }
        }
        await ghFetchFileSha();
      } else if (!dirHandle) {
        const ok = await ensureDirHandle();
        if (!ok) {
          editMode = false;
          document.body.classList.remove('edit-mode');
          document.getElementById('layer-panel').classList.remove('visible');
          return;
        }
      }
      if (autoSaveTimer) clearInterval(autoSaveTimer);
      autoSaveTimer = setInterval(saveToFile, isGitHubPages ? GH_AUTO_SAVE_INTERVAL : 10000);
      // ── 편집중 배지 표시 ──
      showEditBadge(true);
    } else {
      userZoom = 1; panX = 0; panY = 0;
      clearInterval(autoSaveTimer);
      autoSaveTimer = null;
      (isGitHubPages ? saveToFile() : saveToFile(true)).then(() => releaseTabLock());
      document.querySelectorAll('[data-group^="ag"]').forEach(el => delete el.dataset.group);
      // dim-handle 배지 제거
      document.querySelectorAll('.dim-handle').forEach(b => b.remove());
      // 프레젠테이션 상태 리셋
      currentStep = 0;
      currentOrder = 0;
      setDim(false);
      showStep(slides[currentSlide], 0);
      clearSelection();
      selectBoxActive = false;
      document.getElementById('select-box').style.display = 'none';
      undoStack.length = 0;
      redoStack.length = 0;
      document.getElementById('layer-panel').classList.remove('visible');
      // ── 편집중 배지 숨기기 ──
      showEditBadge(false);
    }
  }

  function showEditBadge(show) {
    let badge = document.getElementById('edit-mode-badge');
    if (show) {
      if (!badge) {
        badge = document.createElement('div');
        badge.id = 'edit-mode-badge';
        badge.textContent = isGitHubPages ? '편집중 — 자동저장 30초 (GitHub)' : '편집중 — 자동저장 10초';
        badge.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:99999;background:#FF6B00;color:#fff;padding:6px 18px;border-radius:8px;font-size:14px;font-weight:900;pointer-events:none;animation:editBadgeBlink 1.5s infinite;';
        document.body.appendChild(badge);
        if (!document.getElementById('edit-badge-style')) {
          const style = document.createElement('style');
          style.id = 'edit-badge-style';
          style.textContent = '@keyframes editBadgeBlink{0%,100%{opacity:1}50%{opacity:0.3}}';
          document.head.appendChild(style);
        }
      }
      badge.style.display = '';
    } else if (badge) {
      badge.style.display = 'none';
    }
  }

  function enterContentEditable(el, e) {
    pushUndo();
    isEditing = true;
    el.contentEditable = 'true';
    el.focus();
    if (e) {
      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (range) { const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range); }
    }
    const onKeydown = ev => {
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); el.blur(); }
      if ((ev.ctrlKey || ev.metaKey) && ev.key === 'z') { ev.preventDefault(); ev.stopPropagation(); el.blur(); ev.shiftKey ? doRedo() : doUndo(); }
    };
    el.addEventListener('keydown', onKeydown);
    el.addEventListener('blur', () => {
      el.removeAttribute('contenteditable');
      isEditing = false;
      el.removeEventListener('keydown', onKeydown);
    }, { once: true });
  }

  function exitGroup() {
    if (groupParent) { groupParent.classList.remove('group-entered-parent'); groupParent.querySelectorAll('.child-selected').forEach(c => c.classList.remove('child-selected')); }
    groupEntered = false;
    groupParent = null;
  }

  function clearSelection() {
    exitGroup();
    selectedEls.forEach(s => {
      s.classList.remove('edit-selected');
      s.classList.remove('edit-group-selected');
    });
    selectedEl = null;
    selectedEls = [];
    individualMode = false;
    document.body.classList.remove('individual-mode');
    isDragging = false;
    pendingDrag = false;
    document.getElementById('coord-panel').style.display = 'none';
    document.getElementById('font-panel').classList.remove('visible');
    document.querySelectorAll('.resize-handle').forEach(h => h.classList.remove('visible'));
    document.getElementById('multi-select-box').style.display = 'none';
    document.getElementById('group-box').style.display = 'none';
    updateGroupToolbar();
    document.getElementById('guide-snap-overlay').innerHTML = '';
    document.getElementById('snap-x').style.display = 'none';
    document.getElementById('snap-y').style.display = 'none';
  }

  function showGroupBox(gid) {
    const box = document.getElementById('group-box');
    if (!gid) { box.style.display = 'none'; return; }
    const members = Array.from(slides[currentSlide].querySelectorAll(`[data-group="${CSS.escape(gid)}"]`));
    if (members.length === 0) { box.style.display = 'none'; return; }
    const PAD = 8;
    let minL = Infinity, minT = Infinity, maxR = -Infinity, maxB = -Infinity;
    members.forEach(el => {
      const l = el.offsetLeft, t = el.offsetTop, w = el.offsetWidth, h = el.offsetHeight;
      if (l < minL) minL = l;
      if (t < minT) minT = t;
      if (l + w > maxR) maxR = l + w;
      if (t + h > maxB) maxB = t + h;
    });
    box.style.left   = (minL - PAD) + 'px';
    box.style.top    = (minT - PAD) + 'px';
    box.style.width  = (maxR - minL + PAD * 2) + 'px';
    box.style.height = (maxB - minT + PAD * 2) + 'px';
    box.style.display = 'block';
  }

  function clientToStage(cx, cy) {
    const rect = document.getElementById('stage').getBoundingClientRect();
    const scale = rect.width / 1920;
    return { x: (cx - rect.left) / scale, y: (cy - rect.top) / scale };
  }

  function updateCoordPanel(el) {
    const s = el.style;
    const lines = [];
    if (s.top) lines.push('top: ' + s.top + ';');
    if (s.left) lines.push('left: ' + s.left + ';');
    if (s.width) lines.push('width: ' + s.width + ';');
    if (s.transform) lines.push('transform: ' + s.transform + ';');
    document.getElementById('coord-text').textContent = lines.join('\n');
    updateFontPanel(el);
    updateResizeHandle();
  }

  function updateFontPanel(el) {
    const panel = document.getElementById('font-panel');
    if (!el || (!el.matches('.text-area') && !el.matches('.bubble') && !el.matches('.slide-el') && !el.classList.contains('child-selected') && !el.closest('.group-entered-parent'))) {
      panel.classList.remove('visible');
      return;
    }
    const hl = (el.classList.contains('child-selected') ? el : null)
      || el.querySelector('.hl') || el.querySelector('.check-text, .icon-flow-label') || el;
    const fs = Math.round(parseFloat(hl.style.fontSize) || parseFloat(getComputedStyle(hl).fontSize) || 108);
    document.getElementById('font-size-input').value = fs;
    const tbfs = document.getElementById('tb-font-size');
    if (tbfs) tbfs.value = fs;
    panel.classList.add('visible');
    const elRect = el.getBoundingClientRect();
    const pw = panel.offsetWidth, ph = panel.offsetHeight;
    const cx = elRect.left + elRect.width / 2;
    panel.style.left = Math.max(4, cx - pw / 2) + 'px';
    panel.style.top = Math.max(4, elRect.top - ph - 8) + 'px';
  }

  function applyFontSize(delta) {
    if (!selectedEl) return;
    const childSel = groupParent ? groupParent.querySelector('.child-selected') : null;
    const editing = document.querySelector('[contenteditable="true"]');

    // 경로 1: 개별 자식 선택 (그룹 진입 or 텍스트 편집 중)
    if (childSel || editing) {
      const target = childSel || editing;
      const curFs = Math.round(parseFloat(target.style.fontSize) || parseFloat(getComputedStyle(target).fontSize) || 108);
      const fs = delta !== 0
        ? Math.max(10, Math.min(500, curFs + delta))
        : Math.max(10, Math.min(500, parseInt(document.getElementById('font-size-input').value) || curFs));
      pushUndo();
      target.style.fontSize = fs + 'px';

    // 경로 2: slide-el 전체 선택 → 모든 텍스트 자식에 각각 적용
    } else if (selectedEl.matches('.slide-el')) {
      const TEXT_CHILDREN = '.card-title, .card-desc, .card-num, .grid-title, .grid-desc, .grid-icon, .num-text, .num-badge, .check-text, .bar-label, .bar-value, .tl-box, .btn-pill, .alert-text, .alert-icon, .compare-header, .compare-item, .quote-text, .quote-source, .tag-chip, .icon-label, .flow-box, .flow-arrow, .stat-num, .stat-label, .section-badge, .corner-label';
      const children = selectedEl.querySelectorAll(TEXT_CHILDREN);
      if (children.length === 0) return;
      pushUndo();
      children.forEach(child => {
        const curFs = Math.round(parseFloat(child.style.fontSize) || parseFloat(getComputedStyle(child).fontSize) || 108);
        child.style.fontSize = Math.max(10, Math.min(500, curFs + delta)) + 'px';
      });

    // 경로 3: 일반 요소 (.text-area, .bubble 등)
    } else {
      const target = selectedEl.querySelector('.hl')
        || (selectedEl.matches('.hl') ? selectedEl : null)
        || (selectedEl.matches('.bubble') ? selectedEl : null)
        || selectedEl;
      const curFs = Math.round(parseFloat(target.style.fontSize) || parseFloat(getComputedStyle(target).fontSize) || 108);
      const fs = delta !== 0
        ? Math.max(10, Math.min(500, curFs + delta))
        : Math.max(10, Math.min(500, parseInt(document.getElementById('font-size-input').value) || curFs));
      pushUndo();
      target.style.fontSize = fs + 'px';
    }
    updateFontPanel(selectedEl);
  }

  document.getElementById('font-dec').addEventListener('click', () => applyFontSize(-4));
  document.getElementById('font-inc').addEventListener('click', () => applyFontSize(4));
  document.getElementById('font-size-input').addEventListener('change', () => applyFontSize(0));

  function updateResizeHandle() {
    const handles = document.querySelectorAll('.resize-handle');
    const msBox = document.getElementById('multi-select-box');
    if (!selectedEl || !editMode) {
      handles.forEach(h => h.classList.remove('visible'));
      msBox.style.display = 'none';
      return;
    }
    // step-dim: 리사이즈 불가
    if (selectedEl.classList.contains('step-dim')) {
      handles.forEach(h => h.classList.remove('visible'));
      msBox.style.display = 'none';
      return;
    }
    // text-area / hl-wrap 등 텍스트 요소는 edge handle 숨김 (fontSize만 조절하므로)
    const isTextEl = selectedEl.classList.contains('text-area') || selectedEl.classList.contains('hl-wrap') || selectedEl.classList.contains('step-title');
    if (selectedEls.length > 1) {
      let minL = Infinity, minT = Infinity, maxR = -Infinity, maxB = -Infinity;
      selectedEls.forEach(el => {
        const l = el.offsetLeft, t = el.offsetTop;
        const r = l + el.offsetWidth, b = t + el.offsetHeight;
        if (l < minL) minL = l;
        if (t < minT) minT = t;
        if (r > maxR) maxR = r;
        if (b > maxB) maxB = b;
      });
      msBox.style.display = 'block';
      msBox.style.left = minL + 'px';
      msBox.style.top  = minT + 'px';
      msBox.style.width  = (maxR - minL) + 'px';
      msBox.style.height = (maxB - minT) + 'px';
      const cx = (minL + maxR) / 2, cy = (minT + maxB) / 2;
      const cornerPos = { tl: [minL-6, minT-6], tr: [maxR-6, minT-6], bl: [minL-6, maxB-6], br: [maxR-6, maxB-6] };
      const edgePos = { t: [cx-6, minT-6], r: [maxR-6, cy-6], b: [cx-6, maxB-6], l: [minL-6, cy-6] };
      handles.forEach(h => {
        if (h.dataset.corner) { const c = h.dataset.corner; h.style.left = cornerPos[c][0] + 'px'; h.style.top = cornerPos[c][1] + 'px'; h.classList.add('visible'); }
        else if (h.dataset.edge) { const e2 = h.dataset.edge; h.style.left = edgePos[e2][0] + 'px'; h.style.top = edgePos[e2][1] + 'px'; if (!isTextEl) h.classList.add('visible'); else h.classList.remove('visible'); }
      });
    } else {
      msBox.style.display = 'none';
      const l = selectedEl.offsetLeft, t = selectedEl.offsetTop;
      const w = selectedEl.offsetWidth, hh = selectedEl.offsetHeight;
      const cx = l + w / 2, cy = t + hh / 2;
      const cornerPos = { tl: [l-6, t-6], tr: [l+w-6, t-6], bl: [l-6, t+hh-6], br: [l+w-6, t+hh-6] };
      const edgePos = { t: [cx-6, t-6], r: [l+w-6, cy-6], b: [cx-6, t+hh-6], l: [l-6, cy-6] };
      handles.forEach(h => {
        if (h.dataset.corner) { const c = h.dataset.corner; h.style.left = cornerPos[c][0] + 'px'; h.style.top = cornerPos[c][1] + 'px'; h.classList.add('visible'); }
        else if (h.dataset.edge) { const e2 = h.dataset.edge; h.style.left = edgePos[e2][0] + 'px'; h.style.top = edgePos[e2][1] + 'px'; if (!isTextEl) h.classList.add('visible'); else h.classList.remove('visible'); }
      });
    }
  }

  function copyCoords() {
    navigator.clipboard.writeText(document.getElementById('coord-text').textContent);
  }

  // ── Undo / Redo ──
  function pushUndo() {
    if (isGitHubPages) ghMarkDirty();
    undoStack.push(document.getElementById('stage').innerHTML);
    if (undoStack.length > 50) undoStack.shift();
    redoStack.length = 0;
  }

  function restoreSnapshot(html) {
    document.getElementById('stage').innerHTML = html;
    slides = document.querySelectorAll('#stage > .slide');
    document.querySelectorAll('.edit-selected, .edit-group-selected, .group-entered-parent, .child-selected').forEach(el => { el.classList.remove('edit-selected', 'edit-group-selected', 'group-entered-parent', 'child-selected'); });
    document.body.classList.remove('individual-mode');
    selectedEl = null;
    selectedEls = [];
    individualMode = false;
    isDragging = false;
    isResizing = false;
    resizeImgInit = null;
    resizeCorner = null;
    resizeEdge = null;
    resizeImgInitRect = null;
    resizeMultiInitRects = null;
    pendingDrag = false;
    selectBoxActive = false;
    document.getElementById('select-box').style.display = 'none';
    document.getElementById('coord-panel').style.display = 'none';
    document.getElementById('font-panel').classList.remove('visible');
    document.getElementById('snap-x').style.display = 'none';
    document.getElementById('snap-y').style.display = 'none';
    document.getElementById('multi-select-box').style.display = 'none';
    slides.forEach((s, i) => {
      s.classList.toggle('active', i === currentSlide);
      s.classList.remove('leave-left', 'enter-from-left');
    });
    showStep(slides[currentSlide], currentStep);
    if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
    buildFilmstrip();
  }

  function doUndo() {
    if (!undoStack.length) return;
    redoStack.push(document.getElementById('stage').innerHTML);
    restoreSnapshot(undoStack.pop());
  }

  function doRedo() {
    if (!redoStack.length) return;
    undoStack.push(document.getElementById('stage').innerHTML);
    restoreSnapshot(redoStack.pop());
  }

  // resize handle는 stage 이벤트 위임으로 처리 (innerHTML 복원 후에도 동작)

  document.getElementById('stage').addEventListener('dragstart', e => {
    if (editMode) e.preventDefault();
  });

  document.getElementById('stage').addEventListener('dblclick', e => {
    if (!editMode) return;
    // 그룹 진입 상태에서 자식 더블클릭 → 텍스트 편집
    if (groupEntered && groupParent) {
      const child = e.target.closest(CHILD_SEL);
      if (child && groupParent.contains(child)) {
        enterContentEditable(child, e);
        return;
      }
    }
    if (!editMode) return;
    let el = e.target.closest('.hl, .bubble, .bg-label, .card-title, .card-desc, .num-text, .bar-label, .bar-value, .icon-label, .flow-box, .icon-flow-label, .flow-arrow, .check-text, .hbar-label, .hbar-val, .stat-num, .quote-text, .grid-title, .section-badge, .corner-label, .btn-pill, .tag-chip, .alert-text, .compare-header, .compare-item, .tl-box, .cta-btn, .stat-label');
    if (!el) {
      const area = e.target.closest('.text-area');
      if (area) el = area.querySelector('.hl');
    }
    if (!el) return;

    isEditing = true;
    el.contentEditable = 'true';
    el.focus();
    const range = document.caretRangeFromPoint(e.clientX, e.clientY);
    if (range) { const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range); }

    const onKeydown = ev => {
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); el.blur(); }
      if ((ev.ctrlKey || ev.metaKey) && ev.key === 'z') { ev.preventDefault(); ev.stopPropagation(); el.blur(); ev.shiftKey ? doRedo() : doUndo(); }
    };
    el.addEventListener('keydown', onKeydown);
    el.addEventListener('blur', () => {
      el.removeAttribute('contenteditable');
      isEditing = false;
      el.removeEventListener('keydown', onKeydown);
    }, { once: true });
  });

  document.addEventListener('mousedown', e => {
    if (!editMode) return;
    if (e.target.closest('.color-palette, .color-swatch, #palette-bg, #palette-fc')) {
      if (isEditing) e.preventDefault(); // 텍스트 선택 유지
      return;
    }
    if (!e.target.closest('#stage') && !e.target.classList.contains('resize-handle')) return;
    if (e.target.closest('[contenteditable="true"]')) return;
    if (isEditing) {
      const editable = document.querySelector('[contenteditable="true"]');
      if (editable) editable.blur();
    }

    // 그룹 진입 상태: 자식 요소 클릭 또는 밖 클릭 처리
    if (groupEntered && groupParent) {
      if (groupParent.contains(e.target) && e.target !== groupParent) {
        e.preventDefault(); e.stopPropagation();
        groupParent.querySelectorAll('.child-selected').forEach(c => c.classList.remove('child-selected'));
        const child = e.target.closest(CHILD_SEL) || e.target;
        child.classList.add('child-selected');
        updateFontPanel(child);
        selectedEl = groupParent;
        selectedEls = [groupParent];
        pendingDrag = true;
        mouseDownPos = { x: e.clientX, y: e.clientY };
        dragAnchor = clientToStage(e.clientX, e.clientY);
        elAnchor = { top: groupParent.offsetTop, left: groupParent.offsetLeft };
        elAnchors = [{ el: groupParent, top: groupParent.offsetTop, left: groupParent.offsetLeft }];
        updateCoordPanel(groupParent);
        return;
      }
      if (!groupParent.contains(e.target) && !e.target.closest('.resize-handle')) {
        exitGroup();
      }
    }

    // resize handle 이벤트 위임 (innerHTML 복원 후에도 동작)
    if (e.target.classList.contains('resize-handle')) {
      if (!selectedEl) { clearSelection(); return; }
      e.preventDefault(); e.stopPropagation();
      pushUndo();
      isResizing = true;
      resizeCorner = e.target.dataset.corner || null;
      resizeEdge = e.target.dataset.edge || null;
      const stagePos0 = clientToStage(e.clientX, e.clientY);
      resizeAnchorX = stagePos0.x;
      resizeAnchorY = stagePos0.y;
      // edge handle: 단방향 리사이즈 (slide-el, img, emoji-icon, bubble 전용)
      if (resizeEdge && (selectedEl.tagName === 'IMG' || selectedEl.classList.contains('emoji-icon') || selectedEl.classList.contains('slide-el') || selectedEl.classList.contains('bubble'))) {
        resizeInitFontSizes = null;
        resizeImgInit = null;
        const fs = parseFloat(selectedEl.style.fontSize) || 0;
        resizeImgInitRect = {
          left: selectedEl.offsetLeft,
          top: selectedEl.offsetTop,
          w: fs > 0 ? fs : selectedEl.offsetWidth,
          h: fs > 0 ? fs : selectedEl.offsetHeight,
          ratio: null,
          fontSize: fs > 0 ? fs : null
        };
        resizeMultiInitRects = [];
        return;
      }
      if (resizeEdge) { resizeImgInitRect = null; resizeInitFontSizes = null; return; } // edge on text — skip
      // IMG / emoji-icon / bubble 리사이즈 (4모서리, 비율 유지)
      if (selectedEl.tagName === 'IMG' || selectedEl.classList.contains('emoji-icon') || selectedEl.classList.contains('slide-el') || selectedEl.classList.contains('bubble')) {
        resizeInitFontSizes = null;
        resizeImgInit = null;
        const stagePos = clientToStage(e.clientX, e.clientY);
        const fs = parseFloat(selectedEl.style.fontSize) || 0;
        const ow = fs > 0 ? fs : selectedEl.offsetWidth;
        const oh = fs > 0 ? fs : selectedEl.offsetHeight;
        resizeImgInitRect = {
          left: selectedEl.offsetLeft,
          top: selectedEl.offsetTop,
          w: ow,
          h: oh,
          ratio: ow / oh,
          fontSize: fs > 0 ? fs : null
        };
        resizeAnchorX = stagePos.x;
        resizeAnchorY = stagePos.y;
        resizeMultiInitRects = selectedEls.filter(s => s !== selectedEl).map(s => ({
          el: s, left: s.offsetLeft, top: s.offsetTop, w: s.offsetWidth, h: s.offsetHeight
        }));
        return;
      }
      resizeImgInit = null;
      resizeImgInitRect = null;
      const _stagePos = clientToStage(e.clientX, e.clientY);
      resizeAnchorX = _stagePos.x;
      resizeAnchorY = _stagePos.y;
      const hls = [];
      selectedEls.forEach(sel => {
        const found = sel.querySelectorAll('.hl');
        if (found.length > 0) found.forEach(hl => hls.push(hl));
        else if (sel.matches('.hl')) hls.push(sel);
      });
      resizeInitFontSizes = hls.map(hl => ({
        el: hl,
        fs: parseFloat(hl.style.fontSize) || parseFloat(getComputedStyle(hl).fontSize) || 108
      }));
      return;
    }

    const el = e.target.closest(EDITABLE_SEL);

    if (!el) {
      // 빈 영역 클릭 → 드래그 선택 박스 시작
      e.preventDefault();
      e.stopPropagation();
      clearSelection();
      selectBoxActive = true;
      selectBoxOrigin = clientToStage(e.clientX, e.clientY);
      const sb = document.getElementById('select-box');
      sb.style.left = selectBoxOrigin.x + 'px';
      sb.style.top  = selectBoxOrigin.y + 'px';
      sb.style.width = '0'; sb.style.height = '0';
      sb.style.display = 'block';
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // Shift+클릭: 다중 선택 토글
    if (e.shiftKey) {
      const idx = selectedEls.indexOf(el);
      if (idx >= 0) {
        el.classList.remove('edit-selected');
        selectedEls.splice(idx, 1);
        selectedEl = selectedEls[selectedEls.length - 1] || null;
      } else {
        el.classList.add('edit-selected');
        selectedEls.push(el);
        selectedEl = el;
      }
      if (selectedEl) updateCoordPanel(selectedEl);
      else {
        document.getElementById('coord-panel').style.display = 'none';
        document.querySelectorAll('.resize-handle').forEach(h => h.classList.remove('visible'));
      }
      updateGroupToolbar();
      if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
      return;
    }

    // 단일 선택 (이미 선택된 요소가 아니면 선택 초기화)
    if (!selectedEls.includes(el)) {
      // 새 요소 클릭
      selectedEls.forEach(s => {
        s.classList.remove('edit-selected');
        s.classList.remove('edit-group-selected');
      });
      individualMode = false;
      document.body.classList.remove('individual-mode');
      const gid = el.dataset.group;
      if (gid) {
        selectedEls = Array.from(slides[currentSlide].querySelectorAll(`[data-group="${CSS.escape(gid)}"]`));
        selectedEl = el;
        selectedEls.forEach(s => s.classList.add('edit-group-selected'));
        showGroupBox(gid);
      } else {
        selectedEls = [el];
        selectedEl = el;
        el.classList.add('edit-selected');
        showGroupBox(null);
      }
    } else {
      // 이미 선택된 요소 재클릭
      const gid = el.dataset.group;
      if (gid && !individualMode) {
        // 그룹 재클릭 → 개별 모드 진입
        individualMode = true;
        document.body.classList.add('individual-mode');
        selectedEls.forEach(s => {
          s.classList.remove('edit-selected');
          s.classList.add('edit-group-selected');
        });
        el.classList.remove('edit-group-selected');
        el.classList.add('edit-selected');
        selectedEl = el;
        updateCoordPanel(el);
        updateGroupToolbar();
        if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
      } else if (gid && individualMode) {
        // 개별 모드 재클릭 → 다른 멤버로 전환
        selectedEls.forEach(s => {
          s.classList.remove('edit-selected');
          s.classList.add('edit-group-selected');
        });
        el.classList.remove('edit-group-selected');
        el.classList.add('edit-selected');
        selectedEl = el;
      } else if (el.matches('.slide-el') && selectedEls.length === 1) {
        // 카드 블록 재클릭 → mouseup에서 드래그 여부 확인 후 그룹 진입
        pendingGroupEntry = { el, target: e.target };
        selectedEl = el;
      } else {
        selectedEl = el;
      }
    }

    // step-dim 선택 시 해당 step-layer를 visible로 표시, 드래그는 허용하되 좌표 정규화 건너뜀
    const isStepDim = el.classList.contains('step-dim');
    if (isStepDim) {
      const layer = el.closest('.step-layer');
      if (layer) layer.classList.add('visible');
      updateCoordPanel(el);
      updateGroupToolbar();
      if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
      pendingDrag = true;
      mouseDownPos = { x: e.clientX, y: e.clientY };
      dragAnchor = clientToStage(e.clientX, e.clientY);
      elAnchor = { top: el.offsetTop, left: el.offsetLeft };
      elAnchors = [{ el, top: el.offsetTop, left: el.offsetLeft }];
      return;
    }

    // right/bottom/% → top+left px로 정규화 (transform은 유지)
    el.style.left = el.offsetLeft + 'px';
    el.style.top = el.offsetTop + 'px';
    if (!el.style.width) el.style.width = el.offsetWidth + 'px';
    el.style.right = '';
    el.style.bottom = '';

    pendingDrag = true;
    mouseDownPos = { x: e.clientX, y: e.clientY };
    dragAnchor = clientToStage(e.clientX, e.clientY);
    elAnchor = { top: el.offsetTop, left: el.offsetLeft };
    if (individualMode) {
      elAnchors = [{ el: selectedEl, top: selectedEl.offsetTop, left: selectedEl.offsetLeft }];
    } else {
      elAnchors = selectedEls.map(s => ({ el: s, top: s.offsetTop, left: s.offsetLeft }));
    }

    updateCoordPanel(el);
    updateGroupToolbar();
    if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
  });

  document.addEventListener('mousemove', e => {
    // 필름스트립 드래그
    if (fsDragPending && !fsDragItem) {
      if (Math.abs(e.clientX - fsDragStartX) > 5) {
        clearTimeout(fsDragPending);
        fsDragPending = null;
      }
    }
    if (fsDragItem) {
      if (fsDragGhost) { fsDragGhost.style.left = (e.clientX - 68) + 'px'; fsDragGhost.style.top = (e.clientY - 38) + 'px'; }
      const inner = document.getElementById('filmstrip-inner');
      const items = [...inner.querySelectorAll('.fs-item')];
      let dropIdx = items.length;
      for (let i = 0; i < items.length; i++) {
        if (i === fsDragFromIdx) continue;
        const r = items[i].getBoundingClientRect();
        if (e.clientX < r.left + r.width / 2) { dropIdx = i; break; }
      }
      fsDragDropIdx = dropIdx;
      let dropLine = inner.querySelector('.fs-drop-line');
      if (!dropLine) { dropLine = document.createElement('div'); dropLine.className = 'fs-drop-line'; inner.appendChild(dropLine); }
      if (dropIdx < items.length) {
        const r = items[dropIdx].getBoundingClientRect();
        const ir = inner.getBoundingClientRect();
        dropLine.style.left = (r.left - ir.left + inner.scrollLeft) + 'px';
      } else {
        const last = items[items.length - 1];
        const r = last.getBoundingClientRect();
        const ir = inner.getBoundingClientRect();
        dropLine.style.left = (r.right - ir.left + inner.scrollLeft) + 'px';
      }
      dropLine.style.display = 'block';
      return;
    }
    // 레이어 패널 드래그 호버
    if (layerDragPending && !layerDragItem) {
      if (Math.abs(e.clientY - layerDragStartY) > 5) {
        layerDragItem = layerDragPending;
        layerDragItem.style.opacity = '0.5';
        layerDropLine = document.createElement('div');
        layerDropLine.className = 'layer-drop-line';
        layerDropLine.style.display = 'none';
        document.getElementById('layer-list').appendChild(layerDropLine);
        layerDragPending = null;
      }
    }
    if (layerDragItem) { updateLayerHover(e.clientY); return; }

    // 드래그 선택 박스 그리기
    if (selectBoxActive && selectBoxOrigin) {
      const pos = clientToStage(e.clientX, e.clientY);
      const x1 = Math.min(selectBoxOrigin.x, pos.x), x2 = Math.max(selectBoxOrigin.x, pos.x);
      const y1 = Math.min(selectBoxOrigin.y, pos.y), y2 = Math.max(selectBoxOrigin.y, pos.y);
      const sb = document.getElementById('select-box');
      sb.style.left = x1 + 'px'; sb.style.top = y1 + 'px';
      sb.style.width = (x2 - x1) + 'px'; sb.style.height = (y2 - y1) + 'px';
      return;
    }

    // 리사이즈 핸들 드래그
    // IMG 리사이즈 (4모서리, 비율 유지)
    if (isResizing && selectedEl && resizeImgInitRect) {
      const pos = clientToStage(e.clientX, e.clientY);
      const dx = pos.x - resizeAnchorX;
      const dy = pos.y - resizeAnchorY;
      const { left: initLeft, top: initTop, w: initW, h: initH, ratio } = resizeImgInitRect;
      let newW, newH, newLeft, newTop;
      // edge handle: 한 방향만 리사이즈 (비율 무시)
      if (resizeEdge) {
        newW = initW; newH = initH; newLeft = initLeft; newTop = initTop;
        if (resizeEdge === 'r') { newW = Math.max(50, Math.round(initW + dx)); }
        else if (resizeEdge === 'l') { newW = Math.max(50, Math.round(initW - dx)); newLeft = Math.round(initLeft + initW - newW); }
        else if (resizeEdge === 'b') { newH = Math.max(50, Math.round(initH + dy)); }
        else if (resizeEdge === 't') { newH = Math.max(50, Math.round(initH - dy)); newTop = Math.round(initTop + initH - newH); }
        if (resizeImgInitRect.fontSize !== null) {
          const scale = (resizeEdge === 'l' || resizeEdge === 'r') ? newW / initW : newH / initH;
          selectedEl.style.fontSize = Math.max(12, Math.round(resizeImgInitRect.fontSize * scale)) + 'px';
        } else {
          selectedEl.style.width = newW + 'px';
          selectedEl.style.height = newH + 'px';
          selectedEl.style.maxWidth = '';
        }
        selectedEl.style.left = newLeft + 'px';
        selectedEl.style.top = newTop + 'px';
        updateResizeHandle();
        return;
      }
      if (resizeCorner === 'br') {
        newW = Math.max(50, Math.round(initW + dx));
        newH = Math.round(newW / ratio);
        newLeft = initLeft; newTop = initTop;
      } else if (resizeCorner === 'bl') {
        newW = Math.max(50, Math.round(initW - dx));
        newH = Math.round(newW / ratio);
        newLeft = Math.round(initLeft + initW - newW);
        newTop = initTop;
      } else if (resizeCorner === 'tr') {
        newW = Math.max(50, Math.round(initW + dx));
        newH = Math.round(newW / ratio);
        newLeft = initLeft;
        newTop = Math.round(initTop + initH - newH);
      } else { // tl
        newW = Math.max(50, Math.round(initW - dx));
        newH = Math.round(newW / ratio);
        newLeft = Math.round(initLeft + initW - newW);
        newTop = Math.round(initTop + initH - newH);
      }
      if (resizeImgInitRect.fontSize !== null) {
        selectedEl.style.fontSize = newW + 'px';
      } else {
        selectedEl.style.width = newW + 'px';
        selectedEl.style.height = newH + 'px';
        selectedEl.style.maxWidth = '';
      }
      selectedEl.style.left = newLeft + 'px';
      selectedEl.style.top = newTop + 'px';
      // 다중 선택 시 나머지 요소도 비례 적용
      if (resizeMultiInitRects && resizeMultiInitRects.length > 0) {
        const scale = resizeImgInitRect.w > 0 ? newW / resizeImgInitRect.w : 1;
        const anchorX = resizeCorner === 'br' || resizeCorner === 'tr' ? resizeImgInitRect.left : resizeImgInitRect.left + resizeImgInitRect.w;
        const anchorY = resizeCorner === 'br' || resizeCorner === 'bl' ? resizeImgInitRect.top : resizeImgInitRect.top + resizeImgInitRect.h;
        resizeMultiInitRects.forEach(({ el: oel, left: ol, top: ot, w: ow2, h: oh2 }) => {
          oel.style.width  = Math.round(ow2 * scale) + 'px';
          oel.style.height = Math.round(oh2 * scale) + 'px';
          oel.style.left   = Math.round(anchorX + (ol - anchorX) * scale) + 'px';
          oel.style.top    = Math.round(anchorY + (ot - anchorY) * scale) + 'px';
        });
      }
      updateResizeHandle();
      return;
    }
    if (isResizing && selectedEl && resizeInitFontSizes) {
      const _rPos = clientToStage(e.clientX, e.clientY);
      const dx = _rPos.x - resizeAnchorX;
      const dy = _rPos.y - resizeAnchorY;
      let signX = 1, signY = 1;
      if (resizeCorner === 'tl') { signX = -1; signY = -1; }
      else if (resizeCorner === 'tr') { signX =  1; signY = -1; }
      else if (resizeCorner === 'bl') { signX = -1; signY =  1; }
      const delta = (dx * signX + dy * signY) / 2;
      resizeInitFontSizes.forEach(({ el, fs }) => {
        el.style.fontSize = Math.max(10, Math.round(fs + delta)) + 'px';
      });
      updateResizeHandle();
      return;
    }

    // 임계값 초과 시 드래그 시작 (undo 저장)
    if (pendingDrag && mouseDownPos) {
      const dx = e.clientX - mouseDownPos.x, dy = e.clientY - mouseDownPos.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > DRAG_THRESHOLD) {
        pushUndo();
        isDragging = true;
        pendingDrag = false;
      }
    }
    if (!isDragging || !selectedEl) return;
    const pos = clientToStage(e.clientX, e.clientY);
    const dxDrag = pos.x - dragAnchor.x, dyDrag = pos.y - dragAnchor.y;

    // 다중 선택 이동
    if (elAnchors.length > 1) {
      elAnchors.forEach(({ el, top, left }) => {
        el.style.left = Math.round(left + dxDrag) + 'px';
        el.style.top  = Math.round(top  + dyDrag) + 'px';
      });
      // bounding box 중앙 기준 stage 중앙 스냅
      let minL=Infinity, minT=Infinity, maxR=-Infinity, maxB=-Infinity;
      elAnchors.forEach(({ el }) => {
        minL = Math.min(minL, el.offsetLeft);
        minT = Math.min(minT, el.offsetTop);
        maxR = Math.max(maxR, el.offsetLeft + el.offsetWidth);
        maxB = Math.max(maxB, el.offsetTop + el.offsetHeight);
      });
      const bcx = (minL + maxR) / 2, bcy = (minT + maxB) / 2;
      const SNAP_T = 8;
      const sxEl = document.getElementById('snap-x'), syEl = document.getElementById('snap-y');
      if (Math.abs(bcx - 960) <= SNAP_T) {
        const adj = 960 - bcx;
        elAnchors.forEach(({ el }) => { el.style.left = (el.offsetLeft + adj) + 'px'; });
        sxEl.style.left = '960px'; sxEl.style.display = 'block';
      } else sxEl.style.display = 'none';
      if (Math.abs(bcy - 540) <= SNAP_T) {
        const adj = 540 - bcy;
        elAnchors.forEach(({ el }) => { el.style.top = (el.offsetTop + adj) + 'px'; });
        syEl.style.top = '540px'; syEl.style.display = 'block';
      } else syEl.style.display = 'none';
      ['gap-left','gap-right','gap-top','gap-bottom'].forEach(id => { document.getElementById(id).style.display = 'none'; });
      updateCoordPanel(selectedEl);
      updateResizeHandle();
      return;
    }

    let newLeft = Math.round(elAnchor.left + dxDrag);
    let newTop  = Math.round(elAnchor.top  + dyDrag);

    // ── 스냅 가이드 ──
    const SNAP_T = 8;
    const stageEl = document.getElementById('stage');
    const w = selectedEl.offsetWidth, h = selectedEl.offsetHeight;
    const xs = [stageEl.offsetWidth / 2];
    const ys = [stageEl.offsetHeight / 2];
    const layer = selectedEl.closest('.step-layer') || selectedEl.parentElement;
    layer.querySelectorAll(EDITABLE_SEL).forEach(other => {
      if (other === selectedEl || other.classList.contains('step-dim')) return;
      xs.push(other.offsetLeft, other.offsetLeft + other.offsetWidth / 2, other.offsetLeft + other.offsetWidth);
      ys.push(other.offsetTop,  other.offsetTop  + other.offsetHeight / 2, other.offsetTop  + other.offsetHeight);
    });
    // 보이는 가이드 엣지 수집
    document.querySelectorAll('.guide').forEach(g => {
      if (g.style.display === 'none' || getComputedStyle(g).display === 'none') return;
      const gl = parseInt(g.style.left) || 0, gt = parseInt(g.style.top) || 0;
      const gw = parseInt(g.style.width) || 0, gh = parseInt(g.style.height) || 0;
      if (gw === 0 && gh === 0) return;
      xs.push(gl, gl + gw);
      ys.push(gt, gt + gh);
    });
    function snapTo(val, list) { for (const t of list) if (Math.abs(val - t) <= SNAP_T) return t; return null; }
    let snapXLine = null, snapYLine = null, s;
    if      ((s = snapTo(newLeft + w / 2, xs)) !== null) { newLeft = Math.round(s - w / 2); snapXLine = s; }
    else if ((s = snapTo(newLeft,         xs)) !== null) { newLeft = s;     snapXLine = s; }
    else if ((s = snapTo(newLeft + w,     xs)) !== null) { newLeft = s - w; snapXLine = s; }
    if      ((s = snapTo(newTop  + h / 2, ys)) !== null) { newTop  = Math.round(s - h / 2); snapYLine = s; }
    else if ((s = snapTo(newTop,          ys)) !== null) { newTop  = s;     snapYLine = s; }
    else if ((s = snapTo(newTop  + h,     ys)) !== null) { newTop  = s - h; snapYLine = s; }
    const sxEl = document.getElementById('snap-x'), syEl = document.getElementById('snap-y');
    if (snapXLine !== null) { sxEl.style.left = snapXLine + 'px'; sxEl.style.display = 'block'; } else sxEl.style.display = 'none';
    if (snapYLine !== null) { syEl.style.top  = snapYLine + 'px'; syEl.style.display = 'block'; } else syEl.style.display = 'none';

    // ── 간격 표시 + 등간격 스냅 ──
    {
      const gapLeft  = document.getElementById('gap-left');
      const gapRight = document.getElementById('gap-right');
      const gapTop   = document.getElementById('gap-top');
      const gapBottom= document.getElementById('gap-bottom');
      const cx = newLeft + w / 2, cy = newTop + h / 2;
      let lNeighbor = null, rNeighbor = null, tNeighbor = null, bNeighbor = null;
      let hasRealLNeighbor = false, hasRealRNeighbor = false, hasRealTNeighbor = false, hasRealBNeighbor = false;
      layer.querySelectorAll(EDITABLE_SEL).forEach(other => {
        if (other === selectedEl || other.classList.contains('step-dim')) return;
        const ox = other.offsetLeft, oy = other.offsetTop, ow2 = other.offsetWidth, oh2 = other.offsetHeight;
        const ocx = ox + ow2 / 2, ocy = oy + oh2 / 2;
        // 수평 이웃: Y 중심 차이 < 요소 높이
        if (Math.abs(ocy - cy) < h) {
          if (ox + ow2 <= newLeft) { // 왼쪽
            if (!lNeighbor || ox + ow2 > lNeighbor.right) { lNeighbor = { right: ox + ow2, mid: ocy }; hasRealLNeighbor = true; }
          } else if (ox >= newLeft + w) { // 오른쪽
            if (!rNeighbor || ox < rNeighbor.left) { rNeighbor = { left: ox, mid: ocy }; hasRealRNeighbor = true; }
          }
        }
        // 수직 이웃: X 중심 차이 < 요소 너비
        if (Math.abs(ocx - cx) < w) {
          if (oy + oh2 <= newTop) { // 위
            if (!tNeighbor || oy + oh2 > tNeighbor.bottom) { tNeighbor = { bottom: oy + oh2, mid: ocx }; hasRealTNeighbor = true; }
          } else if (oy >= newTop + h) { // 아래
            if (!bNeighbor || oy < bNeighbor.top) { bNeighbor = { top: oy, mid: ocx }; hasRealBNeighbor = true; }
          }
        }
      });
      // 이웃 없으면 캔버스 경계를 기준점으로 (gap 표시 전용, 스냅 제외)
      if (!lNeighbor) lNeighbor = { right: 0, mid: cy };
      if (!rNeighbor) rNeighbor = { left: 1920, mid: cy };
      if (!tNeighbor) tNeighbor = { bottom: 0, mid: cx };
      if (!bNeighbor) bNeighbor = { top: 1080, mid: cx };

      // 수평 등간격 스냅
      let leftGap = null, rightGap = null;
      leftGap  = newLeft - lNeighbor.right;
      rightGap = rNeighbor.left - (newLeft + w);
      if (hasRealLNeighbor && hasRealRNeighbor && Math.abs(leftGap - rightGap) <= SNAP_T) {
        const equalGap = (leftGap + rightGap) / 2;
        newLeft = Math.round(lNeighbor.right + equalGap);
        leftGap = equalGap; rightGap = equalGap;
        gapLeft.classList.add('equal'); gapRight.classList.add('equal');
      } else {
        gapLeft.classList.remove('equal'); gapRight.classList.remove('equal');
      }

      // 수직 등간격 스냅
      let topGap = null, bottomGap = null;
      topGap    = newTop - tNeighbor.bottom;
      bottomGap = bNeighbor.top - (newTop + h);
      if (hasRealTNeighbor && hasRealBNeighbor && Math.abs(topGap - bottomGap) <= SNAP_T) {
        const equalGap = (topGap + bottomGap) / 2;
        newTop = Math.round(tNeighbor.bottom + equalGap);
        topGap = equalGap; bottomGap = equalGap;
        gapTop.classList.add('equal'); gapBottom.classList.add('equal');
      } else {
        gapTop.classList.remove('equal'); gapBottom.classList.remove('equal');
      }

      function showHGap(el, x1, x2, y) {
        const midY = Math.round(y - 1);
        el.style.left = x1 + 'px'; el.style.top = midY + 'px';
        el.style.width = (x2 - x1) + 'px'; el.style.height = '0';
        el.style.display = 'block';
        const line = el.querySelector('.gap-line');
        line.style.left = '0'; line.style.top = '0';
        line.style.width = '100%'; line.style.height = '2px';
        const val = el.querySelector('.gap-val');
        val.textContent = Math.round(x2 - x1) + 'px';
        val.style.left = Math.round((x2 - x1) / 2 - 20) + 'px';
        val.style.top = '-14px';
      }
      function showVGap(el, y1, y2, x) {
        const midX = Math.round(x - 1);
        el.style.left = midX + 'px'; el.style.top = y1 + 'px';
        el.style.width = '0'; el.style.height = (y2 - y1) + 'px';
        el.style.display = 'block';
        const line = el.querySelector('.gap-line');
        line.style.left = '0'; line.style.top = '0';
        line.style.width = '2px'; line.style.height = '100%';
        const val = el.querySelector('.gap-val');
        val.textContent = Math.round(y2 - y1) + 'px';
        val.style.top = Math.round((y2 - y1) / 2 - 10) + 'px';
        val.style.left = '6px';
      }

      if (leftGap !== null && leftGap >= 0) showHGap(gapLeft,  lNeighbor.right, newLeft, cy);
      else gapLeft.style.display = 'none';
      if (rightGap !== null && rightGap >= 0) showHGap(gapRight, newLeft + w, rNeighbor.left, cy);
      else gapRight.style.display = 'none';
      if (topGap !== null && topGap >= 0) showVGap(gapTop,    tNeighbor.bottom, newTop, cx);
      else gapTop.style.display = 'none';
      if (bottomGap !== null && bottomGap >= 0) showVGap(gapBottom, newTop + h, bNeighbor.top, cx);
      else gapBottom.style.display = 'none';
    }

    selectedEl.style.left = newLeft + 'px';
    selectedEl.style.top  = newTop + 'px';
    updateCoordPanel(selectedEl);
    if (selectedEl.dataset.group) showGroupBox(selectedEl.dataset.group);
  });

  document.addEventListener('mouseup', e => {
    // 필름스트립 드래그 완료
    if (fsDragPending) { clearTimeout(fsDragPending); fsDragPending = null; }
    if (fsDragItem) {
      fsDragItem.style.opacity = '';
      if (fsDragGhost) { fsDragGhost.remove(); fsDragGhost = null; }
      const inner = document.getElementById('filmstrip-inner');
      const dropLine = inner.querySelector('.fs-drop-line');
      if (dropLine) dropLine.remove();
      const toIdx = fsDragDropIdx >= 0 ? fsDragDropIdx : fsDragFromIdx;
      const from = fsDragFromIdx;
      fsDragItem = null; fsDragFromIdx = -1; fsDragDropIdx = -1;
      fsDragDone = true; setTimeout(() => { fsDragDone = false; }, 100);
      reorderSlide(from, toIdx > from ? toIdx - 1 : toIdx);
      return;
    }
    // 레이어 패널 드래그 처리 (우선)
    if (layerDragPending) { layerDragPending = null; }
    if (layerDragItem) {
      layerDragItem.style.opacity = '';
      layerDragItem.style.outline = '';
      const list = document.getElementById('layer-list');
      if (layerDropLine) { layerDropLine.remove(); layerDropLine = null; }

      // drop-zone highlight 해제
      document.getElementById('layer-list').querySelectorAll('.layer-drop-zone').forEach(z => z.classList.remove('drag-over'));

      if (layerActiveTab === 'position') {
        // 위치 탭: z-order만 변경
        if (layerOverItem) {
          if (layerOverPos === 'top') list.insertBefore(layerDragItem, layerOverItem);
          else list.insertBefore(layerDragItem, layerOverItem.nextSibling);
        }
        const items = Array.from(list.querySelectorAll('.layer-item'));
        const parent = layerDragItem._el ? layerDragItem._el.parentElement : null;
        if (parent) {
          [...items].reverse().forEach((i, idx) => {
            if (i._el && i._el.parentElement === parent) {
              parent.appendChild(i._el);
              i._el.style.zIndex = idx + 1;
            }
          });
        }
        buildLayerPanel();
      } else if (layerActiveTab === 'animation' && layerDragItem._isAnimRow) {
        // 애니메이션 탭 정렬 모드: 드롭 위치에 따라 DOM 순서 변경 후 step 재할당
        if (layerOverItem) {
          if (layerOverPos === 'top') list.insertBefore(layerDragItem, layerOverItem);
          else list.insertBefore(layerDragItem, layerOverItem.nextSibling);
        }
        // 리스트 역순으로 step 재할당 (목록 위=마지막 등장, 아래=먼저 등장)
        const orderedItems = Array.from(list.querySelectorAll('.layer-item')).filter(i => i._isAnimRow);
        orderedItems.forEach((item, idx) => {
          const newStep = orderedItems.length - idx;
          if (item._gid && item._members) {
            item._members.forEach(m => moveToStep(m, newStep));
          } else if (item._el) {
            moveToStep(item._el, newStep);
          }
        });
        buildLayerPanel();
      } else {
        // 애니메이션 탭: 구간 간 이동 (step 변경) 또는 z-order 변경
        if (layerTargetSection !== layerDragItem._step) {
          moveToStep(layerDragItem._el, layerTargetSection);
        } else {
          if (layerOverItem) {
            if (layerOverPos === 'top') list.insertBefore(layerDragItem, layerOverItem);
            else list.insertBefore(layerDragItem, layerOverItem.nextSibling);
          }
          const items = Array.from(list.querySelectorAll('.layer-item'));
          const parent = layerDragItem._el ? layerDragItem._el.parentElement : null;
          if (parent) {
            [...items].reverse().forEach((i, idx) => {
              if (i._el && i._el.parentElement === parent) {
                parent.appendChild(i._el);
                i._el.style.zIndex = idx + 1;
              }
            });
          }
          buildLayerPanel();
        }
      }
      layerDragItem = null;
      layerOverItem = null;
      layerOverPos = null;
      return;
    }

    // 드래그 선택 박스 완료
    if (selectBoxActive) {
      selectBoxActive = false;
      const sb = document.getElementById('select-box');
      const x1 = parseFloat(sb.style.left || 0), y1 = parseFloat(sb.style.top || 0);
      const x2 = x1 + parseFloat(sb.style.width || 0), y2 = y1 + parseFloat(sb.style.height || 0);
      sb.style.display = 'none';
      if (x2 - x1 > 5 && y2 - y1 > 5) {
        const slide = slides[currentSlide];
        const hits = [];
        slide.querySelectorAll(EDITABLE_SEL).forEach(el => {
          if (el.classList.contains('step-dim')) return;
          const lay = el.closest('.step-layer');
          if (!editMode && lay && lay.dataset.step !== '0' && !lay.classList.contains('visible')) return;
          const r = el.offsetLeft, t = el.offsetTop;
          if (r + el.offsetWidth > x1 && r < x2 && t + el.offsetHeight > y1 && t < y2) hits.push(el);
        });
        selectedEls = hits;
        hits.forEach(h => h.classList.add('edit-selected'));
        selectedEl = hits[0] || null;
        if (selectedEl) {
          updateCoordPanel(selectedEl);
          elAnchors = selectedEls.map(s => ({ el: s, top: s.offsetTop, left: s.offsetLeft }));
        }
        updateGroupToolbar();
        if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
      }
      selectBoxOrigin = null;
      return;
    }

    if (isResizing) {
      isResizing = false;
      resizeAnchorY = null;
      resizeAnchorX = null;
      resizeInitFontSizes = null;
      resizeImgInit = null;
      resizeCorner = null;
      resizeEdge = null;
      resizeImgInitRect = null;
      resizeMultiInitRects = null;
      pendingDrag = false;
      mouseDownPos = null;
      updateResizeHandle();
      return;
    }
    const wasDragging = isDragging;
    isDragging = false;
    pendingDrag = false;
    mouseDownPos = null;
    document.getElementById('snap-x').style.display = 'none';
    document.getElementById('snap-y').style.display = 'none';
    ['gap-left','gap-right','gap-top','gap-bottom'].forEach(id => { document.getElementById(id).style.display = 'none'; });

    // 드래그 안 했으면 그룹 진입 (캔바 스타일)
    if (pendingGroupEntry && !wasDragging) {
      const { el, target } = pendingGroupEntry;
      pendingGroupEntry = null;
      exitGroup();
      groupEntered = true;
      groupParent = el;
      el.classList.remove('edit-selected');
      el.classList.add('group-entered-parent');
      const child = target.closest(CHILD_SEL);
      if (child && el.contains(child)) { child.classList.add('child-selected'); updateFontPanel(child); }
      updateCoordPanel(el);
    } else {
      pendingGroupEntry = null;
    }
  });

  // 창 포커스 이탈 시 모든 드래그 상태 리셋
  window.addEventListener('blur', () => {
    if (fsDragPending) { clearTimeout(fsDragPending); fsDragPending = null; }
    if (fsDragItem) { fsDragItem.style.opacity = ''; fsDragItem = null; }
    if (fsDragGhost) { fsDragGhost.remove(); fsDragGhost = null; }
    fsDragFromIdx = -1; fsDragDropIdx = -1;
    isDragging = false;
    pendingDrag = false;
    selectBoxActive = false;
    isResizing = false;
    if (layerDragItem) { layerDragItem.style.opacity = ''; layerDragItem = null; }
  });

  // ── 레이어 패널 ──
  function getElLabel(el) {
    if (el.matches('.step-dim')) return '오버레이';
    if (el.matches('.text-area')) { const h = el.querySelector('.hl'); return h ? h.textContent.trim().slice(0, 18) : '텍스트'; }
    if (el.matches('.bubble')) return el.textContent.trim().slice(0, 18);
    if (el.matches('.bg-label')) return el.textContent.trim().slice(0, 18);
    if (el.tagName === 'IMG') return '이미지';
    if (el.matches('.corner-label')) return el.textContent.trim().slice(0, 18);
    if (el.matches('.section-badge')) return el.textContent.trim().slice(0, 18);
    if (el.matches('.emoji-icon')) return el.textContent.trim().slice(0, 6) || '이모지';
    if (el.dataset.type) {
      const inner = el.querySelector('.card-title, .num-text, .icon-label, .bar-label, .flow-text, .hbar-label, .check-text, .grid-title, .quote-text, .stat-num') || el;
      return inner.textContent.trim().slice(0, 15) || el.dataset.type;
    }
    return '요소';
  }

  function getElType(el) {
    if (el.matches('.step-dim')) return 'DIM';
    if (el.matches('.text-area')) return 'HL';
    if (el.matches('.bubble')) return '말풍선';
    if (el.matches('.bg-label')) return '레이블';
    if (el.matches('.corner-label')) return '라벨';
    if (el.matches('.section-badge')) return '배지';
    if (el.tagName === 'IMG') return 'IMG';
    if (el.dataset.type) return el.dataset.type;
    return '';
  }

  function buildLayerPanel() {
    const list = document.getElementById('layer-list');
    const header = document.getElementById('layer-tab-header');
    list.innerHTML = '';
    header.innerHTML = '';
    document.querySelectorAll('.layer-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === layerActiveTab));

    if (layerActiveTab === 'animation') buildAnimationTab(list, header);
    else buildPositionTab(list, header);
  }

  function makeLayerItem(el, step) {
    const item = document.createElement('div');
    item.className = 'layer-item' + (selectedEls.includes(el) ? ' lyr-selected' : '');
    item._el = el;
    item._step = step;
    const groupBadge = el.dataset.group ? `<span class="layer-badge" style="color:#FF6B00;">[${escHTML(el.dataset.group.toUpperCase())}]</span>` : '';
    item.innerHTML = `<span class="layer-handle">⠿</span><span class="layer-label">${escHTML(getElLabel(el))}</span>${groupBadge}<span class="layer-badge">${escHTML(getElType(el))}</span>`;
    item.addEventListener('click', (ev) => {
      if (layerDragItem) return;
      if (ev.shiftKey && selectedEls.length > 0) {
        const idx = selectedEls.indexOf(el);
        if (idx >= 0) {
          el.classList.remove('edit-selected');
          selectedEls.splice(idx, 1);
          selectedEl = selectedEls[selectedEls.length - 1] || null;
        } else {
          el.style.left = el.offsetLeft + 'px'; el.style.top = el.offsetTop + 'px';
          el.style.right = ''; el.style.bottom = '';
          el.classList.add('edit-selected');
          selectedEls.push(el);
          selectedEl = el;
        }
      } else {
        selectedEls.forEach(s => { s.classList.remove('edit-selected'); s.classList.remove('edit-group-selected'); });
        const gid = el.dataset.group;
        if (gid) {
          selectedEls = Array.from(slides[currentSlide].querySelectorAll(`[data-group="${CSS.escape(gid)}"]`));
          selectedEl = el;
          selectedEls.forEach(s => s.classList.add('edit-group-selected'));
          showGroupBox(gid);
        } else {
          selectedEl = el; selectedEls = [el];
          el.style.left = el.offsetLeft + 'px'; el.style.top = el.offsetTop + 'px';
          el.style.right = ''; el.style.bottom = '';
          el.classList.add('edit-selected');
          showGroupBox(null);
        }
      }
      if (selectedEl) updateCoordPanel(selectedEl);
      updateGroupToolbar();
      buildLayerPanel();
    });
    item.addEventListener('mousedown', ev => {
      ev.stopPropagation(); ev.preventDefault();
      layerDragPending = item;
      layerDragStartY = ev.clientY;
    });
    return item;
  }

  function buildAnimationTab(list, header) {
    const slide = slides[currentSlide];

    // 프레젠테이션 설정 섹션 헤더
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'anim-section-title';
    sectionTitle.textContent = '프레젠테이션 설정';
    header.appendChild(sectionTitle);

    // "클릭 시 표시" 토글 (항상 표시, 요소 미선택 시 disabled)
    const srcLayer = selectedEl ? selectedEl.closest('.step-layer') : null;
    const currentStep = srcLayer ? parseInt(srcLayer.dataset.step) : 0;
    const isOnClick = currentStep > 0;
    const disabled = !selectedEl || (selectedEl && selectedEl.classList.contains('step-dim'));
    const row = document.createElement('div');
    row.className = 'anim-toggle-row';
    row.innerHTML = `<span class="anim-toggle-label">클릭 시 표시</span>
      <label class="anim-toggle${disabled ? ' disabled' : ''}">
        <input type="checkbox" ${isOnClick ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
        <span class="anim-toggle-slider"></span>
      </label>`;
    if (!disabled) {
      row.querySelector('input').addEventListener('change', e => {
        if (e.target.checked) moveToStep(selectedEl, 1);
        else moveToStep(selectedEl, 0);
        buildLayerPanel();
      });
    }
    header.appendChild(row);

    // 애니메이션 타입 선택 드롭다운
    const ANIM_TYPES = [
      { cls: '', label: '기본 (아래에서)' },
      { cls: 'anim-scale', label: '확대' },
      { cls: 'anim-left', label: '왼쪽에서' },
      { cls: 'anim-right', label: '오른쪽에서' },
      { cls: 'anim-pop', label: '팝' },
      { cls: 'anim-fade', label: '페이드' },
      { cls: 'anim-zoom', label: '줌' },
      { cls: 'anim-flip', label: '플립' },
      { cls: 'anim-split', label: '스플릿' },
      { cls: 'anim-center', label: '중앙 등장' },
      { cls: 'anim-underline', label: '밑줄 긋기' },
    ];
    const animTypeRow = document.createElement('div');
    animTypeRow.className = 'anim-type-row';
    const animTypeDisabled = !selectedEl || selectedEl.classList.contains('step-dim');
    const currentAnimCls = (!selectedEl || selectedEl.classList.contains('step-dim') || currentStep === 0) ? '' : (ANIM_TYPES.find(t => t.cls && selectedEl.classList.contains(t.cls)) || ANIM_TYPES[0]).cls;
    let selectHTML = '<select class="anim-type-select"' + (animTypeDisabled ? ' disabled' : '') + '>';
    ANIM_TYPES.forEach(t => {
      selectHTML += `<option value="${t.cls}"${t.cls === currentAnimCls ? ' selected' : ''}>${escHTML(t.label)}</option>`;
    });
    selectHTML += '</select>';
    animTypeRow.innerHTML = `<span class="anim-type-label">애니메이션</span>${selectHTML}`;
    if (!animTypeDisabled) {
      animTypeRow.querySelector('select').addEventListener('change', function() {
        // step-0에 있으면 자동으로 step-1로 이동 (moveToStep 내부에서 pushUndo)
        if (currentStep === 0) {
          moveToStep(selectedEl, 1);
        } else {
          pushUndo();
        }
        ANIM_TYPES.forEach(t => { if (t.cls) selectedEl.classList.remove(t.cls); });
        if (this.value) selectedEl.classList.add(this.value);
        buildLayerPanel();
      });
    }
    header.appendChild(animTypeRow);

    // 밀어올리기 전환 토글 (레이어 단위)
    const pushupRow = document.createElement('div');
    pushupRow.className = 'anim-pushup-row';
    const pushupDisabled = !selectedEl;
    const pushupLayer = selectedEl ? selectedEl.closest('.step-layer') : null;
    const isPushup = pushupLayer ? pushupLayer.dataset.transition === 'pushup' : false;
    pushupRow.innerHTML = `<span class="anim-pushup-label">밀어올리기 전환</span>
      <label class="anim-toggle${pushupDisabled ? ' disabled' : ''}">
        <input type="checkbox" ${isPushup ? 'checked' : ''} ${pushupDisabled ? 'disabled' : ''}>
        <span class="anim-toggle-slider"></span>
      </label>`;
    if (!pushupDisabled) {
      pushupRow.querySelector('input').addEventListener('change', function() {
        // step-0에 있으면 자동으로 step-1로 이동 (moveToStep 내부에서 pushUndo)
        if (currentStep === 0) {
          moveToStep(selectedEl, 1);
        } else {
          pushUndo();
        }
        const layer = selectedEl.closest('.step-layer');
        if (this.checked) {
          layer.dataset.transition = 'pushup';
          layer.classList.add('anim-pushup-layer');
          // pushup 레이어에는 dim 불필요 — step-dim 숨김
          const dim = layer.querySelector('.step-dim');
          if (dim) dim.classList.remove('anim-shown');
        } else {
          delete layer.dataset.transition;
          layer.classList.remove('anim-pushup-layer', 'push-enter', 'push-exit');
        }
        buildLayerPanel();
      });
    }
    header.appendChild(pushupRow);

    // 오버레이 없음 토글 (data-no-dim)
    const noDimRow = document.createElement('div');
    noDimRow.className = 'anim-pushup-row';
    const noDimDisabled = !selectedEl || isPushup;
    const isNoDim = pushupLayer ? pushupLayer.hasAttribute('data-no-dim') : false;
    noDimRow.innerHTML = `<span class="anim-pushup-label">오버레이 없음</span>
      <label class="anim-toggle${noDimDisabled ? ' disabled' : ''}">
        <input type="checkbox" ${isNoDim ? 'checked' : ''} ${noDimDisabled ? 'disabled' : ''}>
        <span class="anim-toggle-slider"></span>
      </label>`;
    if (!noDimDisabled) {
      noDimRow.querySelector('input').addEventListener('change', function() {
        // step-0에 있으면 자동으로 step-1로 이동 (moveToStep 내부에서 pushUndo)
        if (currentStep === 0) {
          moveToStep(selectedEl, 1);
        } else {
          pushUndo();
        }
        const layer = selectedEl.closest('.step-layer');
        if (this.checked) {
          layer.setAttribute('data-no-dim', '');
          const dim = layer.querySelector('.step-dim');
          if (dim) dim.classList.remove('anim-shown');
          syncDimOuter(slides[currentSlide]);
        } else {
          layer.removeAttribute('data-no-dim');
        }
        buildLayerPanel();
      });
    }
    header.appendChild(noDimRow);

    // "클릭하여 정렬" 라벨
    const sortLabel = document.createElement('div');
    sortLabel.className = 'anim-sort-label';
    sortLabel.innerHTML = '<span class="anim-sort-icon">☰</span> 클릭하여 정렬';
    header.appendChild(sortLabel);

    // step 1+ 요소를 행 단위로 수집 (같은 그룹 = 한 행)
    const rows = [];
    const seenGroups = new Set();
    slide.querySelectorAll('.step-layer').forEach(layer => {
      const step = parseInt(layer.dataset.step);
      if (step === 0) return;
      getOrderedEls(layer).forEach(el => {
        if (el.classList.contains('step-dim')) return;
        const gid = el.dataset.group;
        if (gid) {
          const key = gid + '-' + step;
          if (!seenGroups.has(key)) {
            seenGroups.add(key);
            const members = [...layer.querySelectorAll(`[data-group="${CSS.escape(gid)}"]`)];
            rows.push({ step, el, gid, members });
          }
        } else {
          rows.push({ step, el });
        }
      });
    });
    // 누적 클릭 번호 계산: step 오름차순 → 미그룹은 개별 번호, 그룹은 첫 등장 시 번호
    const sortedForClick = [...rows].sort((a, b) => a.step - b.step);
    let clickNum = 0;
    const groupClickMap = new Map();
    sortedForClick.forEach(row => {
      if (row.gid) {
        const key = row.gid + '-' + row.step;
        if (!groupClickMap.has(key)) {
          groupClickMap.set(key, ++clickNum);
        }
        row.clickNum = groupClickMap.get(key);
      } else {
        row.clickNum = ++clickNum;
      }
    });
    rows.sort((a, b) => b.clickNum - a.clickNum);

    if (rows.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'anim-order-empty';
      empty.textContent = '애니메이션 요소 없음';
      list.appendChild(empty);
    } else {
      rows.forEach(row => {
        const item = document.createElement('div');
        item.className = 'layer-item' + (row.el && selectedEls.includes(row.el) ? ' lyr-selected' : '');
        item._el = row.el;
        item._step = row.step;
        item._isAnimRow = true;
        item._gid = row.gid || null;
        item._members = row.members || null;

        const label = row.gid
          ? `[${escHTML(row.gid.toUpperCase())}] 그룹`
          : escHTML(getElLabel(row.el));
        const typeBadge = row.gid
          ? ''
          : `<span class="layer-badge">${escHTML(getElType(row.el))}</span>`;
        const stepBadge = `<span class="layer-step-badge">클릭${row.clickNum}회</span>`;
        item.innerHTML = `<span class="layer-handle">⠿</span><span class="layer-label">${label}</span>${typeBadge}${stepBadge}`;

        item.addEventListener('click', () => {
          if (layerDragItem) return;
          const el = row.gid ? row.members[0] : row.el;
          selectedEls.forEach(s => { s.classList.remove('edit-selected'); s.classList.remove('edit-group-selected'); });
          if (row.gid) {
            selectedEls = [...row.members];
            selectedEl = el;
            selectedEls.forEach(s => s.classList.add('edit-group-selected'));
            showGroupBox(row.gid);
          } else {
            selectedEl = el; selectedEls = [el];
            el.style.left = el.offsetLeft + 'px'; el.style.top = el.offsetTop + 'px';
            el.style.right = ''; el.style.bottom = '';
            el.classList.add('edit-selected');
            showGroupBox(null);
          }
          if (selectedEl) updateCoordPanel(selectedEl);
          updateGroupToolbar();
          buildLayerPanel();
        });
        item.addEventListener('mousedown', ev => {
          ev.stopPropagation(); ev.preventDefault();
          layerDragPending = item;
          layerDragStartY = ev.clientY;
        });
        list.appendChild(item);
      });
    }

    // step 0 요소 섹션 (항상 보임)
    const step0Els = [];
    const step0Layer = slide.querySelector('.step-layer[data-step="0"]');
    if (step0Layer) {
      Array.from(step0Layer.children).forEach(el => {
        if (el.matches(EDITABLE_SEL) && !el.classList.contains('step-dim')) step0Els.push(el);
      });
    }
    if (step0Els.length > 0) {
      const divider = document.createElement('div');
      divider.className = 'anim-step0-divider';
      divider.textContent = '── 항상 보임 ──';
      list.appendChild(divider);
      step0Els.forEach(el => {
        const item = makeLayerItem(el, 0);
        item._isAnimRow = false;
        item.style.opacity = '0.55';
        list.appendChild(item);
      });
    }

    // 오버레이 추가/삭제 버튼
    const overlayBtn = document.createElement('div');
    overlayBtn.className = 'anim-overlay-btn';
    overlayBtn.textContent = '+ 오버레이 추가';
    overlayBtn.addEventListener('click', () => {
      pushUndo();
      const sl = slides[currentSlide];
      const maxStep = parseInt(sl.dataset.steps || '1');
      // 새 step-layer 생성 + step-dim 포함 (기본: 오버레이 없음)
      const newLayer = document.createElement('div');
      newLayer.className = 'step-layer';
      newLayer.dataset.step = String(maxStep);
      newLayer.dataset.noDim = '';
      newLayer.innerHTML = '<div class="step-dim"></div>';
      sl.appendChild(newLayer);
      sl.dataset.steps = String(maxStep + 1);
      buildLayerPanel();
    });
    list.appendChild(overlayBtn);
  }

  function buildPositionTab(list) {
    const slide = slides[currentSlide];
    // 모든 요소를 z-order 순서로 수집
    const allEls = [];
    slide.querySelectorAll('.step-layer').forEach(layer => {
      const step = parseInt(layer.dataset.step);
      layer.querySelectorAll(EDITABLE_SEL).forEach(el => {
        allEls.push({ el, step, layer });
      });
    });
    // z-order: DOM 순서 기반 (뒤 = 높은 z)
    // 그룹별로 묶기
    const seen = new Set();
    const rows = []; // { type: 'single'|'group', gid, step, el, members }
    allEls.forEach(({ el, step }) => {
      const gid = el.dataset.group;
      if (gid) {
        if (!seen.has(gid)) {
          seen.add(gid);
          const members = allEls.filter(e => e.el.dataset.group === gid);
          rows.push({ type: 'group', gid, step: members[0].step, members });
        }
      } else {
        rows.push({ type: 'single', el, step });
      }
    });

    // 역순(위 z-order 먼저)으로 렌더
    [...rows].reverse().forEach(row => {
      if (row.type === 'group') {
        const isExpanded = expandedGroups.has(row.gid);
        const grpRow = document.createElement('div');
        grpRow.className = 'layer-item-group';
        grpRow.innerHTML = `<span class="layer-handle">⠿</span><span class="grp-name">[${escHTML(row.gid.toUpperCase())}] 그룹</span><span class="layer-step-badge">S${row.step}</span><span class="grp-arrow">${isExpanded ? '▲' : '▽'}</span>`;
        grpRow._gid = row.gid;
        grpRow._step = row.step;
        grpRow.addEventListener('click', () => {
          if (expandedGroups.has(row.gid)) expandedGroups.delete(row.gid);
          else expandedGroups.add(row.gid);
          buildLayerPanel();
        });
        grpRow.addEventListener('mousedown', ev => {
          ev.stopPropagation(); ev.preventDefault();
          layerDragPending = grpRow;
          layerDragStartY = ev.clientY;
        });
        list.appendChild(grpRow);
        if (isExpanded) {
          row.members.forEach(({ el, step }) => {
            const item = makeLayerItem(el, step);
            item.classList.add('pos-child');
            // step badge 추가
            const badge = document.createElement('span');
            badge.className = 'layer-step-badge';
            badge.textContent = 'S' + step;
            item.appendChild(badge);
            list.appendChild(item);
          });
        }
      } else {
        const item = makeLayerItem(row.el, row.step);
        const badge = document.createElement('span');
        badge.className = 'layer-step-badge';
        badge.textContent = 'S' + row.step;
        item.appendChild(badge);
        list.appendChild(item);
      }
    });
  }

  // ── step 간 이동 ──
  function moveToStep(el, targetStep) {
    if (el.classList.contains('step-dim')) return; // step-dim은 이동 불가
    const slide = slides[currentSlide];
    const srcLayer = el.closest('.step-layer');
    if (!srcLayer || parseInt(srcLayer.dataset.step) === targetStep) return;
    pushUndo();
    if (targetStep >= 1) {
      let targetLayer = slide.querySelector(`.step-layer[data-step="${targetStep}"]`);
      if (!targetLayer) {
        targetLayer = document.createElement('div');
        targetLayer.className = 'step-layer';
        targetLayer.dataset.step = String(targetStep);
        targetLayer.dataset.noDim = '';
        targetLayer.innerHTML = '<div class="step-dim"></div>';
        slide.appendChild(targetLayer);
        slide.dataset.steps = String(Math.max(parseInt(slide.dataset.steps || '1'), targetStep + 1));
      }
      srcLayer.removeChild(el);
      if (el.matches('.text-area')) {
        const sc = document.createElement('div');
        sc.className = 'step-content';
        sc.innerHTML = el.innerHTML;
        el.innerHTML = '';
        el.appendChild(sc);
      }
      targetLayer.appendChild(el);
      if (parseInt(srcLayer.dataset.step) > 0 && !srcLayer.querySelector(EDITABLE_SEL + ':not(.step-dim)')) {
        srcLayer.remove();
        recalcSteps(slide);
      }
    } else {
      const layer0 = slide.querySelector('.step-layer[data-step="0"]');
      if (!layer0) return;
      srcLayer.removeChild(el);
      if (el.matches('.text-area')) {
        const sc = el.querySelector(':scope > .step-content');
        if (sc) el.innerHTML = sc.innerHTML;
      }
      layer0.appendChild(el);
      if (!srcLayer.querySelector(EDITABLE_SEL + ':not(.step-dim)')) {
        srcLayer.remove();
        recalcSteps(slide);
      }
    }
    buildLayerPanel();
  }

  function updateLayerHover(clientY) {
    if (!layerDragItem) return;
    const list = document.getElementById('layer-list');
    const listRect = list.getBoundingClientRect();
    // layer-item + drop-zone 모두 대상
    const others = Array.from(list.querySelectorAll('.layer-item, .layer-drop-zone')).filter(i => i !== layerDragItem);

    // 현재 커서 위치가 속한 섹션 결정 (위에서 가장 가까운 section-header)
    let curSection = 0;
    Array.from(list.querySelectorAll('.layer-section-header')).forEach(hdr => {
      const r = hdr.getBoundingClientRect();
      if (clientY >= r.bottom) curSection = hdr._section !== undefined ? hdr._section : curSection;
    });
    layerTargetSection = curSection;

    // drop-zone highlight
    list.querySelectorAll('.layer-drop-zone').forEach(z => {
      z.classList.toggle('drag-over', z._step === curSection);
    });

    let newOverItem = null, newOverPos = null, lineY = 0;
    let found = false;
    for (const item of others) {
      const r = item.getBoundingClientRect();
      if (clientY < r.top + r.height / 2) {
        newOverItem = item;
        newOverPos = 'top';
        lineY = r.top - listRect.top + list.scrollTop;
        found = true;
        break;
      }
    }
    if (!found && others.length > 0) {
      const last = others[others.length - 1];
      const r = last.getBoundingClientRect();
      newOverItem = last;
      newOverPos = 'bot';
      lineY = r.bottom - listRect.top + list.scrollTop;
    }

    layerOverItem = newOverItem;
    layerOverPos = newOverPos;
    if (layerDropLine) {
      layerDropLine.style.display = newOverItem ? '' : 'none';
      layerDropLine.style.top = lineY + 'px';
    }
  }

  function toggleLayerPanel() {
    const panel = document.getElementById('layer-panel');
    if (panel.classList.toggle('visible')) buildLayerPanel();
  }

  document.querySelectorAll('.layer-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      layerActiveTab = tab.dataset.tab;
      buildLayerPanel();
    });
  });

  // ── 정렬 컨텍스트 메뉴 ──
  const alignMenu = document.getElementById('align-menu');
  function alignToPage(dir) {
    if (dir === 'h-dist') {
      if (selectedEls.length < 3) return;
      pushUndo();
      const sorted = [...selectedEls].sort((a, b) => a.offsetLeft - b.offsetLeft);
      const min = sorted[0].offsetLeft;
      const max = sorted[sorted.length - 1].offsetLeft;
      const gap = (max - min) / (sorted.length - 1);
      sorted.forEach((el, i) => { el.style.left = Math.round(min + gap * i) + 'px'; });
      return;
    }
    if (dir === 'v-dist') {
      if (selectedEls.length < 3) return;
      pushUndo();
      const sorted = [...selectedEls].sort((a, b) => a.offsetTop - b.offsetTop);
      const min = sorted[0].offsetTop;
      const max = sorted[sorted.length - 1].offsetTop;
      const gap = (max - min) / (sorted.length - 1);
      sorted.forEach((el, i) => { el.style.top = Math.round(min + gap * i) + 'px'; });
      return;
    }
    if (!selectedEl) return;
    pushUndo();
    if (selectedEls.length >= 2) {
      // 다중 요소: 요소 간 정렬
      if (dir === 'left') {
        const minL = Math.min(...selectedEls.map(e => e.offsetLeft));
        selectedEls.forEach(e => { e.style.left = minL + 'px'; });
      } else if (dir === 'right') {
        const maxR = Math.max(...selectedEls.map(e => e.offsetLeft + e.offsetWidth));
        selectedEls.forEach(e => { e.style.left = (maxR - e.offsetWidth) + 'px'; });
      } else if (dir === 'top') {
        const minT = Math.min(...selectedEls.map(e => e.offsetTop));
        selectedEls.forEach(e => { e.style.top = minT + 'px'; });
      } else if (dir === 'bottom') {
        const maxB = Math.max(...selectedEls.map(e => e.offsetTop + e.offsetHeight));
        selectedEls.forEach(e => { e.style.top = (maxB - e.offsetHeight) + 'px'; });
      } else if (dir === 'h') {
        selectedEls.forEach(e => { e.style.left = Math.round((1920 - e.offsetWidth) / 2) + 'px'; });
      } else if (dir === 'v') {
        selectedEls.forEach(e => { e.style.top = Math.round((1080 - e.offsetHeight) / 2) + 'px'; });
      }
    } else {
      // 단일 요소: 슬라이드 기준 정렬
      selectedEl.style.left = selectedEl.offsetLeft + 'px';
      selectedEl.style.top  = selectedEl.offsetTop  + 'px';
      selectedEl.style.right = ''; selectedEl.style.bottom = '';
      const hasCT = /translate\(-50%/.test(selectedEl.style.transform || '');
      if (dir === 'left') {
        selectedEl.style.left = '120px';
      } else if (dir === 'right') {
        selectedEl.style.left = (1920 - selectedEl.offsetWidth - 120) + 'px';
      } else if (dir === 'top') {
        selectedEl.style.top = '80px';
      } else if (dir === 'bottom') {
        selectedEl.style.top = (1080 - selectedEl.offsetHeight - 80) + 'px';
      } else if (dir === 'h') {
        selectedEl.style.left = hasCT ? '960px' : Math.round((1920 - selectedEl.offsetWidth) / 2) + 'px';
      } else if (dir === 'v') {
        selectedEl.style.top = hasCT ? '540px' : Math.round((1080 - selectedEl.offsetHeight) / 2) + 'px';
      }
    }
    if (selectedEl) updateCoordPanel(selectedEl);
  }
  document.addEventListener('contextmenu', e => {
    if (!editMode) { e.preventDefault(); goPrev(); return; }
    const el = e.target.closest(EDITABLE_SEL);
    if (!el || !document.getElementById('stage').contains(el)) return;
    e.preventDefault();
    const layer = el.closest('.step-layer');
    if (!editMode && layer && layer.dataset.step !== '0' && !layer.classList.contains('visible')) return;
    if (selectedEl !== el) {
      selectedEls.forEach(s => s.classList.remove('edit-selected'));
      selectedEl = el;
      selectedEls = [el];
      el.style.left = el.offsetLeft + 'px'; el.style.top = el.offsetTop + 'px';
      el.style.right = ''; el.style.bottom = '';
      selectedEl.classList.add('edit-selected');
      updateCoordPanel(el);
    }
    alignMenu.style.left = e.clientX + 'px'; alignMenu.style.top = e.clientY + 'px';
    alignMenu.classList.add('visible');
  });
  alignMenu.addEventListener('click', e => {
    const item = e.target.closest('.align-item');
    if (!item) return;
    if (item.dataset.action === 'group') {
      if (selectedEls.length >= 2) {
        pushUndo();
        const gid = 'g' + Date.now();
        selectedEls.forEach(el => { el.dataset.group = gid; });
        if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
      }
    } else if (item.dataset.action === 'ungroup') {
      if (selectedEls.length) {
        pushUndo();
        selectedEls.forEach(el => { delete el.dataset.group; });
        if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
      }
    } else if (item.dataset.align) {
      alignToPage(item.dataset.align);
    }
    alignMenu.classList.remove('visible');
  });
  document.addEventListener('click', () => alignMenu.classList.remove('visible'));

  // ── 상단 툴바 이벤트 ──
  document.getElementById('tb-exit').addEventListener('click', () => toggleEditMode());
  document.getElementById('tb-font-dec').addEventListener('click', () => applyFontSize(-4));
  document.getElementById('tb-font-inc').addEventListener('click', () => applyFontSize(4));
  document.getElementById('tb-font-size').addEventListener('change', () => {
    if (!selectedEl) return;
    const tbInput = document.getElementById('tb-font-size');
    const fs = Math.max(10, Math.min(500, parseInt(tbInput.value) || 108));
    tbInput.value = fs;
    document.getElementById('font-size-input').value = fs;
    applyFontSize(0);
  });
  document.querySelectorAll('.tb-align').forEach(btn => {
    btn.addEventListener('click', () => alignToPage(btn.dataset.align));
  });
  document.getElementById('tb-group').addEventListener('click', () => {
    if (selectedEls.length < 2) return;
    pushUndo();
    const gid = 'g' + Date.now();
    selectedEls.forEach(el => { el.dataset.group = gid; });
    if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
  });
  document.getElementById('tb-ungroup').addEventListener('click', () => {
    if (!selectedEls.length) return;
    pushUndo();
    selectedEls.forEach(el => { delete el.dataset.group; });
    if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
  });
  document.getElementById('tb-delete').addEventListener('click', () => {
    if (!selectedEls.length || !editMode) return;
    pushUndo();
    const slide = slides[currentSlide];
    [...selectedEls].forEach(el => {
      const layer = el.closest('.step-layer');
      if (layer) {
        layer.removeChild(el);
        if (parseInt(layer.dataset.step) > 0 && !layer.querySelector(EDITABLE_SEL + ':not(.step-dim)')) {
          layer.remove();
          recalcSteps(slide);
        }
      } else if (el.parentElement) {
        el.parentElement.removeChild(el);
      }
    });
    selectedEl = null; selectedEls = [];
    document.getElementById('coord-panel').style.display = 'none';
    document.querySelectorAll('.resize-handle').forEach(h => h.classList.remove('visible'));
    if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
  });
  document.getElementById('tb-undo').addEventListener('click', () => doUndo());
  document.getElementById('tb-save').addEventListener('click', () => {
    if (isGitHubPages && !ghIsDirty()) { showToast('변경사항 없음', 2000); return; }
    saveToFile(true);
  });
  document.getElementById('tb-anim').addEventListener('click', () => {
    layerActiveTab = 'animation';
    const panel = document.getElementById('layer-panel');
    if (panel.classList.contains('visible')) {
      panel.classList.remove('visible');
    } else {
      panel.classList.add('visible');
      buildLayerPanel();
    }
  });

  // ── HL 배경색/글자색 팔레트 ──
  (function() {
    const paletteBg = document.getElementById('palette-bg');
    const paletteFc = document.getElementById('palette-fc');
    const btnBg = document.getElementById('tb-bg-color');
    const btnFc = document.getElementById('tb-fc-color');
    const indBg = document.getElementById('tb-bg-indicator');
    const indFc = document.getElementById('tb-fc-indicator');
    const BG_CLASSES = ['bg-blue','bg-red','bg-green','bg-white','bg-black','bg-gray'];
    const FC_CLASSES = ['fc-white','fc-red','fc-blue','fc-yellow','fc-black'];
    const BG_COLORS = {'':'transparent','bg-blue':'rgba(255,148,52,0.12)','bg-red':'rgba(0,0,0,0.06)','bg-green':'rgba(255,148,52,0.12)','bg-white':'#fff','bg-black':'#222','bg-accent':'rgba(255,148,52,0.15)','bg-gray':'#999'};
    const FC_COLORS = {'':'#222','fc-white':'#fff','fc-red':'#FF6B00','fc-blue':'#FF6B00','fc-yellow':'#FF6B00'};

    function closePalettes() {
      paletteBg.classList.remove('open');
      paletteFc.classList.remove('open');
    }
    function positionPalette(palette, btn) {
      const r = btn.getBoundingClientRect();
      palette.style.left = r.left + 'px';
      palette.style.top = (r.bottom + 4) + 'px';
    }
    function getHlEls() {
      return selectedEls.map(e => {
        if (e.matches('.hl')) return [e];
        const hls = e.querySelectorAll('.hl');
        return hls.length ? Array.from(hls) : [];
      }).flat();
    }
    function updateIndicators() {
      const hls = getHlEls();
      if (hls.length === 0) return;
      const h = hls[0];
      const bgCls = BG_CLASSES.find(c => h.classList.contains(c)) || '';
      const fcCls = FC_CLASSES.find(c => h.classList.contains(c)) || '';
      indBg.style.background = BG_COLORS[bgCls] || 'transparent';
      indFc.style.background = FC_COLORS[fcCls] || '#222';
      paletteBg.querySelectorAll('.color-swatch').forEach(s => s.classList.toggle('active', s.dataset.cls === bgCls));
      paletteFc.querySelectorAll('.color-swatch').forEach(s => s.classList.toggle('active', s.dataset.cls === fcCls));
    }
    btnBg.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = paletteBg.classList.contains('open');
      closePalettes();
      if (!isOpen) { positionPalette(paletteBg, btnBg); paletteBg.classList.add('open'); updateIndicators(); }
    });
    btnFc.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = paletteFc.classList.contains('open');
      closePalettes();
      if (!isOpen) { positionPalette(paletteFc, btnFc); paletteFc.classList.add('open'); updateIndicators(); }
    });
    paletteBg.addEventListener('click', (e) => {
      const sw = e.target.closest('.color-swatch');
      if (!sw) return;
      pushUndo();
      const hls = getHlEls();
      hls.forEach(h => {
        BG_CLASSES.forEach(c => h.classList.remove(c));
        if (sw.dataset.cls) h.classList.add(sw.dataset.cls);
      });
      updateIndicators();
      closePalettes();
    });
    paletteFc.addEventListener('click', (e) => {
      const sw = e.target.closest('.color-swatch');
      if (!sw) return;
      pushUndo();
      // 부분 글자색: 텍스트 편집 중 선택 범위가 있으면 해당 범위만 색상 적용
      if (isEditing) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
          const color = FC_COLORS[sw.dataset.cls] || '#222';
          document.execCommand('foreColor', false, color);
          closePalettes();
          return;
        }
      }
      const hls = getHlEls();
      hls.forEach(h => {
        FC_CLASSES.forEach(c => h.classList.remove(c));
        if (sw.dataset.cls) h.classList.add(sw.dataset.cls);
      });
      updateIndicators();
      closePalettes();
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#palette-bg, #palette-fc, #tb-bg-color, #tb-fc-color')) closePalettes();
    });
  })();

  // ── 복사/붙여넣기 (Ctrl+V) ──
  document.addEventListener('paste', e => {
    if (!editMode || isEditing) return;
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
    if (!item) {
      // 요소 붙여넣기 (내부 클립보드)
      if (clipboardEl) {
        e.preventDefault();
        pushUndo();
        const temp = document.createElement('div');
        temp.innerHTML = clipboardEl;
        const newEl = temp.firstElementChild;
        if (!newEl) return;
        newEl.style.left = (parseInt(newEl.style.left) || 0) + 20 + 'px';
        newEl.style.top  = (parseInt(newEl.style.top)  || 0) + 20 + 'px';
        newEl.classList.remove('edit-selected');
        delete newEl.dataset.group;
        const layer0 = slides[currentSlide].querySelector('.step-layer[data-step="0"]');
        layer0.appendChild(newEl);
        selectedEls.forEach(s => s.classList.remove('edit-selected'));
        selectedEl = newEl; selectedEls = [newEl];
        newEl.classList.add('edit-selected');
        updateCoordPanel(newEl);
        updateResizeHandle();
        if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
      }
      return;
    }
    e.preventDefault();
    pushUndo();

    const blob = item.getAsFile();
    if (!blob) return;
    const targetSlide = currentSlide;
    const reader = new FileReader();
    reader.onload = ev => {
      const tempImg = new Image();
      tempImg.onload = () => {
        const MAX_W = 960;
        let w = tempImg.naturalWidth, h = tempImg.naturalHeight;
        if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }

        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(tempImg, 0, 0, w, h);

        const addImg = (src) => {
          const img = document.createElement('img');
          img.src = src;
          img.draggable = false;
          img.style.position = 'absolute';
          const slideW = 1920, slideH = 1080;
          const imgW = Math.min(w, 680);
          const imgH = Math.round(h * imgW / w);
          img.style.top = Math.round((slideH - imgH) / 2) + 'px';
          img.style.left = Math.round((slideW - imgW) / 2) + 'px';
          img.style.maxWidth = '680px';

          const layer0 = slides[targetSlide].querySelector('.step-layer[data-step="0"]');
          layer0.appendChild(img);

          selectedEls.forEach(s => s.classList.remove('edit-selected'));
          selectedEl = img;
          selectedEls = [img];
          img.classList.add('edit-selected');
          updateCoordPanel(img);
        };

        if (imgDirHandle) {
          canvas.toBlob(async (outBlob) => {
            const filename = `img-${Date.now()}.jpg`;
            try {
              const imgFileHandle = await imgDirHandle.getFileHandle(filename, { create: true });
              const writable = await imgFileHandle.createWritable();
              await writable.write(outBlob);
              await writable.close();
              addImg(`./images/${filename}`);
            } catch(err) {
              console.error(err);
              showToast('⚠️ 이미지를 파일로 저장하지 못해 내장 저장합니다', 4000);
              addImg(canvas.toDataURL('image/jpeg', 0.8));
            }
          }, 'image/jpeg', 0.8);
        } else {
          addImg(canvas.toDataURL('image/jpeg', 0.8));
        }
      };
      tempImg.src = ev.target.result;
    };
    reader.readAsDataURL(blob);
  });

  function applyStepState(clone, step) {
    clone.querySelectorAll('.step-layer[data-step]').forEach(layer => {
      const s = parseInt(layer.dataset.step);
      if (s === 0) {
        layer.style.opacity = '1';
        layer.classList.add('visible');
      } else if (s <= step) {
        layer.style.opacity = '1';
        layer.classList.add('visible');
        getOrderedEls(layer).forEach(el => el.classList.add('anim-shown'));
        const content = layer.querySelector('.step-content');
        if (content) { content.style.opacity = '1'; content.style.transform = 'translateY(0)'; }
      } else {
        layer.style.opacity = '0';
        layer.classList.remove('visible');
      }
    });
  }

  function slidePreviewHTML(slide, step) {
    const clone = slide.cloneNode(true);
    clone.style.cssText = 'position:relative; width:1920px; height:1080px; opacity:1; transform:none; pointer-events:none;';
    clone.querySelectorAll('.edit-selected, .edit-group-selected').forEach(el => { el.classList.remove('edit-selected'); el.classList.remove('edit-group-selected'); });
    applyStepState(clone, step);
    return clone.outerHTML;
  }

  function syncPresenter() {
    if (!presenterWindow || presenterWindow.closed) return;
    const slide = slides[currentSlide];
    const totalSteps = getSteps(slide);
    const nextSlide = slides[currentSlide + 1];
    let nextHTML = '';
    let nextSlideHTML = '';
    if (currentStep + 1 < totalSteps) {
      nextHTML = slidePreviewHTML(slide, currentStep + 1);
      nextSlideHTML = nextSlide ? slidePreviewHTML(nextSlide, 0) : '';
    } else if (nextSlide) {
      nextHTML = slidePreviewHTML(nextSlide, 0);
      const nextNextSlide = slides[currentSlide + 2];
      nextSlideHTML = nextNextSlide ? slidePreviewHTML(nextNextSlide, 0) : '';
    }
    presenterChannel.postMessage({
      type: 'sync',
      slide: currentSlide,
      step: currentStep,
      total: slides.length,
      currentHTML: slidePreviewHTML(slide, currentStep),
      nextHTML,
      nextSlideHTML,
      notes: slide.dataset.notes || ''
    });
  }

  presenterChannel.onmessage = e => {
    if (e.data.type === 'ready') { syncPresenter(); return; }
    if (e.data.type === 'nav') {
      if (e.data.action === 'next') goNext();
      else if (e.data.action === 'prev') goPrev();
    }
    if (e.data.type === 'notes') {
      if (slides[e.data.slide]) slides[e.data.slide].dataset.notes = e.data.text;
    }
  };

  function openPresenterView() {
    if (presenterWindow && !presenterWindow.closed) { presenterWindow.close(); presenterWindow = null; return; }
    const sw = screen.width, sh = screen.height;
    const pw = 960, ph = 700;
    const pl = Math.round((sw - pw) / 2), pt = Math.round((sh - ph) / 2);
    presenterWindow = window.open('', 'presenter', `width=${pw},height=${ph},left=${pl},top=${pt},resizable=yes`);
    if (!presenterWindow) return;
    const cssHref = new URL('./assets/slide-style.css', location.href).href;
    presenterWindow.document.write(`<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8">
<title>발표자 모드</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${cssHref}">
<style>
html, body { width: 100%; height: 100vh; overflow: hidden; background: #1a1a1a !important; display: block !important; flex-direction: unset !important; justify-content: unset !important; align-items: unset !important; }
#presenter-root { display: flex; flex-direction: column; height: 100vh; font-family: 'Pretendard', 'Noto Sans KR', sans-serif; color: #fff; }
#pres-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; background: #111; border-bottom: 1px solid #333; font-size: 15px; font-weight: 700; flex-shrink: 0; }
#pres-slide-info { color: #FF6B00; }
#pres-timer { color: #aaa; font-family: monospace; font-size: 18px; }
#pres-main { display: flex; flex: 1; overflow: hidden; min-height: 0; }
#pres-current-wrap { flex: 6; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
#pres-next-wrap { flex: 4; padding: 12px; display: flex; flex-direction: column; gap: 4px; border-left: 1px solid #333; }
#pres-next-slide-wrap { flex: 1; display: flex; flex-direction: column; gap: 4px; border-top: 1px solid #333; padding-top: 8px; }
.pres-label { font-size: 11px; color: #888; font-weight: 700; flex-shrink: 0; }
.slide-preview { position: relative; overflow: hidden; flex: 1; background: #ddd; border-radius: 4px; }
.slide-clone-wrap { position: absolute; top: 0; left: 0; transform-origin: top left; pointer-events: none; }
.slide-clone-wrap * { transition: none !important; animation: none !important; }
#pres-notes { padding: 10px 16px; background: #111; border-top: 1px solid #333; height: 160px; display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
#pres-notes-label { font-size: 11px; color: #888; font-weight: 700; }
#pres-notes-input { flex: 1; background: #222; border: 1px solid #444; border-radius: 6px; color: #fff; font-size: 13px; padding: 6px 10px; font-family: inherit; overflow-y: auto; line-height: 1.8; }
#pres-footer { display: flex; justify-content: space-between; padding: 8px 16px; background: #111; border-top: 1px solid #333; flex-shrink: 0; }
#pres-footer button { background: #333; border: 1px solid #555; color: #fff; font-size: 14px; font-weight: 700; padding: 6px 20px; border-radius: 6px; cursor: pointer; }
#pres-footer button:hover { background: #444; }
.step-layer { position: absolute; inset: 0; pointer-events: none; }
.step-dim { position: absolute; inset: 0; }
.step-content { position: relative; z-index: 1; }
<\/style>
<\/head>
<body>
<div id="presenter-root">
  <div id="pres-header">
    <div id="pres-slide-info">슬라이드 1 / 1</div>
    <div id="pres-timer">00:00:00</div>
  </div>
  <div id="pres-main">
    <div id="pres-current-wrap">
      <div class="pres-label">현재 슬라이드</div>
      <div class="slide-preview" id="pres-current"><\/div>
    <\/div>
    <div id="pres-next-wrap">
      <div class="pres-label">다음 화면</div>
      <div class="slide-preview" id="pres-next" style="flex:1;"><\/div>
      <div id="pres-next-slide-wrap">
        <div class="pres-label">다음 슬라이드</div>
        <div class="slide-preview" id="pres-next-slide" style="flex:1;"><\/div>
      <\/div>
    <\/div>
  <\/div>
  <div id="pres-notes">
    <div id="pres-notes-label">참고 (원고)<\/div>
    <div id="pres-notes-input" contenteditable="true" style="white-space:pre-wrap;overflow-y:auto;" placeholder="발표 노트..."><\/div>
  <\/div>
  <div id="pres-footer">
    <button id="pres-btn-prev">◀ 이전<\/button>
    <button id="pres-btn-next">다음 ▶<\/button>
  <\/div>
<\/div>
<script>
const ch = new BroadcastChannel('slide-presenter-${sessionId}');
let curSlideIdx = 0;
const startTime = Date.now();
setInterval(() => {
  const e2 = Math.floor((Date.now() - startTime) / 1000);
  const h = String(Math.floor(e2 / 3600)).padStart(2,'0');
  const m = String(Math.floor((e2 % 3600) / 60)).padStart(2,'0');
  const s = String(e2 % 60).padStart(2,'0');
  document.getElementById('pres-timer').textContent = h+':'+m+':'+s;
}, 1000);
function renderPreview(container, html) {
  container.innerHTML = '';
  if (!html) return;
  const wrap = document.createElement('div');
  wrap.className = 'slide-clone-wrap';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const slideEl = temp.firstElementChild;
  if (!slideEl) return;
  slideEl.style.cssText = 'position:relative; width:1920px; height:1080px; opacity:1; transform:none; pointer-events:none;';
  slideEl.querySelectorAll('.edit-selected, .edit-group-selected').forEach(el => { el.classList.remove('edit-selected'); el.classList.remove('edit-group-selected'); });
  wrap.appendChild(slideEl);
  container.appendChild(wrap);
  const cw = container.offsetWidth, ch2 = container.offsetHeight;
  const scale = Math.min(cw / 1920, ch2 / 1080);
  wrap.style.transform = 'scale(' + scale + ')';
  wrap.style.width = '1920px';
  wrap.style.height = '1080px';
}
ch.onmessage = ev => {
  const d = ev.data;
  if (d.type === 'sync') {
    curSlideIdx = d.slide;
    document.getElementById('pres-slide-info').textContent = '슬라이드 ' + (d.slide + 1) + ' / ' + d.total;
    renderPreview(document.getElementById('pres-current'), d.currentHTML);
    renderPreview(document.getElementById('pres-next'), d.nextHTML);
    renderPreview(document.getElementById('pres-next-slide'), d.nextSlideHTML || '');
    const fullNotes = d.notes || '';
    const el = document.getElementById('pres-notes-input');
    el.textContent = fullNotes;
  }
};
document.getElementById('pres-btn-prev').addEventListener('click', () => ch.postMessage({ type: 'nav', action: 'prev' }));
document.getElementById('pres-btn-next').addEventListener('click', () => ch.postMessage({ type: 'nav', action: 'next' }));
document.getElementById('pres-notes-input').addEventListener('input', ev => ch.postMessage({ type: 'notes', slide: curSlideIdx, text: ev.target.textContent }));
document.addEventListener('keydown', ev => {
  if (document.activeElement && document.activeElement.id === 'pres-notes-input') return;
  if (ev.key === 'ArrowRight') { ev.preventDefault(); ch.postMessage({ type: 'nav', action: 'next' }); }
  if (ev.key === 'ArrowLeft') { ev.preventDefault(); ch.postMessage({ type: 'nav', action: 'prev' }); }
});
ch.postMessage({ type: 'ready' });
<\/script>
<\/body><\/html>`);
    presenterWindow.document.close();
    presenterWindow.resizeTo(pw, ph);
    presenterWindow.moveTo(pl, pt);
    setTimeout(() => syncPresenter(), 200);
  }

  // ── Drill-Down (compound 요소 내부 선택) ──
  const COMPOUND_CHILDREN = {
    'bar-chart': '.bar-row',
    'checklist': '.check-item',
    'grid-card-wrap': '.grid-card',
    'btn-grid': '.btn-pill',
    'step-timeline': '.tl-circle, .tl-box',
    'compare-box': '.compare-col',
    'tag-group': '.tag-chip',
    'cta-group': '.cta-btn',
  };
  let drillParent = null;

  function getCompoundChildSel(el) {
    for (const [cls, sel] of Object.entries(COMPOUND_CHILDREN)) {
      if (el.classList.contains(cls)) {
        const children = el.querySelectorAll(sel);
        if (children.length >= 2) return sel;
      }
    }
    return null;
  }

  function enterDrill(el) {
    if (drillParent) exitDrill();
    drillParent = el;
    el.classList.add('drill-active');
  }

  function exitDrill() {
    if (!drillParent) return;
    drillParent.classList.remove('drill-active');
    document.querySelectorAll('.drill-child-selected').forEach(e => e.classList.remove('drill-child-selected'));
    drillParent = null;
  }

  // ── group-toolbar 위치 업데이트 ──
  const groupToolbar = document.getElementById('group-toolbar');
  document.getElementById('gt-ungroup').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!selectedEl || !editMode) return;
    pushUndo();
    const gid = selectedEl.dataset.group;
    if (gid) {
      selectedEls.forEach(el => delete el.dataset.group);
    } else {
      // compound 분리
      const childSel = getCompoundChildSel(selectedEl);
      if (childSel) {
        if (selectedEl.classList.contains('bar-chart') ||
            selectedEl.classList.contains('hbar-chart') ||
            selectedEl.classList.contains('line-chart')) {
          return; // 차트는 분리 불가
        }
        const layer = selectedEl.closest('.step-layer');
        const children = Array.from(selectedEl.querySelectorAll(childSel));
        const stageRect = document.getElementById('stage').getBoundingClientRect();
        const scale = Math.min(innerWidth / 1920, innerHeight / 1080);
        children.forEach(child => {
          const cr = child.getBoundingClientRect();
          const newEl = child.cloneNode(true);
          newEl.style.position = 'absolute';
          newEl.style.left = Math.round((cr.left - stageRect.left) / scale) + 'px';
          newEl.style.top = Math.round((cr.top - stageRect.top) / scale) + 'px';
          layer.appendChild(newEl);
        });
        layer.removeChild(selectedEl);
      }
    }
    selectedEl = null; selectedEls = [];
    groupToolbar.classList.remove('visible');
    exitDrill();
    if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
  });
  document.getElementById('gt-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!selectedEls.length || !editMode) return;
    pushUndo();
    const slide = slides[currentSlide];
    [...selectedEls].forEach(el => {
      const layer = el.closest('.step-layer');
      if (layer) {
        layer.removeChild(el);
        if (parseInt(layer.dataset.step) > 0 && !layer.querySelector(EDITABLE_SEL + ':not(.step-dim)')) {
          layer.remove();
          recalcSteps(slide);
        }
      } else if (el.parentElement) {
        el.parentElement.removeChild(el);
      }
    });
    selectedEl = null; selectedEls = [];
    groupToolbar.classList.remove('visible');
    exitDrill();
    document.getElementById('coord-panel').style.display = 'none';
    if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
  });

  function updateGroupToolbar() {
    if (!selectedEl || !editMode) { groupToolbar.classList.remove('visible'); return; }
    const hasGroup = selectedEls.some(e => e.dataset.group);
    const hasCompound = getCompoundChildSel(selectedEl);
    if (!hasGroup && !hasCompound) { groupToolbar.classList.remove('visible'); return; }
    groupToolbar.classList.add('visible');
    const rect = selectedEl.getBoundingClientRect();
    groupToolbar.style.left = rect.left + 'px';
    groupToolbar.style.top = Math.max(4, rect.top - 44) + 'px';
  }

  document.querySelectorAll('.line-chart').forEach(el => buildLineChart(el));
