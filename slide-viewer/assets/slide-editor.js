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
  // 머지 후 슬라이드 모델: 138장 = 38 base + 100 variants
  // - canonical idx: DOM 순서 (0..137)
  // - visible idx: 필름스트립에서 보이는 fs-item 순서 (펼쳐진 page-group의 variants 포함)
  // - presentation 모드: base만 순회 (←/→는 다음/이전 base로)
  // - 편집 모드: 모든 138장 순회 (←/→는 canonical ±1)
  // - stable key: data-slide-id (예: T03_v1) → slidesByKey 매핑

  // 같은 page-group의 base와 variants가 DOM에서 인접 배치되어 있다는 불변식에 의존
  function rebuildSlidesByKey() {
    slidesByKey = {};
    slides.forEach(s => {
      if (s.dataset.slideId) slidesByKey[s.dataset.slideId] = s;
      // display label: 1-indexed (base: "3-1", variant1: "3-2", ...)
      const pg = s.dataset.pageGroup;
      const v = parseInt(s.dataset.variant || "0") + 1;
      if (pg) s.dataset.displayLabel = `${pg}-${v}`;
    });
  }

  function getPageGroupVariants(pg) {
    // 같은 page-group의 variant slide(들) (data-variant != "0")
    return [...slides].filter(s => s.dataset.pageGroup === String(pg) && s.dataset.variant !== "0");
  }

  function pageGroupHasVariants(pg) {
    return getPageGroupVariants(pg).length > 0;
  }

  function togglePageGroup(pg) {
    pg = String(pg);
    const variantItems = document.querySelectorAll(`#filmstrip-inner .fs-item.fs-variant[data-page-group="${pg}"]`);
    if (variantItems.length === 0) return;
    if (expandedFilmGroups.has(pg)) {
      expandedFilmGroups.delete(pg);
      variantItems.forEach(el => el.classList.remove('show'));
    } else {
      expandedFilmGroups.add(pg);
      variantItems.forEach(el => el.classList.add('show'));
    }
  }

  function expandPageGroup(pg) {
    pg = String(pg);
    if (expandedFilmGroups.has(pg)) return;
    const variantItems = document.querySelectorAll(`#filmstrip-inner .fs-item.fs-variant[data-page-group="${pg}"]`);
    if (variantItems.length === 0) return;
    expandedFilmGroups.add(pg);
    variantItems.forEach(el => el.classList.add('show'));
  }

  function visibleFilmstripCanonicalIdxs() {
    return [...document.querySelectorAll('#filmstrip-inner .fs-item:not(.fs-variant), #filmstrip-inner .fs-item.fs-variant.show')]
      .map(el => parseInt(el.dataset.canonicalIdx));
  }

  function visibleToCanonical(visIdx) {
    return visibleFilmstripCanonicalIdxs()[visIdx];
  }

  function canonicalToVisible(canIdx) {
    return visibleFilmstripCanonicalIdxs().indexOf(canIdx);
  }

  function buildFilmstrip() {
    const inner = document.getElementById('filmstrip-inner');
    if (!inner) return;
    inner.innerHTML = '';
    slides.forEach((slide, idx) => {
      const pg = slide.dataset.pageGroup;
      const variant = slide.dataset.variant; // "0" = base, "1"+ = variant
      const isVariant = variant && variant !== "0";

      const item = document.createElement('div');
      let cls = 'fs-item';
      if (idx === currentSlide) cls += ' current';
      if (isVariant) {
        cls += ' fs-variant';
        if (pg && expandedFilmGroups.has(String(pg))) cls += ' show';
      }
      item.className = cls;
      item.dataset.canonicalIdx = String(idx);
      if (pg) item.dataset.pageGroup = pg;
      if (variant != null) item.dataset.variant = variant;

      const fsInner = document.createElement('div');
      fsInner.className = 'fs-inner';
      const clone = slide.cloneNode(true);
      clone.style.cssText = 'position:relative;width:1920px;height:1080px;opacity:1;transform:none;pointer-events:none;';
      applyStepState(clone, getSteps(slide) - 1);
      fsInner.appendChild(clone);

      const num = document.createElement('div');
      num.className = 'fs-num';
      // 번호 포맷: base = pg, variant = "pg-(variant+1)" (1-indexed, 예: "3-2")
      if (pg) {
        num.textContent = isVariant ? `${pg}-${parseInt(variant) + 1}` : `${pg}`;
        item.setAttribute('data-group-color', parseInt(pg) % 4);
      } else {
        num.textContent = idx + 1;
      }

      item.appendChild(fsInner);
      item.appendChild(num);

      item.addEventListener('click', () => {
        if (fsDragItem || fsDragDone) return;
        // base 클릭 시 같은 page-group의 variants 토글 + base로 이동
        // variant 클릭 시 해당 variant로 이동만 (토글 없음)
        if (!isVariant && pg && pageGroupHasVariants(pg)) {
          togglePageGroup(pg);
        }
        goToSlide(idx);
      });
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
    // currentSlide가 collapsed page-group의 variant이면 자동 expand 후 스크롤
    const cur = slides[currentSlide];
    if (cur && cur.dataset.variant !== "0" && cur.dataset.pageGroup) {
      expandPageGroup(cur.dataset.pageGroup);
    }
    const curEl = document.querySelector('#filmstrip-inner .fs-item.current');
    if (curEl) curEl.scrollIntoView({ inline: 'nearest', behavior: 'smooth', block: 'nearest' });
  }
  function updateFilmstripCurrent() {
    document.querySelectorAll('#filmstrip-inner .fs-item').forEach(item => {
      const idx = parseInt(item.dataset.canonicalIdx);
      item.classList.toggle('current', idx === currentSlide);
    });
    scrollFilmstripToCurrent();
  }

  function reorderSlide(fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    const fromSlide = slides[fromIdx];
    const toSlide = slides[toIdx];
    if (!fromSlide || !toSlide) return;
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
    // 다른 그룹으로 이동 시 고유 pageGroup 부여 (overview 그리드 깨짐 방지)
    if (fromSlide.dataset.pageGroup !== toSlide.dataset.pageGroup) {
      const maxPg = Math.max(...[...container.querySelectorAll(':scope > .slide')].map(s => parseInt(s.dataset.pageGroup) || 0));
      moved.dataset.pageGroup = String(maxPg + 1);
      moved.dataset.variant = '0';
    }
    slides = [...container.querySelectorAll(':scope > .slide')];
    rebuildSlidesByKey();
    buildFilmstrip();
    goToSlide(toIdx);
  }

  function deleteSlide(idx, force) {
    if (slides.length <= 1) return;
    const target = slides[idx];
    // base 삭제 가드: force=true면 무조건 허용, 생성 슬라이드(data-generated)도 허용
    if (!force && !document.body.dataset.generated && target && target.dataset.variant === "0" && pageGroupHasVariants(target.dataset.pageGroup)) {
      if (typeof showToast === 'function') showToast('베이스 슬라이드는 같은 그룹의 변형이 있을 때 삭제 불가');
      return;
    }
    pushUndo();
    const container = document.getElementById('stage');
    const deletedPg = target ? target.dataset.pageGroup : null;
    container.removeChild(slides[idx]);
    slides = [...container.querySelectorAll(':scope > .slide')];
    rebuildSlidesByKey();
    // 삭제 후 page-group이 완전히 사라졌으면 expandedFilmGroups에서 제거
    if (deletedPg && ![...slides].some(s => s.dataset.pageGroup === deletedPg)) {
      expandedFilmGroups.delete(deletedPg);
    }
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
  let slidesByKey = {};       // data-slide-id → DOM 요소 (stable key)
  let expandedFilmGroups = new Set();  // 확장된 page-group(string) 집합
  // 초기 slidesByKey + display-label 빌드
  rebuildSlidesByKey();
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
  const sndPenWrite   = new Audio('./assets/sounds/pen-sketch.mp3');

  // AudioContext lazy 싱글톤 (브라우저 동시 ctx 제한 회피 + 메모리 누수 방지)
  let _sharedAudioCtx = null;
  function getSharedAudioCtx() {
    // closed 상태면 버리고 새로 만들기 (OS 슬립·탭 백그라운드 후 회복)
    if (_sharedAudioCtx && _sharedAudioCtx.state === 'closed') {
      _sharedAudioCtx = null;
    }
    if (!_sharedAudioCtx) {
      try {
        _sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch(e) { return null; }
    }
    if (_sharedAudioCtx.state === 'suspended') {
      _sharedAudioCtx.resume().catch(() => {});
    }
    return _sharedAudioCtx;
  }

  function playSndChart() {
    try {
      const ctx = getSharedAudioCtx(); if (!ctx) return;
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
    if (type === 'write') { playSndWrite(); return; }
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
      const ctx = getSharedAudioCtx(); if (!ctx) return;
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
      const ctx = getSharedAudioCtx(); if (!ctx) return;
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

  // write: 만년필 글씨 소리 (MP3 파일)
  function playSndWrite() {
    sndPenWrite.currentTime = 0;
    sndPenWrite.play().catch(() => {});
  }

  // pop: 배지/칩 팝인용
  function playSndPop() {
    try {
      const ctx = getSharedAudioCtx(); if (!ctx) return;
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

  // 손글씨 한글자씩 분리 (T37 마지막정리 / T38 챕터전환 .hand-typing 처리)
  // 페이지 로드 시 1회 실행. 새로 추가된 .hand-typing은 dataset 체크로 중복 방지.
  function splitHandTyping(root) {
    if (!root || !root.querySelectorAll) return;
    const els = root.querySelectorAll('.hand-typing');
    els.forEach(el => {
      if (el.dataset.handTypingInit === '1') return;
      // 자식이 이미 .ch span인 경우 스킵 (재진입 방지)
      if (el.querySelector(':scope > .ch')) { el.dataset.handTypingInit = '1'; return; }
      const text = el.textContent || '';
      el.textContent = '';
      const frag = document.createDocumentFragment();
      Array.from(text).forEach((ch, i) => {
        const span = document.createElement('span');
        span.className = 'ch';
        span.textContent = ch === ' ' ? '\u00A0' : ch;
        span.style.transitionDelay = (i * 0.15) + 's';
        frag.appendChild(span);
      });
      el.appendChild(frag);
      el.dataset.handTypingInit = '1';
    });
  }

  // 페이지 로드 후 자동 실행 (DOM 안정 대기 100ms)
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(() => splitHandTyping(document), 100));
    } else {
      setTimeout(() => splitHandTyping(document), 100);
    }
  }

  function getSteps(slide) {
    return parseInt(slide.dataset.steps || '1');
  }

  function getOrderedEls(layer) {
    if (parseInt(layer.dataset.step) === 0) return [];
    // EDITABLE_SEL과 독립 — anim-shown 흐름은 no-edit-select와 무관하게 모든 .slide-el 대상
    return Array.from(layer.children).filter(el =>
      el.classList.contains('slide-el') &&
      !el.classList.contains('step-title') &&
      !el.classList.contains('step-dim')
    );
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

  // base만 순회하기 위한 헬퍼 (presentation 모드용)
  function findNextBaseCanonical(from) {
    for (let i = from + 1; i < slides.length; i++) {
      if (slides[i].dataset.variant === "0" || slides[i].dataset.variant === undefined) return i;
    }
    return -1;
  }
  function findPrevBaseCanonical(from) {
    for (let i = from - 1; i >= 0; i--) {
      if (slides[i].dataset.variant === "0" || slides[i].dataset.variant === undefined) return i;
    }
    return -1;
  }
  // 현재 슬라이드의 base 인덱스 (variant이면 같은 page-group의 base) — slideNum 표시용
  function getCurrentBaseDisplayIdx() {
    const cur = slides[currentSlide];
    if (!cur) return 0;
    const baseSlides = [...slides].filter(s => !s.dataset.variant || s.dataset.variant === "0");
    if (!cur.dataset.variant || cur.dataset.variant === "0") {
      return baseSlides.indexOf(cur);
    }
    // variant: 같은 page-group의 base 찾기
    return baseSlides.findIndex(s => s.dataset.pageGroup === cur.dataset.pageGroup);
  }
  function getBaseSlidesCount() {
    return [...slides].filter(s => !s.dataset.variant || s.dataset.variant === "0").length;
  }

  // 슬라이드 전환
  function goToSlide(idx, fromStep) {
    if (animating) return;
    const next = Math.max(0, Math.min(idx, slides.length - 1));
    if (next === currentSlide) return;
    animating = true;

    // variant로 점프 시 해당 page-group 자동 expand (필름스트립 표시 동기화)
    const nextSlide = slides[next];
    if (nextSlide && nextSlide.dataset.variant && nextSlide.dataset.variant !== "0" && nextSlide.dataset.pageGroup) {
      if (typeof expandPageGroup === 'function') expandPageGroup(nextSlide.dataset.pageGroup);
    }

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
    // slideNum 표시:
    // - 편집 모드: canonical 기준 (1~138 of all)
    // - 생성 슬라이드: 전체 순차 번호 (1~295 of all)
    // - 에디터 presentation 모드: base만 카운트 (1~38)
    if (editMode || document.body.dataset.generated) {
      document.getElementById('slideNum').textContent = `${currentSlide + 1} / ${slides.length}`;
    } else {
      const baseTotal = getBaseSlidesCount();
      // baseIdx가 -1이면(고아 variant 등 비정상 상태) 0으로 폴백 — 슬라이드 번호 표시 깨짐 방지
      const baseIdx = Math.max(0, getCurrentBaseDisplayIdx());
      const cur = slides[currentSlide];
      if (cur && cur.dataset.variant && cur.dataset.variant !== "0") {
        document.getElementById('slideNum').textContent = `${baseIdx + 1}-${cur.dataset.variant} / ${baseTotal}`;
      } else {
        document.getElementById('slideNum').textContent = `${baseIdx + 1} / ${baseTotal}`;
      }
    }
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
    } else {
      // 생성 슬라이드: 모든 variant 순차 탐색 / 에디터: base만 순회
      if (document.body.dataset.generated) {
        if (currentSlide < slides.length - 1) goToSlide(currentSlide + 1);
      } else {
        const nextBase = findNextBaseCanonical(currentSlide);
        if (nextBase !== -1) goToSlide(nextBase);
      }
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
    } else {
      // 생성 슬라이드: 모든 variant 순차 탐색 / 에디터: base만 순회
      if (document.body.dataset.generated) {
        if (currentSlide > 0) goToSlide(currentSlide - 1);
      } else {
        const prevBase = findPrevBaseCanonical(currentSlide);
        if (prevBase !== -1) goToSlide(prevBase);
      }
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
      if (selectedEl) {
        clipboardEl = selectedEl.outerHTML;
        showToast('요소 복사됨', 1500);
      }
      return;
    }
    // Ctrl+X: 요소 잘라내기 (편집 모드)
    if ((e.ctrlKey || e.metaKey) && e.key === 'x' && editMode && !isEditing) {
      if (selectedEl) {
        e.preventDefault();
        clipboardEl = selectedEl.outerHTML;
        pushUndo();
        const slide = slides[currentSlide];
        const layer = selectedEl.closest('.step-layer');
        selectedEl.remove();
        if (layer && parseInt(layer.dataset.step) > 0 && !layer.querySelector(EDITABLE_SEL + ':not(.step-dim)')) {
          layer.remove();
          recalcSteps(slide);
        }
        clearSelection();
        showToast('요소 잘라내기', 1500);
        if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
      }
      return;
    }
    // Ctrl+V: 요소 붙여넣기 (편집 모드, 내부 클립보드)
    if ((e.ctrlKey || e.metaKey) && e.key === 'v' && editMode && !isEditing && clipboardEl) {
      e.preventDefault();
      pushUndo();
      const temp = document.createElement('div');
      temp.innerHTML = clipboardEl;
      const newEl = temp.firstElementChild;
      if (!newEl) return;
      newEl.style.left = (parseInt(newEl.style.left) || 0) + 20 + 'px';
      newEl.style.top  = (parseInt(newEl.style.top)  || 0) + 20 + 'px';
      newEl.classList.remove('edit-selected', 'edit-group-selected');
      delete newEl.dataset.group;
      const layer0 = slides[currentSlide].querySelector('.step-layer[data-step="0"]');
      layer0.appendChild(newEl);
      selectedEls.forEach(s => s.classList.remove('edit-selected', 'edit-group-selected'));
      selectedEl = newEl; selectedEls = [newEl];
      newEl.classList.add('edit-selected');
      updateCoordPanel(newEl);
      updateResizeHandle();
      if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
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
        refreshAfterUngroup();
      } else {
        // 기존 그룹 해제 후 새 그룹 생성 (step 배치는 변경하지 않음)
        selectedEls.forEach(el => delete el.dataset.group);
        groupCounter++;
        const gid = 'g' + groupCounter;
        selectedEls.forEach(el => { el.dataset.group = gid; });
        if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
      }
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
      // groupEntered 상태: .child-selected 자식만 삭제 (자리 유지: visibility hidden)
      if (groupEntered && groupParent) {
        const child = groupParent.querySelector('.child-selected');
        if (child) {
          pushUndo();
          child.style.visibility = 'hidden';
          child.style.pointerEvents = 'none';
          child.classList.remove('child-selected');
          if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
          return;
        }
      }
      pushUndo();
      const slide = slides[currentSlide];
      const toDelete = individualMode ? [selectedEl] : [...selectedEls];
      toDelete.forEach(el => {
        const layer = el.closest('.step-layer');
        el.remove();
        if (layer && parseInt(layer.dataset.step) > 0 && !layer.querySelector(EDITABLE_SEL + ':not(.step-dim)')) {
          layer.remove();
          recalcSteps(slide);
        }
      });
      isResizing = false;
      resizeCorner = null;
      resizeEdge = null;
      clearSelection();
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
  let expandedOverviewGroups = new Set();  // 확장된 page-group(string) 집합 — overview 전용

  function buildOverview() {
    ovGrid.innerHTML = '';
    // 삭제된 page-group sweep
    for (const pg of [...expandedOverviewGroups]) {
      if (![...slides].some(s => s.dataset.pageGroup === pg)) expandedOverviewGroups.delete(pg);
    }

    let currentGroup = null;
    let currentPg = null;

    // base가 삭제된 page-group 감지: 첫 variant를 base 역할로 표시
    const pgsWithBase = new Set();
    const promotedFirst = new Set(); // pg → 이미 첫 variant를 base로 승격했는지
    slides.forEach(s => {
      if (!s.dataset.variant || s.dataset.variant === "0") pgsWithBase.add(s.dataset.pageGroup);
    });

    slides.forEach((slide, slideIdx) => {
      const isCurrent = slideIdx === currentSlide;
      const pg = slide.dataset.pageGroup;
      const variant = slide.dataset.variant;
      const isVariantRaw = variant && variant !== "0";
      // orphan variant(base 삭제됨)의 첫 번째 → base 역할 승격
      const isOrphanFirst = isVariantRaw && pg && !pgsWithBase.has(pg) && !promotedFirst.has(pg);
      if (isOrphanFirst) promotedFirst.add(pg);
      const isVariant = isVariantRaw && !isOrphanFirst;
      const isExpanded = pg && expandedOverviewGroups.has(String(pg));

      // 새 page-group이면 새 .ov-group wrapper
      // base가 삭제된 orphan variant도 새 그룹 시작
      if (!isVariant || !currentGroup || (pg && pg !== currentPg)) {
        const variantCount = pg ? [...slides].filter(s => s.dataset.pageGroup === pg && s.dataset.variant !== "0").length : 0;
        const effectiveVariants = isOrphanFirst ? variantCount - 1 : variantCount;
        currentGroup = document.createElement('div');
        currentGroup.className = 'ov-group' + (isExpanded && effectiveVariants > 0 ? ' expanded' : '');
        if (pg) currentGroup.dataset.pageGroup = pg;
        // 펼치면 base+variants가 들어갈 만큼 grid-column span
        if (isExpanded && effectiveVariants > 0) {
          currentGroup.style.gridColumn = `span ${Math.min(1 + effectiveVariants, 5)}`;
        }
        currentPg = pg;
        ovGrid.appendChild(currentGroup);
      }

      const item = document.createElement('div');
      let cls = 'ov-item';
      if (isCurrent) cls += ' current';
      if (isVariant) {
        cls += ' ov-variant';
        if (isExpanded) cls += ' show';
      }
      item.className = cls;
      item._slideIdx = slideIdx;
      if (pg) item.dataset.pageGroup = pg;
      if (variant != null) item.dataset.variant = variant;
      // z-index: base 맨 위, variants 순서대로 뒤로
      item.style.zIndex = isVariant ? String(10 - parseInt(variant)) : '20';

      const thumb = document.createElement('div');
      thumb.className = 'ov-thumb';
      const clone = slide.cloneNode(true);
      clone.className = 'slide';
      clone.style.cssText = 'position:relative; width:1920px; height:1080px; opacity:1; transform:none; pointer-events:none;';
      applyStepState(clone, getSteps(slide) - 1);
      thumb.appendChild(clone);

      const num = document.createElement('div');
      num.className = 'ov-num';
      if (pg) {
        num.textContent = isVariant ? `${pg}-${parseInt(variant) + 1}` : `${pg}`;
      } else {
        num.textContent = `${slideIdx + 1}`;
      }

      item.appendChild(thumb);
      item.appendChild(num);

      // 카드 클릭 = 무조건 이동 + 모달 닫기
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
          const allItems = [...ovGrid.querySelectorAll('.ov-item')];
          // 보이는 카드만 드롭 대상 (접힌 variant 제외 — getBoundingClientRect 오염 방지)
          const visibleItems = allItems.filter(it => {
            if (!it.classList.contains('ov-variant')) return true;
            if (it.classList.contains('show')) return true;
            return false;
          });
          // 그리드 행/열 기반 드롭 판정
          let visDropIdx = visibleItems.length;
          for (let i = 0; i < visibleItems.length; i++) {
            const r = visibleItems[i].getBoundingClientRect();
            if (r.width === 0 && r.height === 0) continue;
            // 마우스가 이 카드 행 위에 있으면 → 이 행 첫 칸 앞에 드롭
            if (ev.clientY < r.top) { visDropIdx = i; break; }
            // 같은 행: 마우스가 카드 좌측 절반 안이면 → 이 카드 앞에 드롭
            if (ev.clientY < r.bottom && ev.clientX < r.left + r.width / 2) { visDropIdx = i; break; }
          }
          // 보이는 인덱스 → 실제 슬라이드 인덱스 변환
          ovDragDropIdx = visDropIdx < visibleItems.length ? visibleItems[visDropIdx]._slideIdx : allItems[allItems.length - 1]._slideIdx + 1;
          allItems.forEach(it => it.classList.remove('ov-drop-before'));
          if (visDropIdx < visibleItems.length) visibleItems[visDropIdx].classList.add('ov-drop-before');
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

      currentGroup.appendChild(item);

      // base(또는 승격된 orphan first) 카드에 +/- 토글 버튼 (variants 있을 때만)
      if (!isVariant && pg) {
        let variantCount = [...slides].filter(s => s.dataset.pageGroup === pg && s.dataset.variant !== "0").length;
        if (isOrphanFirst) variantCount--; // 승격된 자신 제외
        if (variantCount > 0) {
          const toggleBtn = document.createElement('button');
          toggleBtn.className = 'ov-toggle';
          toggleBtn.textContent = isExpanded ? `−${variantCount}` : `+${variantCount}`;
          toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (expandedOverviewGroups.has(String(pg))) {
              expandedOverviewGroups.delete(String(pg));
            } else {
              expandedOverviewGroups.add(String(pg));
            }
            buildOverview();
          });
          item.appendChild(toggleBtn);
        }
      }
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
    delBtn.textContent = '🗑 이 슬라이드 삭제';
    delBtn.style.cssText = 'padding:8px 16px;cursor:pointer;';
    delBtn.addEventListener('mouseenter', () => delBtn.style.background = '#c0392b');
    delBtn.addEventListener('mouseleave', () => delBtn.style.background = 'none');
    delBtn.addEventListener('click', () => {
      try {
        hideSlideContextMenu();
        if (slides.length <= 1) return;
        // overview 전용 삭제: goToSlide 없이 직접 처리 (overview 유지)
        pushUndo();
        const container = document.getElementById('stage');
        const target = slides[idx];
        const deletedPg = target ? target.dataset.pageGroup : null;
        container.removeChild(target);
        slides = [...container.querySelectorAll(':scope > .slide')];
        rebuildSlidesByKey();
        if (deletedPg && ![...slides].some(s => s.dataset.pageGroup === deletedPg)) {
          expandedFilmGroups.delete(deletedPg);
          expandedOverviewGroups.delete(deletedPg);
        }
        // transition class 정리 + active + showStep (Codex 권고: 빈 화면 방지)
        currentSlide = Math.min(idx, slides.length - 1);
        slides.forEach(s => {
          s.classList.remove('active', 'leave-left', 'enter-from-left');
          s.style.opacity = '';
          s.style.transform = '';
          s.style.transition = '';
        });
        if (slides[currentSlide]) {
          slides[currentSlide].classList.add('active');
          showStep(slides[currentSlide], 0);
        }
        currentStep = 0;
        currentOrder = 0;
        buildFilmstrip();
        buildOverview();
        ensureDirHandle().then(ok => { if (ok) saveToFile(true); });
      } catch (err) {
        if (typeof showToast === 'function') showToast('삭제 오류: ' + err.message + '\n' + (err.stack || ''), 8000);
      }
    });
    menu.appendChild(delBtn);

    const copyBtn = document.createElement('div');
    copyBtn.textContent = '📋 이 슬라이드 복사';
    copyBtn.style.cssText = 'padding:8px 16px;cursor:pointer;';
    copyBtn.addEventListener('mouseenter', () => copyBtn.style.background = '#444');
    copyBtn.addEventListener('mouseleave', () => copyBtn.style.background = 'none');
    copyBtn.addEventListener('click', () => {
      try {
        hideSlideContextMenu();
        pushUndo();
        const container = document.getElementById('stage');
        const source = slides[idx];
        const clone = source.cloneNode(true);
        // 새 slide-id 부여 (원본_copy_타임스탬프)
        const origId = clone.dataset.slideId || clone.id || '';
        clone.dataset.slideId = origId + '_copy_' + Date.now();
        clone.id = '';
        clone.classList.remove('active');
        // 원본 바로 뒤에 삽입
        const next = source.nextElementSibling;
        if (next) container.insertBefore(clone, next);
        else container.appendChild(clone);
        slides = [...container.querySelectorAll(':scope > .slide')];
        rebuildSlidesByKey();
        buildFilmstrip();
        buildOverview();
        ensureDirHandle().then(ok => { if (ok) saveToFile(true); });
        if (typeof showToast === 'function') showToast('슬라이드 복사 완료', 2000);
      } catch (err) {
        if (typeof showToast === 'function') showToast('복사 오류: ' + err.message, 5000);
      }
    });
    menu.appendChild(copyBtn);

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
  const isGitHubPages = location.hostname.endsWith('.github.io') || location.hostname.endsWith('.vercel.app');

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
    document.querySelectorAll('#stage .step-layer').forEach(l => l.classList.remove('visible'));
    dimOuter.classList.remove('on');
    document.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    const animShownEls = Array.from(document.querySelectorAll('#stage .anim-shown'));
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

    // ── HTML 조립 (확장 프로그램 오염 원천 차단) ──
    // document.documentElement.outerHTML 대신 알려진 요소만 골라서 조립
    const _headParts = [
      '<meta charset="UTF-8">',
      '<title>' + escHTML(document.title) + '</title>',
      document.querySelector('head > script') ? document.querySelector('head > script').outerHTML : '',
      document.querySelector('link[href*="fonts.googleapis"]') ? document.querySelector('link[href*="fonts.googleapis"]').outerHTML : '',
      document.querySelector('link[href*="slide-style"]') ? document.querySelector('link[href*="slide-style"]').outerHTML : '',
      document.getElementById('edit-badge-style') ? document.getElementById('edit-badge-style').outerHTML : ''
    ].filter(Boolean);

    const _bodyIds = [
      'layer-panel','guide-toolbar','dim-outer','stage',
      'overview','help','align-menu','group-toolbar',
      'slideNum','edit-badge','top-toolbar',
      'palette-bg','palette-fc','coord-panel','font-panel'
    ];
    const _afterScriptIds = ['gs-crosshair-h','gs-crosshair-v','filmstrip'];

    const bodyBefore = _bodyIds.map(id => document.getElementById(id)).filter(Boolean).map(el => el.outerHTML).join('\n');
    const scriptTag = document.querySelector('script[src*="slide-editor"]') ? document.querySelector('script[src*="slide-editor"]').outerHTML : '';
    const bodyAfter = _afterScriptIds.map(id => document.getElementById(id)).filter(Boolean).map(el => el.outerHTML).join('');

    const bodyClass = document.body.className.trim();
    const bodyAttrs = [];
    if (bodyClass) bodyAttrs.push('class="' + escHTML(bodyClass) + '"');
    for (const [k, v] of Object.entries(document.body.dataset)) {
      bodyAttrs.push('data-' + k.replace(/[A-Z]/g, m => '-' + m.toLowerCase()) + '="' + escHTML(v) + '"');
    }
    const bodyTag = '<body' + (bodyAttrs.length ? ' ' + bodyAttrs.join(' ') : '') + '>';

    const html = '<!DOCTYPE html>\n<html lang="ko">\n<head>\n'
      + _headParts.join('\n') + '\n</head>\n'
      + bodyTag + '\n'
      + bodyBefore + '\n'
      + scriptTag + '\n'
      + bodyAfter + '\n'
      + '</body>\n</html>';
    // 제거한 레이어 복원
    removedLayers.forEach(r => {
      try {
        if (r.next && r.next.parentNode === r.parent) r.parent.insertBefore(r.layer, r.next);
        else r.parent.appendChild(r.layer);
      } catch(_) { r.parent.appendChild(r.layer); }
    });
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
        showToast('저장 완료!', 4000);
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
        showToast('저장 완료!', 4000);
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

  // CDN 캐시 우회는 Cloudflare Pages 이관으로 해결 예정
  // document.write 방식은 텍스트 깨짐/슬라이드 중복 유발하여 제거됨

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
  // [data-type]:not(.slide) — .slide 자체는 슬라이드 배경(data-type="카드" 등이 붙음), 편집 대상 아님
  const EDITABLE_SEL = '.bubble, .text-area, .bg-label, .slide-el:not(.no-edit-select), img, .emoji-icon, .section-badge, .corner-label, .step-dim, [data-type]:not(.slide):not(.no-edit-select), .tl-circle, .tl-box, .tl-desc';
  let editMode = false;
  let isEditing = false;
  let clipboardEl = null;
  let selectedEl = null;
  let selectedEls = [];
  let elAnchors = [];
  // SVG connector(.step-timeline > svg) 동반 이동: SVGElement는 offsetLeft 미지원이라 selection 안 넣고 별도 추적
  let svgDragAnchors = [];
  let isDragging = false;
  const CHILD_SEL = '.card-title, .card-desc, .card-num, .grid-title, .grid-desc, .grid-icon, .num-text, .num-badge, .check-text, .check-box, .bar-label, .bar-value, .bar-fill, .hbar-label, .hbar-val, .stat-num, .stat-label, .stat-detail-item, .icon-label, .icon-circle, .icon-flow-label, .flow-box, .flow-arrow, .alert-text, .alert-icon, .compare-header, .compare-item, .quote-text, .quote-source, .tag-chip, .tl-box, .tl-circle, .btn-pill, .cta-btn, .contrast-word, .contrast-sub';
  // 비텍스트 자식 (fontSize 기반 리사이즈 대상 아님 — 이들은 기존 slide-el 박스 리사이즈로 처리)
  const NON_TEXT_CHILD_SEL = '.bar-fill, .check-box, .icon-circle, .tl-circle';
  // 툴바/팬널/팔레트 영역 — 편집 중 클릭 시 focus/selection 유지해야 하는 대상
  const TOOLBAR_PROTECT_SEL = '#top-toolbar, #font-panel, #format-bar, .color-palette, .color-swatch';
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

  function showFormatBar(el) {
    const bar = document.getElementById('format-bar');
    if (!bar) return;
    const rect = el.getBoundingClientRect();
    bar.style.left = Math.max(4, rect.left + rect.width / 2 - 120) + 'px';
    bar.style.top  = Math.max(52, rect.top - 44) + 'px';
    bar.classList.add('visible');
    bar.style.display = '';
  }
  function hideFormatBar() {
    const bar = document.getElementById('format-bar');
    if (bar) { bar.classList.remove('visible'); bar.style.display = 'none'; }
  }

  function enterContentEditable(el, e) {
    pushUndo();
    isEditing = true;
    el.contentEditable = 'true';
    el.focus();
    showFormatBar(el);
    if (e) {
      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (range) { const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range); }
    }
    const onKeydown = ev => {
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); el.blur(); }
      if ((ev.ctrlKey || ev.metaKey) && ev.key === 'z') { ev.preventDefault(); ev.stopPropagation(); el.blur(); ev.shiftKey ? doRedo() : doUndo(); }
    };
    const onPaste = ev => {
      ev.preventDefault();
      const text = ev.clipboardData?.getData('text/plain') ?? '';
      if (!text) return;
      const sel = window.getSelection();
      if (!sel) return;
      if (!sel.rangeCount || !el.contains(sel.anchorNode)) {
        el.focus();
        const r = document.createRange();
        r.selectNodeContents(el);
        r.collapse(false);
        sel.removeAllRanges();
        sel.addRange(r);
      }
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    };
    el.addEventListener('keydown', onKeydown);
    el.addEventListener('paste', onPaste);
    el.addEventListener('blur', () => {
      el.removeAttribute('contenteditable');
      isEditing = false;
      hideFormatBar();
      el.removeEventListener('keydown', onKeydown);
      el.removeEventListener('paste', onPaste);
    }, { once: true });
  }

  function exitGroup() {
    if (groupParent) { groupParent.classList.remove('group-entered-parent'); groupParent.querySelectorAll('.child-selected').forEach(c => c.classList.remove('child-selected')); }
    groupEntered = false;
    groupParent = null;
  }

  // 그룹 해제 후 시각 상태 복구: 노란 박스 hide, edit-group-selected → edit-selected (다중 선택 상태로 전환)
  // exitGroup() 먼저 호출 — 그룹 진입 상태(groupEntered/groupParent/child-selected)도 함께 정리 (코덱스 rv: stale state 잔존 방지)
  function refreshAfterUngroup() {
    exitGroup();
    selectedEls.forEach(s => {
      s.classList.remove('edit-group-selected');
      s.classList.add('edit-selected');
    });
    document.getElementById('group-box').style.display = 'none';
    individualMode = false;
    document.body.classList.remove('individual-mode');
    updateGroupToolbar();
    if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
  }

  function clearSelection() {
    exitGroup();
    // 방어적: selectedEls 추적 누락된 stale 클래스도 함께 스크럽
    document.querySelectorAll('.edit-selected, .edit-group-selected').forEach(el => {
      el.classList.remove('edit-selected', 'edit-group-selected');
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
    // hl 우선순위: child-selected → .hl → 타입 특화(.check-text/.icon-flow-label)
    // → .slide-el 컨테이너면 첫 텍스트 자식(카드 등) → fallback el
    let hl = (el.classList.contains('child-selected') ? el : null)
      || el.querySelector('.hl')
      || el.querySelector('.check-text, .icon-flow-label');
    if (!hl && el.matches('.slide-el')) {
      const textChildren = Array.from(el.querySelectorAll(CHILD_SEL + ', .section-badge, .corner-label'))
        .filter(c => !c.matches(NON_TEXT_CHILD_SEL));
      hl = textChildren[0] || null;
    }
    if (!hl) hl = el;
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
      // 경로 1-a: 편집 중 선택 범위가 있으면 해당 부분만 크기 변경 (span 래핑)
      if (editing) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
          const range = sel.getRangeAt(0);
          if (editing.contains(range.commonAncestorContainer)) {
            // 이미 fontSize span 안에 완전히 포함되면 해당 span 크기만 업데이트
            let existingSpan = null;
            let node = range.commonAncestorContainer;
            if (node.nodeType === 3) node = node.parentNode;
            while (node && node !== editing) {
              if (node.nodeType === 1 && node.tagName === 'SPAN' && node.style && node.style.fontSize) {
                // 선택 범위가 이 span 안에 완전히 포함되는지 (선택 ⊆ span)
                const spanRange = document.createRange();
                spanRange.selectNodeContents(node);
                if (range.compareBoundaryPoints(Range.START_TO_START, spanRange) >= 0
                    && range.compareBoundaryPoints(Range.END_TO_END, spanRange) <= 0) {
                  existingSpan = node;
                }
                break;
              }
              node = node.parentNode;
            }
            const refFs = existingSpan
              ? (parseFloat(existingSpan.style.fontSize) || parseFloat(getComputedStyle(existingSpan).fontSize) || 108)
              : (parseFloat(getComputedStyle(range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentNode).fontSize) || 108);
            const newFs = delta !== 0
              ? Math.max(10, Math.min(500, Math.round(refFs + delta)))
              : Math.max(10, Math.min(500, parseInt(document.getElementById('font-size-input').value) || Math.round(refFs)));
            if (existingSpan) {
              pushUndo();
              existingSpan.style.fontSize = newFs + 'px';
            } else {
              // 부분 노드 경계 가로지르면 surroundContents가 실패 → DOM 강제 분해는 위험하므로 중단
              const span = document.createElement('span');
              span.style.fontSize = newFs + 'px';
              try {
                pushUndo();
                range.surroundContents(span);
              } catch (err) {
                // 되돌리기 (pushUndo는 했지만 surroundContents 실패로 DOM 변경 없음 → 그대로 두고 취소)
                undoStack.pop();
                console.warn('[applyFontSize] 부분 선택이 요소 경계를 가로지름 — 선택 범위를 단순 텍스트 안쪽으로 조정해주세요.', err);
                return;
              }
              // 선택 범위 복원
              const newRange = document.createRange();
              newRange.selectNodeContents(span);
              sel.removeAllRanges();
              sel.addRange(newRange);
            }
            updateFontPanel(selectedEl);
            return;
          }
        }
      }

      // 경로 1-b: 선택 범위 없거나 child-selected → 대상 요소 전체 크기 변경 (기존)
      const target = childSel || editing;
      const curFs = Math.round(parseFloat(target.style.fontSize) || parseFloat(getComputedStyle(target).fontSize) || 108);
      const fs = delta !== 0
        ? Math.max(10, Math.min(500, curFs + delta))
        : Math.max(10, Math.min(500, parseInt(document.getElementById('font-size-input').value) || curFs));
      pushUndo();
      target.style.fontSize = fs + 'px';

    // 경로 2: slide-el 전체 선택 → 모든 텍스트 자식에 각각 적용
    } else if (selectedEl.matches('.slide-el')) {
      // .slide-el 아래 텍스트 자식들 (CHILD_SEL \ NON_TEXT_CHILD_SEL) + 직속 .section-badge/.corner-label
      const children = Array.from(selectedEl.querySelectorAll(CHILD_SEL + ', .section-badge, .corner-label'))
        .filter(c => !c.matches(NON_TEXT_CHILD_SEL));
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
    // 그룹 진입 + 텍스트 자식 선택: 자식 기준 corner handle만 표시 (edge 숨김)
    // 블랙리스트 방식: 비텍스트 자식(.bar-fill 등)만 제외, 나머지는 모두 텍스트 취급
    const _activeChildRaw = groupParent ? groupParent.querySelector('.child-selected') : null;
    const activeChild = (_activeChildRaw && !_activeChildRaw.matches(NON_TEXT_CHILD_SEL)) ? _activeChildRaw : null;
    if (activeChild) {
      msBox.style.display = 'none';
      // offsetLeft 체인으로 stage 기준 좌표 계산 (getBoundingClientRect는 transform 때문에 역변환 필요 → 체인 방식이 더 단순/정확)
      const stageEl = document.getElementById('stage');
      let l = 0, t = 0;
      let cur = activeChild;
      while (cur && cur !== stageEl && cur.offsetParent) {
        l += cur.offsetLeft;
        t += cur.offsetTop;
        if (cur.offsetParent === stageEl) break;
        cur = cur.offsetParent;
      }
      const w = activeChild.offsetWidth;
      const hh = activeChild.offsetHeight;
      const cornerPos = { tl: [l-6, t-6], tr: [l+w-6, t-6], bl: [l-6, t+hh-6], br: [l+w-6, t+hh-6] };
      handles.forEach(h => {
        if (h.dataset.corner) {
          const c = h.dataset.corner;
          h.style.left = cornerPos[c][0] + 'px';
          h.style.top = cornerPos[c][1] + 'px';
          h.classList.add('visible');
        } else if (h.dataset.edge) {
          h.classList.remove('visible');
        }
      });
      return;
    }
    const isTextEl = false; // 모든 요소에 edge handle 표시 (폭/높이 조절 가능)
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

  // ── 리사이즈 치수 라벨 ──
  function showResizeDimLabel(w, h, el) {
    const lbl = document.getElementById('resize-dim-label');
    if (!lbl) return;
    lbl.textContent = Math.round(w) + ' × ' + Math.round(h);
    lbl.style.display = 'block';
    lbl.style.left = (el.offsetLeft + el.offsetWidth + 8) + 'px';
    lbl.style.top  = (el.offsetTop  + el.offsetHeight + 8) + 'px';
  }
  function showResizeFontLabel(fs, el) {
    const lbl = document.getElementById('resize-dim-label');
    if (!lbl) return;
    lbl.textContent = Math.round(fs) + 'px';
    lbl.style.display = 'block';
    lbl.style.left = (el.offsetLeft + el.offsetWidth + 8) + 'px';
    lbl.style.top  = (el.offsetTop  + el.offsetHeight + 8) + 'px';
  }
  function hideResizeDimLabel() {
    const lbl = document.getElementById('resize-dim-label');
    if (lbl) lbl.style.display = 'none';
  }

  // ── 스냅 포인트 수집 (드래그 + 리사이즈 공용) ──
  function collectSnapPoints(excludeEl) {
    const stageEl = document.getElementById('stage');
    const xs = [stageEl.offsetWidth / 2];
    const ys = [stageEl.offsetHeight / 2];
    const layer = excludeEl.closest('.step-layer') || excludeEl.parentElement;
    layer.querySelectorAll(EDITABLE_SEL).forEach(other => {
      if (other === excludeEl || other.classList.contains('step-dim')) return;
      if (other.tagName === 'IMG' && other.closest('.slide-el')) return;
      xs.push(other.offsetLeft, other.offsetLeft + other.offsetWidth / 2, other.offsetLeft + other.offsetWidth);
      ys.push(other.offsetTop,  other.offsetTop  + other.offsetHeight / 2, other.offsetTop  + other.offsetHeight);
    });
    document.querySelectorAll('.guide').forEach(g => {
      if (g.style.display === 'none' || getComputedStyle(g).display === 'none') return;
      const gl = parseInt(g.style.left) || 0, gt = parseInt(g.style.top) || 0;
      const gw = parseInt(g.style.width) || 0, gh = parseInt(g.style.height) || 0;
      if (gw === 0 && gh === 0) return;
      xs.push(gl, gl + gw);
      ys.push(gt, gt + gh);
    });
    return { xs, ys };
  }
  function snapToValue(val, list, threshold) { for (const t of list) if (Math.abs(val - t) <= threshold) return t; return null; }
  function showSnapLines(snapXLine, snapYLine) {
    const sxEl = document.getElementById('snap-x'), syEl = document.getElementById('snap-y');
    if (snapXLine !== null) { sxEl.style.left = snapXLine + 'px'; sxEl.style.display = 'block'; } else sxEl.style.display = 'none';
    if (snapYLine !== null) { syEl.style.top  = snapYLine + 'px'; syEl.style.display = 'block'; } else syEl.style.display = 'none';
  }
  function applyResizeSnap(el, newLeft, newTop, newW, newH) {
    const SNAP_T = 8;
    const { xs, ys } = collectSnapPoints(el);
    let snapX = null, snapY = null;
    const right = newLeft + newW, bottom = newTop + newH;
    const cx = newLeft + newW / 2, cy = newTop + newH / 2;
    let s;
    if      ((s = snapToValue(right, xs, SNAP_T)) !== null) snapX = s;
    else if ((s = snapToValue(cx,    xs, SNAP_T)) !== null) snapX = s;
    else if ((s = snapToValue(newLeft, xs, SNAP_T)) !== null) snapX = s;
    if      ((s = snapToValue(bottom, ys, SNAP_T)) !== null) snapY = s;
    else if ((s = snapToValue(cy,     ys, SNAP_T)) !== null) snapY = s;
    else if ((s = snapToValue(newTop,  ys, SNAP_T)) !== null) snapY = s;
    showSnapLines(snapX, snapY);
  }

  // resize handle는 stage 이벤트 위임으로 처리 (innerHTML 복원 후에도 동작)

  // selection 안 자식이 속한 .step-timeline 안 svg connector를 모아서 동반 이동 anchor로 만들기
  // (SVGElement는 offsetLeft 표준 미지원이라 EDITABLE_SEL/일반 drag 흐름에 못 들어감)
  function collectSvgDragAnchors(els) {
    const svgs = new Set();
    els.forEach(s => {
      const tl = s.closest && s.closest('.step-timeline');
      if (!tl) return;
      tl.querySelectorAll(':scope > svg').forEach(svg => svgs.add(svg));
    });
    return Array.from(svgs).map(svg => ({
      el: svg,
      top: parseFloat(svg.style.top) || 0,
      left: parseFloat(svg.style.left) || 0,
    }));
  }

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
    let el = e.target.closest('.hl, .bubble, .bg-label, .card-title, .card-desc, .num-text, .bar-label, .bar-value, .icon-label, .flow-box, .icon-flow-label, .flow-arrow, .check-text, .hbar-label, .hbar-val, .stat-num, .quote-text, .grid-title, .section-badge, .corner-label, .btn-pill, .tag-chip, .alert-text, .compare-header, .compare-item, .tl-box, .cta-btn, .stat-label, .cork-label, .hand-title-mark, .hand-typing, .contrast-word, .contrast-sub, .contrast-quote, .contrast-bottom, .tl-desc');
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
    const onPaste = ev => {
      ev.preventDefault();
      const text = ev.clipboardData?.getData('text/plain') ?? '';
      if (!text) return;
      const sel = window.getSelection();
      if (!sel) return;
      // selection이 el 밖에 있으면 el 끝으로 caret 이동
      if (!sel.rangeCount || !el.contains(sel.anchorNode)) {
        el.focus();
        const r = document.createRange();
        r.selectNodeContents(el);
        r.collapse(false);
        sel.removeAllRanges();
        sel.addRange(r);
      }
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    };
    el.addEventListener('keydown', onKeydown);
    el.addEventListener('paste', onPaste);
    el.addEventListener('blur', () => {
      el.removeAttribute('contenteditable');
      isEditing = false;
      el.removeEventListener('keydown', onKeydown);
      el.removeEventListener('paste', onPaste);
    }, { once: true });
  });

  // 편집 중 툴바/팬널/팔레트 버튼 클릭 시 focus/selection 유지 (capture phase 최우선 — 브라우저 selection clear 차단)
  // input/textarea는 focus 필요하므로 예외 (타이핑 중 selection 일시적 손실은 감수)
  document.addEventListener('mousedown', e => {
    if (!isEditing) return;
    if (e.target.closest(TOOLBAR_PROTECT_SEL) && !e.target.closest('input, textarea')) {
      e.preventDefault();
    }
  }, true);

  document.addEventListener('mousedown', e => {
    if (!editMode) return;
    if (e.target.closest(TOOLBAR_PROTECT_SEL)) {
      if (isEditing && !e.target.closest('input, textarea')) e.preventDefault(); // 버블 단계 보험
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
        // 자식 드래그 분리용 상태 저장
        pendingDrag = true;
        mouseDownPos = { x: e.clientX, y: e.clientY };
        dragAnchor = clientToStage(e.clientX, e.clientY);
        // 드래그 시작 시 자식을 부모에서 추출 (pushUndo → clone → 독립 배치)
        pendingGroupEntry = null;
        selectedEl = groupParent;
        selectedEls = [groupParent];
        // _pendingChildExtract: 드래그 임계값 넘으면 자식 추출
        selectedEl._pendingChildExtract = child;
        elAnchor = { top: groupParent.offsetTop, left: groupParent.offsetLeft };
        elAnchors = [{ el: groupParent, top: groupParent.offsetTop, left: groupParent.offsetLeft }];
        updateCoordPanel(groupParent);
        if (child) updateFontPanel(child);
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
      // edge handle: 단방향 리사이즈
      if (resizeEdge && (selectedEl.tagName === 'IMG' || selectedEl.classList.contains('emoji-icon') || selectedEl.classList.contains('slide-el') || selectedEl.classList.contains('bubble') || selectedEl.classList.contains('text-area') || selectedEl.classList.contains('hl-wrap'))) {
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
      // 그룹 진입 + 자식 선택: 리사이즈 방식 분기
      // 비텍스트 자식(.bar-fill 등)은 아래 기존 IMG/bubble 브랜치로 빠짐 (블랙리스트 방식)
      const _activeChildRaw = groupParent ? groupParent.querySelector('.child-selected') : null;
      const activeChild = (_activeChildRaw && !_activeChildRaw.matches(NON_TEXT_CHILD_SEL)) ? _activeChildRaw : null;
      if (activeChild) {
        const _stagePos = clientToStage(e.clientX, e.clientY);
        resizeAnchorX = _stagePos.x;
        resizeAnchorY = _stagePos.y;
        // 고정 크기 자식(card-num 등): width/height 기반 박스 리사이즈
        const compStyle = getComputedStyle(activeChild);
        const hasFixedW = compStyle.width && compStyle.width !== 'auto' && parseFloat(compStyle.width) > 0;
        const hasFixedH = compStyle.height && compStyle.height !== 'auto' && parseFloat(compStyle.height) > 0;
        if (hasFixedW && hasFixedH) {
          resizeInitFontSizes = null;
          resizeImgInit = null;
          const ow = activeChild.offsetWidth;
          const oh = activeChild.offsetHeight;
          const fs = parseFloat(activeChild.style.fontSize) || parseFloat(compStyle.fontSize) || 0;
          resizeImgInitRect = {
            left: activeChild.offsetLeft,
            top: activeChild.offsetTop,
            w: ow, h: oh,
            ratio: ow / oh,
            fontSize: fs > 0 ? fs : null,
            _childEl: activeChild
          };
          resizeMultiInitRects = [];
          return;
        }
        // 텍스트 자식: fontSize 기반 리사이즈
        resizeImgInit = null;
        resizeImgInitRect = null;
        resizeInitFontSizes = [{
          el: activeChild,
          fs: parseFloat(activeChild.style.fontSize) || parseFloat(compStyle.fontSize) || 108
        }];
        return;
      }
      // IMG / emoji-icon / bubble / text-area 리사이즈 (4모서리, 비율 유지)
      if (selectedEl.tagName === 'IMG' || selectedEl.classList.contains('emoji-icon') || selectedEl.classList.contains('slide-el') || selectedEl.classList.contains('bubble') || selectedEl.classList.contains('text-area') || selectedEl.classList.contains('hl-wrap')) {
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

    let el = e.target.closest(EDITABLE_SEL);
    // img inside .slide-el → select parent .slide-el (prevents dual selection + fixes resize coords)
    if (el && el.tagName === 'IMG' && el.closest('.slide-el')) el = el.closest('.slide-el');

    if (!el) {
      // 기존 다중 selection의 bounding box 안에 mousedown이면 selection 유지하고 multi-drag 시작
      // (예: .step-timeline.no-edit-select 같은 통과 컨테이너 위 빈 영역에서 자식 selection 옮기기)
      if (selectedEls.length > 1) {
        const pos = clientToStage(e.clientX, e.clientY);
        let minL = Infinity, minT = Infinity, maxR = -Infinity, maxB = -Infinity;
        selectedEls.forEach(s => {
          minL = Math.min(minL, s.offsetLeft);
          minT = Math.min(minT, s.offsetTop);
          maxR = Math.max(maxR, s.offsetLeft + s.offsetWidth);
          maxB = Math.max(maxB, s.offsetTop + s.offsetHeight);
        });
        if (pos.x >= minL && pos.x <= maxR && pos.y >= minT && pos.y <= maxB) {
          e.preventDefault();
          e.stopPropagation();
          pendingDrag = true;
          mouseDownPos = { x: e.clientX, y: e.clientY };
          dragAnchor = pos;
          elAnchors = selectedEls.map(s => ({ el: s, top: s.offsetTop, left: s.offsetLeft }));
          svgDragAnchors = collectSvgDragAnchors(selectedEls);
          return;
        }
      }
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
        if (el === selectedEl) {
          // individualMode + 같은 카드 재클릭 → 그룹 진입(자식 드릴다운). mouseup에서 드래그 여부 확인 후 확정
          pendingGroupEntry = { el, target: e.target };
          selectedEl = el;
        } else {
          // 다른 멤버로 전환
          selectedEls.forEach(s => {
            s.classList.remove('edit-selected');
            s.classList.add('edit-group-selected');
          });
          el.classList.remove('edit-group-selected');
          el.classList.add('edit-selected');
          selectedEl = el;
        }
      } else if (el.matches('.slide-el') && selectedEls.length === 1) {
        // 카드 블록 재클릭 → mouseup에서 드래그 여부 확인 후 그룹 진입
        pendingGroupEntry = { el, target: e.target };
        selectedEl = el;
      } else {
        selectedEl = el;
      }
    }

    // step-dim 선택 시 드래그 허용, 좌표 정규화 건너뜀
    // (edit mode CSS !important로 이미 보이므로 layer.visible 추가 불필요 — 추가하면 오버레이 중첩으로 어두워짐)
    const isStepDim = el.classList.contains('step-dim');
    if (isStepDim) {
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
    svgDragAnchors = collectSvgDragAnchors(individualMode ? [selectedEl] : selectedEls);

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
    // IMG / box 리사이즈 (4모서리, 비율 유지)
    if (isResizing && selectedEl && resizeImgInitRect) {
      const resizeTarget = resizeImgInitRect._childEl || selectedEl;
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
          resizeTarget.style.fontSize = Math.max(12, Math.round(resizeImgInitRect.fontSize * scale)) + 'px';
        } else {
          resizeTarget.style.width = newW + 'px';
          resizeTarget.style.height = newH + 'px';
          resizeTarget.style.maxWidth = '';
        }
        resizeTarget.style.left = newLeft + 'px';
        resizeTarget.style.top = newTop + 'px';
        if (resizeImgInitRect.fontSize !== null) showResizeFontLabel(parseFloat(resizeTarget.style.fontSize), resizeTarget);
        else showResizeDimLabel(newW, newH, resizeTarget);
        applyResizeSnap(resizeTarget, newLeft, newTop, newW, newH);
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
        resizeTarget.style.fontSize = newW + 'px';
      } else {
        resizeTarget.style.width = newW + 'px';
        resizeTarget.style.height = newH + 'px';
        resizeTarget.style.maxWidth = '';
      }
      resizeTarget.style.left = newLeft + 'px';
      resizeTarget.style.top = newTop + 'px';
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
      if (resizeImgInitRect.fontSize !== null) showResizeFontLabel(parseFloat(resizeTarget.style.fontSize), resizeTarget);
      else showResizeDimLabel(newW, newH, resizeTarget);
      applyResizeSnap(resizeTarget, newLeft, newTop, newW, newH);
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
      if (resizeInitFontSizes.length > 0) showResizeFontLabel(parseFloat(resizeInitFontSizes[0].el.style.fontSize), resizeInitFontSizes[0].el);
      updateResizeHandle();
      return;
    }

    // 임계값 초과 시 드래그 시작 (undo 저장)
    if (pendingDrag && mouseDownPos) {
      const dx = e.clientX - mouseDownPos.x, dy = e.clientY - mouseDownPos.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > DRAG_THRESHOLD) {
        pushUndo();
        // groupEntered 자식 드래그: 자식을 부모에서 추출하여 독립 요소로 전환
        if (selectedEl && selectedEl._pendingChildExtract) {
          const child = selectedEl._pendingChildExtract;
          delete selectedEl._pendingChildExtract;
          const layer = selectedEl.closest('.step-layer');
          const stageRect = document.getElementById('stage').getBoundingClientRect();
          const scale = stageRect.width / 1920;
          const cr = child.getBoundingClientRect();
          const newEl = child.cloneNode(true);
          newEl.classList.remove('child-selected');
          newEl.style.position = 'absolute';
          newEl.style.left = Math.round((cr.left - stageRect.left) / scale) + 'px';
          newEl.style.top = Math.round((cr.top - stageRect.top) / scale) + 'px';
          layer.appendChild(newEl);
          child.remove();
          exitGroup();
          selectedEls.forEach(s => s.classList.remove('edit-selected', 'edit-group-selected'));
          selectedEl = newEl;
          selectedEls = [newEl];
          newEl.classList.add('edit-selected');
          dragAnchor = clientToStage(e.clientX, e.clientY);
          elAnchor = { top: newEl.offsetTop, left: newEl.offsetLeft };
          elAnchors = [{ el: newEl, top: newEl.offsetTop, left: newEl.offsetLeft }];
          updateCoordPanel(newEl);
        } else if (selectedEl && selectedEl._pendingChildExtract === undefined) {
          // 일반 드래그 (추출 아님)
        }
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
      // SVG connector(.step-timeline > svg) 동반 이동 — selection엔 없지만 부모 timeline 안 svg를 함께
      svgDragAnchors.forEach(({ el, top, left }) => {
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
    const w = selectedEl.offsetWidth, h = selectedEl.offsetHeight;
    const { xs, ys } = collectSnapPoints(selectedEl);
    let snapXLine = null, snapYLine = null, s;
    if      ((s = snapToValue(newLeft + w / 2, xs, SNAP_T)) !== null) { newLeft = Math.round(s - w / 2); snapXLine = s; }
    else if ((s = snapToValue(newLeft,         xs, SNAP_T)) !== null) { newLeft = s;     snapXLine = s; }
    else if ((s = snapToValue(newLeft + w,     xs, SNAP_T)) !== null) { newLeft = s - w; snapXLine = s; }
    if      ((s = snapToValue(newTop  + h / 2, ys, SNAP_T)) !== null) { newTop  = Math.round(s - h / 2); snapYLine = s; }
    else if ((s = snapToValue(newTop,          ys, SNAP_T)) !== null) { newTop  = s;     snapYLine = s; }
    else if ((s = snapToValue(newTop  + h,     ys, SNAP_T)) !== null) { newTop  = s - h; snapYLine = s; }
    showSnapLines(snapXLine, snapYLine);

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
        if (other.tagName === 'IMG' && other.closest('.slide-el')) return;
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
    // SVG connector 동반 이동(단일 selection drag)
    svgDragAnchors.forEach(({ el, top, left }) => {
      el.style.left = Math.round(left + dxDrag) + 'px';
      el.style.top  = Math.round(top  + dyDrag) + 'px';
    });
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
          // img inside .slide-el → skip (parent .slide-el handles it)
          if (el.tagName === 'IMG' && el.closest('.slide-el')) return;
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
      hideResizeDimLabel();
      showSnapLines(null, null);
      updateResizeHandle();
      return;
    }
    const wasDragging = isDragging;
    isDragging = false;
    pendingDrag = false;
    mouseDownPos = null;
    if (selectedEl) delete selectedEl._pendingChildExtract;
    svgDragAnchors = [];
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
      if (child && el.contains(child)) updateFontPanel(child); // 좌표 부모, 폰트 자식 (덮어쓰기 방지)
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
    hideResizeDimLabel();
    showSnapLines(null, null);
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
      { cls: '', label: '아래에서 올라옴' },
      { cls: 'anim-scale', label: '작게→크게' },
      { cls: 'anim-left', label: '왼쪽에서 슬라이드' },
      { cls: 'anim-right', label: '오른쪽에서 슬라이드' },
      { cls: 'anim-pop', label: '톡 튀어나옴' },
      { cls: 'anim-fade', label: '서서히 나타남' },
      { cls: 'anim-zoom', label: '확대 등장' },
      { cls: 'anim-flip', label: '뒤집기' },
      { cls: 'anim-split', label: '갈라짐' },
      { cls: 'anim-center', label: '가운데서 등장' },
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
    animTypeRow.innerHTML = `<span class="anim-type-label">등장 효과</span>${selectHTML}`;
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
    pushupRow.innerHTML = `<span class="anim-pushup-label">이전 내용 밀어내기</span>
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
    noDimRow.innerHTML = `<span class="anim-pushup-label">배경 어둡게 안 함</span>
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
    sortLabel.innerHTML = '<span class="anim-sort-icon">☰</span> 등장 순서 (드래그로 변경)';
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
      empty.textContent = '요소를 선택하고 "클릭 시 표시"를 켜면\n등장 순서에 추가됩니다';
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
        const stepBadge = `<span class="layer-step-badge">${row.clickNum}번째</span>`;
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
      divider.textContent = '항상 보임 (클릭 없이 표시)';
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
        refreshAfterUngroup();
      }
    } else if (item.dataset.action === 'copy') {
      if (selectedEl) { clipboardEl = selectedEl.outerHTML; showToast('요소 복사됨', 1500); }
    } else if (item.dataset.action === 'paste') {
      if (clipboardEl) {
        pushUndo();
        const temp = document.createElement('div');
        temp.innerHTML = clipboardEl;
        const newEl = temp.firstElementChild;
        if (newEl) {
          newEl.style.left = (parseInt(newEl.style.left) || 0) + 20 + 'px';
          newEl.style.top  = (parseInt(newEl.style.top)  || 0) + 20 + 'px';
          newEl.classList.remove('edit-selected', 'edit-group-selected');
          delete newEl.dataset.group;
          const layer0 = slides[currentSlide].querySelector('.step-layer[data-step="0"]');
          layer0.appendChild(newEl);
          clearSelection(); selectElement(newEl);
          showToast('붙여넣기 완료', 1500);
        }
      }
    } else if (item.dataset.action === 'duplicate') {
      if (selectedEl) {
        clipboardEl = selectedEl.outerHTML;
        pushUndo();
        const temp = document.createElement('div');
        temp.innerHTML = clipboardEl;
        const newEl = temp.firstElementChild;
        if (newEl) {
          newEl.style.left = (parseInt(newEl.style.left) || 0) + 20 + 'px';
          newEl.style.top  = (parseInt(newEl.style.top)  || 0) + 20 + 'px';
          newEl.classList.remove('edit-selected', 'edit-group-selected');
          delete newEl.dataset.group;
          const layer0 = slides[currentSlide].querySelector('.step-layer[data-step="0"]');
          layer0.appendChild(newEl);
          clearSelection(); selectElement(newEl);
          showToast('복제 완료', 1500);
        }
      }
    } else if (item.dataset.action === 'delete') {
      document.getElementById('tb-delete').click();
    } else if (item.dataset.align) {
      alignToPage(item.dataset.align);
    }
    alignMenu.classList.remove('visible');
  });
  document.addEventListener('click', () => alignMenu.classList.remove('visible'));

  // ── 플로팅 서식바 이벤트 ──
  document.getElementById('format-bar').addEventListener('mousedown', e => e.preventDefault()); // 포커스 유지
  document.querySelectorAll('#format-bar .fmt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.cmd) {
        document.execCommand(btn.dataset.cmd);
      } else if (btn.dataset.align) {
        // 현재 편집 중인 요소의 textAlign 변경
        const editingEl = document.querySelector('[contenteditable="true"]');
        if (editingEl) editingEl.style.textAlign = btn.dataset.align;
      }
    });
  });

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
  // B/I/U 버튼 (상단 툴바)
  document.getElementById('tb-bold').addEventListener('click', () => document.execCommand('bold'));
  document.getElementById('tb-italic').addEventListener('click', () => document.execCommand('italic'));
  document.getElementById('tb-underline').addEventListener('click', () => document.execCommand('underline'));
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
    refreshAfterUngroup();
  });
  document.getElementById('tb-delete').addEventListener('click', () => {
    if (!selectedEls.length || !editMode) return;
    // groupEntered 상태: .child-selected 자식만 삭제 (자리 유지: visibility hidden)
    if (groupEntered && groupParent) {
      const child = groupParent.querySelector('.child-selected');
      if (child) {
        pushUndo();
        child.style.visibility = 'hidden';
        child.style.pointerEvents = 'none';
        child.classList.remove('child-selected');
        if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
        return;
      }
    }
    pushUndo();
    const slide = slides[currentSlide];
    const toDelete = individualMode ? [selectedEl] : [...selectedEls];
    toDelete.forEach(el => {
      const layer = el.closest('.step-layer');
      el.remove();
      if (layer && parseInt(layer.dataset.step) > 0 && !layer.querySelector(EDITABLE_SEL + ':not(.step-dim)')) {
        layer.remove();
        recalcSteps(slide);
      }
    });
    clearSelection();
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
    const BG_CLASSES = ['bg-blue','bg-red','bg-green','bg-white','bg-black','bg-accent','bg-gray','bg-v-orange','bg-v-blue','bg-v-green','bg-v-red','bg-v-purple','bg-v-brown'];
    const FC_CLASSES = ['fc-white','fc-red','fc-blue','fc-yellow','fc-black','fc-green','fc-brown','fc-gray','fc-purple'];
    const BG_COLORS = {'':'transparent','bg-blue':'rgba(255,148,52,0.12)','bg-red':'rgba(0,0,0,0.06)','bg-green':'rgba(255,148,52,0.12)','bg-white':'#fff','bg-black':'#222','bg-accent':'rgba(255,148,52,0.15)','bg-gray':'#999','bg-v-orange':'#FF6B00','bg-v-blue':'#4A90D9','bg-v-green':'#2ECC71','bg-v-red':'#E63946','bg-v-purple':'#9B59B6','bg-v-brown':'#8B4513'};
    const FC_COLORS = {'':'#222','fc-white':'#fff','fc-red':'#FF6B00','fc-blue':'#4A90D9','fc-yellow':'#E63946','fc-black':'#222','fc-green':'#2ECC71','fc-brown':'#8B4513','fc-gray':'#999','fc-purple':'#9B59B6'};
    // 팔레트에 원색 스와치 동적 추가
    [['bg-v-orange','#FF6B00','주황'],['bg-v-blue','#4A90D9','파랑'],['bg-v-green','#2ECC71','초록'],['bg-v-red','#E63946','빨강'],['bg-v-purple','#9B59B6','보라'],['bg-v-brown','#8B4513','갈색']].forEach(([cls, color, title]) => {
      if (paletteBg.querySelector(`[data-cls="${cls}"]`)) return;
      const sw = document.createElement('div');
      sw.className = 'color-swatch';
      sw.dataset.cls = cls;
      sw.style.background = color;
      sw.title = title;
      paletteBg.appendChild(sw);
    });
    // 글자색 팔레트에 추가 색상
    [['fc-green','#2ECC71','초록'],['fc-brown','#8B4513','갈색'],['fc-gray','#999','회색'],['fc-purple','#9B59B6','보라']].forEach(([cls, color, title]) => {
      if (paletteFc.querySelector(`[data-cls="${cls}"]`)) return;
      const sw = document.createElement('div');
      sw.className = 'color-swatch';
      sw.dataset.cls = cls;
      sw.style.background = color;
      sw.title = title;
      paletteFc.appendChild(sw);
    });

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
      // groupEntered 상태: .child-selected 우선
      if (groupEntered && groupParent) {
        const child = groupParent.querySelector('.child-selected');
        if (child) return [child];
      }
      return selectedEls.map(e => {
        if (e.matches('.hl')) return [e];
        const hls = e.querySelectorAll('.hl');
        if (hls.length) return Array.from(hls);
        return [e];
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
    btnBg.addEventListener('mousedown', (e) => {
      if (isEditing) e.preventDefault(); // 편집 중 선택 범위 유지
    });
    btnFc.addEventListener('mousedown', (e) => {
      if (isEditing) e.preventDefault(); // 편집 중 선택 범위 유지
    });
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
        if (sw.dataset.cls) {
          h.classList.add(sw.dataset.cls);
          h.style.background = BG_COLORS[sw.dataset.cls];
        } else {
          h.style.removeProperty('background');
        }
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
        if (sw.dataset.cls) {
          h.classList.add(sw.dataset.cls);
          h.style.color = FC_COLORS[sw.dataset.cls];
        } else {
          h.style.removeProperty('color');
        }
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
      } else {
        // 외부 텍스트 → 새 텍스트 요소 생성
        const textData = e.clipboardData.getData('text/plain');
        if (textData && textData.trim()) {
          e.preventDefault();
          pushUndo();
          const el = document.createElement('div');
          el.className = 'text-area';
          el.style.cssText = 'position:absolute; left:200px; top:400px; width:1600px;';
          const wrap = document.createElement('div');
          wrap.className = 'hl-wrap';
          const inner = document.createElement('div');
          const span = document.createElement('span');
          span.className = 'hl';
          span.textContent = textData;
          inner.appendChild(span);
          wrap.appendChild(inner);
          el.appendChild(wrap);
          const layer0 = slides[currentSlide].querySelector('.step-layer[data-step="0"]');
          layer0.appendChild(el);
          selectedEls.forEach(s => s.classList.remove('edit-selected'));
          selectedEl = el; selectedEls = [el];
          el.classList.add('edit-selected');
          updateCoordPanel(el);
          updateResizeHandle();
          if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
        }
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
<link href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Noto+Sans+KR:wght@900&display=swap" rel="stylesheet">
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
    const fullNotes = (d.notes || '').replace(/🟡[\d]+(?:[-–][\d]+)?\s*/g, '🟡');
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
    // groupEntered 상태: .child-selected 자식만 분리
    if (groupEntered && groupParent) {
      const child = groupParent.querySelector('.child-selected');
      if (child) {
        pushUndo();
        const layer = groupParent.closest('.step-layer');
        const stageRect = document.getElementById('stage').getBoundingClientRect();
        const scale = stageRect.width / 1920;
        const cr = child.getBoundingClientRect();
        const newEl = child.cloneNode(true);
        newEl.style.position = 'absolute';
        newEl.style.left = Math.round((cr.left - stageRect.left) / scale) + 'px';
        newEl.style.top = Math.round((cr.top - stageRect.top) / scale) + 'px';
        layer.appendChild(newEl);
        child.remove();
        exitGroup();
        clearSelection();
        groupToolbar.classList.remove('visible');
        if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
        return;
      }
    }
    pushUndo();
    const gid = selectedEl.dataset.group;
    if (gid) {
      if (individualMode) {
        // 개별 모드: 선택된 요소만 그룹 해제
        delete selectedEl.dataset.group;
      } else {
        selectedEls.forEach(el => delete el.dataset.group);
      }
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
    clearSelection();
    groupToolbar.classList.remove('visible');
    exitDrill();
    if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
  });
  document.getElementById('gt-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!selectedEls.length || !editMode) return;
    // groupEntered 상태: .child-selected 자식만 삭제 (자리 유지: visibility hidden)
    if (groupEntered && groupParent) {
      const child = groupParent.querySelector('.child-selected');
      if (child) {
        pushUndo();
        child.style.visibility = 'hidden';
        child.style.pointerEvents = 'none';
        child.classList.remove('child-selected');
        groupToolbar.classList.remove('visible');
        if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
        return;
      }
    }
    pushUndo();
    const slide = slides[currentSlide];
    const toDelete = individualMode ? [selectedEl] : [...selectedEls];
    toDelete.forEach(el => {
      const layer = el.closest('.step-layer');
      el.remove();
      if (layer && parseInt(layer.dataset.step) > 0 && !layer.querySelector(EDITABLE_SEL + ':not(.step-dim)')) {
        layer.remove();
        recalcSteps(slide);
      }
    });
    clearSelection();
    groupToolbar.classList.remove('visible');
    exitDrill();
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
