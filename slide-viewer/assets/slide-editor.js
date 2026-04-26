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
    if (e.target && e.target.closest('input, textarea, [contenteditable="true"]')) return;
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
  // 편집기 번호 체계
  // - canonical idx: DOM 순서
  // - visible idx: 필름스트립에서 보이는 fs-item 순서 (펼쳐진 page-group의 variants 포함)
  // - presentation 모드: base만 순회 (←/→는 다음/이전 base로)
  // - 편집 모드: 모든 slide 순회 (←/→는 canonical ±1)
  // - stable key: data-slide-id (예: T03_v1) → slidesByKey 매핑

  function getVisibleBasePageGroups() {
    const seen = new Set();
    const ordered = [];
    [...slides].forEach(s => {
      if (s.dataset.variant && s.dataset.variant !== "0") return;
      const pg = s.dataset.pageGroup;
      if (!pg || seen.has(pg)) return;
      seen.add(pg);
      ordered.push(pg);
    });
    return ordered;
  }

  function getDisplayIndexByPageGroup(pg) {
    if (pg == null || pg === '') return null;
    const parsed = parseInt(String(pg), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function getEditorBaseTotal() {
    return getVisibleBasePageGroups().length;
  }

  function formatEditorDisplayNumber(pg, variant) {
    const tnum = getDisplayIndexByPageGroup(pg);
    if (tnum == null) return null;
    const parsedVariant = parseInt(variant || "0", 10);
    if (!Number.isFinite(parsedVariant) || parsedVariant <= 0) {
      return `T${tnum}`;
    }
    return `T${tnum}-${parsedVariant + 1}`;
  }

  // 같은 page-group의 base와 variants가 DOM에서 인접 배치되어 있다는 불변식에 의존
  function rebuildSlidesByKey() {
    slidesByKey = {};
    slides.forEach(s => {
      if (s.dataset.slideId) slidesByKey[s.dataset.slideId] = s;
      const pg = s.dataset.pageGroup;
      if (!pg) return;
      const displayNumber = formatEditorDisplayNumber(pg, s.dataset.variant || "0");
      if (!displayNumber) return;
      s.dataset.displayGroupIndex = String(pg);
      s.dataset.displayNumber = displayNumber;
      const t = s.dataset.type || '';
      s.dataset.displayLabel = t ? `${displayNumber} ${t}` : `${displayNumber}`;
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
      if (pg) {
        num.textContent = slide.dataset.displayNumber || (isVariant ? `T${pg}-${parseInt(variant) + 1}` : `T${pg}`);
        const colorSeed = parseInt(slide.dataset.displayGroupIndex || pg, 10);
        item.setAttribute('data-group-color', Number.isFinite(colorSeed) ? colorSeed % 4 : 0);
      } else {
        num.textContent = idx + 1;
      }
      // 타입 라벨
      const slideType = slide.dataset.type;
      if (slideType) {
        const typeSpan = document.createElement('span');
        typeSpan.className = 'fs-type';
        typeSpan.textContent = slideType;
        num.appendChild(typeSpan);
      }

      item.appendChild(fsInner);
      item.appendChild(num);
      if (typeof createTypeMetaChips === 'function') {
        item.appendChild(createTypeMetaChips(slide, { compact: true }));
      }

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
    if (typeof insertFilmstripCategoryDividers === 'function') {
      insertFilmstripCategoryDividers();
    }
    scrollFilmstripToCurrent();
    buildSlideJumpNav();
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
    updateSlideJumpNav();
  }

  function isGeneratedDeck() {
    return document.body.classList.contains('frozen-legacy-deck');
  }

  function shouldRevealAllInSourceBrowseView() {
    return false;
  }

  function getSourceBrowseStepState(slide) {
    if (!slide) return { step: 0, revealAll: false, order: 0 };
    const revealAll = shouldRevealAllInSourceBrowseView();
    const step = revealAll ? Math.max(0, getSteps(slide) - 1) : 0;
    const layer = slide.querySelector(`.step-layer[data-step="${step}"]`);
    const order = revealAll && layer && typeof getOrderedEls === 'function'
      ? getOrderedEls(layer).length
      : 0;
    return { step, revealAll, order };
  }

  window.shouldRevealAllInSourceBrowseView = shouldRevealAllInSourceBrowseView;
  window.getSourceBrowseStepState = getSourceBrowseStepState;

  function getSlideScriptPreview(slide) {
    if (!slide) return '';
    return (slide.dataset.notes || '').trim();
  }

  function normalizePresenterNotesText(text) {
    return (text || '')
      .replace(/🟡[\d]+(?:[-–][\d]+)?\s*/g, '🟡 ')
      .replace(/[ \t]+\n/g, '\n')
      .trim();
  }

  let runtimeNotesEditingSlide = -1;
  let runtimeNotesSuppressApply = false;
  let runtimeNotesHidden = false;
  document.body.classList.remove('presenter-open', 'runtime-notes-hidden');

  function ensureRuntimeNotesDock() {
    let dock = document.getElementById('runtime-notes-dock');
    if (dock) return dock;

    dock = document.createElement('div');
    dock.id = 'runtime-notes-dock';
    dock.innerHTML = `
      <button id="runtime-notes-toggle" type="button" aria-expanded="false">발표자 노트</button>
      <div id="runtime-notes-panel" aria-hidden="true">
        <div class="runtime-notes-label">참고 (원고)</div>
        <textarea class="runtime-notes-body" spellcheck="false" placeholder="대본 없음"></textarea>
      </div>
    `;
    dock.addEventListener('click', e => e.stopPropagation());
    dock.addEventListener('keydown', e => e.stopPropagation());

    const toggle = dock.querySelector('#runtime-notes-toggle');
    const editor = dock.querySelector('.runtime-notes-body');
    toggle.addEventListener('click', e => {
      e.stopPropagation();
      toggleRuntimeNotesPanel();
    });
    if (editor) {
      editor.addEventListener('focus', () => {
        runtimeNotesEditingSlide = currentSlide;
      });
      editor.addEventListener('input', () => {
        if (runtimeNotesSuppressApply) return;
        runtimeNotesEditingSlide = currentSlide;
        if (typeof window.__applyPresenterNotes === 'function') {
          window.__applyPresenterNotes({
            slide: currentSlide,
            text: editor.value,
            flush: false,
            source: 'runtime-dock',
          });
        } else if (slides[currentSlide]) {
          slides[currentSlide].dataset.notes = editor.value;
        }
      });
      editor.addEventListener('blur', () => {
        const slideIndex = runtimeNotesEditingSlide === -1 ? currentSlide : runtimeNotesEditingSlide;
        runtimeNotesEditingSlide = -1;
        if (typeof window.__applyPresenterNotes === 'function') {
          window.__applyPresenterNotes({
            slide: slideIndex,
            text: editor.value,
            flush: true,
            source: 'runtime-dock',
          });
        } else if (slides[slideIndex]) {
          slides[slideIndex].dataset.notes = editor.value;
          if (typeof saveToFile === 'function') saveToFile(true);
        }
      });
    }

    document.body.appendChild(dock);
    return dock;
  }

  function toggleRuntimeNotesPanel(forceOpen) {
    const dock = ensureRuntimeNotesDock();
    const toggle = dock.querySelector('#runtime-notes-toggle');
    const panel = dock.querySelector('#runtime-notes-panel');
    const nextOpen = typeof forceOpen === 'boolean'
      ? forceOpen
      : !dock.classList.contains('open');
    dock.classList.toggle('open', nextOpen);
    toggle.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
    panel.setAttribute('aria-hidden', nextOpen ? 'false' : 'true');
  }

  function toggleRuntimeNotesHidden(force) {
    runtimeNotesHidden = typeof force === 'boolean' ? force : !runtimeNotesHidden;
    document.body.classList.toggle('runtime-notes-hidden', runtimeNotesHidden);
    if (runtimeNotesHidden) toggleRuntimeNotesPanel(false);
    return runtimeNotesHidden;
  }

  window.__toggleRuntimeNotesHidden = force => toggleRuntimeNotesHidden(force);

  function shouldHandleRuntimeNotesShortcut(e) {
    if (!e || e.defaultPrevented || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return false;
    if (!(e.code === 'KeyF' || String(e.key || '').toLowerCase() === 'f')) return false;
    const target = e.target;
    const isTyping = !!(target && target.closest && target.closest('input, textarea, [contenteditable="true"]'));
    const isRuntimeNotes = !!(target && target.closest && target.closest('#runtime-notes-dock'));
    return !isTyping || isRuntimeNotes;
  }

  function toggleFullscreenForShortcut() {
    if (!document.fullscreenElement) {
      const request = document.documentElement?.requestFullscreen;
      if (request) Promise.resolve(request.call(document.documentElement)).catch(() => {});
    } else if (document.exitFullscreen) {
      Promise.resolve(document.exitFullscreen()).catch(() => {});
    }
  }

  function toggleRuntimeOrPresenterNotes(force) {
    if (presenterWindow && !presenterWindow.closed && typeof togglePresenterNotesFromMain === 'function') {
      if (togglePresenterNotesFromMain(force)) return true;
    }
    if (typeof window.__toggleRuntimeNotesHidden === 'function') {
      window.__toggleRuntimeNotesHidden(force);
      return true;
    }
    return false;
  }

  function handleRuntimePresentationShortcut(force) {
    toggleRuntimeOrPresenterNotes(force);
    toggleFullscreenForShortcut();
  }

  function setRuntimeNotesPanelText(text) {
    const dock = ensureRuntimeNotesDock();
    const body = dock.querySelector('.runtime-notes-body');
    if (!body) return;
    if (
      runtimeNotesEditingSlide === currentSlide &&
      document.activeElement === body
    ) return;
    runtimeNotesSuppressApply = true;
    body.value = normalizePresenterNotesText(text);
    runtimeNotesSuppressApply = false;
  }

  function setRuntimeNotesForSlide(slide) {
    setRuntimeNotesPanelText(getSlideScriptPreview(slide));
  }

  const runtimeInkActionsBySlide = new Map();
  const runtimeInkTransientBySlide = new Map();
  const runtimeInkCursorState = {
    slide: -1,
    point: null,
    mode: 'off',
  };

  function cloneInkActions(actions) {
    return Array.isArray(actions)
      ? actions.map(action => ({
          ...action,
          points: Array.isArray(action?.points)
            ? action.points.map(point => ({ x: Number(point.x) || 0, y: Number(point.y) || 0 }))
            : [],
        }))
      : [];
  }

  function ensureRuntimeInkLayer() {
    let layer = document.getElementById('runtime-ink-layer');
    if (layer) return layer;
    const stage = document.getElementById('stage');
    if (!stage) return null;
    layer = document.createElement('div');
    layer.id = 'runtime-ink-layer';
    layer.innerHTML = `
      <div id="runtime-ink-sparks"></div>
      <canvas id="runtime-ink-canvas" width="1920" height="1080"></canvas>
      <div id="runtime-ink-cursor" aria-hidden="true"></div>
    `;
    stage.appendChild(layer);
    return layer;
  }

  function drawInkPath(ctx, points) {
    if (!points || !points.length) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    if (points.length === 1) ctx.lineTo(points[0].x + 0.01, points[0].y + 0.01);
    ctx.stroke();
  }

  function renderInkAction(ctx, action) {
    if (!action) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = action.width || (action.mode === 'erase' ? 42 : 18);
    if (action.mode === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = action.color || '#ff3b30';
    }
    if (action.shape === 'rect' && action.points && action.points.length >= 2) {
      const start = action.points[0];
      const end = action.points[action.points.length - 1];
      ctx.strokeRect(
        Math.min(start.x, end.x),
        Math.min(start.y, end.y),
        Math.abs(end.x - start.x),
        Math.abs(end.y - start.y),
      );
    } else if (action.shape === 'line' && action.points && action.points.length >= 2) {
      drawInkPath(ctx, [action.points[0], action.points[action.points.length - 1]]);
    } else {
      drawInkPath(ctx, action.points);
    }
    ctx.restore();
  }

  function spawnRuntimeInkSpark(point) {
    const layer = ensureRuntimeInkLayer();
    const sparks = layer?.querySelector('#runtime-ink-sparks');
    if (!sparks || !point) return;
    for (let i = 0; i < 4; i++) {
      const spark = document.createElement('span');
      spark.className = 'runtime-ink-spark';
      spark.style.left = `${point.x}px`;
      spark.style.top = `${point.y}px`;
      spark.style.setProperty('--spark-x', `${(Math.random() - 0.5) * 44}px`);
      spark.style.setProperty('--spark-y', `${(Math.random() - 0.5) * 44}px`);
      spark.style.setProperty('--spark-scale', (0.72 + Math.random() * 0.48).toFixed(2));
      sparks.appendChild(spark);
      setTimeout(() => spark.remove(), 480);
    }
  }

  function renderRuntimeInkCursor() {
    const layer = ensureRuntimeInkLayer();
    const cursor = layer?.querySelector('#runtime-ink-cursor');
    if (!cursor) return;
    const point = runtimeInkCursorState.point;
    const visible = (
      runtimeInkCursorState.slide === currentSlide &&
      !!point &&
      runtimeInkCursorState.mode &&
      runtimeInkCursorState.mode !== 'off'
    );
    cursor.classList.remove('visible', 'cursor-present', 'cursor-draw', 'cursor-erase');
    if (!visible) return;
    cursor.classList.add('visible', `cursor-${runtimeInkCursorState.mode}`);
    cursor.style.left = `${point.x}px`;
    cursor.style.top = `${point.y}px`;
  }

  function setRuntimeInkCursorState(slideIndex, point = null, mode = 'off') {
    runtimeInkCursorState.slide = slideIndex;
    runtimeInkCursorState.point = point
      ? { x: Number(point.x) || 0, y: Number(point.y) || 0 }
      : null;
    runtimeInkCursorState.mode = point && mode ? mode : 'off';
    renderRuntimeInkCursor();
  }

  function renderRuntimeInkForSlide(slideIndex = currentSlide) {
    const layer = ensureRuntimeInkLayer();
    const canvas = layer?.querySelector('#runtime-ink-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 1920, 1080);
    cloneInkActions(runtimeInkActionsBySlide.get(slideIndex) || []).forEach(action => renderInkAction(ctx, action));
    const transient = runtimeInkTransientBySlide.get(slideIndex);
    if (transient) renderInkAction(ctx, transient);
    renderRuntimeInkCursor();
  }

  function setRuntimeInkStateForSlide(
    slideIndex,
    actions,
    transientAction = null,
    sparkPoint = null,
    cursorPoint = null,
    cursorMode = 'off',
  ) {
    runtimeInkActionsBySlide.set(slideIndex, cloneInkActions(actions));
    if (transientAction && transientAction.points && transientAction.points.length) {
      runtimeInkTransientBySlide.set(slideIndex, cloneInkActions([transientAction])[0]);
    } else {
      runtimeInkTransientBySlide.delete(slideIndex);
    }
    if (slideIndex === currentSlide) {
      setRuntimeInkCursorState(slideIndex, cursorPoint, cursorMode);
    } else if (runtimeInkCursorState.slide === slideIndex && !cursorPoint) {
      setRuntimeInkCursorState(slideIndex, null, 'off');
    }
    if (slideIndex === currentSlide && sparkPoint) spawnRuntimeInkSpark(sparkPoint);
    if (slideIndex === currentSlide) renderRuntimeInkForSlide(slideIndex);
  }

  function getRuntimeInkActionsForSlide(slideIndex) {
    return cloneInkActions(runtimeInkActionsBySlide.get(slideIndex) || []);
  }

  function clearRuntimeInkForSlide(slideIndex) {
    runtimeInkActionsBySlide.delete(slideIndex);
    runtimeInkTransientBySlide.delete(slideIndex);
    if (runtimeInkCursorState.slide === slideIndex) {
      setRuntimeInkCursorState(slideIndex, null, 'off');
    }
    if (slideIndex === currentSlide) renderRuntimeInkForSlide(slideIndex);
  }

  function clearRuntimeInkForView(slideIndex = currentSlide) {
    clearRuntimeInkForSlide(slideIndex);
  }

  window.getRuntimeInkActionsForSlide = getRuntimeInkActionsForSlide;
  window.setRuntimeInkStateForSlide = setRuntimeInkStateForSlide;
  window.renderRuntimeInkForSlide = renderRuntimeInkForSlide;
  window.clearRuntimeInkForSlide = clearRuntimeInkForSlide;
  window.clearRuntimeInkForView = clearRuntimeInkForView;
  window.__getRuntimeInkState = () => ({
    slide: currentSlide,
    actionCount: getRuntimeInkActionsForSlide(currentSlide).length,
    hasTransient: !!runtimeInkTransientBySlide.get(currentSlide),
    cursorVisible: (
      runtimeInkCursorState.slide === currentSlide &&
      !!runtimeInkCursorState.point &&
      runtimeInkCursorState.mode !== 'off'
    ),
    cursorMode: (
      runtimeInkCursorState.slide === currentSlide &&
      runtimeInkCursorState.point
    ) ? runtimeInkCursorState.mode : 'off',
    lastShape: (() => {
      const actions = getRuntimeInkActionsForSlide(currentSlide);
      return actions.length ? actions[actions.length - 1].shape || null : null;
    })(),
  });

  function setSlideJumpNotesText(text) {
    const nav = document.getElementById('slide-jump-nav');
    if (!nav) return;
    const notes = nav.querySelector('.sj-notes');
    if (!notes) return;
    notes.textContent = (text || '').trim() || '대본 없음';
  }

  function setSlideJumpNotesForSlide(slide) {
    setSlideJumpNotesText(getSlideScriptPreview(slide));
  }

  function buildSlideJumpNav() {
    const nav = document.getElementById('slide-jump-nav');
    if (!nav) return;
    let toggle = nav.querySelector('.sj-toggle');
    let toolbar = nav.querySelector('.sj-toolbar');
    let search = nav.querySelector('.sj-search');
    let grid = nav.querySelector('.sj-grid');
    let notes = nav.querySelector('.sj-notes');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.className = 'sj-toggle';
      toggle.type = 'button';
      toggle.title = '접기/펴기';
      toggle.textContent = '›';
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const collapsed = nav.classList.toggle('collapsed');
        document.body.classList.toggle('sjn-collapsed', collapsed);
        toggle.textContent = collapsed ? '‹' : '›';
      });
      nav.appendChild(toggle);
    }
    if (!toolbar && !isGeneratedDeck()) {
      toolbar = document.createElement('div');
      toolbar.className = 'sj-toolbar';
      search = document.createElement('input');
      search.className = 'sj-search';
      search.type = 'text';
      search.placeholder = '번호 / T번호 / 타입';
      search.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const q = (search.value || '').trim().toLowerCase();
        if (!q) return;
        const first = [...grid.querySelectorAll('.sj-item')].find(item => item.style.display !== 'none');
        if (!first) return;
        first.click();
      });
      search.addEventListener('input', () => {
        const q = (search.value || '').trim().toLowerCase();
        grid.querySelectorAll('.sj-item').forEach(item => {
          const hay = ((item.dataset.search || '') + ' ' + (item.textContent || '')).toLowerCase();
          item.style.display = !q || hay.includes(q) ? '' : 'none';
        });
      });
      toolbar.appendChild(search);
      nav.appendChild(toolbar);
    }
    if (!grid) {
      grid = document.createElement('div');
      grid.className = 'sj-grid';
      nav.appendChild(grid);
    }
    if (!notes && !isGeneratedDeck()) {
      notes = document.createElement('div');
      notes.className = 'sj-notes';
      nav.appendChild(notes);
    }
    grid.innerHTML = '';
    const basePgs = getVisibleBasePageGroups();
    const sortedPgs = [...basePgs].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    const curPg = slides[currentSlide] ? slides[currentSlide].dataset.pageGroup : null;
    sortedPgs.forEach(pg => {
      const baseSlide = [...slides].find(s => s.dataset.pageGroup === pg && (s.dataset.variant === '0' || !s.dataset.variant));
      if (!baseSlide) return;
      const baseType = baseSlide.dataset.type || '';
      const canonicalIdx = [...slides].indexOf(baseSlide);
      const displayNumber = formatEditorDisplayNumber(pg, '0');
      if (!displayNumber) return;
      const item = document.createElement('div');
      item.className = 'sj-item' + (pg === curPg ? ' active' : '');
      item.dataset.pg = pg;
      item.dataset.canonicalIdx = String(canonicalIdx);
      item.textContent = displayNumber;
      item.dataset.search = [displayNumber, pg, baseType, baseSlide.dataset.displayLabel || ''].join(' ');
      const specialHint = (typeof specialUsageHintForPageGroup === 'function')
        ? specialUsageHintForPageGroup(pg)
        : '';
      if (specialHint) item.title = specialHint;
      item.addEventListener('click', () => {
        const overview = document.getElementById('overview');
        if (overview && overview.dataset.open === '1') {
          const card = document.querySelector('#overview-grid .ov-group[data-page-group="' + pg + '"]')
            || document.querySelector('#overview-grid .ov-item[data-page-group="' + pg + '"]');
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.remove('sj-highlight');
            void card.offsetWidth;
            card.classList.add('sj-highlight');
            setTimeout(() => card.classList.remove('sj-highlight'), 3100);
          }
        } else {
          goToSlide(canonicalIdx);
        }
      });
      grid.appendChild(item);
    });
    const active = grid.querySelector('.sj-item.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
    if (notes) setSlideJumpNotesForSlide(slides[currentSlide]);
  }

  function updateSlideJumpNav() {
    setRuntimeNotesForSlide(slides[currentSlide]);
    renderRuntimeInkForSlide(currentSlide);
    const nav = document.getElementById('slide-jump-nav');
    if (!nav) return;
    const grid = nav.querySelector('.sj-grid');
    if (!grid || grid.children.length === 0) { buildSlideJumpNav(); return; }
    const curPg = slides[currentSlide] ? slides[currentSlide].dataset.pageGroup : null;
    grid.querySelectorAll('.sj-item').forEach(item => {
      item.classList.toggle('active', item.dataset.pg === curPg);
    });
    const active = grid.querySelector('.sj-item.active');
    if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    setSlideJumpNotesForSlide(slides[currentSlide]);
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
    if (!(document.body && document.body.dataset.generated === 'true')) {
      if (typeof showToast === 'function') showToast('에디터에서는 슬라이드 삭제를 막았습니다.');
      return;
    }
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

  // 세션 36 후속3: 모듈 밖 고아 조각 자동 정리 (페이지 로드 시 1회)
  // 이전에 모듈 내부 자식이 드래그로 빠져나가 슬라이드에 남아있던 현상 해결.
  // 조건: 모듈 전용 클래스를 가진 요소가 [data-module-id] 조상 없이 떠 있으면 고아.
  //
  // ⚠️ rv-후속(Codex): 아래 classes 목록은 전부 MODULE_SPECS의 모듈 전용 클래스다.
  // 새 요소에 이 클래스명(summary-text/tag-label/progress-fill/counter-*/prev-* 등)을
  // 절대 재사용하지 말 것. 재사용 시 페이지 로드마다 조용히 제거되어 데이터 손실 발생.
  (function cleanupOrphanModuleFragments() {
    const classes = [
      'sc-item', 'sc-num', 'sc-label',
      'stat-box', 'stat-value',
      'tri-col', 'tri-icon', 'tri-title', 'tri-sub', 'tri-bullets',
      'empty-card',
      'cl-item', 'cl-mark', 'cl-text',
      'af-item', 'af-step', 'af-arrow',
      'qb-text', 'qb-source',
      'wb-icon', 'wb-text',
      'summary-text', 'tag-label',
      'counter-current', 'counter-sep', 'counter-total',
      'contrast-left', 'contrast-neq', 'contrast-right',
      'ko-main', 'en-sub',
      'prev-indicator', 'prev-arrow', 'prev-title',
      'progress-fill'
    ];
    let removed = 0;
    classes.forEach(cls => {
      document.querySelectorAll('#stage .' + cls).forEach(el => {
        if (!el.closest('[data-module-id]')) {
          el.remove();
          removed++;
        }
      });
    });
    if (removed > 0) console.log('[module cleanup] 고아 조각 제거:', removed);
  })();

  // 레거시 runtime deck 중 T53/T54 계열은 예전 익명 텍스트 구조가 남아 있을 수 있다.
  // 편집/리사이즈 훅을 잃지 않도록 현재 타입 훅 클래스로 자동 승격한다.
  (function normalizeLegacyFlowBlocks() {
    const upgradeTextHook = (selector, className, skipSelector = '') => {
      document.querySelectorAll('#stage ' + selector).forEach(el => {
        if (el.querySelector(':scope > .' + className)) return;
        if (skipSelector && el.querySelector(skipSelector)) return;
        const childEls = Array.from(el.children || []);
        if (childEls.length === 1 && !(Array.from(el.childNodes || []).some(node => node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.trim()))) {
          childEls[0].classList.add(className);
          return;
        }
        const wrapper = document.createElement('div');
        wrapper.className = className;
        while (el.firstChild) wrapper.appendChild(el.firstChild);
        el.appendChild(wrapper);
      });
    };
    upgradeTextHook('.flow-step1', 'flow-step-title');
    upgradeTextHook('.flow-step2', 'flow-step-body');
    upgradeTextHook('.branch-root', 'branch-root-text');
    upgradeTextHook('.branch-result', 'branch-result-text', '.branch-sub');
  })();

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

  function bootstrapInitialSlideView() {
    slides = document.querySelectorAll('#stage > .slide');
    if (!slides.length) return;
    rebuildSlidesByKey();
    ensureRuntimeNotesDock();
    ensureRuntimeInkLayer();

    const activeIdx = Array.from(slides).findIndex(slide => slide.classList.contains('active'));
    if (activeIdx >= 0) currentSlide = activeIdx;

    const activeSlide = slides[currentSlide];
    const sourceBrowseState = (
      activeSlide &&
      typeof getSourceBrowseStepState === 'function'
    ) ? getSourceBrowseStepState(activeSlide) : null;
    if (sourceBrowseState && sourceBrowseState.revealAll) {
      currentStep = sourceBrowseState.step;
      currentOrder = sourceBrowseState.order;
    } else if (activeSlide) {
      const visibleSteps = Array.from(activeSlide.querySelectorAll('.step-layer.visible[data-step]'))
        .map(layer => parseInt(layer.dataset.step || '0', 10))
        .filter(Number.isFinite);
      currentStep = visibleSteps.length ? Math.max(...visibleSteps) : 0;
      currentOrder = 0;
    } else {
      currentStep = 0;
      currentOrder = 0;
    }

    slides.forEach((slide, index) => {
      slide.classList.toggle('active', index === currentSlide);
      slide.classList.remove('leave-left', 'enter-from-left');
      slide.style.opacity = '';
      slide.style.transform = '';
      slide.style.transition = '';
    });

    if (slides[currentSlide] && typeof showStep === 'function') {
      showStep(
        slides[currentSlide],
        currentStep,
        !!(sourceBrowseState && sourceBrowseState.revealAll)
      );
    }
    setRuntimeNotesForSlide(slides[currentSlide]);
    renderRuntimeInkForSlide(currentSlide);
    if (typeof buildFilmstrip === 'function') buildFilmstrip();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapInitialSlideView, { once: true });
  } else {
    setTimeout(bootstrapInitialSlideView, 0);
  }
  // ── 에디터 구역/카테고리 헤더 ──
  // 데이터 정본:
  //   - references/type-compile-config.json 의 visual_category / editor_section
  //   - references/type-registry.json 의 field_mapping.fields.title 존재 여부
  // JS에는 page-group 기준 bucket/category 맵을 미러링하고, 테스트가 drift를 막는다.

  const BUCKET_META = [
    { key: 'title', label: '제목 있음', icon: 'T' },
    { key: 'no-title', label: '제목 없음', icon: 'N' },
    { key: 'special', label: '특수', icon: 'S' },
  ];

  const CATEGORY_META = [
    { name: '임팩트',         icon: '🔥' },
    { name: '아이콘+글',      icon: '🖼' },
    { name: '카드/리스트',    icon: '📋' },
    { name: '플로우',         icon: '➡️' },
    { name: '비교',           icon: '⚖️' },
    { name: '차트/다이어그램', icon: '📊' },
    { name: '텍스트',         icon: '📝' },
  ];

  const SPECIAL_USAGE_HINT = 'T23=구독/좋아요 CTA · T37=영상 마무리 · T38=챕터 전환';

  const PG_TO_BUCKET = {
    1:  'special',
    2:  'title',    3:  'title',    4:  'title',
    5:  'title',    6:  'title',    7:  'title',    8:  'title',
    9:  'title',    10: 'title',    11: 'title',    12: 'title',
    13: 'title',    14: 'title',    15: 'title',    16: 'title',
    17: 'title',    18: 'title',    19: 'title',    20: 'title',
    21: 'title',    22: 'title',    23: 'special',  24: 'title',
    25: 'title',    26: 'title',    27: 'title',    28: 'title',
    29: 'title',    30: 'title',    31: 'title',    32: 'title',
    33: 'title',    34: 'title',    35: 'title',    36: 'title',
    37: 'special',  38: 'special',  39: 'title',    40: 'title',
    41: 'title',    42: 'title',    43: 'title',    44: 'title',
    45: 'title',    46: 'title',    47: 'title',    48: 'title',
    49: 'title',    50: 'title',    51: 'title',    52: 'title',
    53: 'title',    54: 'title',    55: 'title',    56: 'title',
    57: 'title',    58: 'title',    59: 'title',
  };

  const PG_TO_CATEGORY = {
    1:  '아이콘+글',
    2:  '아이콘+글',   3:  '카드/리스트', 4:  '카드/리스트',
    5:  '카드/리스트', 6:  '카드/리스트', 7:  '아이콘+글',   8:  '아이콘+글',
    9:  '플로우',      10: '플로우',      11: '차트/다이어그램', 12: '차트/다이어그램',
    13: '임팩트',      14: '임팩트',      15: '차트/다이어그램', 16: '차트/다이어그램',
    17: '비교',        18: '임팩트',      19: '아이콘+글',   20: '카드/리스트',
    21: '임팩트',      22: '카드/리스트', 23: '아이콘+글', 24: '비교',
    25: '비교',        26: '카드/리스트', 27: '플로우',      28: '비교',
    29: '아이콘+글',   30: '플로우',      31: '비교',        32: '플로우',
    33: '플로우',      34: '플로우',      35: '임팩트',      36: '아이콘+글',
    37: '텍스트',      38: '텍스트',      39: '텍스트',    40: '텍스트',
    41: '텍스트',      42: '비교',        43: '텍스트',
    44: '텍스트',      45: '텍스트',      46: '텍스트',      47: '텍스트',
    48: '텍스트',      49: '아이콘+글',   50: '비교',        51: '아이콘+글',
    52: '비교',        53: '플로우',      54: '플로우',      55: '텍스트',
    56: '텍스트',      57: '텍스트',      58: '텍스트',      59: '텍스트',
  };

  function bucketOfPageGroup(pg) {
    if (pg == null || pg === '') return null;
    return PG_TO_BUCKET[parseInt(pg)] || null;
  }

  function categoryOfPageGroup(pg) {
    if (pg == null || pg === '') return null;
    return PG_TO_CATEGORY[parseInt(pg)] || null;
  }

  function specialUsageHintForPageGroup(pg) {
    const num = parseInt(pg, 10);
    if (num === 23) return 'T23 CTA버튼: 구독/좋아요 CTA 전용';
    if (num === 37) return 'T37 마지막정리: 영상 마무리 전용';
    if (num === 38) return 'T38 챕터전환: 챕터 전환 전용';
    return '';
  }

  function findBucketMeta(bucketKey) {
    return BUCKET_META.find(function(b) { return b.key === bucketKey; }) || null;
  }

  function findCategoryMeta(catName) {
    return CATEGORY_META.find(function(c) { return c.name === catName; }) || null;
  }

  function countBasePageGroupsByBucket(slideList) {
    const counts = {};
    const seenPgs = new Set();
    slideList.forEach(function(s) {
      const pg = s.dataset ? s.dataset.pageGroup : null;
      if (!pg || seenPgs.has(pg)) return;
      seenPgs.add(pg);
      const bucket = bucketOfPageGroup(pg);
      if (!bucket) return;
      counts[bucket] = (counts[bucket] || 0) + 1;
    });
    return counts;
  }

  function countBasePageGroupsByCategory(slideList) {
    const counts = {};
    const seenPgs = new Set();
    slideList.forEach(function(s) {
      const pg = s.dataset ? s.dataset.pageGroup : null;
      if (!pg || seenPgs.has(pg)) return;
      seenPgs.add(pg);
      const cat = categoryOfPageGroup(pg);
      if (!cat) return;
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }

  function filmstripBucketDividerEl(bucketKey, count) {
    const meta = findBucketMeta(bucketKey);
    const divider = document.createElement('div');
    divider.className = 'fs-bucket-divider';
    divider.dataset.bucket = bucketKey;
    if (bucketKey === 'special') divider.title = SPECIAL_USAGE_HINT;
    divider.innerHTML =
      '<span class="fs-bucket-icon">' + (meta ? meta.icon : '') + '</span>' +
      '<span class="fs-bucket-name">' + (meta ? meta.label : bucketKey) + '</span>' +
      '<span class="fs-bucket-count">' + count + '</span>' +
      (bucketKey === 'special' ? '<span class="fs-bucket-hint"> · ' + SPECIAL_USAGE_HINT + '</span>' : '');
    return divider;
  }

  function insertFilmstripCategoryDividers() {
    const inner = document.getElementById('filmstrip-inner');
    if (!inner) return;
    inner.querySelectorAll('.fs-bucket-divider, .fs-category-divider').forEach(function(el) { el.remove(); });

    const baseItems = [...inner.querySelectorAll('.fs-item')].filter(function(it) {
      return !it.dataset.variant || it.dataset.variant === '0';
    });
    const bucketCounts = countBasePageGroupsByBucket(baseItems);
    const categoryCounts = countBasePageGroupsByCategory(baseItems);

    let prevBucket = null;
    let prevCat = null;
    const children = [...inner.children];
    children.forEach(function(child) {
      if (!child.classList || !child.classList.contains('fs-item')) return;
      const isBase = !child.dataset.variant || child.dataset.variant === '0';
      if (!isBase) return;

      const bucket = bucketOfPageGroup(child.dataset.pageGroup);
      if (bucket && bucket !== prevBucket) {
        inner.insertBefore(filmstripBucketDividerEl(bucket, bucketCounts[bucket] || 0), child);
        prevBucket = bucket;
        prevCat = null;
      }

      const cat = categoryOfPageGroup(child.dataset.pageGroup);
      if (bucket !== 'special' && cat && cat !== prevCat) {
        const meta = findCategoryMeta(cat);
        const divider = document.createElement('div');
        divider.className = 'fs-category-divider';
        divider.dataset.category = cat;
        divider.innerHTML =
          '<span class="fs-cat-icon">' + (meta ? meta.icon : '') + '</span>' +
          '<span class="fs-cat-name">' + cat + '</span>' +
          '<span class="fs-cat-count">' + (categoryCounts[cat] || 0) + '</span>';
        inner.insertBefore(divider, child);
        prevCat = cat;
      }
    });
  }

  function overviewBucketHeaderEl(bucketKey, count) {
    const meta = findBucketMeta(bucketKey);
    const header = document.createElement('div');
    header.className = 'ov-bucket-header';
    header.dataset.bucket = bucketKey;
    if (bucketKey === 'special') header.title = SPECIAL_USAGE_HINT;
    header.innerHTML =
      '<span class="ov-bucket-icon">' + (meta ? meta.icon : '') + '</span>' +
      '<span class="ov-bucket-name">' + (meta ? meta.label : bucketKey) + '</span>' +
      '<span class="ov-bucket-count">' + count + '</span>' +
      (bucketKey === 'special' ? '<span class="ov-bucket-hint"> · ' + SPECIAL_USAGE_HINT + '</span>' : '');
    return header;
  }

  function overviewCategoryHeaderEl(catName, count) {
    const meta = findCategoryMeta(catName);
    const header = document.createElement('div');
    header.className = 'ov-category-header';
    header.dataset.category = catName;
    header.innerHTML =
      '<span class="ov-cat-icon">' + (meta ? meta.icon : '') + '</span>' +
      '<span class="ov-cat-name">' + (meta ? meta.name : catName) + '</span>' +
      '<span class="ov-cat-count">' + count + '</span>';
    return header;
  }
  // 자동 생성 보조 데이터 — references/type-registry.json + type-compile-config.json 기준
  // 에디터 개요/필름스트립 카드의 메타 태그 표시용.
  const PG_TO_TYPE_META = {
    1: {"label": "T01 말풍선+텍스트", "schemaRequiredCount": 1, "fillRange": [2, 2], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": true}},
    2: {"label": "T02 아이콘+텍스트", "schemaRequiredCount": 1, "fillRange": [2, 2], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": true, "imageRequired": false, "emoji": true}},
    3: {"label": "T03 카드", "schemaRequiredCount": 4, "fillRange": [4, 16], "itemsRange": [1, 5], "displaySteps": null, "usageScope": null, "media": {"image": true, "imageRequired": false, "emoji": false}},
    4: {"label": "T04 그리드카드", "schemaRequiredCount": 4, "fillRange": [4, 16], "itemsRange": [1, 5], "displaySteps": null, "usageScope": null, "media": {"image": true, "imageRequired": false, "emoji": true}},
    5: {"label": "T05 번호항목", "schemaRequiredCount": 2, "fillRange": [2, 6], "itemsRange": [1, 5], "displaySteps": null, "usageScope": null, "media": {"image": true, "imageRequired": false, "emoji": false}},
    6: {"label": "T06 체크리스트", "schemaRequiredCount": 2, "fillRange": [2, 6], "itemsRange": [1, 5], "displaySteps": null, "usageScope": null, "media": {"image": true, "imageRequired": false, "emoji": false}},
    7: {"label": "T07 아이콘행", "schemaRequiredCount": 5, "fillRange": [5, 13], "itemsRange": [1, 3], "displaySteps": null, "usageScope": null, "media": {"image": true, "imageRequired": false, "emoji": true}},
    8: {"label": "T08 아이콘아이템", "schemaRequiredCount": 3, "fillRange": [3, 11], "itemsRange": [1, 5], "displaySteps": null, "usageScope": null, "media": {"image": true, "imageRequired": false, "emoji": true}},
    9: {"label": "T09 플로우", "schemaRequiredCount": 2, "fillRange": [2, 6], "itemsRange": [1, 5], "displaySteps": null, "usageScope": null, "media": {"image": true, "imageRequired": false, "emoji": false}},
    10: {"label": "T10 아이콘플로우", "schemaRequiredCount": 3, "fillRange": [3, 11], "itemsRange": [1, 5], "displaySteps": null, "usageScope": null, "media": {"image": true, "imageRequired": false, "emoji": true}},
    11: {"label": "T11 바차트", "schemaRequiredCount": 4, "fillRange": [4, 16], "itemsRange": [1, 5], "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    12: {"label": "T12 라인차트", "schemaRequiredCount": 4, "fillRange": [5, 5], "itemsRange": [1, 2], "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    13: {"label": "T13 큰숫자(서클)", "schemaRequiredCount": 2, "fillRange": [3, 3], "itemsRange": [1, 3], "displaySteps": null, "usageScope": null, "media": {"image": true, "imageRequired": false, "emoji": false}},
    14: {"label": "T14 숫자스탯", "schemaRequiredCount": 3, "fillRange": [3, 3], "itemsRange": [1, 3], "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    15: {"label": "T15 다이어그램", "schemaRequiredCount": 2, "fillRange": [2, 7], "itemsRange": [1, 5], "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    16: {"label": "T16 타임라인", "schemaRequiredCount": 3, "fillRange": [3, 11], "itemsRange": [1, 5], "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    17: {"label": "T17 비교박스", "schemaRequiredCount": 2, "fillRange": [3, 3], "itemsRange": [1, 5], "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    18: {"label": "T18 인용", "schemaRequiredCount": 3, "fillRange": [3, 3], "itemsRange": [1, 3], "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    19: {"label": "T19 경고배너", "schemaRequiredCount": 3, "fillRange": [3, 11], "itemsRange": [1, 5], "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": true}},
    20: {"label": "T20 태그칩", "schemaRequiredCount": 2, "fillRange": [3, 4], "itemsRange": [2, 3], "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    21: {"label": "T21 섹션배지+코너레이블", "schemaRequiredCount": 5, "fillRange": [5, 5], "itemsRange": [2, 5], "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": true}},
    22: {"label": "T22 버튼그리드", "schemaRequiredCount": 2, "fillRange": [2, 6], "itemsRange": [1, 5], "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    23: {"label": "T23 CTA버튼", "schemaRequiredCount": 2, "fillRange": [2, 2], "itemsRange": null, "displaySteps": 4, "usageScope": "cta_only", "media": {"image": false, "imageRequired": false, "emoji": false}},
    24: {"label": "T24 비교박스(이모지VS)", "schemaRequiredCount": 2, "fillRange": [3, 3], "itemsRange": [1, 5], "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": true}},
    25: {"label": "T25 비교박스(불릿리스트)", "schemaRequiredCount": 3, "fillRange": [3, 7], "itemsRange": [1, 5], "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": true}},
    26: {"label": "T26 그리드카드(아이콘좌측)", "schemaRequiredCount": 4, "fillRange": [4, 16], "itemsRange": [1, 5], "displaySteps": null, "usageScope": null, "media": {"image": true, "imageRequired": false, "emoji": true}},
    27: {"label": "T27 섹션배지(챕터플로우)", "schemaRequiredCount": 6, "fillRange": [7, 10], "itemsRange": [2, 5], "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": true}},
    28: {"label": "T28 비교테이블", "schemaRequiredCount": 8, "fillRange": [8, 20], "itemsRange": [1, 5], "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    29: {"label": "T29 이미지+텍스트", "schemaRequiredCount": 1, "fillRange": [3, 3], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": true, "imageRequired": true, "emoji": true}},
    30: {"label": "T30 분기플로우", "schemaRequiredCount": 7, "fillRange": [10, 13], "itemsRange": [2, 3], "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    31: {"label": "T31 분할레이아웃", "schemaRequiredCount": 15, "fillRange": [17, 23], "itemsRange": [2, 5], "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": true}},
    32: {"label": "T32 등식플로우", "schemaRequiredCount": 5, "fillRange": [8, 11], "itemsRange": [2, 3], "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": true}},
    33: {"label": "T33 아이콘플로우(스탯)", "schemaRequiredCount": 3, "fillRange": [3, 9], "itemsRange": [1, 4], "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": true}},
    34: {"label": "T34 플로우(상세)", "schemaRequiredCount": 5, "fillRange": [9, 13], "itemsRange": [2, 3], "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": true}},
    35: {"label": "T35 토픽결론", "schemaRequiredCount": 5, "fillRange": [5, 5], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    36: {"label": "T36 인용(대비)", "schemaRequiredCount": 5, "fillRange": [5, 5], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": true}},
    37: {"label": "T37 마지막정리", "schemaRequiredCount": 2, "fillRange": [3, 5], "itemsRange": [2, 4], "displaySteps": null, "usageScope": "outro_only", "media": {"image": false, "imageRequired": false, "emoji": false}},
    38: {"label": "T38 챕터전환", "schemaRequiredCount": 3, "fillRange": [5, 9], "itemsRange": [2, 4], "displaySteps": null, "usageScope": "chapter_only", "media": {"image": false, "imageRequired": false, "emoji": false}},
    39: {"label": "T39 용어정의", "schemaRequiredCount": 2, "fillRange": [4, 4], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    40: {"label": "T40 인물카드", "schemaRequiredCount": 2, "fillRange": [4, 4], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    41: {"label": "T41 대질문", "schemaRequiredCount": 2, "fillRange": [3, 3], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    42: {"label": "T42 좌우2분할", "schemaRequiredCount": 6, "fillRange": [7, 7], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": true}},
    43: {"label": "T43 블로그인트로", "schemaRequiredCount": 2, "fillRange": [3, 3], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    44: {"label": "T44 한줄강조", "schemaRequiredCount": 1, "fillRange": [1, 1], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    45: {"label": "T45 두줄대비", "schemaRequiredCount": 2, "fillRange": [2, 2], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    46: {"label": "T46 카운터제목", "schemaRequiredCount": 3, "fillRange": [3, 3], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    47: {"label": "T47 아이콘강조", "schemaRequiredCount": 3, "fillRange": [3, 3], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": true, "imageRequired": true, "emoji": true}},
    48: {"label": "T48 두줄전개", "schemaRequiredCount": 2, "fillRange": [2, 2], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    49: {"label": "T49 아이콘2단강조", "schemaRequiredCount": 3, "fillRange": [3, 3], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": true}},
    50: {"label": "T50 좌우2단비교", "schemaRequiredCount": 3, "fillRange": [3, 3], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    51: {"label": "T51 아이콘2단포인트", "schemaRequiredCount": 3, "fillRange": [3, 3], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": true}},
    52: {"label": "T52 상하2단비교", "schemaRequiredCount": 3, "fillRange": [3, 3], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    53: {"label": "T53 2단플로우", "schemaRequiredCount": 3, "fillRange": [3, 3], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    54: {"label": "T54 분기2단플로우", "schemaRequiredCount": 3, "fillRange": [3, 3], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    55: {"label": "T55 상하두줄전개", "schemaRequiredCount": 2, "fillRange": [2, 2], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    56: {"label": "T56 상단강조전개", "schemaRequiredCount": 2, "fillRange": [2, 2], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    57: {"label": "T57 좌측바전개", "schemaRequiredCount": 2, "fillRange": [2, 2], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    58: {"label": "T58 인용형전개", "schemaRequiredCount": 2, "fillRange": [2, 2], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
    59: {"label": "T59 카드형전개", "schemaRequiredCount": 2, "fillRange": [2, 2], "itemsRange": null, "displaySteps": null, "usageScope": null, "media": {"image": false, "imageRequired": false, "emoji": false}},
  };

  function typeMetaOfPageGroup(pg) {
    if (pg == null || pg === '') return null;
    return PG_TO_TYPE_META[parseInt(pg, 10)] || null;
  }

  function countBySelector(slide, selector) {
    return slide ? slide.querySelectorAll(selector).length : 0;
  }

  function inputLabelOfSlide(slide, meta) {
    if (!slide || !slide.dataset) return null;
    const pg = parseInt(slide.dataset.pageGroup, 10);
    let n = 0;
    if ([3, 4, 26].includes(pg)) n = countBySelector(slide, '.step-layer[data-step]:not([data-step="0"]) .grid-card, .step-layer[data-step]:not([data-step="0"]) .card');
    else if ([5, 6].includes(pg)) n = countBySelector(slide, '.step-layer[data-step]:not([data-step="0"]) .num-item, .step-layer[data-step]:not([data-step="0"]) .check-item');
    else if (pg === 7) n = countBySelector(slide, '.step-layer[data-step]:not([data-step="0"]) [data-type="아이콘행"]');
    else if (pg === 8) n = countBySelector(slide, '.step-layer[data-step]:not([data-step="0"]) .icon-item');
    else if (pg === 9) n = countBySelector(slide, '.step-layer[data-step]:not([data-step="0"]) .flow-box');
    else if (pg === 10) n = countBySelector(slide, '.step-layer[data-step]:not([data-step="0"]) .icon-flow-item');
    else if (pg === 11) n = countBySelector(slide, '.bar-row, .hbar-row');
    else if (pg === 15) n = countBySelector(slide, '.step-layer[data-step]:not([data-step="0"]) .flow-box');
    else if (pg === 16) n = countBySelector(slide, '.step-layer[data-step]:not([data-step="0"]) .step-timeline');
    else if (pg === 17) n = countBySelector(slide, '.compare-col.good .compare-item');
    else if (pg === 19) n = countBySelector(slide, '.alert-banner');
    else if (pg === 20) n = countBySelector(slide, '.tag-chip');
    else if (pg === 21) n = countBySelector(slide, '.section-badge');
    else if (pg === 22) n = countBySelector(slide, '.btn-pill');
    else if (pg === 24) n = countBySelector(slide, '.compare-col.good .compare-item');
    else if (pg === 25) n = countBySelector(slide, '.bullet-card');
    else if (pg === 28) n = countBySelector(slide, '.comp-table tbody tr');
    else if (pg === 37) n = countBySelector(slide, '.step-layer[data-step]:not([data-step="0"]) .postit');
    else if (pg === 38) n = countBySelector(slide, '.step-layer[data-step]:not([data-step="0"]) .postit-mid');

    if (pg === 11 && n) return String(1 + (n * 2));
    if (pg === 12) return '5';
    if (pg === 13) return '3+';
    if (pg === 15 && n) return String(1 + n);
    if (pg === 16 && n) return String(1 + (n * 2));
    if (pg === 17 && n) return String(1 + (n * 2));
    if (pg === 24 && n) return String(1 + (n * 2));
    if (pg === 25 && n) return String(1 + n + 1);
    if (pg === 28 && n) return String(1 + (n * 3) + 1);
    if (pg === 37 && n) return String(1 + n);
    if (pg === 38 && n) return String(1 + (n * 2));
    if (n) return String(1 + n);
    if (meta && Array.isArray(meta.fillRange)) {
      const minF = meta.fillRange[0];
      const maxF = meta.fillRange[1];
      return minF === maxF ? String(minF) : (minF + '~' + maxF);
    }
    return null;
  }

  function createTypeMetaChips(slide, options) {
    options = options || {};
    const row = document.createElement('div');
    row.className = options.compact ? 'type-meta-chips compact' : 'type-meta-chips';
    if (!slide) return row;
    const meta = typeMetaOfPageGroup(slide.dataset ? slide.dataset.pageGroup : null);
    const addChip = function(label, title, extraClass) {
      if (!label) return;
      const chip = document.createElement('span');
      chip.className = 'type-meta-chip' + (extraClass ? ' ' + extraClass : '');
      chip.textContent = label;
      if (title) chip.title = title;
      row.appendChild(chip);
    };
    const steps = (typeof getDisplaySteps === 'function')
      ? getDisplaySteps(slide)
      : ((meta && Number.isFinite(meta.displaySteps)) ? meta.displaySteps : ((typeof getSteps === 'function') ? getSteps(slide) : 1));
    addChip(steps + '스텝', '실제 표시 스텝 수');
    const inputLabel = inputLabelOfSlide(slide, meta);
    if (inputLabel) addChip('입력 ' + inputLabel, '채워야 하는 실제 입력값 수');
    if (meta && Array.isArray(meta.itemsRange)) {
      const min = meta.itemsRange[0];
      const max = meta.itemsRange[1];
      addChip((min === max ? String(min) : (min + '~' + max)) + '개', '지원 아이템 수');
    }
    if (meta && meta.media) {
      if (meta.media.imageRequired) addChip('🖼!', '이미지 필수', 'media');
      else if (meta.media.image) addChip('🖼', '이미지 지원', 'media');
      if (meta.media.emoji) addChip('🙂', '이모지/아이콘 슬롯', 'media');
    }
    return row;
  }
  // 자동 생성 — regenerate-snippets.py (MODULE_SPECS + RECOMMENDED_MODULES_BY_TYPE)
  window.MODULES_DATA = {
  "modules": [
    {
      "id": "M01",
      "name": "스탯박스",
      "html": "<div class=\"slide-el mod-M01 stat-box-row\"><div class=\"stat-box\"><div class=\"stat-value\">{{STAT1_VALUE}}</div><div class=\"stat-label\">{{STAT1_LABEL}}</div></div><div class=\"stat-box\"><div class=\"stat-value\">{{STAT2_VALUE}}</div><div class=\"stat-label\">{{STAT2_LABEL}}</div></div><div class=\"stat-box\"><div class=\"stat-value\">{{STAT3_VALUE}}</div><div class=\"stat-label\">{{STAT3_LABEL}}</div></div></div>",
      "css_class": "mod-M01",
      "default_slot_hint": "bottom",
      "slots": {
        "STAT1_VALUE": {
          "label": "1번 수치",
          "required": true
        },
        "STAT1_LABEL": {
          "label": "1번 라벨",
          "required": true
        },
        "STAT2_VALUE": {
          "label": "2번 수치",
          "required": true
        },
        "STAT2_LABEL": {
          "label": "2번 라벨",
          "required": true
        },
        "STAT3_VALUE": {
          "label": "3번 수치",
          "required": true
        },
        "STAT3_LABEL": {
          "label": "3번 라벨",
          "required": true
        }
      },
      "default_size": {
        "width": 1440,
        "height": 240
      },
      "recommend_keywords": [
        "수치",
        "비율",
        "%",
        "억",
        "만원"
      ],
      "recommend_intents": [
        "수치",
        "강조"
      ],
      "preview_text": "여러 수치를 한 줄에 나란히",
      "position_hint_label": "하단",
      "example": "조사 결과 찬성 32% / 반대 45% / 유보 23%",
      "repeat": {
        "unit_selector": ".stat-box",
        "repeat_min": 1,
        "repeat_max": 3,
        "repeat_default": 1
      }
    },
    {
      "id": "M02",
      "name": "3단 상세",
      "html": "<div class=\"slide-el mod-M02 tri-detail\"><div class=\"tri-col\"><div class=\"tri-icon\">{{ICON1}}</div><div class=\"tri-title\">{{TITLE1}}</div><div class=\"tri-sub\">{{SUB1}}</div><ul class=\"tri-bullets\">{{BULLETS1}}</ul></div><div class=\"tri-col\"><div class=\"tri-icon\">{{ICON2}}</div><div class=\"tri-title\">{{TITLE2}}</div><div class=\"tri-sub\">{{SUB2}}</div><ul class=\"tri-bullets\">{{BULLETS2}}</ul></div><div class=\"tri-col\"><div class=\"tri-icon\">{{ICON3}}</div><div class=\"tri-title\">{{TITLE3}}</div><div class=\"tri-sub\">{{SUB3}}</div><ul class=\"tri-bullets\">{{BULLETS3}}</ul></div></div>",
      "css_class": "mod-M02",
      "default_slot_hint": "bottom",
      "slots": {
        "ICON1": {
          "label": "1번 아이콘",
          "required": true
        },
        "TITLE1": {
          "label": "1번 제목",
          "required": true
        },
        "SUB1": {
          "label": "1번 부제",
          "required": false
        },
        "BULLETS1": {
          "label": "1번 불릿",
          "required": false
        },
        "ICON2": {
          "label": "2번 아이콘",
          "required": true
        },
        "TITLE2": {
          "label": "2번 제목",
          "required": true
        },
        "SUB2": {
          "label": "2번 부제",
          "required": false
        },
        "BULLETS2": {
          "label": "2번 불릿",
          "required": false
        },
        "ICON3": {
          "label": "3번 아이콘",
          "required": true
        },
        "TITLE3": {
          "label": "3번 제목",
          "required": true
        },
        "SUB3": {
          "label": "3번 부제",
          "required": false
        },
        "BULLETS3": {
          "label": "3번 불릿",
          "required": false
        }
      },
      "default_size": {
        "width": 1640,
        "height": 420
      },
      "recommend_keywords": [
        "상세",
        "설명",
        "비교",
        "3가지",
        "세 가지"
      ],
      "recommend_intents": [
        "나열",
        "비교"
      ],
      "preview_text": "3개 항목 상세 설명(아이콘+제목+불릿)",
      "position_hint_label": "하단",
      "example": "투자·저축·소비 각 영역 설명",
      "repeat": {
        "unit_selector": ".tri-col",
        "repeat_min": 1,
        "repeat_max": 3,
        "repeat_default": 1
      }
    },
    {
      "id": "M03",
      "name": "요약바",
      "html": "<div class=\"slide-el mod-M03 summary-bar\"><span class=\"summary-text\">{{SUMMARY}}</span></div>",
      "css_class": "mod-M03",
      "default_slot_hint": "bottom",
      "slots": {
        "SUMMARY": {
          "label": "요약 문구",
          "required": true
        }
      },
      "default_size": {
        "width": 1440,
        "height": 90
      },
      "recommend_keywords": [
        "요약",
        "정리",
        "핵심",
        "한 줄"
      ],
      "recommend_intents": [
        "결론"
      ],
      "preview_text": "핵심을 한 줄로 요약",
      "position_hint_label": "하단",
      "example": "결국 중요한 건 시간이다"
    },
    {
      "id": "M04",
      "name": "대비박스",
      "html": "<div class=\"slide-el mod-M04 contrast-box\"><span class=\"contrast-left\">{{LEFT}}</span><span class=\"contrast-neq\">≠</span><span class=\"contrast-right\">{{RIGHT}}</span></div>",
      "css_class": "mod-M04",
      "default_slot_hint": "top",
      "slots": {
        "LEFT": {
          "label": "좌측 값",
          "required": true
        },
        "RIGHT": {
          "label": "우측 값",
          "required": true
        }
      },
      "default_size": {
        "width": 1000,
        "height": 120
      },
      "recommend_keywords": [
        "대비",
        "반대",
        "차이",
        "vs",
        "아닌"
      ],
      "recommend_intents": [
        "비교"
      ],
      "preview_text": "두 가지를 정면으로 대비",
      "position_hint_label": "상단",
      "example": "어제의 상식 ≠ 오늘의 정답"
    },
    {
      "id": "M05",
      "name": "영문병기",
      "html": "<div class=\"slide-el mod-M05 ko-en\"><div class=\"ko-main\">{{KO}}</div><div class=\"en-sub\">{{EN}}</div></div>",
      "css_class": "mod-M05",
      "default_slot_hint": "center",
      "slots": {
        "KO": {
          "label": "한글",
          "required": true
        },
        "EN": {
          "label": "영문",
          "required": true
        }
      },
      "default_size": {
        "width": 760,
        "height": 220
      },
      "recommend_keywords": [
        "용어",
        "영어",
        "개념",
        "뜻",
        "정의"
      ],
      "recommend_intents": [
        "전환"
      ],
      "preview_text": "한글과 영문 개념 병기",
      "position_hint_label": "중앙",
      "example": "몰입 / Flow"
    },
    {
      "id": "M06",
      "name": "태그/뱃지",
      "html": "<div class=\"slide-el mod-M06 tag-badge\"><span class=\"tag-label\">{{TAG}}</span></div>",
      "css_class": "mod-M06",
      "default_slot_hint": "top",
      "slots": {
        "TAG": {
          "label": "태그",
          "required": true
        }
      },
      "default_size": {
        "width": 260,
        "height": 64
      },
      "recommend_keywords": [
        "태그",
        "라벨",
        "분류",
        "카테고리"
      ],
      "recommend_intents": [
        "강조"
      ],
      "preview_text": "작은 태그·분류 라벨",
      "position_hint_label": "상단",
      "example": "#중요"
    },
    {
      "id": "M07",
      "name": "챕터카운터",
      "html": "<div class=\"slide-el mod-M07 chapter-counter\"><span class=\"counter-current\">{{CURRENT}}</span><span class=\"counter-sep\">/</span><span class=\"counter-total\">{{TOTAL}}</span></div>",
      "css_class": "mod-M07",
      "default_slot_hint": "top",
      "slots": {
        "CURRENT": {
          "label": "현재 번호",
          "required": true
        },
        "TOTAL": {
          "label": "전체 개수",
          "required": true
        }
      },
      "default_size": {
        "width": 200,
        "height": 80
      },
      "recommend_keywords": [
        "진행",
        "챕터",
        "순서",
        "단계"
      ],
      "recommend_intents": [
        "전환"
      ],
      "preview_text": "현재 챕터 / 전체 표시",
      "position_hint_label": "상단",
      "example": "3 / 7"
    },
    {
      "id": "M08",
      "name": "프로그레스바",
      "html": "<div class=\"slide-el mod-M08 progress-bar\"><div class=\"progress-fill\" style=\"width:{{PERCENT}}%;\"></div></div>",
      "css_class": "mod-M08",
      "default_slot_hint": "bottom",
      "slots": {
        "PERCENT": {
          "label": "퍼센트 (0~100)",
          "required": true
        }
      },
      "default_size": {
        "width": 840,
        "height": 24
      },
      "recommend_keywords": [
        "진행",
        "퍼센트",
        "상태",
        "비율"
      ],
      "recommend_intents": [
        "수치",
        "전환"
      ],
      "preview_text": "진행률 막대바",
      "position_hint_label": "하단",
      "example": "진행률 60%"
    },
    {
      "id": "M09",
      "name": "이미지슬롯",
      "html": "<div class=\"slide-el mod-M09 image-slot\"><img src=\"{{IMG_SRC}}\" alt=\"{{IMG_ALT}}\" /></div>",
      "css_class": "mod-M09",
      "default_slot_hint": "free",
      "slots": {
        "IMG_SRC": {
          "label": "이미지 경로",
          "required": true
        },
        "IMG_ALT": {
          "label": "대체 텍스트",
          "required": false
        }
      },
      "default_size": {
        "width": 480,
        "height": 360
      },
      "recommend_keywords": [
        "사진",
        "이미지",
        "그림",
        "자료"
      ],
      "recommend_intents": [
        "근거"
      ],
      "preview_text": "이미지 한 장 배치",
      "position_hint_label": "자유",
      "example": "본문에 사진·그래프 삽입"
    },
    {
      "id": "M10",
      "name": "빈카드 프리뷰",
      "html": "<div class=\"slide-el mod-M10 empty-preview\"><div class=\"empty-card\"></div><div class=\"empty-card\"></div><div class=\"empty-card\"></div></div>",
      "css_class": "mod-M10",
      "default_slot_hint": "bottom",
      "slots": {},
      "default_size": {
        "width": 1200,
        "height": 160
      },
      "recommend_keywords": [
        "예고",
        "다음",
        "미리보기"
      ],
      "recommend_intents": [
        "전환"
      ],
      "preview_text": "다음 내용 미리보기 빈카드",
      "position_hint_label": "하단",
      "example": "다음 장 예고 빈 카드 3장",
      "repeat": {
        "unit_selector": ".empty-card",
        "repeat_min": 1,
        "repeat_max": 3,
        "repeat_default": 1
      }
    },
    {
      "id": "M11",
      "name": "좌측이전장",
      "html": "<div class=\"slide-el mod-M11 prev-thumb\"><span class=\"prev-indicator\">-{{OFFSET}}</span><span class=\"prev-arrow\">&lt;</span><span class=\"prev-title\">{{PREV_TITLE}}</span></div>",
      "css_class": "mod-M11",
      "default_slot_hint": "left",
      "slots": {
        "OFFSET": {
          "label": "이전 거리",
          "required": true
        },
        "PREV_TITLE": {
          "label": "이전장 제목",
          "required": true
        }
      },
      "default_size": {
        "width": 360,
        "height": 64
      },
      "recommend_keywords": [
        "이전",
        "돌아가기",
        "복습",
        "앞"
      ],
      "recommend_intents": [
        "전환"
      ],
      "preview_text": "이전 슬라이드로 되돌아가는 썸네일",
      "position_hint_label": "좌측",
      "example": "좌측 상단에 이전 장 썸네일"
    },
    {
      "id": "M12",
      "name": "상세리스트",
      "html": "<div class=\"slide-el mod-M12 detail-list\"><ul>{{ITEMS}}</ul></div>",
      "css_class": "mod-M12",
      "default_slot_hint": "bottom",
      "slots": {
        "ITEMS": {
          "label": "목록 항목 (li)",
          "required": true
        }
      },
      "default_size": {
        "width": 900,
        "height": 300
      },
      "recommend_keywords": [
        "목록",
        "항목",
        "리스트"
      ],
      "recommend_intents": [
        "나열"
      ],
      "preview_text": "여러 항목을 불릿 목록으로",
      "position_hint_label": "하단",
      "example": "확인할 항목 6개 리스트"
    },
    {
      "id": "M13",
      "name": "태그모음",
      "html": "<div class=\"slide-el mod-M13 tag-group\">{{TAGS}}</div>",
      "css_class": "mod-M13",
      "default_slot_hint": "bottom",
      "slots": {
        "TAGS": {
          "label": "태그 묶음 (span)",
          "required": true
        }
      },
      "default_size": {
        "width": 1200,
        "height": 80
      },
      "recommend_keywords": [
        "해시태그",
        "키워드",
        "태그모음"
      ],
      "recommend_intents": [
        "나열",
        "결론"
      ],
      "preview_text": "해시태그·키워드 묶음",
      "position_hint_label": "하단",
      "example": "#절약 #소비습관 #시간가치"
    },
    {
      "id": "M14",
      "name": "화살표플로우",
      "html": "<div class=\"slide-el mod-M14 arrow-flow\"><span class=\"af-item\"><span class=\"af-step\">{{STEP1}}</span><span class=\"af-arrow\">→</span></span><span class=\"af-item\"><span class=\"af-step\">{{STEP2}}</span><span class=\"af-arrow\">→</span></span><span class=\"af-item\"><span class=\"af-step\">{{STEP3}}</span><span class=\"af-arrow\">→</span></span></div>",
      "css_class": "mod-M14",
      "default_slot_hint": "center",
      "slots": {
        "STEP1": {
          "label": "1단계",
          "required": true
        },
        "STEP2": {
          "label": "2단계",
          "required": true
        },
        "STEP3": {
          "label": "3단계",
          "required": true
        }
      },
      "default_size": {
        "width": 1400,
        "height": 120
      },
      "recommend_keywords": [
        "흐름",
        "단계",
        "순서",
        "→",
        "과정"
      ],
      "recommend_intents": [
        "나열",
        "전환"
      ],
      "preview_text": "원인→결과, 단계 흐름 화살표",
      "position_hint_label": "중앙",
      "example": "원인 → 과정 → 결과",
      "repeat": {
        "unit_selector": ".af-item",
        "repeat_min": 2,
        "repeat_max": 3,
        "repeat_default": 3
      }
    },
    {
      "id": "M15",
      "name": "체크리스트",
      "html": "<div class=\"slide-el mod-M15 check-list\"><div class=\"cl-item\"><span class=\"cl-mark\">☑</span><span class=\"cl-text\">{{CHECK1}}</span></div><div class=\"cl-item\"><span class=\"cl-mark\">☑</span><span class=\"cl-text\">{{CHECK2}}</span></div><div class=\"cl-item\"><span class=\"cl-mark\">☑</span><span class=\"cl-text\">{{CHECK3}}</span></div></div>",
      "css_class": "mod-M15",
      "default_slot_hint": "bottom",
      "slots": {
        "CHECK1": {
          "label": "1번 항목",
          "required": true
        },
        "CHECK2": {
          "label": "2번 항목",
          "required": true
        },
        "CHECK3": {
          "label": "3번 항목",
          "required": true
        }
      },
      "default_size": {
        "width": 1200,
        "height": 240
      },
      "recommend_keywords": [
        "체크",
        "확인",
        "조건",
        "요약",
        "리스트"
      ],
      "recommend_intents": [
        "나열",
        "결론"
      ],
      "preview_text": "체크표시로 조건·항목 정리",
      "position_hint_label": "하단",
      "example": "체크 조건 3개 정리",
      "repeat": {
        "unit_selector": ".cl-item",
        "repeat_min": 1,
        "repeat_max": 3,
        "repeat_default": 3
      }
    },
    {
      "id": "M16",
      "name": "인용박스",
      "html": "<div class=\"slide-el mod-M16 quote-box\"><div class=\"qb-text\">{{QUOTE}}</div><div class=\"qb-source\">— {{SOURCE}}</div></div>",
      "css_class": "mod-M16",
      "default_slot_hint": "center",
      "slots": {
        "QUOTE": {
          "label": "인용 문구",
          "required": true
        },
        "SOURCE": {
          "label": "출처",
          "required": false
        }
      },
      "default_size": {
        "width": 1200,
        "height": 220
      },
      "recommend_keywords": [
        "인용",
        "출처",
        "말",
        "발언",
        "격언"
      ],
      "recommend_intents": [
        "근거",
        "강조"
      ],
      "preview_text": "전문가 말·자료 인용",
      "position_hint_label": "중앙",
      "example": "시간은 돈이다 — 벤저민 프랭클린"
    },
    {
      "id": "M17",
      "name": "경고배너",
      "html": "<div class=\"slide-el mod-M17 warn-banner\"><span class=\"wb-icon\">⚠️</span><span class=\"wb-text\">{{WARN}}</span></div>",
      "css_class": "mod-M17",
      "default_slot_hint": "top",
      "slots": {
        "WARN": {
          "label": "경고 문구",
          "required": true
        }
      },
      "default_size": {
        "width": 1200,
        "height": 90
      },
      "recommend_keywords": [
        "주의",
        "경고",
        "위험",
        "금지",
        "중요"
      ],
      "recommend_intents": [
        "강조"
      ],
      "preview_text": "주의·중요 포인트 경고",
      "position_hint_label": "상단",
      "example": "⚠️ 이것만은 반드시 주의하세요"
    },
    {
      "id": "M18",
      "name": "단계번호",
      "html": "<div class=\"slide-el mod-M18 step-circles\"><div class=\"sc-item\"><span class=\"sc-num\">1</span><span class=\"sc-label\">{{NUMSTEP1}}</span></div><div class=\"sc-item\"><span class=\"sc-num\">2</span><span class=\"sc-label\">{{NUMSTEP2}}</span></div><div class=\"sc-item\"><span class=\"sc-num\">3</span><span class=\"sc-label\">{{NUMSTEP3}}</span></div></div>",
      "css_class": "mod-M18",
      "default_slot_hint": "center",
      "slots": {
        "NUMSTEP1": {
          "label": "1번 설명",
          "required": true
        },
        "NUMSTEP2": {
          "label": "2번 설명",
          "required": true
        },
        "NUMSTEP3": {
          "label": "3번 설명",
          "required": true
        }
      },
      "default_size": {
        "width": 1400,
        "height": 180
      },
      "recommend_keywords": [
        "단계",
        "순서",
        "절차",
        "1",
        "2",
        "3"
      ],
      "recommend_intents": [
        "나열",
        "전환"
      ],
      "preview_text": "1·2·3 번호로 순서 강조",
      "position_hint_label": "중앙",
      "example": "① 준비 ② 실행 ③ 점검",
      "repeat": {
        "unit_selector": ".sc-item",
        "repeat_min": 1,
        "repeat_max": 3,
        "repeat_default": 3
      }
    },
    {
      "id": "M19",
      "name": "말풍선",
      "html": "<div class=\"slide-el mod-M19 speech-bubble-card\"><div class=\"bubble\" style=\"position:relative; top:auto; left:auto; width:100%; box-sizing:border-box;\">{{BUBBLE}}</div></div>",
      "css_class": "mod-M19",
      "default_slot_hint": "top",
      "slots": {
        "BUBBLE": {
          "label": "말풍선 문구",
          "required": true
        }
      },
      "default_size": {
        "width": 720,
        "height": 180
      },
      "recommend_keywords": [
        "질문",
        "반론",
        "말풍선",
        "한마디",
        "시청자"
      ],
      "recommend_intents": [
        "질문",
        "강조"
      ],
      "preview_text": "짧은 질문·반론 말풍선",
      "position_hint_label": "상단",
      "example": "\"이건 진짜일까요?\""
    }
  ],
  "recommendedByType": {
    "2단플로우": [
      "M01",
      "M03",
      "M09"
    ],
    "CTA버튼": [
      "M09"
    ],
    "경고배너": [
      "M06",
      "M09"
    ],
    "그리드카드": [
      "M03",
      "M09",
      "M13"
    ],
    "그리드카드(아이콘좌측)": [
      "M03",
      "M09",
      "M13"
    ],
    "다이어그램": [
      "M09"
    ],
    "대질문": [
      "M19",
      "M06",
      "M09"
    ],
    "두줄대비": [
      "M04",
      "M06",
      "M09"
    ],
    "두줄전개": [
      "M06",
      "M09"
    ],
    "등식플로우": [
      "M03",
      "M09"
    ],
    "라인차트": [
      "M03",
      "M09"
    ],
    "마지막정리": [
      "M06",
      "M09",
      "M13"
    ],
    "말풍선+텍스트": [
      "M06",
      "M09"
    ],
    "바차트": [
      "M03",
      "M09"
    ],
    "버튼그리드": [
      "M03",
      "M09",
      "M13"
    ],
    "번호항목": [
      "M03",
      "M09",
      "M13"
    ],
    "분기2단플로우": [
      "M03",
      "M09"
    ],
    "분기플로우": [
      "M03",
      "M09"
    ],
    "분할레이아웃": [
      "M03",
      "M09"
    ],
    "블로그인트로": [
      "M06",
      "M07",
      "M08",
      "M09",
      "M10"
    ],
    "비교박스": [
      "M03",
      "M09",
      "M13"
    ],
    "비교박스(불릿리스트)": [
      "M03",
      "M09",
      "M13"
    ],
    "비교박스(이모지VS)": [
      "M03",
      "M09",
      "M13"
    ],
    "비교테이블": [
      "M03",
      "M09",
      "M13"
    ],
    "상하2단비교": [
      "M04",
      "M06",
      "M09"
    ],
    "섹션배지(챕터플로우)": [
      "M05",
      "M08",
      "M09",
      "M11"
    ],
    "섹션배지+코너레이블": [
      "M05",
      "M08",
      "M09",
      "M11"
    ],
    "숫자스탯": [
      "M09",
      "M12"
    ],
    "아이콘+텍스트": [
      "M19",
      "M06",
      "M09"
    ],
    "아이콘2단강조": [
      "M06",
      "M09"
    ],
    "아이콘2단포인트": [
      "M06",
      "M09"
    ],
    "아이콘강조": [
      "M06",
      "M09"
    ],
    "아이콘아이템": [
      "M03",
      "M09",
      "M13"
    ],
    "아이콘플로우": [
      "M01",
      "M03",
      "M09"
    ],
    "아이콘플로우(스탯)": [
      "M01",
      "M03",
      "M09"
    ],
    "아이콘행": [
      "M03",
      "M09"
    ],
    "용어정의": [
      "M05",
      "M06",
      "M09"
    ],
    "이미지+텍스트": [
      "M06",
      "M09"
    ],
    "인물카드": [
      "M06",
      "M09"
    ],
    "인용": [
      "M04",
      "M09"
    ],
    "인용(대비)": [
      "M03",
      "M04",
      "M09"
    ],
    "인용(미니멀)": [
      "M04",
      "M09"
    ],
    "좌우2단비교": [
      "M04",
      "M06",
      "M09"
    ],
    "좌우2분할": [
      "M06",
      "M09"
    ],
    "챕터전환": [
      "M05",
      "M08",
      "M09",
      "M11"
    ],
    "체크리스트": [
      "M03",
      "M09",
      "M13"
    ],
    "체크리스트(요약)": [
      "M03",
      "M09",
      "M13"
    ],
    "카드": [
      "M01",
      "M03",
      "M09",
      "M13"
    ],
    "카운터제목": [
      "M06",
      "M07",
      "M08",
      "M09"
    ],
    "큰숫자(서클)": [
      "M09",
      "M12"
    ],
    "타임라인": [
      "M08",
      "M09"
    ],
    "태그칩": [
      "M03",
      "M09",
      "M13"
    ],
    "토픽결론": [
      "M01",
      "M05",
      "M06",
      "M09",
      "M12",
      "M13"
    ],
    "플로우": [
      "M01",
      "M02",
      "M03",
      "M09"
    ],
    "플로우(상세)": [
      "M01",
      "M02",
      "M03",
      "M09"
    ],
    "한줄강조": [
      "M06",
      "M09"
    ]
  }
};
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
      const targetNum = parseFloat(target);
      const unit = target.replace(/[\d.]/g, '') || '%';
      const overshoot = Math.min(targetNum * 1.06, 100);
      f.style.transition = 'none';
      f.style.width = '0';
      const anim = f.animate([
        { width: '0' },
        { width: overshoot + unit, offset: 0.7 },
        { width: target }
      ], {
        duration: 2400,
        easing: 'ease-out',
        fill: 'forwards',
        delay: i * 720
      });
      anim.onfinish = () => { f.style.width = target; };
      // sweep highlight after bar partially fills
      setTimeout(() => {
        f.classList.add('sweep-active');
        f.addEventListener('animationend', (e) => {
          if (e.animationName === 'bar-sweep') f.classList.remove('sweep-active');
        }, { once: true });
      }, i * 720 + 600);
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
    let customYTicks = [];
    try {
      const parsed = JSON.parse(el.dataset.yTicks || '[]');
      if (Array.isArray(parsed)) customYTicks = parsed.map(v => String(v ?? ''));
    } catch (err) {}
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
    const compactUnit = unit && unit.length <= 2;
    for (let i = 0; i <= YTICKS; i++) {
      const v = minV + (range * i / YTICKS);
      const y = pad.top + (1 - i / YTICKS) * chartH;
      const fallbackLabel = `${Number.isInteger(v) ? v : v.toFixed(1)}${compactUnit ? unit : ''}`;
      const label = customYTicks[i] ?? fallbackLabel;
      yTicksHTML += `<line stroke="#ddd" stroke-width="1" x1="${pad.left}" y1="${y}" x2="${pad.left + chartW}" y2="${y}"/>`;
      yTicksHTML += `<text class="chart-label" x="${pad.left - 8}" y="${y + 8}" text-anchor="end">${label}</text>`;
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
      <text class="chart-val lc-end-val" x="${lastPt.x + 12}" y="${lastPt.y + 10}">${vals[vals.length-1]}${compactUnit ? unit : ''}</text>
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

  // float-y 위상 오프셋 — 같은 슬라이드 내 동일 클래스 요소들이 동시에 움직이지 않도록
  function staggerFloatY(root) {
    if (!root || !root.querySelectorAll) return;
    const FLOAT_CLASSES = [
      'card','grid-card','flow-box','check-item','icon-circle','tl-circle',
      'bullet-card','eq-box','flow-detail','branch-result','split-list',
      'split-stat-main','big-stat','stat-block','icon-flow-icon',
      'compare-col','emoji-icon'
    ];
    root.querySelectorAll('.slide').forEach(slide => {
      FLOAT_CLASSES.forEach(cls => {
        const els = slide.querySelectorAll('.' + cls);
        if (els.length < 2) return;
        const style = getComputedStyle(els[0]);
        const dur = parseFloat(style.animationDuration) || 4;
        els.forEach((el, i) => {
          el.style.animationDelay = -(dur * i / els.length).toFixed(2) + 's';
        });
      });
    });
  }

  // 페이지 로드 후 자동 실행 (DOM 안정 대기 100ms)
  if (typeof document !== 'undefined') {
    const _initAnimations = () => setTimeout(() => {
      splitHandTyping(document);
      staggerFloatY(document);
    }, 100);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _initAnimations);
    } else {
      _initAnimations();
    }
  }

  function getMaxActualStepIndex(slide) {
    if (!slide) return 0;
    let maxStep = 0;
    const NON_MEANINGFUL_STEP_SEL = '.vertical-divider, .branch-arrow, .flow-arrow, .icon-flow-arrow, .eq-chain-arrow, .chapter-flow-arrow';
    const isCountableStepEl = el =>
      el &&
      !el.closest('.edit-hidden-placeholder, .layout-detached-placeholder') &&
      !el.classList.contains('edit-hidden-placeholder') &&
      !el.classList.contains('layout-detached-placeholder') &&
      !el.matches(NON_MEANINGFUL_STEP_SEL);
    const hasMeaningfulLayerContent = layer => {
      const candidates = Array.from(layer.querySelectorAll(
        '.slide-el, .step-content, .text-area, .bubble, .corner-label, [data-appear-step]'
      ));
      return candidates.some(el => isCountableStepEl(el));
    };
    slide.querySelectorAll('.step-layer[data-step]').forEach(layer => {
      const layerStep = parseInt(layer.dataset.step, 10) || 0;
      if (layerStep > 0 && hasMeaningfulLayerContent(layer)) {
        maxStep = Math.max(maxStep, layerStep);
      }
    });
    slide.querySelectorAll('[data-appear-step]').forEach(el => {
      if (!isCountableStepEl(el)) return;
      maxStep = Math.max(maxStep, parseInt(el.dataset.appearStep, 10) || 0);
    });
    return maxStep;
  }
  window.getMaxActualStepIndex = getMaxActualStepIndex;

  function getSteps(slide) {
    if (!slide) return 1;
    const actual = getMaxActualStepIndex(slide) + 1;
    return Math.max(1, actual);
  }

  function getOrderedEls(layer) {
    const isActiveOrderedEl = el =>
      !el.classList.contains('step-title') &&
      !el.classList.contains('step-dim') &&
      !el.classList.contains('edit-hidden-placeholder');
    const layerStep = parseInt(layer.dataset.step, 10) || 0;
    if (layerStep === 0) {
      return Array.from(layer.querySelectorAll(
        '.items-row > [data-appear-step], .items-col > [data-appear-step], .items-grid > [data-appear-step]'
      ))
        .filter(el => isActiveOrderedEl(el) && (parseInt(el.dataset.appearStep, 10) || 0) > 0)
        .sort((a, b) => (parseInt(a.dataset.appearStep, 10) || 0) - (parseInt(b.dataset.appearStep, 10) || 0));
    }
    // flex 컨테이너 내 data-appear-step 자식 우선 수집
    const flexItems = Array.from(layer.querySelectorAll(
      '.items-row > [data-appear-step], .items-col > [data-appear-step], .items-grid > [data-appear-step]'
    )).filter(isActiveOrderedEl);
    if (flexItems.length > 0) {
      return flexItems.sort((a, b) =>
        (parseInt(a.dataset.appearStep) || 0) - (parseInt(b.dataset.appearStep) || 0)
      );
    }
    // generated 슬라이드는 .items-row 내부에 step용 .slide-el이 중첩되는 경우가 많다.
    const nestedSlideEls = Array.from(layer.querySelectorAll(
      '.items-row > .slide-el, .items-col > .slide-el, .items-grid > .slide-el'
    )).filter(isActiveOrderedEl);
    if (nestedSlideEls.length > 0) return nestedSlideEls;
    // 기존: 직접 자식 .slide-el (EDITABLE_SEL과 독립)
    return Array.from(layer.children).filter(el =>
      el.classList.contains('slide-el') &&
      isActiveOrderedEl(el)
    );
  }

  function countLogicalOrderedUnits(ordered) {
    let count = 0;
    let idx = 0;
    while (idx < ordered.length) {
      const group = ordered[idx].dataset.group;
      count++;
      idx++;
      if (group) {
        while (idx < ordered.length && ordered[idx].dataset.group === group) idx++;
      }
    }
    return count;
  }

  function getDisplaySteps(slide) {
    if (!slide) return 1;
    let steps = 1;
    const hasMeaningfulLayerContent = layer => {
      const candidates = Array.from(layer.querySelectorAll(
        '.slide-el, .step-content, .text-area, .bubble, .corner-label, [data-appear-step]'
      ));
      return candidates.some(el =>
        !el.closest('.edit-hidden-placeholder, .layout-detached-placeholder') &&
        !el.classList.contains('edit-hidden-placeholder') &&
        !el.classList.contains('layout-detached-placeholder') &&
        !el.matches('.vertical-divider, .branch-arrow, .flow-arrow, .icon-flow-arrow, .eq-chain-arrow, .chapter-flow-arrow')
      );
    };
    const layers = Array.from(slide.querySelectorAll('.step-layer[data-step]'))
      .sort((a, b) => (parseInt(a.dataset.step, 10) || 0) - (parseInt(b.dataset.step, 10) || 0));
    layers.forEach(layer => {
      const layerStep = parseInt(layer.dataset.step, 10) || 0;
      const ordered = getOrderedEls(layer);
      if (ordered.length > 0) {
        steps += countLogicalOrderedUnits(ordered);
      } else if (layerStep > 0 && hasMeaningfulLayerContent(layer)) {
        steps += 1;
      }
    });
    return Math.max(1, steps);
  }
  window.getDisplaySteps = getDisplaySteps;

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
    const maxStep = Math.max(0, getSteps(slide) - 1);
    const revealAllInEditMode = !!(
      editMode &&
      document.body &&
      !document.body.classList.contains('frozen-legacy-deck')
    );
    const effectiveStep = revealAllInEditMode ? maxStep : Math.max(0, Math.min(step, maxStep));
    const forceRevealAll = !!revealAll || revealAllInEditMode;
    let hasDim = false;
    slide.querySelectorAll('.step-layer[data-step]').forEach(layer => {
      const s = parseInt(layer.dataset.step);
      const isPushup = layer.dataset.transition === 'pushup';
      const noDim = layer.hasAttribute('data-no-dim');
      if (s <= effectiveStep) {
        layer.classList.add('visible');
        // pushup 레이어: 현재 step이면 보이고, 이전 pushup은 push-exit 상태
        if (isPushup) {
          layer.classList.remove('push-enter', 'push-exit');
          if (!forceRevealAll && s < effectiveStep) {
            // 이 pushup 레이어 위에 다른 pushup이 있으면 밀려난 상태
            const nextPushup = slide.querySelector(`.step-layer[data-transition="pushup"][data-step="${s + 1}"]`);
            if (nextPushup) layer.classList.add('push-exit');
          }
        }
        if (s === 0) {
          const ordered0 = getOrderedEls(layer);
          if (forceRevealAll || effectiveStep > 0) {
            ordered0.forEach(el => {
              el.classList.add('anim-shown');
              if (forceRevealAll) addAnimReadyImmediate(el);
              else addAnimReady(el);
            });
          } else {
            ordered0.forEach(el => { el.classList.remove('anim-shown'); removeAnimReady(el); });
          }
        }
        if (s > 0) {
          if (!noDim && !isPushup) hasDim = true;
          if (s === effectiveStep && !forceRevealAll) {
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
              if (forceRevealAll) addAnimReadyImmediate(el);
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
    if (typeof clearRuntimeInkForView === 'function') clearRuntimeInkForView(currentSlide);

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

    // step 초기화:
    // - 생성 런타임: 뒤로 가면 마지막 step, 앞으로 가면 0 (프레젠테이션 탐색 유지)
    // - source editor browse: 항상 최종 step 전체 표시
    setDim(false);
    currentSlide = next;
    const generatedRuntime = !!document.body.dataset.generated;
    const revealAllInSourceBrowse = (
      !generatedRuntime &&
      typeof getSourceBrowseStepState === 'function' &&
      getSourceBrowseStepState(inSlide).revealAll
    );
    if (generatedRuntime) {
      currentStep = forward ? 0 : getSteps(inSlide) - 1;
      currentOrder = 0;
    } else if (revealAllInSourceBrowse) {
      const browseState = getSourceBrowseStepState(inSlide);
      currentStep = browseState.step;
      currentOrder = browseState.order;
    } else {
      currentStep = 0;
      currentOrder = 0;
    }
    if (generatedRuntime && !forward) {
      const lastLayer = inSlide.querySelector(`.step-layer[data-step="${currentStep}"]`);
      if (lastLayer) currentOrder = getOrderedEls(lastLayer).length;
      showStep(inSlide, currentStep, true);
      triggerStep0Anims(inSlide);
    } else if (revealAllInSourceBrowse) {
      showStep(inSlide, currentStep, true);
      triggerStep0Anims(inSlide);
    } else {
      showStep(inSlide, currentStep);
      triggerStep0Anims(inSlide);
    }

    if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
    // slideNum 표시:
    // - 에디터: visible base 순서 기준 (base=1, variant=1-2)
    // - 생성 슬라이드: 전체 순차 번호 유지
    const _numEl = document.getElementById('slideNum');
    const _curSlide = slides[currentSlide];
    const _typeLabel = _curSlide && _curSlide.dataset.type ? ` ${_curSlide.dataset.type}` : '';
    if (document.body.dataset.generated) {
      _numEl.textContent = `${currentSlide + 1} / ${slides.length}${_typeLabel}`;
    } else if (editMode) {
      const baseTotal = typeof getEditorBaseTotal === 'function' ? getEditorBaseTotal() : getBaseSlidesCount();
      const displayNumber = _curSlide && _curSlide.dataset.displayNumber;
      if (displayNumber) {
        _numEl.textContent = `${displayNumber} / ${baseTotal}${_typeLabel}`;
      } else {
        _numEl.textContent = `T${currentSlide + 1} / ${slides.length}${_typeLabel}`;
      }
    } else {
      const baseTotal = getBaseSlidesCount();
      const displayNumber = _curSlide && _curSlide.dataset.displayNumber;
      if (displayNumber) {
        _numEl.textContent = `${displayNumber} / ${baseTotal}${_typeLabel}`;
      } else {
        // baseIdx가 -1이면(고아 variant 등 비정상 상태) 0으로 폴백 — 슬라이드 번호 표시 깨짐 방지
        const baseIdx = Math.max(0, getCurrentBaseDisplayIdx());
        _numEl.textContent = `T${baseIdx + 1} / ${baseTotal}${_typeLabel}`;
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
    const sourceBrowseRevealAll = (
      !document.body.dataset.generated &&
      typeof shouldRevealAllInSourceBrowseView === 'function' &&
      shouldRevealAllInSourceBrowseView()
    );
    if (sourceBrowseRevealAll) {
      const nextBase = findNextBaseCanonical(currentSlide);
      if (nextBase !== -1) goToSlide(nextBase);
      return;
    }
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
            if (isChartEl(gel)) {
              if (gel.classList.contains('bar-chart') || gel.classList.contains('hbar-chart')) animateBarChart(gel);
              animateCountValues(gel);
            }
            else if (gel.classList.contains('line-chart')) animateLineChart(gel);
          });
        } else {
          el.classList.add('anim-shown');
          addAnimReady(el);
          if (isChartEl(el)) {
            if (el.classList.contains('bar-chart') || el.classList.contains('hbar-chart')) animateBarChart(el);
            animateCountValues(el); playSound('chart');
          }
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
      if (typeof clearRuntimeInkForView === 'function') clearRuntimeInkForView(currentSlide);
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
              if (isChartEl(gel)) {
                if (gel.classList.contains('bar-chart') || gel.classList.contains('hbar-chart')) animateBarChart(gel);
                animateCountValues(gel);
              }
              else if (gel.classList.contains('line-chart')) animateLineChart(gel);
            });
          } else {
            firstEl.classList.add('anim-shown');
            addAnimReady(firstEl);
            if (isChartEl(firstEl)) {
              if (firstEl.classList.contains('bar-chart') || firstEl.classList.contains('hbar-chart')) animateBarChart(firstEl);
              animateCountValues(firstEl);
            }
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
    const sourceBrowseRevealAll = (
      !document.body.dataset.generated &&
      typeof shouldRevealAllInSourceBrowseView === 'function' &&
      shouldRevealAllInSourceBrowseView()
    );
    if (sourceBrowseRevealAll) {
      const prevBase = findPrevBaseCanonical(currentSlide);
      if (prevBase !== -1) goToSlide(prevBase);
      return;
    }
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
        if (typeof clearRuntimeInkForView === 'function') clearRuntimeInkForView(currentSlide);
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
      if (typeof clearRuntimeInkForView === 'function') clearRuntimeInkForView(currentSlide);
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
    const totalSteps = (typeof getSteps === 'function')
      ? getSteps(slide)
      : Math.max(1, ...Array.from(slide.querySelectorAll('.step-layer')).map(l => (parseInt(l.dataset.step, 10) || 0) + 1));
    slide.dataset.steps = String(totalSteps);
    if (slide === slides[currentSlide] && typeof currentStep !== 'undefined') {
      currentStep = Math.max(0, Math.min(currentStep, totalSteps - 1));
      if (typeof showStep === 'function') showStep(slide, currentStep);
    }
  }

  function toggleStepOverlay() {
    pushUndo();
    const slide = slides[currentSlide];
    const newStep = (typeof getSteps === 'function' ? getSteps(slide) : 1);
    const newLayer = document.createElement('div');
    newLayer.className = 'step-layer';
    newLayer.dataset.step = String(newStep);
    newLayer.innerHTML = '<div class="step-dim"></div>';
    slide.appendChild(newLayer);
    slide.dataset.steps = String(newStep + 1);
    if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
  }

  document.addEventListener('keydown', e => {
    if (!shouldHandleRuntimeNotesShortcut(e)) return;
    e.preventDefault();
    e.stopPropagation();
    handleRuntimePresentationShortcut();
  }, true);

  document.addEventListener('keydown', e => {
    if (e.target && e.target.closest('input, textarea, [contenteditable="true"]')) return;
    // Ctrl+S: 저장 (텍스트 편집 중에도 허용)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
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
      const copySource = (typeof getGroupActionTarget === 'function' && groupEntered && groupParent)
        ? getGroupActionTarget()
        : selectedEl;
      if (copySource) {
        clipboardEl = copySource.outerHTML;
        clipboardStep = parseInt(copySource.closest('.step-layer')?.dataset.step || '0', 10) || 0;
        showToast('요소 복사됨', 1500);
      }
      return;
    }
    // Ctrl+X: 요소 잘라내기 (편집 모드)
    if ((e.ctrlKey || e.metaKey) && e.key === 'x' && editMode && !isEditing) {
      const cutTarget = (typeof getGroupActionTarget === 'function' && groupEntered && groupParent)
        ? getGroupActionTarget()
        : selectedEl;
      if (cutTarget) {
        e.preventDefault();
        clipboardEl = cutTarget.outerHTML;
        clipboardStep = parseInt(cutTarget.closest('.step-layer')?.dataset.step || '0', 10) || 0;
        pushUndo();
        const slide = slides[currentSlide];
        removeEditableElement(cutTarget, slide);
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
      const targetLayer =
        slides[currentSlide].querySelector(`.step-layer[data-step="${clipboardStep}"]`) ||
        slides[currentSlide].querySelector('.step-layer[data-step="0"]');
      if (typeof insertEditableCloneNearReference === 'function') {
        insertEditableCloneNearReference(newEl, selectedEl, targetLayer);
      } else if (selectedEl && selectedEl.parentElement === targetLayer) {
        targetLayer.insertBefore(newEl, selectedEl.nextSibling);
      } else {
        targetLayer.appendChild(newEl);
      }
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
    const groupChildSelected = !!(
      groupEntered &&
      groupParent &&
      groupParent.querySelector('.child-selected, .child-action-target')
    );
    // Delete: 슬라이드 삭제 (선택 요소 없을 때, 편집 모드)
    if (e.key === 'Delete' && editMode && !selectedEls.length && !groupChildSelected) {
      e.preventDefault();
      if (!(document.body && document.body.dataset.generated === 'true')) {
        if (typeof showToast === 'function') showToast('에디터에서는 슬라이드 삭제를 막았습니다.');
        return;
      }
      deleteSlide(currentSlide);
      return;
    }
    // Delete/Backspace: 선택 요소 삭제 (편집 모드)
    if ((e.code === 'Delete' || e.code === 'Backspace') && editMode) {
      if (!selectedEls.length && !groupChildSelected) return;
      // groupEntered 상태에서도 기본은 parent 우선, 정말 child-only 인 경우만 자식 삭제
      if (groupEntered && groupParent && typeof getGroupActionTarget === 'function') {
        const target = getGroupActionTarget();
        if (target && target !== groupParent) {
          pushUndo();
          removeEditableElement(target, slides[currentSlide]);
          clearSelection();
          if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
          return;
        }
      }
      pushUndo();
      const slide = slides[currentSlide];
      const toDelete = individualMode ? [selectedEl] : [...selectedEls];
      toDelete.forEach(el => {
        removeEditableElement(el, slide);
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
    // E키 (도움말 닫힌 상태에서만 / 오버뷰 열려있으면 먼저 닫고 토글)
    if (e.code === 'KeyE') {
      if (document.getElementById('help').classList.contains('visible')) return;
      if (overview.dataset.open === '1') closeOverview();
      toggleEditMode();
      return;
    }
    // M키 (편집 모드에서 모듈 피커 열기/닫기)
    if (e.code === 'KeyM' && editMode && !isEditing) {
      if (overview.dataset.open === '1') return;
      if (document.getElementById('help').classList.contains('visible')) return;
      if (modulePicker && modulePicker.dataset.open === '1') {
        closeModulePicker();
      } else {
        openModulePicker();
      }
      return;
    }
    // Escape: module picker 열려있으면 닫기 (overview보다 먼저 체크)
    if (e.key === 'Escape' && modulePicker && modulePicker.dataset.open === '1') {
      closeModulePicker();
      return;
    }
    // Escape: overview 열려있으면 닫기
    if (e.key === 'Escape' && overview.dataset.open === '1') { closeOverview(); return; }
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
      // dialog#overview는 Escape로 자동 닫힘 (close 이벤트 핸들러에서 처리)
      document.getElementById('help').classList.remove('visible');
      return;
    }
    if (e.code === 'KeyF') {
      e.preventDefault();
      handleRuntimePresentationShortcut();
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
    if (document.getElementById('overview').dataset.open !== '1') goNext();
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
        if (isGitHubPages && typeof ghMarkDirty === 'function') ghMarkDirty();
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
  const ovBackdrop = document.getElementById('overview-backdrop');

  function openOverview() {
    buildOverview();
    document.documentElement.classList.add('overview-open');
    document.body.classList.add('overview-open');
    ovBackdrop.classList.add('visible');
    overview.classList.add('visible');
    overview.dataset.open = '1';
    if (typeof buildSlideJumpNav === 'function') buildSlideJumpNav();
  }

  function closeOverview() {
    document.documentElement.classList.remove('overview-open');
    document.body.classList.remove('overview-open');
    ovBackdrop.classList.remove('visible');
    overview.classList.remove('visible');
    delete overview.dataset.open;
    ovGrid.innerHTML = '';
    document.documentElement.focus();
  }

  // ── 모듈 피커 (M키) ──
  const modulePicker = document.getElementById('module-picker');
  const modulePickerGrid = document.getElementById('module-picker-grid');
  const modulePickerBackdrop = document.getElementById('module-picker-backdrop');
  const modulePickerTitle = document.getElementById('module-picker-title');

  function openModulePicker() {
    const slide = slides[currentSlide];
    if (!slide || !modulePicker) return;
    const slideType = slide.dataset.type || '';
    buildModulePicker(slideType);
    document.documentElement.classList.add('module-picker-open');
    document.body.classList.add('module-picker-open');
    modulePickerBackdrop.classList.add('visible');
    modulePicker.classList.add('visible');
    modulePicker.dataset.open = '1';
  }

  function closeModulePicker() {
    if (!modulePicker) return;
    document.documentElement.classList.remove('module-picker-open');
    document.body.classList.remove('module-picker-open');
    modulePickerBackdrop.classList.remove('visible');
    modulePicker.classList.remove('visible');
    delete modulePicker.dataset.open;
    if (modulePickerGrid) modulePickerGrid.innerHTML = '';
    document.documentElement.focus();
  }

  // 모듈 HTML placeholder 기본값 — 피커 미리보기 + 삽입 시 공통 사용
  const MODULE_PLACEHOLDER_DEFAULTS = {
    '{{STAT1_VALUE}}': '32%', '{{STAT2_VALUE}}': '45%', '{{STAT3_VALUE}}': '23%',
    '{{STAT1_LABEL}}': '찬성', '{{STAT2_LABEL}}': '반대', '{{STAT3_LABEL}}': '유보',
    '{{ICON1}}': '🔥', '{{ICON2}}': '⚡', '{{ICON3}}': '💡',
    '{{TITLE1}}': '제목 1', '{{TITLE2}}': '제목 2', '{{TITLE3}}': '제목 3',
    '{{SUB1}}': '부제 1', '{{SUB2}}': '부제 2', '{{SUB3}}': '부제 3',
    '{{BULLETS1}}': '<li>항목 1</li><li>항목 2</li>',
    '{{BULLETS2}}': '<li>항목 1</li><li>항목 2</li>',
    '{{BULLETS3}}': '<li>항목 1</li><li>항목 2</li>',
    '{{SUMMARY}}': '핵심 한 줄 요약',
    '{{LEFT}}': '기존', '{{RIGHT}}': '신규',
    '{{KO}}': '한국어', '{{EN}}': 'English',
    '{{TAG}}': '태그',
    '{{CURRENT}}': '3', '{{TOTAL}}': '7',
    '{{PERCENT}}': '60',
    '{{IMG_SRC}}': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    '{{IMG_ALT}}': '이미지 설명',
    '{{OFFSET}}': '1',
    '{{PREV_TITLE}}': '이전 장',
    '{{ITEMS}}': '<li>항목 1</li><li>항목 2</li><li>항목 3</li>',
    '{{TAGS}}': '<span class="tg">태그1</span><span class="tg">태그2</span><span class="tg">태그3</span>',
    // 세션 36 신규 모듈 M14~M18 placeholder
    '{{STEP1}}': '준비', '{{STEP2}}': '실행', '{{STEP3}}': '결과',
    '{{CHECK1}}': '첫 번째 조건', '{{CHECK2}}': '두 번째 조건', '{{CHECK3}}': '세 번째 조건',
    '{{QUOTE}}': '중요한 건 방향이다',
    '{{SOURCE}}': '출처',
    '{{WARN}}': '주의: 이것만은 꼭 확인하세요',
    '{{NUMSTEP1}}': '준비 단계', '{{NUMSTEP2}}': '실행 단계', '{{NUMSTEP3}}': '점검 단계',
    '{{BUBBLE}}': '이건 꼭 확인하세요',
  };

  function fillModulePlaceholders(html) {
    return html.replace(/\{\{[A-Z0-9_]+\}\}/g, (match) => {
      return Object.prototype.hasOwnProperty.call(MODULE_PLACEHOLDER_DEFAULTS, match)
        ? MODULE_PLACEHOLDER_DEFAULTS[match]
        : match;
    });
  }

  // 세션 36 후속3: stage는 자연 크기로 렌더되게 두고 scrollWidth/Height로 측정.
  // wrap 허용 — 큰 모듈(M14 1400px)이 박스 안에 wrap으로 2~3줄 나와도 식별성 우선.
  // scale 최소 바닥 0.3 — 너무 축소되면 글자 안 보임.
  function fitPreviewScale(previewEl) {
    // rv-후속: 박스가 숨김(display:none) 또는 레이아웃 미확정이면 잘못된 scale 계산 방지
    if (previewEl.clientWidth < 50 || previewEl.clientHeight < 50) return;
    const stage = previewEl.querySelector('.mp-preview-stage');
    if (!stage) return;
    stage.style.setProperty('--mp-scale', '1');
    const elW = stage.scrollWidth  || stage.offsetWidth  || 1;
    const elH = stage.scrollHeight || stage.offsetHeight || 1;
    const boxW = previewEl.clientWidth  - 12;
    const boxH = previewEl.clientHeight - 12;
    const raw = Math.min(boxW / elW, boxH / elH, 1);
    const finalScale = Math.max(raw, 0.3);
    stage.style.setProperty('--mp-scale', String(finalScale));
  }

  function buildModulePicker(slideType) {
    if (!modulePickerGrid) return;
    modulePickerGrid.innerHTML = '';
    // 세션 28 결정: 전체 모듈 표시 + 추천 모듈 상단 + ★/노란 띠 강조.
    const data = window.MODULES_DATA || { modules: [], recommendedByType: {} };
    const recommended = new Set(data.recommendedByType[slideType] || []);
    const allModules = data.modules || [];
    const ordered = [
      ...allModules.filter(m => recommended.has(m.id)),
      ...allModules.filter(m => !recommended.has(m.id)),
    ];
    if (modulePickerTitle) {
      modulePickerTitle.textContent = `모듈 삽입 — ${slideType || '(타입 없음)'} · ${allModules.length}개 (추천 ★${recommended.size})`;
    }
    // 세션 36: 카드 선택 개수 상태 저장 (card DOM에 data-count로)
    const previewsToFit = [];
    ordered.forEach(m => {
      const card = document.createElement('button');
      card.className = 'mp-card';
      card.type = 'button';
      card.dataset.moduleId = m.id;
      // 반복 메타 있으면 기본 개수로 초기화
      const repeat = m.repeat || null;
      const defaultCount = repeat ? (repeat.repeat_default || 1) : 1;
      card.dataset.count = String(defaultCount);
      if (recommended.has(m.id)) card.dataset.recommended = '1';
      // 세션 36 후속: mp-top = id + name + badge 한 줄
      const topDiv = document.createElement('div');
      topDiv.className = 'mp-top';
      const idSpan = document.createElement('span');
      idSpan.className = 'mp-id';
      idSpan.textContent = recommended.has(m.id) ? ('★ ' + m.id) : m.id;
      const nameSpan = document.createElement('span');
      nameSpan.className = 'mp-name';
      nameSpan.textContent = m.name;
      topDiv.append(idSpan, nameSpan);
      if (m.position_hint_label) {
        const posBadge = document.createElement('span');
        posBadge.className = 'mp-pos-badge';
        posBadge.textContent = m.position_hint_label;
        topDiv.append(posBadge);
      }
      card.append(topDiv);
      // 세션 36 Phase 3: preview_text (이름 아래 1줄 설명)
      if (m.preview_text) {
        const pvText = document.createElement('div');
        pvText.className = 'mp-preview-text';
        pvText.textContent = m.preview_text;
        card.append(pvText);
      }
      const preview = document.createElement('div');
      preview.className = 'mp-preview';
      const stage = document.createElement('div');
      stage.className = 'mp-preview-stage';
      // 세션 36 후속3: maxWidth만 제한해 wrap 허용 (좁은 박스에서 감김)
      const dW = (m.default_size && m.default_size.width) || 600;
      stage.style.maxWidth = dW + 'px';
      stage.innerHTML = fillModulePlaceholders(m.html);
      // 세션 36 후속3 (b): 프리뷰는 최대 2유닛만 — 3개짜리 복잡해서 안 보인다는 피드백
      if (repeat && repeat.unit_selector) {
        const units = stage.querySelectorAll(repeat.unit_selector);
        const previewMax = 2;
        for (let i = units.length - 1; i >= previewMax; i--) units[i].remove();
      }
      preview.appendChild(stage);
      card.append(preview);
      previewsToFit.push(preview);
      // 세션 36 Phase 3: example (hover tooltip)
      if (m.example) {
        card.title = m.example;
        const exDiv = document.createElement('div');
        exDiv.className = 'mp-example';
        exDiv.textContent = '예: ' + m.example;
        card.append(exDiv);
      }
      // 세션 36 Phase 2A: 반복 메타 있으면 [1][2][3] 토글
      if (repeat && (repeat.repeat_max || 1) > 1) {
        const countRow = document.createElement('div');
        countRow.className = 'mp-count';
        const maxN = repeat.repeat_max || 3;
        const minN = repeat.repeat_min || 1;
        for (let n = minN; n <= maxN; n++) {
          const btn = document.createElement('span');
          btn.className = 'mp-count-btn';
          btn.textContent = String(n);
          btn.dataset.n = String(n);
          if (n === defaultCount) btn.dataset.active = '1';
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            card.dataset.count = String(n);
            countRow.querySelectorAll('.mp-count-btn').forEach(b => delete b.dataset.active);
            btn.dataset.active = '1';
          });
          countRow.append(btn);
        }
        card.append(countRow);
      }
      card.addEventListener('click', () => {
        const count = parseInt(card.dataset.count || '1', 10);
        insertModule(m.id, count);
        closeModulePicker();
      });
      modulePickerGrid.appendChild(card);
    });
    // 레이아웃 안정화 후 scale 계산 — requestAnimationFrame 2회로 보장
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        previewsToFit.forEach(fitPreviewScale);
      });
    });
  }

  function insertModule(moduleId, count) {
    const data = window.MODULES_DATA || { modules: [] };
    const m = (data.modules || []).find(x => x.id === moduleId);
    if (!m) return;
    pushUndo();
    const temp = document.createElement('div');
    temp.innerHTML = fillModulePlaceholders(m.html);
    const newEl = temp.firstElementChild;
    if (!newEl) return;
    newEl.dataset.moduleId = m.id;
    // 세션 36 Phase 2A: count 인자로 반복 유닛 개수 조절
    // rv-후속(Codex): repeat_min/max 계약 강제 — 외부 호출이 범위 밖 count 넘겨도 clamp
    const _r = m.repeat || {};
    const _min = _r.repeat_min || 1;
    const _max = _r.repeat_max || (count || 1);
    const effectiveCount = Math.max(_min, Math.min(count || _r.repeat_default || 1, _max));
    if (m.repeat && m.repeat.unit_selector) {
      const units = newEl.querySelectorAll(m.repeat.unit_selector);
      const want = Math.min(effectiveCount, units.length);
      for (let i = units.length - 1; i >= want; i--) {
        units[i].remove();
      }
    }
    // 세션 36 후속 (치명 버그): 폭은 모듈 default_size 기반, count 비례 축소
    // hint는 top/left 위치에만 사용. 폭/높이는 모듈 속성으로 결정.
    const hintPos = {
      top:    { left: 40,  top: 60  },
      bottom: { left: 260, top: 820 },
      center: { left: 460, top: 440 },
      left:   { left: 40,  top: 440 },
      free:   { left: 760, top: 440 },
    };
    const pos = hintPos[m.default_slot_hint] || hintPos.center;
    const defaultW = (m.default_size && m.default_size.width)  || 600;
    const defaultH = (m.default_size && m.default_size.height) || 200;
    let finalW = defaultW;
    if (m.repeat && m.repeat.repeat_max) {
      // count / repeat_max 비례로 폭 축소 (M02 1640×3 → count 1: 547px)
      finalW = Math.round(defaultW * effectiveCount / m.repeat.repeat_max);
    }
    newEl.style.position = 'absolute';
    newEl.style.left = pos.left + 'px';
    newEl.style.top  = pos.top + 'px';
    newEl.style.width = finalW + 'px';
    newEl.style.minHeight = defaultH + 'px';
    // 기본 step(step-0) layer에 바로 삽입 — 기존 편집 요소와 동일 취급
    // 드래그·선택·리사이즈는 기존 mousedown 핸들러(edit-events.js)에 자동 위임.
    // step을 뒤로 옮기려면 레이어 패널(Alt+1)에서 수동 이동.
    const layer0 = slides[currentSlide].querySelector('.step-layer[data-step="0"]');
    if (!layer0) return;
    layer0.appendChild(newEl);
    selectedEls.forEach(s => s.classList.remove('edit-selected', 'edit-group-selected'));
    selectedEl = newEl; selectedEls = [newEl];
    newEl.classList.add('edit-selected');
    if (typeof updateCoordPanel === 'function') updateCoordPanel(newEl);
    if (typeof updateResizeHandle === 'function') updateResizeHandle();
    if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
    const countSuffix = (count && count > 1) ? ` ×${count}` : '';
    if (typeof showToast === 'function') showToast(`모듈 삽입: ${m.id} ${m.name}${countSuffix}`, 1500);
  }

  if (modulePickerBackdrop) {
    modulePickerBackdrop.addEventListener('click', () => closeModulePicker());
  }

  let ovDragItem = null, ovDragFromIdx = -1, ovDragGhost = null, ovDragDropIdx = -1;
  let expandedOverviewGroups = new Set();  // 확장된 page-group(string) 집합 — overview 전용

  function deleteOverviewSlideAt(idx) {
    if (!(document.body && document.body.dataset.generated === 'true')) {
      if (typeof showToast === 'function') showToast('에디터에서는 슬라이드 삭제를 막았습니다.');
      return;
    }
    if (slides.length <= 1) return;
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
    if (typeof buildSlideJumpNav === 'function') buildSlideJumpNav();
    ensureDirHandle().then(ok => { if (ok) saveToFile(true); });
  }

  function duplicateOverviewSlideAt(idx) {
    if (!(document.body && document.body.dataset.generated === 'true')) {
      if (typeof showToast === 'function') showToast('에디터에서는 슬라이드 복제를 막았습니다.');
      return;
    }
    pushUndo();
    const container = document.getElementById('stage');
    const source = slides[idx];
    const clone = source.cloneNode(true);
    const origId = clone.dataset.slideId || clone.id || '';
    clone.dataset.slideId = origId + '_copy_' + Date.now();
    clone.id = '';
    clone.classList.remove('active');
    const next = source.nextElementSibling;
    if (next) container.insertBefore(clone, next);
    else container.appendChild(clone);
    slides = [...container.querySelectorAll(':scope > .slide')];
    rebuildSlidesByKey();
    buildFilmstrip();
    buildOverview();
    if (typeof buildSlideJumpNav === 'function') buildSlideJumpNav();
    ensureDirHandle().then(ok => { if (ok) saveToFile(true); });
    if (typeof showToast === 'function') showToast('슬라이드 복사 완료', 2000);
  }

  function buildOverview() {
    ovGrid.innerHTML = '';
    // 에디터(slides-editor.html)에서는 3구역(title/no-title/special) + 카테고리 표시
    const isEditor = /slides-editor\.html$/.test(location.pathname);
    // 삭제된 page-group sweep
    for (const pg of [...expandedOverviewGroups]) {
      if (![...slides].some(s => s.dataset.pageGroup === pg)) expandedOverviewGroups.delete(pg);
    }

    let currentGroup = null;
    let currentPg = null;
    let currentBucket = null;  // 제목 있음 / 제목 없음 / 특수
    let currentCat = null;     // 제목/제목없음 구역 안의 visual category

    // base가 삭제된 page-group 감지: 첫 variant를 base 역할로 표시
    const pgsWithBase = new Set();
    const promotedFirst = new Set(); // pg → 이미 첫 variant를 base로 승격했는지
    slides.forEach(s => {
      if (!s.dataset.variant || s.dataset.variant === "0") pgsWithBase.add(s.dataset.pageGroup);
    });

    const variantGroupSet = new Set();
    slides.forEach(s => {
      if (s.dataset.pageGroup && s.dataset.variant && s.dataset.variant !== "0") {
        variantGroupSet.add(String(s.dataset.pageGroup));
      }
    });
    if (variantGroupSet.size > 0) {
      const toolbar = document.createElement('div');
      toolbar.className = 'ov-toolbar';
      const allExpanded = [...variantGroupSet].every(pg => expandedOverviewGroups.has(pg));
      const toggleAllBtn = document.createElement('button');
      toggleAllBtn.type = 'button';
      toggleAllBtn.className = 'ov-global-toggle';
      toggleAllBtn.textContent = allExpanded ? '전체 접기' : '전체 펼치기';
      toggleAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (allExpanded) {
          variantGroupSet.forEach(pg => expandedOverviewGroups.delete(pg));
        } else {
          variantGroupSet.forEach(pg => expandedOverviewGroups.add(pg));
        }
        buildOverview();
      });
      toolbar.appendChild(toggleAllBtn);
      ovGrid.appendChild(toolbar);
    }

    const bucketCounts = {};
    const catCounts = {};
    const metaSeenPgs = new Set();
    slides.forEach(s => {
      const pg = s.dataset.pageGroup;
      if (!pg || metaSeenPgs.has(pg)) return;
      metaSeenPgs.add(pg);
      const bucket = (typeof bucketOfPageGroup === 'function') ? bucketOfPageGroup(pg) : null;
      const cat = (typeof categoryOfPageGroup === 'function') ? categoryOfPageGroup(pg) : null;
      if (bucket) bucketCounts[bucket] = (bucketCounts[bucket] || 0) + 1;
      if (cat) catCounts[cat] = (catCounts[cat] || 0) + 1;
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
        const slideBucket = (typeof bucketOfPageGroup === 'function') ? bucketOfPageGroup(pg) : null;
        const slideCat = (typeof categoryOfPageGroup === 'function') ? categoryOfPageGroup(pg) : null;
        if (slideBucket && slideBucket !== currentBucket && isEditor) {
          if (typeof overviewBucketHeaderEl === 'function') {
            ovGrid.appendChild(overviewBucketHeaderEl(slideBucket, bucketCounts[slideBucket] || 0));
          }
          currentBucket = slideBucket;
          currentCat = null;
        }
        if (slideBucket !== 'special' && slideCat && slideCat !== currentCat && isEditor) {
          if (typeof overviewCategoryHeaderEl === 'function') {
            ovGrid.appendChild(overviewCategoryHeaderEl(slideCat, catCounts[slideCat] || 0));
          }
          currentCat = slideCat;
        }
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
      item.tabIndex = 0;
      item._slideIdx = slideIdx;
      if (pg) item.dataset.pageGroup = pg;
      if (variant != null) item.dataset.variant = variant;
      const specialHint = (typeof specialUsageHintForPageGroup === 'function')
        ? specialUsageHintForPageGroup(pg)
        : '';
      if (specialHint) item.title = specialHint;
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
        num.textContent = slide.dataset.displayNumber || (isVariant ? `T${pg}-${parseInt(variant) + 1}` : `T${pg}`);
      } else {
        num.textContent = `${slideIdx + 1}`;
      }
      // 타입 라벨
      const slideType = slide.dataset.type;
      if (slideType) {
        const typeSpan = document.createElement('span');
        typeSpan.className = 'ov-type';
        typeSpan.textContent = slideType;
        num.appendChild(typeSpan);
      }

      item.appendChild(thumb);
      item.appendChild(num);
      if (typeof createTypeMetaChips === 'function') {
        item.appendChild(createTypeMetaChips(slide));
      }
      if (!document.body.classList.contains('frozen-legacy-deck') && document.body && document.body.dataset.generated === 'true') {
        const actions = document.createElement('div');
        actions.className = 'ov-actions';
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'ov-action-btn danger';
        delBtn.textContent = '삭제';
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteOverviewSlideAt(slideIdx);
        });
        actions.append(delBtn);
        item.appendChild(actions);
      }

      // 카드 클릭 = 무조건 이동 + 모달 닫기
      item.addEventListener('click', (e) => {
        if (ovDragItem) return;
        e.stopPropagation();
        closeOverview();
        goToSlide(slideIdx);
      });
      item.addEventListener('mouseenter', () => {
        if (typeof setSlideJumpNotesForSlide === 'function') setSlideJumpNotesForSlide(slide);
      });
      item.addEventListener('mouseleave', () => {
        if (typeof setSlideJumpNotesForSlide === 'function') setSlideJumpNotesForSlide(slides[currentSlide]);
      });
      item.addEventListener('focus', () => {
        if (typeof setSlideJumpNotesForSlide === 'function') setSlideJumpNotesForSlide(slide);
      });
      item.addEventListener('blur', () => {
        if (typeof setSlideJumpNotesForSlide === 'function') setSlideJumpNotesForSlide(slides[currentSlide]);
      });
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!(document.body && document.body.dataset.generated === 'true')) return;
        if (typeof setSlideJumpNotesForSlide === 'function') setSlideJumpNotesForSlide(slide);
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
    // scale은 CSS 고정 (240/1920) — JS 계산 불필요
  }

  // ── 슬라이드 우클릭 메뉴 ──
  let _ctxMenu = null;
  function hideSlideContextMenu() { if (_ctxMenu) { _ctxMenu.remove(); _ctxMenu = null; } }
  function showSlideContextMenu(x, y, idx) {
    if (!(document.body && document.body.dataset.generated === 'true')) return;
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
        deleteOverviewSlideAt(idx);
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
        duplicateOverviewSlideAt(idx);
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
    overview.dataset.open === '1' ? closeOverview() : openOverview();
  }

  window.addEventListener('resize', () => {
    // scale은 CSS 고정 — resize 시 재계산 불필요
  });
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
    const ghPending = isGitHubPages && typeof ghHasPendingChanges === 'function' && ghHasPendingChanges();
    const localPending = isSaving || pendingLocalSave;
    if (editMode || ghPending || localPending) {
      releaseTabLock();
      if (ghPending || localPending) {
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
  let pendingLocalSave = false;

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

  function cloneForSave(el) {
    if (!el) return null;
    const clone = el.cloneNode(true);

    if (clone.id === 'stage') {
      clone.removeAttribute('style');
      const transientIds = ['select-box', 'multi-select-box', 'group-box', 'gap-left', 'gap-right', 'gap-top', 'gap-bottom', 'snap-x', 'snap-y', 'center-cross'];
      transientIds.forEach(id => {
        const target = clone.querySelector('#' + id);
        if (!target) return;
        target.classList.remove('visible', 'equal');
        target.style.cssText = 'display:none;';
      });

      const guideSnapOverlay = clone.querySelector('#guide-snap-overlay');
      if (guideSnapOverlay) guideSnapOverlay.innerHTML = '';

      clone.querySelectorAll('.resize-handle').forEach(handle => {
        handle.classList.remove('visible');
        handle.removeAttribute('style');
      });
      clone.querySelectorAll('.gap-indicator .gap-line, .gap-indicator .gap-val').forEach(node => {
        node.removeAttribute('style');
      });
      clone.querySelectorAll('.dim-handle').forEach(node => node.remove());
    }

    if (clone.id === 'top-toolbar') {
      clone.querySelectorAll('#gh-settings').forEach(node => node.remove());
      const saveStatus = clone.querySelector('#save-status');
      if (saveStatus) saveStatus.textContent = '';
    }

    if (clone.id === 'gs-crosshair-h' || clone.id === 'gs-crosshair-v') {
      clone.style.cssText = 'display:none;';
    }

    if (clone.id === 'filmstrip') {
      const inner = clone.querySelector('#filmstrip-inner');
      if (inner) inner.innerHTML = '';
    }

    return clone;
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
    const layerPanel = document.getElementById('layer-panel');
    const hadLayerVisible = layerPanel.classList.contains('visible');
    layerPanel.classList.remove('visible');
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

    if (document.getElementById('overview').dataset.open === '1') {
      closeOverview();
    }
    const fsInner = document.getElementById('filmstrip-inner');
    const fsChildren = [...fsInner.childNodes];
    fsChildren.forEach(c => c.remove());
    const ovChildren = [...ovGrid.childNodes];
    ovChildren.forEach(c => c.remove());

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
      const totalSteps = (typeof getSteps === 'function')
        ? getSteps(s)
        : Math.max(1, ...Array.from(s.querySelectorAll('.step-layer')).map(l => (parseInt(l.dataset.step, 10) || 0) + 1));
      s.dataset.steps = String(totalSteps);
    });

    // ── HTML 조립 (확장 프로그램 오염 원천 차단) ──
    // document.documentElement.outerHTML 대신 알려진 요소만 골라서 조립
    const _headParts = [
      '<meta charset="UTF-8">',
      '<title>' + escHTML(document.title) + '</title>',
      document.querySelector('head > script') ? document.querySelector('head > script').outerHTML : '',
      document.querySelector('link[href*="fonts.googleapis"]') ? document.querySelector('link[href*="fonts.googleapis"]').outerHTML : '',
      document.querySelector('link[href*="slide-style"]') ? document.querySelector('link[href*="slide-style"]').outerHTML : '',
      document.getElementById('edit-badge-style') ? document.getElementById('edit-badge-style').outerHTML : '',
      document.getElementById('slide-jump-nav-style') ? document.getElementById('slide-jump-nav-style').outerHTML : '',
      document.querySelector('meta[name="gh-sha"]') ? document.querySelector('meta[name="gh-sha"]').outerHTML : ''
    ].filter(Boolean);

    const _bodyIds = [
      'layer-panel','guide-toolbar','dim-outer','stage',
      'overview-backdrop','overview','help','align-menu','group-toolbar',
      'slideNum','edit-badge','top-toolbar',
      'palette-bg','palette-fc','coord-panel','font-panel','format-bar',
      'module-picker-backdrop','module-picker','slide-jump-nav'
    ];
    const _afterScriptIds = ['gs-crosshair-h','gs-crosshair-v','filmstrip'];

    const bodyBefore = _bodyIds
      .map(id => cloneForSave(document.getElementById(id)))
      .filter(Boolean)
      .map(el => el.outerHTML)
      .join('\n');
    const scriptTag = document.querySelector('script[src*="slide-editor"]') ? document.querySelector('script[src*="slide-editor"]').outerHTML : '';
    const bodyAfter = _afterScriptIds
      .map(id => cloneForSave(document.getElementById(id)))
      .filter(Boolean)
      .map(el => el.outerHTML)
      .join('');

    const transientBodyClasses = new Set([
      'edit-mode',
      'hide-dims',
      'individual-mode',
      'module-picker-open',
      'overview-open',
      'presenter-open',
      'runtime-notes-hidden',
      'sjn-collapsed',
    ]);
    const bodyClass = [...document.body.classList]
      .filter(c => !transientBodyClasses.has(c) && !c.startsWith('show-guide'))
      .join(' ');
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
    if (hadLayerVisible) layerPanel.classList.add('visible');
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

  function showSaveStatus(label = '✓ 저장됨') {
    const el = document.getElementById('save-status');
    const now = new Date();
    const hhmm = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    el.textContent = '  ' + label + ' ' + hhmm;
    setTimeout(() => { el.textContent = ''; }, 2000);
  }

  async function saveToFile(force) {
    if (typeof commitActiveEditors === 'function') {
      await commitActiveEditors();
    }
    if (isGitHubPages) { await ghSaveToFile(force); return; }
    if (!dirHandle && force) {
      const ok = await ensureDirHandle();
      if (!ok) return;
    }
    if (!dirHandle) return;
    if (isSaving) {
      pendingLocalSave = pendingLocalSave || !!force;
      return;
    }
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
      if (pendingLocalSave) {
        const rerunForce = pendingLocalSave;
        pendingLocalSave = false;
        setTimeout(() => { saveToFile(rerunForce); }, 0);
      }
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
  const GH_LOCAL_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

  // GitHub Pages CDN 캐시(10분) 때문에 저장 직후 새로고침 시 이전 버전이 보임
  // document.write() 방식은 슬라이드 중복 위험 → 제거. 사용자에게 대기 안내.

  let _ghToken = null;
  let _ghFileSha = null;
  let _ghDirty = false;
  let _ghSaving = false;
  let _ghStageObserver = null;
  let _ghDirtyVersion = 0;
  let _ghPendingSave = false;
  let _ghPendingForce = false;
  let _ghLastSavedHtml = '';
  window.__ghLastSaveOk = false;
  window.__ghLastSavedSha = '';
  window.__ghPublicReflectOk = true;

  function ghGetToken() {
    if (_ghToken) return _ghToken;
    _ghToken = localStorage.getItem(GH_TOKEN_KEY);
    return _ghToken;
  }

  function ghRuntimeDraftRevision() {
    try {
      const script = Array.from(document.scripts || []).find(node =>
        /(?:^|\/)assets\/slide-editor\.js(?:[?#].*)?$/.test(node.src || '')
      );
      if (!script) return 'noversion';
      const url = new URL(script.src, location.href);
      return url.searchParams.get('v') || 'noversion';
    } catch (_) {
      return 'noversion';
    }
  }

  function ghLocalDraftPrefix() {
    return 'gh-local-draft:' + location.pathname;
  }

  function ghLocalDraftKey() {
    return ghLocalDraftPrefix() + ':' + ghRuntimeDraftRevision();
  }

  function ghClearLegacyDrafts() {
    const prefix = ghLocalDraftPrefix() + ':';
    const keepKey = ghLocalDraftKey();
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(prefix) && key !== keepKey) localStorage.removeItem(key);
      });
    } catch (_) {}
  }

  function ghStoreLocalDraft(html, reason = 'fallback') {
    if (!html) return;
    try {
      ghClearLegacyDrafts();
      localStorage.setItem(ghLocalDraftKey(), JSON.stringify({
        html,
        savedAt: Date.now(),
        reason,
      }));
    } catch (_) {}
  }

  function ghLoadLocalDraft() {
    try {
      ghClearLegacyDrafts();
      const raw = localStorage.getItem(ghLocalDraftKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.html || !parsed.savedAt) {
        localStorage.removeItem(ghLocalDraftKey());
        return null;
      }
      if (Date.now() - parsed.savedAt > GH_LOCAL_DRAFT_TTL_MS) {
        localStorage.removeItem(ghLocalDraftKey());
        return null;
      }
      return parsed;
    } catch (_) {
      try { localStorage.removeItem(ghLocalDraftKey()); } catch (_) {}
      return null;
    }
  }

  function ghClearLocalDraft() {
    try {
      ghClearLegacyDrafts();
      localStorage.removeItem(ghLocalDraftKey());
    } catch (_) {}
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

  function ghDecodeContent(data) {
    if (!data || data.encoding !== 'base64' || !data.content) return '';
    try {
      return decodeURIComponent(escape(atob(String(data.content).replace(/\n/g, ''))));
    } catch (_) {
      return '';
    }
  }

  function ghNormalizeHtmlForCompare(html) {
    return String(html || '')
      .replace(/<meta name="gh-sha" content="[^"]*">\s*/g, '');
  }

  function ghGetCurrentHtmlForCompare() {
    if (typeof getCleanHTML === 'function') {
      try {
        return getCleanHTML();
      } catch (_) {}
    }
    return document.documentElement.outerHTML;
  }

  function ghReloadFresh(remoteSha) {
    try {
      const url = new URL(location.href);
      url.searchParams.set('_ghfresh', remoteSha || String(Date.now()));
      location.replace(url.toString());
    } catch (_) {
      location.reload();
    }
  }
  window.ghReloadFresh = ghReloadFresh;

  function ghRestoreLocalDraftIfNeeded(draftOverride = null) {
    const draft = draftOverride || ghLoadLocalDraft();
    if (!draft) return false;
    const normalizedDraft = ghNormalizeHtmlForCompare(draft.html);
    const normalizedCurrent = ghNormalizeHtmlForCompare(ghGetCurrentHtmlForCompare());
    if (normalizedDraft === normalizedCurrent) {
      ghClearLocalDraft();
      return false;
    }
    try {
      const parsed = new DOMParser().parseFromString(draft.html, 'text/html');
      const draftStage = parsed.getElementById('stage');
      const liveStage = document.getElementById('stage');
      if (!draftStage || !liveStage) return false;

      const currentActiveId = document.querySelector('#stage > .slide.active')?.id || '';
      liveStage.innerHTML = draftStage.innerHTML;

      let liveMeta = document.querySelector('meta[name="gh-sha"]');
      const draftMeta = parsed.querySelector('meta[name="gh-sha"]');
      if (draftMeta) {
        if (!liveMeta) {
          liveMeta = document.createElement('meta');
          liveMeta.name = 'gh-sha';
          document.head.appendChild(liveMeta);
        }
        liveMeta.content = draftMeta.content || '';
      }

      slides = document.querySelectorAll('#stage > .slide');
      let nextSlide = currentActiveId
        ? Array.from(slides).findIndex(slide => slide.id === currentActiveId)
        : -1;
      if (nextSlide < 0) nextSlide = Math.min(typeof currentSlide === 'number' ? currentSlide : 0, Math.max(slides.length - 1, 0));
      if (typeof currentSlide !== 'undefined') currentSlide = Math.max(0, nextSlide);
      document.querySelectorAll('#stage > .slide').forEach((slide, index) => {
        slide.classList.toggle('active', index === currentSlide);
        slide.classList.remove('leave-left', 'enter-from-left');
      });
      if (slides[currentSlide] && typeof showStep === 'function') {
        if (typeof getSourceBrowseStepState === 'function') {
          const browseState = getSourceBrowseStepState(slides[currentSlide]);
          if (typeof currentStep !== 'undefined') currentStep = browseState.step;
          if (typeof currentOrder !== 'undefined') currentOrder = browseState.order;
          showStep(slides[currentSlide], currentStep, browseState.revealAll);
        } else {
          if (typeof currentStep !== 'undefined') currentStep = 0;
          if (typeof currentOrder !== 'undefined') currentOrder = 0;
          showStep(slides[currentSlide], 0, true);
        }
      }
      if (typeof scaleStage === 'function') scaleStage();
      showToast('이 브라우저의 임시 저장본을 복구했습니다.', 4000);
      return true;
    } catch (_) {
      return false;
    }
  }
  window.ghRestoreLocalDraftIfNeeded = ghRestoreLocalDraftIfNeeded;

  async function ghWaitForPublicReflect(expectedHtml, timeoutMs = 12000, intervalMs = 1500) {
    const expected = ghNormalizeHtmlForCompare(expectedHtml);
    const baseUrl = new URL(location.href);
    baseUrl.hash = '';
    ['_ghsaved', '_ghfresh', '_ghprobe'].forEach(key => baseUrl.searchParams.delete(key));
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const probeUrl = new URL(baseUrl.toString());
        probeUrl.searchParams.set('_ghprobe', String(Date.now()));
        const res = await fetch(probeUrl.toString(), { cache: 'no-store' });
        if (res.ok) {
          const html = await res.text();
          if (ghNormalizeHtmlForCompare(html) === expected) return true;
        }
      } catch (_) {}
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    return false;
  }
  window.ghWaitForPublicReflect = ghWaitForPublicReflect;

  function _ghFilePath() {
    const filename = location.pathname.split('/').pop() || 'slides.html';
    // slide-viewer/ 또는 slide-viewer-* 하위 경로 추출
    const parts = location.pathname.split('/');
    const svIdx = parts.findIndex(p => /^slide-viewer(?:-.+)?$/.test(p));
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
    if (_ghSaving) {
      _ghPendingSave = true;
      _ghPendingForce = _ghPendingForce || !!force;
      if (force) showToast('저장 진행 중... 변경분을 이어서 저장합니다.', 2000);
      return;
    }
    if (!force && !_ghDirty) return;
    _ghSaving = true;
    window.__ghLastSaveOk = false;
    window.__ghPublicReflectOk = true;
    const startDirtyVersion = _ghDirtyVersion;
    let saveCompleted = false;
    let content = '';
    showToast('GitHub에 저장 중...', 2000);
    try {
      const stageEl = document.getElementById('stage');
      const shouldRebindObserver = !!_ghStageObserver && !!stageEl;
      if (shouldRebindObserver) ghUnbindDirtyObserver();
      try {
        content = getCleanHTML();
      } catch (htmlErr) {
        if (shouldRebindObserver && typeof editMode !== 'undefined' && editMode) {
          ghBindDirtyObserver(stageEl);
        }
        showToast('HTML 직렬화 오류: ' + htmlErr.message, 5000);
        return;
      }
      if (shouldRebindObserver && typeof editMode !== 'undefined' && editMode) {
        ghBindDirtyObserver(stageEl);
      }
      const token = ghGetToken();
      if (!token) {
        ghStoreLocalDraft(content, 'missing-token');
        _ghDirty = false;
        showToast('GitHub 토큰이 없어 이 브라우저에 임시 저장했습니다. ⚙ 에서 설정하세요.', 5000);
        try { showSaveStatus('임시 저장'); } catch(_) {}
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
        _ghLastSavedHtml = content;
        ghStoreLocalDraft(content, 'remote-save');
        window.__ghLastSavedSha = _ghFileSha;
        saveCompleted = true;
        if (_ghDirtyVersion === startDirtyVersion) {
          _ghDirty = false;
        } else {
          _ghDirty = true;
          _ghPendingSave = true;
        }
        // SHA 마커 업데이트 (다음 열 때 최신 판별용)
        let shaMeta = document.querySelector('meta[name="gh-sha"]');
        if (!shaMeta) { shaMeta = document.createElement('meta'); shaMeta.name = 'gh-sha'; document.head.appendChild(shaMeta); }
        shaMeta.content = _ghFileSha;
        ghBumpFreshUrl();
        window.__ghLastSaveOk = true;
        if (window.__slideExitPendingSave) {
          const reflected = await ghWaitForPublicReflect(_ghLastSavedHtml);
          window.__ghPublicReflectOk = reflected;
          if (reflected) ghClearLocalDraft();
          if (!reflected) {
            showToast('저장은 완료됐지만 공개 반영이 조금 늦고 있습니다.', 4000);
          }
        }
        showToast('GitHub 저장 완료! 공개 URL 반영은 잠시 늦을 수 있습니다.', 4000);
        try { showSaveStatus(); } catch(_) {}
      } else if (res.status === 409 || res.status === 422) {
        await _ghHandleConflict(encoded, filePath);
      } else if (res.status === 401) {
        ghHandleAuthError();
        ghStoreLocalDraft(content, 'auth-error');
        showToast('GitHub 저장에 실패해 이 브라우저에 임시 저장했습니다.', 5000);
        try { showSaveStatus('임시 저장'); } catch(_) {}
      } else if (res.status === 403) {
        ghStoreLocalDraft(content, 'rate-limit');
        showToast('GitHub API 한도 초과 — 잠시 후 다시 시도됩니다', 4000);
        try { showSaveStatus('임시 저장'); } catch(_) {}
      } else {
        ghStoreLocalDraft(content, 'http-error');
        const errBody = await res.text().catch(() => '');
        showToast('저장 실패 (' + res.status + '): ' + errBody.slice(0, 100), 5000);
        try { showSaveStatus('임시 저장'); } catch(_) {}
      }
    } catch (e) {
      ghStoreLocalDraft(content, 'network-error');
      showToast('저장 오류: ' + e.message, 5000);
      try { showSaveStatus('임시 저장'); } catch(_) {}
    } finally {
      _ghSaving = false;
      const rerun = _ghPendingSave || _ghPendingForce || (_ghDirty && _ghDirtyVersion > startDirtyVersion);
      const rerunForce = _ghPendingForce;
      _ghPendingSave = false;
      _ghPendingForce = false;
      if (rerun) {
        setTimeout(() => { ghSaveToFile(rerunForce || _ghDirty); }, 0);
      }
    }
  }

  async function _ghHandleConflict(encoded, filePath) {
    // SHA 불일치 — 외부에서 수정됨
    const choice = confirm('⚠️ 파일이 외부에서 변경되었습니다.\n\n확인 = 내 편집 유지 (덮어쓰기)\n취소 = 외부 변경 로드 (새로고침)');
    if (!choice) {
      ghClearLocalDraft();
      location.reload();
      return;
    }
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
        ghClearLocalDraft();
        ghBumpFreshUrl();
        showToast('GitHub 저장 완료! 공개 URL 반영은 잠시 늦을 수 있습니다.', 4000);
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

  function ghBumpFreshUrl() {
    try {
      const url = new URL(location.href);
      url.searchParams.set('_ghsaved', String(Date.now()));
      history.replaceState(null, '', url.toString());
    } catch (_) {}
  }

  function ghMarkDirty() {
    _ghDirty = true;
    _ghDirtyVersion += 1;
  }
  function ghIsDirty() { return _ghDirty; }
  function ghHasPendingChanges() {
    return _ghDirty || _ghSaving || _ghPendingSave || !!window.__slideExitPendingSave;
  }

  function ghBindDirtyObserver(stageEl) {
    if (!isGitHubPages || !stageEl) return;
    ghUnbindDirtyObserver();
    _ghStageObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (typeof editMode !== 'undefined' && !editMode) return;
        if (m.type === 'childList') {
          ghMarkDirty();
          if (_ghSaving) _ghPendingSave = true;
          return;
        }
        if (m.type === 'characterData') {
          ghMarkDirty();
          if (_ghSaving) _ghPendingSave = true;
          return;
        }
        if (m.type === 'attributes') {
          const attr = m.attributeName || '';
          if (
            attr === 'style' ||
            attr === 'src' ||
            attr === 'href' ||
            attr === 'class' ||
            attr.startsWith('data-')
          ) {
            ghMarkDirty();
            if (_ghSaving) _ghPendingSave = true;
            return;
          }
        }
      }
    });
    _ghStageObserver.observe(stageEl, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true
    });
  }

  function ghUnbindDirtyObserver() {
    if (_ghStageObserver) {
      _ghStageObserver.disconnect();
      _ghStageObserver = null;
    }
  }

  // ── 텍스트 편집 시 dirty 감지 (contenteditable) ──
  if (isGitHubPages) {
    document.addEventListener('input', (e) => {
      if (e.target.closest && e.target.closest('[contenteditable]')) ghMarkDirty();
    });
  }

  window.ghHasPendingChanges = ghHasPendingChanges;

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

  // ── 페이지 열 때 GitHub 최신 HTML 자동 로드 ──
  async function ghCheckAndLoadLatest() {
    // sessionStorage 플래그로 무한 루프 방지: document.write() 후 재실행 시 스킵
    const freshKey = 'gh-fresh-' + location.pathname;
    if (sessionStorage.getItem(freshKey)) { sessionStorage.removeItem(freshKey); return; }

    const token = ghGetToken();
    if (!token) return;

    try {
      const filePath = _ghFilePath();
      const res = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${filePath}`, {
        headers: { 'Authorization': `token ${token}` }
      });
      if (!res.ok) return;

      const data = await res.json();
      const remoteSha = data.sha;
      _ghFileSha = remoteSha;

      // 현재 페이지의 SHA 마커와 비교
      let localMeta = document.querySelector('meta[name="gh-sha"]');
      if (localMeta && localMeta.content === remoteSha) return; // 이미 최신

      const remoteHtml = ghDecodeContent(data);
      const localHtml = ghGetCurrentHtmlForCompare();
      if (remoteHtml && ghNormalizeHtmlForCompare(remoteHtml) === ghNormalizeHtmlForCompare(localHtml)) {
        if (!localMeta) {
          localMeta = document.createElement('meta');
          localMeta.name = 'gh-sha';
          document.head.appendChild(localMeta);
        }
        localMeta.content = remoteSha;
        ghClearLocalDraft();
        return;
      }

      // 최신 버전 감지 → 새로고침으로 반영 (document.write는 Chrome 렌더링 깨짐 유발)
      showToast('최신 버전 불러오는 중...', 3000);
      sessionStorage.setItem(freshKey, remoteSha || '1');
      ghReloadFresh(remoteSha);
    } catch (e) {
      console.error('ghCheckAndLoadLatest:', e);
    }
  }

  // 페이지 로드 시 자동 실행
  if (isGitHubPages) {
    const _ghRunCheck = async () => {
      ghClearLegacyDrafts();
      const draft = ghLoadLocalDraft();
      if (draft && draft.reason === 'remote-save' && ghGetToken()) {
        await ghCheckAndLoadLatest();
        const latestDraft = ghLoadLocalDraft();
        if (!latestDraft) return;
        const normalizedDraft = ghNormalizeHtmlForCompare(latestDraft.html);
        const normalizedCurrent = ghNormalizeHtmlForCompare(ghGetCurrentHtmlForCompare());
        if (normalizedDraft === normalizedCurrent) {
          ghClearLocalDraft();
          return;
        }
        ghRestoreLocalDraftIfNeeded(latestDraft);
        return;
      }
      const restored = ghRestoreLocalDraftIfNeeded(draft);
      if (!restored) {
        await ghCheckAndLoadLatest();
        return;
      }
      if (ghGetToken()) await ghCheckAndLoadLatest();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _ghRunCheck);
    else _ghRunCheck();
  }

  // ── GitHub Pages에서 설정 아이콘 추가 ──
  if (isGitHubPages) {
    // DOM 준비 후 설정 아이콘 삽입
    const _ghAddSettingsIcon = () => {
      const saveBtn = document.getElementById('tb-save');
      if (!saveBtn) return;
      if (document.getElementById('gh-settings')) return;
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
  const EDITABLE_SEL = '.bubble, .text-area, .bg-label, .slide-el:not(.no-edit-select), img, .emoji-icon, .section-badge, .corner-label, .step-dim, [data-type]:not(.slide):not(.no-edit-select), .tl-circle, .tl-box, .tl-desc, .items-row, .items-col, .items-grid';
  let editMode = false;
  let isEditing = false;
  let clipboardEl = null;
  let clipboardStep = 0;
  let selectedEl = null;
  let selectedEls = [];
  let elAnchors = [];
  // SVG connector(.step-timeline > svg) 동반 이동: SVGElement는 offsetLeft 미지원이라 selection 안 넣고 별도 추적
  let svgDragAnchors = [];
  let isDragging = false;
  const CHILD_SEL = '.card-title, .card-desc, .card-num, .grid-title, .grid-desc, .grid-icon, .grid-icon-box, .grid-row-body, .num-text, .num-badge, .num-item, .check-text, .check-box, .check-item, .bar-label, .bar-value, .bar-fill, .bar-row, .bar-track, .hbar-label, .hbar-val, .chart-title, .chart-label, .chart-val, .lc-end-val, .stat-num, .stat-label, .stat-detail-item, .big-stat, .stat-block, .stat-circle, .icon-label, .icon-row-role, .icon-row-desc, .icon-circle, .emoji-icon, .icon-flow-item, .icon-flow-label, .icon-flow-icon, .icon-flow-arrow, .flow-box, .flow-arrow, .flow-step1, .flow-step2, .alert-text, .alert-icon, .compare-col, .compare-header, .compare-item, .compare-emoji-icon, .vs-badge, .quote-text, .quote-source, .quote-mark, .quote-img, .quote-card, .quote-layout, .quote-minimal, .tag-chip, .tl-box, .tl-circle, .tl-desc, .btn-pill, .cta-btn, .subscribe, .contrast-word, .contrast-sub, .contrast-top, .contrast-bottom, .contrast-quote, .contrast-vs, .contrast-source, .chapter-pill, .chapter-flow-title, .chapter-flow-desc, .chapter-flow-icon, .chapter-flow-arrow, .bullet-text, .bullet-summary, .bullet-icon, .comp-label, .comp-val, .comp-summary, .comp-table, .comp-table th, .branch-question, .branch-sub, .branch-result, .branch-summary, .branch-node, .branch-arrow, .branch-root, .branch-cols, .branch-col, .eq-title, .eq-desc, .eq-op, .eq-hl, .eq-icon, .eq-chain-box, .eq-chain-sub, .eq-chain-arrow, .eq-result, .flow-detail-title, .flow-detail-sub, .flow-detail-list, .flow-detail-icon, .flow-highlight, .flow-step-title, .flow-step-body, .branch-root-text, .branch-result-text, .split-compare-label, .split-compare-desc, .split-compare-value, .split-list-item, .split-list-num, .split-list-title, .split-list-text, .split-stat-card, .split-stat-main, .split-stat-row, .split-stat-icon, .split-stat-label, .split-stat-value, .split-stat-desc, .split-summary, .icon-flow-stat-emoji, .icon-flow-stat-text, .icon-flow-stat-num, .icon-flow-stat-unit, .icon-flow-highlight, .counter-label, .counter-sub, .line1-emph, .emph-line1, .emph-line2, .person-role, .person-desc, .blog-counter, .blog-meta, .term-en, .term-desc, .img-placeholder, .img-caption, .slide-caption, .postit-num, .cork-label, .step-title, .reveal-line1, .reveal-line2, .two-step-title, .two-step-desc, .point-title, .point-desc, .vertical-line1, .vertical-line2, .left-rail-title, .reveal-band, .reveal-band-text, .left-rail-desc, .left-rail-desc-text, .quote-tail, .quote-tail-text, .step-card, .step-card-body';
  // 비텍스트 자식 (fontSize 기반 리사이즈 대상 아님 — 이들은 기존 slide-el 박스 리사이즈로 처리)
  const NON_TEXT_CHILD_SEL = '.bar-fill, .check-box, .icon-circle, .tl-circle';
  const NON_DETACHABLE_CHILD_SEL = '.bar-fill, .bar-row, .bar-track, .check-box, .icon-circle, .tl-circle, .flow-arrow, .branch-arrow, .icon-flow-arrow, .bar-chart, .line-chart, .hbar-chart, .step-timeline, .multi-stat';
  const NON_MEANINGFUL_STEP_SEL = '.vertical-divider, .branch-arrow, .flow-arrow, .icon-flow-arrow, .eq-chain-arrow, .chapter-flow-arrow';
  const EMPTY_PRUNE_SEL = '.slide-el, .text-area, .bubble, .items-row, .items-col, .items-grid, .compare-box, .compare-col, .branch-flow, .branch-cols, .branch-col, .grid-row-body, .btn-grid, .split-list, .split-list-item, .split-stat-row, .split-stat-card, .icon-flow-item, .icon-flow, .icon-flow-stat, .icon-flow-highlight, table, thead, tbody, tr, td, th';
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
  let layoutDetachCounter = 0;
  let groupCounter = 0;
  let individualMode = false;
  let layerActiveTab = 'animation'; // 'animation' | 'position'
  let expandedGroups = new Set();
  // ── 드래그 선택 박스 ──
  let selectBoxActive = false;
  let selectBoxOrigin = null;
  let selectBoxAdditive = false;
  let selectBoxSeedEls = [];
  let pendingShiftSelect = null;
  // ── Undo / Redo ──
  const undoStack = [];
  const redoStack = [];
  let activeSvgTextEditor = null;

  if (
    document.body &&
    document.body.dataset.generated === 'true' &&
    /260419-slides\.html$/.test(location.pathname)
  ) {
    document.body.classList.add('frozen-legacy-deck');
  }

  function isGeneratedRuntimeDeck() {
    return document.body && document.body.dataset.generated === 'true';
  }

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
        if (!ghGetToken()) {
          showToast('GitHub 토큰이 없어 이 브라우저에 임시 저장됩니다. ⚙ 에서 설정하세요.', 5000);
        }
        await ghFetchFileSha();
      } else if (!dirHandle) {
        const ok = await ensureDirHandle();
        if (!ok) {
          showToast('저장 폴더를 선택하지 않아 저장 없이 편집합니다. 저장할 때 다시 물어봅니다.', 5000);
          try { showSaveStatus('폴더 선택 필요'); } catch(_) {}
        }
      }
      if (autoSaveTimer) clearInterval(autoSaveTimer);
      autoSaveTimer = setInterval(saveToFile, isGitHubPages ? GH_AUTO_SAVE_INTERVAL : 30000);
      if (isGitHubPages && typeof ghBindDirtyObserver === 'function') {
        ghBindDirtyObserver(document.getElementById('stage'));
      }
      // ── 편집중 배지 표시 ──
      showEditBadge(true);
      if (slides[currentSlide] && typeof showStep === 'function') {
        showStep(slides[currentSlide], currentStep);
      }
    } else {
      // ── 편집중 배지 먼저 숨김 (아래 cleanup 중 예외 나도 배지는 반드시 사라지게) ──
      showEditBadge(false);
      if (isGitHubPages && typeof ghUnbindDirtyObserver === 'function') {
        ghUnbindDirtyObserver();
      }
      try {
        userZoom = 1; panX = 0; panY = 0;
        clearInterval(autoSaveTimer);
        autoSaveTimer = null;
        if (isGitHubPages) window.__slideExitPendingSave = true;
        saveToFile(true).finally(() => {
          if (isGitHubPages && window.__ghLastSaveOk && window.__ghPublicReflectOk && typeof ghReloadFresh === 'function') {
            ghReloadFresh(window.__ghLastSavedSha || String(Date.now()));
            return;
          }
          if (isGitHubPages) window.__slideExitPendingSave = false;
          releaseTabLock();
        });
        document.querySelectorAll('[data-group^="ag"]').forEach(el => delete el.dataset.group);
        // dim-handle 배지 제거
        document.querySelectorAll('.dim-handle').forEach(b => b.remove());
        // 프레젠테이션 상태 리셋
        setDim(false);
        if (slides[currentSlide] && typeof getSourceBrowseStepState === 'function') {
          const browseState = getSourceBrowseStepState(slides[currentSlide]);
          currentStep = browseState.step;
          currentOrder = browseState.order;
          showStep(slides[currentSlide], currentStep, browseState.revealAll);
        } else {
          currentStep = 0;
          currentOrder = 0;
          if (slides[currentSlide]) showStep(slides[currentSlide], 0);
        }
        clearSelection();
        selectBoxActive = false;
        selectBoxAdditive = false;
        selectBoxSeedEls = [];
        pendingShiftSelect = null;
        const sb = document.getElementById('select-box');
        if (sb) sb.style.display = 'none';
        undoStack.length = 0;
        redoStack.length = 0;
        if (typeof closeOverview === 'function') closeOverview();
        const lp = document.getElementById('layer-panel');
        if (lp) lp.classList.remove('visible');
      } catch (err) {
        console.error('[toggleEditMode exit cleanup]', err);
      }
    }
  }

  function showEditBadge(show) {
    let badge = document.getElementById('edit-mode-badge');
    if (show) {
      if (!badge) {
        badge = document.createElement('div');
        badge.id = 'edit-mode-badge';
        badge.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:99999;background:#FF6B00;color:#fff;padding:6px 18px;border-radius:8px;font-size:14px;font-weight:900;pointer-events:none;animation:editBadgeBlink 1.5s infinite;';
        document.body.appendChild(badge);
        if (!document.getElementById('edit-badge-style')) {
          const style = document.createElement('style');
          style.id = 'edit-badge-style';
          style.textContent = '@keyframes editBadgeBlink{0%,100%{opacity:1}50%{opacity:0.3}}';
          document.head.appendChild(style);
        }
      }
      badge.textContent = '편집중 — 자동저장 30초';
      badge.style.display = '';
    } else if (badge) {
      badge.remove();
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

  function isSvgTextEditable(el) {
    return !!(
      el &&
      el.namespaceURI === 'http://www.w3.org/2000/svg' &&
      ['text', 'tspan'].includes((el.tagName || '').toLowerCase())
    );
  }

  function getSingleVisibleTextProxy(el, options = {}) {
    if (!el || !el.querySelectorAll) return null;
    if (el.matches && el.matches('.line-chart, .bar-chart, .hbar-chart, .step-timeline, .multi-stat')) return null;
    const directOnly = !!options.directOnly;
    const requireLayoutParent = !!options.requireLayoutParent;
    const parent = el.parentElement;
    if (requireLayoutParent && !(parent && parent.matches('.items-row, .items-col, .items-grid, .compare-box, .compare-col'))) {
      return null;
    }
    const nodes = directOnly
      ? Array.from(el.children)
      : Array.from(el.querySelectorAll(CHILD_SEL + ', .section-badge, .corner-label, .hl'));
    const candidates = nodes.filter(node => {
      if (!(node instanceof Element) || !el.contains(node)) return false;
      if (node.matches('.slide-el, .text-area, .bubble, .hl-wrap')) return false;
      if (node.matches(NON_TEXT_CHILD_SEL) || node.matches(NON_DETACHABLE_CHILD_SEL)) return false;
      const cs = getComputedStyle(node);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity || '1') === 0) return false;
      const rect = node.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      return !!(node.textContent || '').trim();
    });
    if (candidates.length !== 1) return null;
    return candidates[0];
  }
  window.getSingleVisibleTextProxy = getSingleVisibleTextProxy;

  function enterSvgTextEditor(el) {
    const oldText = el.textContent || '';
    const rect = el.getBoundingClientRect();
    const cs = window.getComputedStyle(el);
    const lines = String(oldText).split('\n');
    const fontSize = parseFloat(cs.fontSize) || rect.height || 16;
    const lineHeight = parseFloat(cs.lineHeight) || (fontSize * 1.2);
    const approxCharWidth = Math.max(14, fontSize * 0.9);
    const isChartTitle = el.classList.contains('chart-title');
    const minEditorWidth = Math.max(
      isChartTitle ? 180 : 96,
      rect.width + (isChartTitle ? 28 : 18)
    );
    const minEditorHeight = Math.max(
      lineHeight + 12,
      rect.height + 12,
      lines.length > 1 ? lineHeight * lines.length + 12 : rect.height + 12
    );
    const editor = document.createElement('div');
    editor.className = 'svg-text-editor';
    editor.contentEditable = 'true';
    editor.dataset.svgTextEditor = 'true';
    editor.dataset.singleLine = lines.length === 1 ? 'true' : 'false';
    editor.setAttribute('spellcheck', 'false');
    editor.style.cssText = [
      'position:fixed',
      'z-index:120000',
      `left:${Math.max(8, rect.left - 6)}px`,
      `top:${Math.max(8, rect.top - 6)}px`,
      `min-width:${minEditorWidth}px`,
      `min-height:${minEditorHeight}px`,
      'padding:4px 8px',
      'border:2px solid rgba(255,106,0,0.45)',
      'border-radius:8px',
      'background:rgba(255,255,255,0.96)',
      'color:#111',
      'box-shadow:0 4px 16px rgba(0,0,0,0.12)',
      `font:${cs.font}`,
      `line-height:${cs.lineHeight}`,
      `letter-spacing:${cs.letterSpacing}`,
      'outline:none',
      'white-space:pre-wrap',
      'word-break:keep-all',
      'overflow:visible',
      'caret-color:#111'
    ].join(';');
    if (lines.length === 1) editor.style.whiteSpace = 'pre';
    editor.textContent = oldText;
    const readEditorText = () => {
      const raw = typeof editor.innerText === 'string' ? editor.innerText : editor.textContent || '';
      return raw.replace(/\r/g, '').replace(/\u00a0/g, ' ');
    };
    const syncEditorSize = () => {
      const editorLines = String(readEditorText() || '').split('\n');
      const longestLine = editorLines.reduce((max, line) => Math.max(max, line.length), 0);
      const width = Math.max(
        minEditorWidth,
        Math.min(960, longestLine * approxCharWidth + 28)
      );
      const height = Math.max(
        minEditorHeight,
        lineHeight * Math.max(1, editorLines.length) + 12
      );
      editor.style.width = width + 'px';
      editor.style.minHeight = height + 'px';
      editor.style.height = height + 'px';
    };
    syncEditorSize();
    document.body.appendChild(editor);
    showFormatBar(el);
    requestAnimationFrame(() => {
      editor.focus();
      const sel = window.getSelection();
      if (!sel) return;
      const range = document.createRange();
      range.selectNodeContents(editor);
      sel.removeAllRanges();
      sel.addRange(range);
    });

    const finish = (commit) => {
      editor.removeEventListener('keydown', onKeydown);
      editor.removeEventListener('blur', onBlur);
      editor.removeEventListener('input', onInput);
      editor.removeEventListener('paste', onPaste);
      if (editor.parentNode) editor.parentNode.removeChild(editor);
      if (commit) {
        const nextText = readEditorText();
        if (!(typeof syncLineChartSvgText === 'function' && syncLineChartSvgText(el, nextText))) {
          el.textContent = nextText;
        }
        if (typeof ghMarkDirty === 'function') ghMarkDirty();
      }
      if (activeSvgTextEditor && activeSvgTextEditor.element === editor) activeSvgTextEditor = null;
      isEditing = false;
      hideFormatBar();
    };
    const onKeydown = (ev) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        editor.textContent = oldText;
        finish(false);
        return;
      }
      if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        finish(true);
        return;
      }
      if ((ev.ctrlKey || ev.metaKey) && ev.key === 'z') {
        ev.preventDefault();
        finish(true);
        ev.shiftKey ? doRedo() : doUndo();
      }
    };
    const onInput = () => syncEditorSize();
    const onPaste = ev => {
      ev.preventDefault();
      const text = ev.clipboardData?.getData('text/plain') ?? '';
      if (!text) return;
      document.execCommand('insertText', false, text);
      syncEditorSize();
    };
    const onBlur = () => finish(true);
    editor.addEventListener('keydown', onKeydown);
    editor.addEventListener('input', onInput);
    editor.addEventListener('paste', onPaste);
    editor.addEventListener('blur', onBlur, { once: true });
    activeSvgTextEditor = { element: editor, finish };
  }

  async function commitActiveEditors() {
    if (activeSvgTextEditor && typeof activeSvgTextEditor.finish === 'function') {
      activeSvgTextEditor.finish(true);
      await new Promise(resolve => requestAnimationFrame(resolve));
      return;
    }
    const editingEl = document.querySelector('[contenteditable="true"]');
    if (editingEl && typeof editingEl.blur === 'function') {
      editingEl.blur();
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
  }
  window.commitActiveEditors = commitActiveEditors;

  function syncLineChartSvgText(el, nextText = '', options = {}) {
    const chart = el && el.closest ? el.closest('.line-chart') : null;
    if (!chart) return false;
    const remove = !!options.remove;
    const text = remove ? '' : String(nextText ?? '');
    const readYTicks = () => {
      try {
        const parsed = JSON.parse(chart.dataset.yTicks || '[]');
        return Array.isArray(parsed) ? parsed.map(v => String(v ?? '')) : [];
      } catch (err) {
        return [];
      }
    };
    const writeYTicks = ticks => {
      chart.dataset.yTicks = JSON.stringify(ticks.map(v => String(v ?? '')));
    };

    if (el.classList.contains('chart-title')) {
      chart.dataset.title = text;
      if (typeof buildLineChart === 'function') buildLineChart(chart);
      return true;
    }

    if (el.classList.contains('chart-label') && el.getAttribute('text-anchor') === 'middle') {
      const labels = (chart.dataset.labels || '').split(',').map(s => s.trim());
      const xLabels = Array.from(chart.querySelectorAll('.chart-label'))
        .filter(node => node.getAttribute('text-anchor') === 'middle');
      const idx = xLabels.indexOf(el);
      if (idx >= 0) {
        labels[idx] = text;
        chart.dataset.labels = labels.join(',');
        if (typeof buildLineChart === 'function') buildLineChart(chart);
        return true;
      }
    }

    if (el.classList.contains('chart-label') && el.getAttribute('text-anchor') === 'end') {
      const yLabels = Array.from(chart.querySelectorAll('.chart-label'))
        .filter(node => node.getAttribute('text-anchor') === 'end');
      const idx = yLabels.indexOf(el);
      if (idx >= 0) {
        const ticks = readYTicks();
        const currentLabels = yLabels.map(node => String(node.textContent ?? ''));
        const nextTicks = currentLabels.map((label, i) => (i < ticks.length ? ticks[i] : label));
        while (nextTicks.length < yLabels.length) nextTicks.push(currentLabels[nextTicks.length] || '');
        nextTicks[idx] = text;
        writeYTicks(nextTicks);
        if (typeof buildLineChart === 'function') buildLineChart(chart);
        return true;
      }
    }

    if (el.classList.contains('lc-end-val')) {
      const vals = (chart.dataset.values || '').split(',').map(s => s.trim());
      if (vals.length) {
        const numeric = text.replace(/[^0-9.\-]/g, '');
        if (remove || numeric) {
          vals[vals.length - 1] = remove ? '' : numeric;
          chart.dataset.values = vals.join(',');
          if (typeof buildLineChart === 'function') buildLineChart(chart);
          return true;
        }
      }
    }

    return false;
  }
  window.syncLineChartSvgText = syncLineChartSvgText;

  function enterContentEditable(el, e) {
    pushUndo();
    isEditing = true;
    if (isSvgTextEditable(el)) {
      enterSvgTextEditor(el);
      return;
    }
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
    if (groupParent) {
      groupParent.classList.remove('group-entered-parent');
      groupParent.querySelectorAll('.child-selected').forEach(c => c.classList.remove('child-selected'));
      groupParent.querySelectorAll('.child-action-target').forEach(c => c.classList.remove('child-action-target'));
    }
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
    document.querySelectorAll('.edit-selected, .edit-group-selected, .child-selected, .child-action-target').forEach(el => {
      el.classList.remove('edit-selected', 'edit-group-selected', 'child-selected', 'child-action-target');
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

  function isMeaningfulTextContent(text = '') {
    return text.replace(/\u00a0/g, ' ').trim().length > 0;
  }

  function isRemovalPlaceholderEl(el) {
    return !!(
      el &&
      el.classList &&
      (
        el.classList.contains('edit-hidden-placeholder') ||
        el.classList.contains('layout-detached-placeholder')
      )
    );
  }

  function hasVisibleMeaningfulText(node, selector) {
    if (!(node instanceof Element)) return false;
    return Array.from(node.querySelectorAll(selector)).some(el => {
      if (!(el instanceof Element) || isRemovalPlaceholderEl(el)) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      return isMeaningfulTextContent(el.textContent || '');
    });
  }

  function hasLiveRenderableContent(node) {
    if (!node) return false;
    if (node.nodeType === Node.TEXT_NODE) {
      return isMeaningfulTextContent(node.textContent || '');
    }
    if (!(node instanceof Element)) return false;
    if (isRemovalPlaceholderEl(node)) return false;
    if (node.matches('.step-dim, .step-title, .resize-handle')) return false;
    if (node.matches(NON_MEANINGFUL_STEP_SEL)) return false;
    const cs = getComputedStyle(node);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (node.matches('.slide-el[data-type="비교테이블"], .comp-table')) {
      return hasVisibleMeaningfulText(node, 'tbody td, tbody th, .comp-summary');
    }
    if (node.matches('.slide-el.icon-flow, .slide-el[data-type="아이콘플로우"], .icon-flow, .icon-flow-item')) {
      return hasVisibleMeaningfulText(node, '.icon-flow-label');
    }
    if (node.matches('img, svg, video, canvas')) return true;
    for (const child of node.childNodes) {
      if (hasLiveRenderableContent(child)) return true;
    }
    return false;
  }

  function canAutoPruneEmptyNode(node) {
    return !!(node && node.matches && node.matches(EMPTY_PRUNE_SEL));
  }

  function cleanupEmptyEditContainers(startNode, slide) {
    let node = startNode;
    while (node && node !== slide && node instanceof Element) {
      const parent = node.parentElement;
      if (node.matches('.step-layer')) break;
      if (canAutoPruneEmptyNode(node) && !hasLiveRenderableContent(node)) {
        node.remove();
        node = parent;
        continue;
      }
      node = parent;
    }
    slide.querySelectorAll('.step-layer[data-step]').forEach(layer => {
      const step = parseInt(layer.dataset.step || '0', 10) || 0;
      if (step === 0) return;
      const hasLiveChild = Array.from(layer.childNodes).some(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          return isMeaningfulTextContent(child.textContent || '');
        }
        return (
          child instanceof Element &&
          !child.classList.contains('step-dim') &&
          !child.classList.contains('step-title') &&
          hasLiveRenderableContent(child)
        );
      });
      if (!hasLiveChild) layer.remove();
    });
    recalcSteps(slide);
  }

  function removeEditableElement(el, slide) {
    if (isSvgTextEditable(el) && typeof syncLineChartSvgText === 'function') {
      if (syncLineChartSvgText(el, '', { remove: true })) {
        recalcSteps(slide);
        return;
      }
    }
    const layer = el.closest('.step-layer');
    const parent = el.parentElement;
    const parentDisplay = parent ? getComputedStyle(parent).display : '';
    const elementPosition = getComputedStyle(el).position || '';
    const preserveDirectFlowSlot = !!(
      parent &&
      el.parentElement === parent &&
      parent.matches('.slide-el, .text-area, .bubble') &&
      !['absolute', 'fixed'].includes(elementPosition)
    );
    const preserveLayout = !!(
      parent &&
      (
        parent.classList.contains('items-row') ||
        parent.classList.contains('items-col') ||
        parent.classList.contains('items-grid') ||
        parent.classList.contains('compare-box') ||
        parent.classList.contains('compare-col') ||
        parentDisplay.includes('flex') ||
        parentDisplay.includes('grid') ||
        preserveDirectFlowSlot
      )
    );

    if (preserveLayout) {
      el.style.visibility = 'hidden';
      el.style.pointerEvents = 'none';
      el.style.opacity = '0';
      el.classList.add('edit-hidden-placeholder');
      cleanupEmptyEditContainers(parent || layer, slide);
      return;
    }

    el.remove();
    cleanupEmptyEditContainers(parent || layer, slide);
  }

  function detachLayoutManagedElement(el) {
    if (!el || !el.parentElement) return el;
    const parent = el.parentElement;
    const parentDisplay = getComputedStyle(parent).display || '';
    const elementPosition = getComputedStyle(el).position || '';
    const preserveDirectFlowSlot = !!(
      parent.matches('.slide-el, .text-area, .bubble') &&
      !['absolute', 'fixed'].includes(elementPosition)
    );
    const isLayoutParent = !!(
      parent.matches('.items-row, .items-col, .items-grid, .compare-box, .compare-col') ||
      parentDisplay.includes('flex') ||
      parentDisplay.includes('grid') ||
      preserveDirectFlowSlot
    );
    if (!isLayoutParent) return el;
    if (el.classList.contains('layout-detached')) return el;

    const layer = parent.closest('.step-layer');
    const stageEl = document.getElementById('stage');
    if (!layer || !stageEl) return el;

    const stageRect = stageEl.getBoundingClientRect();
    const scale = stageRect.width / 1920;
    const rect = el.getBoundingClientRect();
    const directDetachChild = (() => {
      const onlyChild = getSingleVisibleTextProxy(el, { directOnly: true, requireLayoutParent: true });
      if (!onlyChild) return null;
      const childRect = onlyChild.getBoundingClientRect();
      if (childRect.width <= 0 || childRect.height <= 0) return null;
      return childRect;
    })();
    const detachRect = directDetachChild || rect;
    const placeholder = el.cloneNode(true);
    layoutDetachCounter += 1;
    placeholder.classList.add('edit-hidden-placeholder', 'no-edit-select', 'layout-detached-placeholder');
    placeholder.classList.remove('edit-selected', 'edit-group-selected', 'child-selected', 'child-action-target');
    placeholder.dataset.layoutPlaceholderId = 'ldp' + layoutDetachCounter;
    placeholder.style.visibility = 'hidden';
    placeholder.style.pointerEvents = 'none';
    placeholder.style.opacity = '0';
    delete placeholder.dataset.group;

    parent.replaceChild(placeholder, el);

    el.classList.add('layout-detached');
    el.style.position = 'absolute';
    el.style.left = Math.round((detachRect.left - stageRect.left) / scale) + 'px';
    el.style.top = Math.round((detachRect.top - stageRect.top) / scale) + 'px';
    el.style.width = Math.round(detachRect.width / scale) + 'px';
    el.style.height = Math.round(detachRect.height / scale) + 'px';
    layer.appendChild(el);
    return el;
  }
  window.detachLayoutManagedElement = detachLayoutManagedElement;

  function shouldPreferParentGroupAction(parent = groupParent) {
    if (!parent) return false;
    return !!(
      parent.matches('.slide-el, .bar-chart, .line-chart, .hbar-chart, .step-timeline, .multi-stat') ||
      parent.closest('.items-row, .items-col, .items-grid, .compare-box, .compare-col')
    );
  }
  window.shouldPreferParentGroupAction = shouldPreferParentGroupAction;

  function shouldAutoEnableChildAction(parent = groupParent, child = null) {
    if (!parent || !child) return false;
    if (child.matches(NON_DETACHABLE_CHILD_SEL)) return false;
    return !!parent.matches('.slide-el, .text-area, .bubble');
  }
  window.shouldAutoEnableChildAction = shouldAutoEnableChildAction;

  function markGroupActionChild(child = null) {
    if (!groupParent) return;
    groupParent.querySelectorAll('.child-action-target').forEach(c => c.classList.remove('child-action-target'));
    if (child && groupParent.contains(child)) child.classList.add('child-action-target');
  }
  window.markGroupActionChild = markGroupActionChild;

  function getGroupActionTarget() {
    if (!groupEntered || !groupParent) return null;
    const actionChild = groupParent.querySelector('.child-action-target');
    if (actionChild) return actionChild;
    const child = groupParent.querySelector('.child-selected');
    if (child && !shouldPreferParentGroupAction(groupParent)) return child;
    return groupParent;
  }
  window.getGroupActionTarget = getGroupActionTarget;

  function insertEditableCloneNearReference(newEl, referenceEl, fallbackParent) {
    const refParent = referenceEl && referenceEl.parentElement;
    if (refParent && refParent.closest && refParent.closest('.slide') === slides[currentSlide]) {
      refParent.insertBefore(newEl, referenceEl.nextSibling);
      return;
    }
    if (fallbackParent) fallbackParent.appendChild(newEl);
  }
  window.insertEditableCloneNearReference = insertEditableCloneNearReference;

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
    const stageEl = document.getElementById('stage');
    const toStageBox = (el) => {
      if (!stageEl || !el) return { left: 0, top: 0, width: 0, height: 0 };
      const stageRect = stageEl.getBoundingClientRect();
      const scale = stageRect.width / 1920 || 1;
      const rect = el.getBoundingClientRect();
      return {
        left: (rect.left - stageRect.left) / scale,
        top: (rect.top - stageRect.top) / scale,
        width: rect.width / scale,
        height: rect.height / scale,
      };
    };
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
      const box = toStageBox(activeChild);
      const l = box.left, t = box.top;
      const w = box.width, hh = box.height;
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
    const textProxy = selectedEls.length === 1 ? getSingleVisibleTextProxy(selectedEl) : null;
    const isTextEl = !!textProxy;
    if (selectedEls.length > 1) {
      let minL = Infinity, minT = Infinity, maxR = -Infinity, maxB = -Infinity;
      selectedEls.forEach(el => {
        const box = toStageBox(el);
        const l = box.left, t = box.top;
        const r = l + box.width, b = t + box.height;
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
      const box = toStageBox(textProxy || selectedEl);
      const l = box.left, t = box.top;
      const w = box.width, hh = box.height;
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
    document.querySelectorAll('.edit-selected, .edit-group-selected, .group-entered-parent, .child-selected, .child-action-target').forEach(el => { el.classList.remove('edit-selected', 'edit-group-selected', 'group-entered-parent', 'child-selected', 'child-action-target'); });
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
  // flex 자식의 offsetLeft/Top은 컨테이너 기준 → stage 좌표로 보정
  function _stageLeft(el) {
    const flex = el.parentElement;
    if (flex && (flex.classList.contains('items-row') || flex.classList.contains('items-col') || flex.classList.contains('items-grid'))) {
      return el.offsetLeft + flex.offsetLeft;
    }
    return el.offsetLeft;
  }
  function _stageTop(el) {
    const flex = el.parentElement;
    if (flex && (flex.classList.contains('items-row') || flex.classList.contains('items-col') || flex.classList.contains('items-grid'))) {
      return el.offsetTop + flex.offsetTop;
    }
    return el.offsetTop;
  }
  function getStageBoxFromRect(el) {
    const stage = document.getElementById('stage');
    if (!stage || !el || !el.getBoundingClientRect) return null;
    const stageRect = stage.getBoundingClientRect();
    const scale = stageRect.width / 1920 || 1;
    const rect = el.getBoundingClientRect();
    return {
      left: (rect.left - stageRect.left) / scale,
      top: (rect.top - stageRect.top) / scale,
      width: rect.width / scale,
      height: rect.height / scale,
    };
  }
  function shouldNormalizeSelectionElement(el) {
    if (!el || !el.matches) return false;
    if (el.matches('.slide-el, .text-area, .bubble, .items-row, .items-col, .items-grid, .compare-box, .compare-col, .step-dim, img')) {
      return true;
    }
    const cs = getComputedStyle(el);
    const position = cs.position || '';
    if (['absolute', 'fixed'].includes(position)) return true;
    if (position !== 'relative') return false;
    return !!(
      (el.style.left && el.style.left !== 'auto') ||
      (el.style.top && el.style.top !== 'auto')
    );
  }
  function collectSnapPoints(excludeEl) {
    const stageEl = document.getElementById('stage');
    const xs = [stageEl.offsetWidth / 2];
    const ys = [stageEl.offsetHeight / 2];
    const layer = excludeEl.closest('.step-layer') || excludeEl.parentElement;
    layer.querySelectorAll(EDITABLE_SEL).forEach(other => {
      if (other === excludeEl || other.classList.contains('step-dim')) return;
      if (other.tagName === 'IMG' && other.closest('.slide-el')) return;
      const ol = _stageLeft(other), ot = _stageTop(other);
      xs.push(ol, ol + other.offsetWidth / 2, ol + other.offsetWidth);
      ys.push(ot, ot + other.offsetHeight / 2, ot + other.offsetHeight);
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

  function _pointWithinRect(rect, clientX, clientY) {
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }

  function findSmallestPointMatch(root, selectors, clientX, clientY) {
    if (!root || !selectors) return null;
    const candidates = Array.from(root.querySelectorAll(selectors)).filter(el => {
      if (!el || el.classList.contains('edit-hidden-placeholder')) return false;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity || '1') === 0) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && _pointWithinRect(rect, clientX, clientY);
    });
    if (!candidates.length) return null;
    candidates.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return (ar.width * ar.height) - (br.width * br.height);
    });
    return candidates[0];
  }

  function findNearestTextAreaLeaf(area, clientX, clientY) {
    if (!area) return null;
    const candidates = Array.from(area.querySelectorAll('.hl, .section-badge, .corner-label')).filter(el => {
      if (!el || el.classList.contains('edit-hidden-placeholder')) return false;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity || '1') === 0) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (!candidates.length) return null;
    const containing = candidates.filter(el => _pointWithinRect(el.getBoundingClientRect(), clientX, clientY));
    if (containing.length) {
      containing.sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return (ar.width * ar.height) - (br.width * br.height);
      });
      return containing[0];
    }
    const distanceToRect = rect => {
      const dx = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
      const dy = clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0;
      return dx * dx + dy * dy;
    };
    candidates.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const dist = distanceToRect(ar) - distanceToRect(br);
      if (dist !== 0) return dist;
      return (ar.width * ar.height) - (br.width * br.height);
    });
    return candidates[0];
  }

  function findNearestChartTextLeaf(area, clientX, clientY) {
    if (!area) return null;
    const candidates = Array.from(area.querySelectorAll('.chart-title, .chart-label, .chart-val, .lc-end-val')).filter(el => {
      if (!el || el.classList.contains('edit-hidden-placeholder')) return false;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity || '1') === 0) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (!candidates.length) return null;
    const distanceToRect = rect => {
      const dx = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
      const dy = clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0;
      return dx * dx + dy * dy;
    };
    candidates.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const dist = distanceToRect(ar) - distanceToRect(br);
      if (dist !== 0) return dist;
      return (ar.width * ar.height) - (br.width * br.height);
    });
    return candidates[0];
  }

  let lastEditableTextProbe = null;

  function rememberEditableTextProbe(target, clientX, clientY) {
    const resolved = resolveEditableTextTarget(target);
    if (!resolved) return;
    lastEditableTextProbe = {
      el: resolved,
      x: clientX,
      y: clientY,
      ts: Date.now(),
    };
  }

  function consumeEditableTextProbe(area) {
    if (!lastEditableTextProbe) return null;
    const probe = lastEditableTextProbe;
    if ((Date.now() - probe.ts) > 800) return null;
    if (!probe.el || !document.contains(probe.el)) return null;
    if (area && !area.contains(probe.el)) return null;
    return probe.el;
  }

  function findLayoutChildAtPoint(container, clientX, clientY) {
    if (!container || !container.matches('.items-row, .items-col, .items-grid, .compare-box, .compare-col')) return null;
    return findSmallestPointMatch(
      container,
      ':scope > .slide-el, :scope > .text-area, :scope > .bubble, :scope > .bar-chart, :scope > .line-chart, :scope > .hbar-chart, :scope > .step-timeline, :scope > .multi-stat',
      clientX,
      clientY
    );
  }

  function findLeafTargetAtPoint(root, clientX, clientY) {
    if (!root) return null;
    const leaf = findSmallestPointMatch(
      root,
      CHILD_SEL + ', .section-badge, .corner-label, .hl',
      clientX,
      clientY
    );
    if (!leaf) return null;
    if (leaf.matches(NON_TEXT_CHILD_SEL) || leaf.matches(NON_DETACHABLE_CHILD_SEL)) return null;
    return leaf;
  }

  function findStructuralTargetAtPoint(root, clientX, clientY) {
    if (!root) return null;
    return findSmallestPointMatch(
      root,
      '.slide-el, .text-area, .bubble, .bar-chart, .line-chart, .hbar-chart, .step-timeline, .multi-stat, .branch-cols, .branch-col',
      clientX,
      clientY
    ) || findSmallestPointMatch(
      root,
      '.items-row, .items-col, .items-grid, .compare-box, .compare-col',
      clientX,
      clientY
    );
  }

  function isChartSvgTextLeaf(target) {
    return !!(
      target &&
      target.matches &&
      target.matches('.chart-title, .chart-label, .chart-val, .lc-end-val')
    );
  }

  function isLayoutManagedTextLeaf(target) {
    if (!target || !target.matches) return false;
    if (!target.matches('.hl, .section-badge, .corner-label')) return false;
    if (target.closest('.text-area, .bubble')) return false;
    const slideEl = target.closest('.slide-el');
    if (!slideEl) return false;
    const parent = slideEl.parentElement;
    return !!(
      parent &&
      parent.matches('.items-row, .items-col, .items-grid')
    );
  }

  function shouldDeferPointLeafToStructuralParent(leafTarget) {
    if (!leafTarget) return false;
    if (isChartSvgTextLeaf(leafTarget)) return false;
    if (isLayoutManagedTextLeaf(leafTarget)) return true;
    const structural = leafTarget.closest('.bar-chart, .line-chart, .hbar-chart, .multi-stat, .stat-circle, .big-stat, .stat-block, .compare-col, .split-list');
    if (!structural) return false;
    if (selectedEl === structural) return false;
    if (groupEntered && groupParent === structural) return false;
    return true;
  }

  document.getElementById('stage').addEventListener('dragstart', e => {
    if (editMode) e.preventDefault();
  });

  function resolveGroupChildTarget(parent, target, clientX = null, clientY = null) {
    if (!parent) return null;
    const pointTarget = (
      typeof clientX === 'number' &&
      typeof clientY === 'number'
    ) ? document.elementFromPoint(clientX, clientY) : null;
    const pointChild = (
      typeof clientX === 'number' &&
      typeof clientY === 'number' &&
      _pointWithinRect(parent.getBoundingClientRect(), clientX, clientY)
    ) ? findSmallestPointMatch(
      parent,
      CHILD_SEL + ', .section-badge, .corner-label, .bar-chart, .line-chart, .hbar-chart, .step-timeline, .multi-stat',
      clientX,
      clientY
    ) : null;
    const pointLeafCandidate = (
      typeof clientX === 'number' &&
      typeof clientY === 'number' &&
      _pointWithinRect(parent.getBoundingClientRect(), clientX, clientY)
    ) ? findSmallestPointMatch(
      parent,
      'div, span, p, strong, em, b, i, text, tspan',
      clientX,
      clientY
    ) : null;
    if (pointChild && !pointChild.matches(NON_TEXT_CHILD_SEL)) {
      return pointChild;
    }
    const pointTextLeaf = resolveEditableTextTarget(pointLeafCandidate || pointTarget);
    if (pointTextLeaf && pointTextLeaf !== parent && parent.contains(pointTextLeaf)) {
      return pointTextLeaf;
    }
    if (!target || !parent.contains(target)) return null;
    const textLeaf = resolveEditableTextTarget(target);
    if (textLeaf && textLeaf !== parent && parent.contains(textLeaf)) {
      return textLeaf;
    }
    let child = target.closest(CHILD_SEL)
      || target.closest('.bar-chart, .line-chart, .hbar-chart, .step-timeline, .multi-stat')
      || resolvePreferredSelectionTarget(target);
    if (!child || (child === parent && !parent.matches(CHILD_SEL))) {
      const candidates = Array.from(parent.querySelectorAll(CHILD_SEL + ', .section-badge, .corner-label'))
        .filter(c => !c.matches(NON_TEXT_CHILD_SEL));
      child = candidates[0] || child;
    }
    return (child && parent.contains(child)) ? child : null;
  }

  function armDirectChildExtract(child, clientX, clientY) {
    if (!child) return false;
    document.querySelectorAll('.child-selected, .child-action-target').forEach(el => {
      if (el !== child) el.classList.remove('child-selected', 'child-action-target');
    });
    selectedEls.forEach(s => s.classList.remove('edit-selected', 'edit-group-selected'));
    child.classList.add('child-selected');
    child.classList.add('child-action-target');
    selectedEl = child;
    selectedEls = [child];
    selectedEl._pendingChildExtract = child;
    pendingGroupEntry = null;
    pendingDrag = true;
    mouseDownPos = { x: clientX, y: clientY };
    dragAnchor = clientToStage(clientX, clientY);
    elAnchor = { top: child.offsetTop, left: child.offsetLeft };
    elAnchors = [{ el: child, top: child.offsetTop, left: child.offsetLeft }];
    updateCoordPanel(child);
    updateFontPanel(child);
    return true;
  }

  // 더블클릭으로 직접 편집 가능한 텍스트 요소 셀렉터 (세션 37 rv: 한 줄 47개+ → 그룹별 상수)
  // 신규 타입 추가 시 해당 그룹에 클래스 추가 (CLAUDE.md 체크리스트 8번)
  const EDITABLE_TEXT_SEL = [
    '.hl', '.bubble', '.bg-label',                                    // 공용 강조/말풍선/배경
    '.card-title', '.card-desc', '.card-num',                         // 카드
    '.num-text', '.num-badge',                                        // 번호항목
    '.bar-label', '.bar-value', '.hbar-label', '.hbar-val',           // 바차트
    '.chart-title', '.chart-label', '.chart-val', '.lc-end-val',      // 차트 SVG 텍스트
    '.icon-label', '.icon-row-role', '.icon-row-desc', '.icon-flow-label', '.icon-flow-icon', '.icon-flow-arrow', // 아이콘+텍스트/플로우
    '.flow-box', '.flow-arrow',                                       // 플로우
    '.check-text', '.check-item',                                     // 체크리스트
    '.stat-num', '.stat-label', '.stat-detail-item', '.big-stat', '.stat-block', // 숫자스탯
    '.quote-text', '.quote-source', '.quote-mark',                    // 인용
    '.grid-title', '.grid-desc', '.grid-icon-box',                    // 그리드카드
    '.section-badge', '.corner-label',                                // 섹션배지
    '.btn-pill',                                                      // 버튼그리드
    '.tag-chip', '.img-caption',                                      // 태그칩/이미지캡션
    '.alert-text', '.alert-icon',                                     // 경고배너
    '.compare-header', '.compare-item', '.compare-emoji-icon', '.comp-table', // 비교박스
    '.tl-box', '.tl-desc',                                            // 타임라인
    '.cta-btn', '.subscribe',                                         // CTA버튼
    '.cork-label', '.hand-title-mark', '.hand-typing',                // 마지막정리(코르크/손글씨)
    '.contrast-word', '.contrast-sub', '.contrast-quote', '.contrast-vs', '.contrast-source', // 인용(대비)
    '.contrast-top', '.contrast-bottom',                              // T45 두줄대비 / 기존 contrast-bottom 요약
    '.line1-emph',                                                    // T44 한줄강조
    '.counter-label', '.counter-sub',                                 // T46 카운터제목
    '.emph-line1', '.emph-line2', '.icon-circle',                     // T47 아이콘강조
    '.chapter-pill', '.chapter-flow-title', '.chapter-flow-desc', '.chapter-flow-icon', // T27
    '.bullet-text', '.bullet-summary', '.bullet-icon',                // T25
    '.comp-label', '.comp-val', '.comp-summary', '.split-compare-label', '.split-compare-desc', '.split-compare-value', // T28 / split compare
    '.branch-question', '.branch-sub', '.branch-result', '.branch-summary', '.branch-node', '.branch-arrow', // T30
    '.eq-title', '.eq-desc', '.eq-op', '.eq-hl', '.eq-icon', '.eq-chain-box', '.eq-chain-sub', '.eq-chain-arrow', '.eq-result', // T32
    '.flow-detail-title', '.flow-detail-sub', '.flow-detail-list', '.flow-detail-icon', '.flow-highlight', '.flow-step-title', '.flow-step-body', // T34 / 2단플로우
    '.split-list-item', '.split-list-num', '.split-list-title', '.split-list-text', '.split-stat-card', '.split-stat-main', '.split-stat-row', '.split-stat-icon', '.split-stat-label', '.split-stat-value', '.split-stat-desc', '.split-summary', // T31
    '.icon-flow-stat-emoji', '.icon-flow-stat-text', '.icon-flow-stat-num', '.icon-flow-stat-unit', '.icon-flow-highlight', // T33
    '.person-role', '.person-desc', '.blog-counter', '.blog-meta', '.term-en', '.term-desc', // T39~T43
    '.step-title', '.reveal-line1', '.reveal-line2', '.two-step-title', '.two-step-desc', '.point-title', '.point-desc', '.vertical-line1', '.vertical-line2', '.left-rail-title', '.left-rail-desc', '.quote-tail', // T49~T59
    '.reveal-band-text', '.left-rail-desc-text', '.quote-tail-text', '.step-card-body', '.postit-num', '.branch-root-text', '.branch-result-text', // T56~T59
    '.chapter-flow-arrow', '.slide-caption', '.img-placeholder', // fallback 의존 축소
  ].join(', ');

  function resolveEditableTextTarget(target) {
    const direct = target.closest(EDITABLE_TEXT_SEL);
    if (direct) return direct;
    let node = target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement;
    while (node && !node.matches?.('.slide, .step-layer')) {
      if (
        node.matches &&
        node.matches('div, span, p, strong, em, b, i, text, tspan') &&
        node.textContent &&
        node.textContent.trim()
      ) {
        const children = Array.from(node.children || []);
        const hasDirectText = Array.from(node.childNodes || []).some(ch =>
          ch.nodeType === Node.TEXT_NODE &&
          ch.textContent &&
          ch.textContent.trim()
        );
        const inEditableScope = !!node.closest('.slide-el, .text-area, .bubble') ||
          !!(node.parentElement && node.parentElement.matches('.step-layer'));
        if (
          inEditableScope &&
          (
            children.length === 0 ||
            children.every(ch => ['BR', 'SPAN', 'STRONG', 'EM', 'B', 'I', 'TSPAN'].includes(ch.tagName)) ||
            hasDirectText
          )
        ) {
          return node;
        }
      }
      node = node.parentElement;
    }
    return null;
  }

  function resolvePreferredSelectionTarget(target) {
    if (
      selectedEl &&
      selectedEl.classList &&
      selectedEl.classList.contains('child-selected') &&
      target &&
      (target === selectedEl || (target.closest && target.closest('.child-selected') === selectedEl) || selectedEl.contains(target))
    ) {
      return selectedEl;
    }
    const leaf = resolveEditableTextTarget(target);
    if (
      leaf &&
      leaf.matches &&
      leaf.matches('div, span, p, strong, em, b, i') &&
      !String(leaf.className || '').trim()
    ) {
      const boxedParent = leaf.closest('.slide-el, .text-area, .bubble');
      if (boxedParent && boxedParent !== leaf) {
        return boxedParent;
      }
    }
    if (isChartSvgTextLeaf(leaf)) {
      return leaf;
    }
    if (isLayoutManagedTextLeaf(leaf)) {
      return leaf.closest('.slide-el') || leaf;
    }
    if (leaf && leaf.matches('.hl, .section-badge, .corner-label')) {
      return leaf.closest('.text-area, .bubble, .slide-el') || leaf;
    }

    const structural = target.closest('.bar-chart, .line-chart, .hbar-chart, .multi-stat, .step-timeline, .branch-cols, .branch-col, .slide-el');
    if (!structural) return leaf;

    const isSelectedStructuralParent = !!(
      leaf &&
      leaf !== structural &&
      structural.contains(leaf) &&
      (
        selectedEl === structural ||
        (groupEntered && groupParent === structural)
      )
    );
    if (isSelectedStructuralParent) {
      return leaf;
    }

    if (structural.matches('.bar-chart, .line-chart, .hbar-chart, .multi-stat, .step-timeline')) {
      if (isChartSvgTextLeaf(leaf)) return leaf;
      return structural;
    }

    // Center-filled stat/compare blocks leave almost no empty hit area.
    // Prefer the parent on single-click so drag/move works, while dblclick still edits the leaf text.
    if (structural.matches('.stat-circle, .big-stat, .stat-block, .compare-col')) {
      return structural;
    }

    const parent = structural.parentElement;
    if (parent && parent.matches('.items-row, .items-col, .items-grid, .compare-col, .compare-box, .compare-emoji')) {
      return structural;
    }

    return leaf || structural;
  }

  document.getElementById('stage').addEventListener('dblclick', e => {
    if (!editMode) return;
    // 그룹 진입 상태에서 자식 더블클릭 → 텍스트 편집
    if (groupEntered && groupParent) {
      const child = e.target.closest(CHILD_SEL) ||
        resolvePreferredSelectionTarget(e.target) ||
        e.target.closest('.bar-chart, .line-chart, .hbar-chart, .step-timeline, .multi-stat');
      if (child && groupParent.contains(child)) {
        enterContentEditable(child, e);
        return;
      }
    }
    if (!editMode) return;
    const activeSlide = (typeof slides !== 'undefined' && slides[currentSlide]) || document.querySelector('#stage > .slide.active');
    const pointLeaf = findLeafTargetAtPoint(activeSlide, e.clientX, e.clientY);
    const area = e.target.closest('.text-area, .step-title, .slide-el');
    const isChartArea = !!(area && area.matches('.line-chart'));
    const probedLeaf = (area && !isChartArea) ? consumeEditableTextProbe(area) : null;
    const nearestAreaLeaf = area ? findNearestTextAreaLeaf(area, e.clientX, e.clientY) : null;
    const nearestChartLeaf = isChartArea ? findNearestChartTextLeaf(area, e.clientX, e.clientY) : null;
    const preferredLeaf = isChartArea
      ? ((isChartSvgTextLeaf(e.target) ? e.target : null) || pointLeaf || nearestChartLeaf || probedLeaf)
      : (probedLeaf || nearestAreaLeaf || pointLeaf);
    let el = resolveEditableTextTarget(preferredLeaf || e.target);
    if (!el) {
      if (area) {
        el = probedLeaf || nearestAreaLeaf || area.querySelector('.hl');
      }
    }
    // 모듈(M01~) 내부 leaf 요소 자동 편집 — 새 모듈 추가 시 화이트리스트 수정 불필요
    if (!el && e.target.closest('[data-module-id]')
        && e.target.children.length === 0
        && !['IMG','BR','HR'].includes(e.target.tagName)) {
      el = e.target;
    }
    if (!el) return;

    if (typeof enterContentEditable === 'function') {
      enterContentEditable(el, e);
      return;
    }

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
      const pointInsideGroup = _pointWithinRect(groupParent.getBoundingClientRect(), e.clientX, e.clientY);
      if ((groupParent.contains(e.target) && e.target !== groupParent) || pointInsideGroup) {
        e.preventDefault(); e.stopPropagation();
        const prevChild = groupParent.querySelector('.child-selected');
        groupParent.querySelectorAll('.child-selected').forEach(c => c.classList.remove('child-selected'));
        const child = resolveGroupChildTarget(groupParent, e.target, e.clientX, e.clientY) || e.target;
        const preferParentAction = typeof shouldPreferParentGroupAction === 'function' && shouldPreferParentGroupAction(groupParent);
        const explicitChildAction = !!(prevChild && child === prevChild);
        const autoChildAction = typeof shouldAutoEnableChildAction === 'function' && shouldAutoEnableChildAction(groupParent, child);
        const useChildAction = !preferParentAction || explicitChildAction || autoChildAction;
        const canExtractChild = !!(
          child &&
          !child.closest('svg') &&
          child.namespaceURI !== 'http://www.w3.org/2000/svg'
        );
        child.classList.add('child-selected');
        if (typeof markGroupActionChild === 'function') markGroupActionChild(useChildAction ? child : null);
        updateFontPanel(child);
        // 자식 드래그 분리용 상태 저장
        pendingDrag = true;
        mouseDownPos = { x: e.clientX, y: e.clientY };
        dragAnchor = clientToStage(e.clientX, e.clientY);
        // 드래그 시작 시 자식을 부모에서 추출 (pushUndo → clone → 독립 배치)
        pendingGroupEntry = null;
        selectedEl = useChildAction ? child : groupParent;
        selectedEls = [selectedEl];
        // _pendingChildExtract: 드래그 임계값 넘으면 자식 추출
        // 세션 36 후속3: 모듈은 자식 추출 금지 — 내부 .sc-item 등이 빠져나가면 모양 깨지고 고립됨.
        //   그룹 진입/자식 선택/텍스트 편집은 그대로 허용. 드래그 시 부모 모듈 전체가 이동.
        if (useChildAction && !groupParent.hasAttribute('data-module-id') && canExtractChild) {
          selectedEl._pendingChildExtract = child;
        }
        elAnchor = { top: groupParent.offsetTop, left: groupParent.offsetLeft };
        elAnchors = [{ el: groupParent, top: groupParent.offsetTop, left: groupParent.offsetLeft }];
        updateCoordPanel(useChildAction ? child : groupParent);
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
        const selectedTextProxy = (
          selectedEl &&
          typeof getSingleVisibleTextProxy === 'function'
        ) ? getSingleVisibleTextProxy(selectedEl) : null;
        if (selectedTextProxy) {
          resizeImgInitRect = null;
          resizeImgInit = null;
          resizeInitFontSizes = [{
            el: selectedTextProxy,
            fs: parseFloat(selectedTextProxy.style.fontSize) || parseFloat(getComputedStyle(selectedTextProxy).fontSize) || 108
          }];
          if (resizeEdge) return;
          return;
        }
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

    const activeSlide = (typeof slides !== 'undefined' && slides[currentSlide]) || document.querySelector('#stage > .slide.active');
    const rawPointLeafTarget = findLeafTargetAtPoint(activeSlide, e.clientX, e.clientY);
    const pointStructuralTarget = findStructuralTargetAtPoint(activeSlide, e.clientX, e.clientY);
    const directTextArea = e.target.closest('.text-area, .step-title, .slide-el');
    const directAreaLeaf = directTextArea
      ? findNearestTextAreaLeaf(directTextArea, e.clientX, e.clientY)
      : null;
    const shouldPreserveExistingTextProbe = !!(
      directTextArea &&
      lastEditableTextProbe &&
      (Date.now() - lastEditableTextProbe.ts) < 400 &&
      directTextArea.contains(lastEditableTextProbe.el) &&
      !rawPointLeafTarget &&
      directTextArea.querySelectorAll('.hl, .section-badge, .corner-label').length > 1 &&
      !e.target.closest('.hl, .section-badge, .corner-label')
    );
    if (!shouldPreserveExistingTextProbe) {
      rememberEditableTextProbe(directAreaLeaf || rawPointLeafTarget || e.target, e.clientX, e.clientY);
    }
    const layoutContainer = (pointStructuralTarget && pointStructuralTarget.matches('.items-row, .items-col, .items-grid, .compare-box, .compare-col'))
      ? pointStructuralTarget
      : e.target.closest('.items-row, .items-col, .items-grid, .compare-box, .compare-col');
    const layoutChildTarget = layoutContainer
      ? findLayoutChildAtPoint(layoutContainer, e.clientX, e.clientY)
      : null;
    const activeChildSelected = (
      !groupEntered &&
      selectedEl &&
      selectedEl.classList &&
      selectedEl.classList.contains('child-selected') &&
      (selectedEl === e.target || selectedEl.contains(e.target))
    ) ? selectedEl : null;
    const pointLeafTarget = shouldDeferPointLeafToStructuralParent(rawPointLeafTarget) ? null : rawPointLeafTarget;
    const preferredTarget = activeChildSelected || pointLeafTarget || layoutChildTarget || pointStructuralTarget || resolvePreferredSelectionTarget(e.target);
    let el = preferredTarget || e.target.closest(EDITABLE_SEL);
    // img inside .slide-el → select parent .slide-el (prevents dual selection + fixes resize coords)
    if (el && el.tagName === 'IMG' && el.closest('.slide-el')) el = el.closest('.slide-el');

    if (!el) {
      // 기존 다중 selection의 bounding box 안에 mousedown이면 selection 유지하고 multi-drag 시작
      // (예: .step-timeline.no-edit-select 같은 통과 컨테이너 위 빈 영역에서 자식 selection 옮기기)
      if (!e.shiftKey && selectedEls.length > 1) {
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
      selectBoxAdditive = !!e.shiftKey;
      selectBoxSeedEls = selectBoxAdditive ? [...selectedEls] : [];
      pendingShiftSelect = null;
      if (!selectBoxAdditive) clearSelection();
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

    if (e.shiftKey) {
      const gid = el.dataset.group;
      pendingShiftSelect = {
        el,
        groupEls: gid ? Array.from(slides[currentSlide].querySelectorAll(`[data-group="${CSS.escape(gid)}"]`)) : null,
        x: e.clientX,
        y: e.clientY,
        seed: [...selectedEls],
      };
      return;
    }

    const activeSelectedCard = (
      !groupEntered &&
      selectedEls.length === 1 &&
      selectedEl &&
      selectedEl.matches('.slide-el, .text-area, .bubble')
    ) ? selectedEl : null;
    const directChildTarget = activeSelectedCard
      ? resolveGroupChildTarget(activeSelectedCard, document.elementFromPoint(e.clientX, e.clientY) || e.target, e.clientX, e.clientY)
      : null;
    const directChildExtractable = !!(
      directChildTarget &&
      activeSelectedCard &&
      activeSelectedCard.contains(directChildTarget) &&
      directChildTarget !== activeSelectedCard &&
      typeof shouldAutoEnableChildAction === 'function' &&
      shouldAutoEnableChildAction(activeSelectedCard, directChildTarget) &&
      !activeSelectedCard.hasAttribute('data-module-id') &&
      !directChildTarget.closest('svg') &&
      directChildTarget.namespaceURI !== 'http://www.w3.org/2000/svg'
    );
    if (directChildExtractable) {
      armDirectChildExtract(directChildTarget, e.clientX, e.clientY);
      return;
    }

    // 단일 선택 (이미 선택된 요소가 아니면 선택 초기화)
    if (!selectedEls.includes(el)) {
      // 새 요소 클릭
      selectedEls.forEach(s => {
        s.classList.remove('edit-selected');
        s.classList.remove('edit-group-selected');
      });
      document.querySelectorAll('.child-selected, .child-action-target').forEach(node => {
        node.classList.remove('child-selected', 'child-action-target');
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
          pendingGroupEntry = { el, target: e.target, x: e.clientX, y: e.clientY };
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
      } else if ((el.matches('.slide-el, .text-area, .bubble') || el.matches('.items-row, .items-col, .items-grid')) && selectedEls.length === 1) {
        // 카드 블록/flex 컨테이너 재클릭 → mouseup에서 드래그 여부 확인 후 그룹 진입
        // (모듈 포함 — 세션 36 후속3: 자식 추출만 별도 차단, 그룹 진입/편집은 허용)
        const reclickChildTarget = resolveGroupChildTarget(
          el,
          document.elementFromPoint(e.clientX, e.clientY) || e.target,
          e.clientX,
          e.clientY
        );
        const reclickChildExtractable = !!(
          reclickChildTarget &&
          el.contains(reclickChildTarget) &&
          reclickChildTarget !== el &&
          typeof shouldAutoEnableChildAction === 'function' &&
          shouldAutoEnableChildAction(el, reclickChildTarget) &&
          !el.hasAttribute('data-module-id') &&
          !reclickChildTarget.closest('svg') &&
          reclickChildTarget.namespaceURI !== 'http://www.w3.org/2000/svg'
        );
        if (reclickChildExtractable && armDirectChildExtract(reclickChildTarget, e.clientX, e.clientY)) {
          return;
        }
        pendingGroupEntry = { el, target: e.target, x: e.clientX, y: e.clientY };
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
    if (shouldNormalizeSelectionElement(el)) {
      const normalizedBox = getStageBoxFromRect(el);
      if (normalizedBox) {
        el.style.left = normalizedBox.left + 'px';
        el.style.top = normalizedBox.top + 'px';
        if (!el.style.width) el.style.width = normalizedBox.width + 'px';
      } else {
        el.style.left = el.offsetLeft + 'px';
        el.style.top = el.offsetTop + 'px';
        if (!el.style.width) el.style.width = el.offsetWidth + 'px';
      }
      el.style.right = '';
      el.style.bottom = '';
    }

    const isInlineEditableLeaf = !!(
      el &&
      !isChartSvgTextLeaf(el) &&
      !shouldNormalizeSelectionElement(el) &&
      typeof resolveEditableTextTarget === 'function' &&
      resolveEditableTextTarget(el) === el
    );
    if (isInlineEditableLeaf && e.detail >= 2) {
      pendingDrag = false;
      mouseDownPos = null;
      dragAnchor = null;
      updateCoordPanel(el);
      updateGroupToolbar();
      if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
      return;
    }

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

    if (pendingShiftSelect && !selectBoxActive) {
      const dx = e.clientX - pendingShiftSelect.x;
      const dy = e.clientY - pendingShiftSelect.y;
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        selectBoxAdditive = true;
        selectBoxSeedEls = [...pendingShiftSelect.seed];
        selectBoxActive = true;
        selectBoxOrigin = clientToStage(pendingShiftSelect.x, pendingShiftSelect.y);
        const sb = document.getElementById('select-box');
        sb.style.left = selectBoxOrigin.x + 'px';
        sb.style.top = selectBoxOrigin.y + 'px';
        sb.style.width = '0';
        sb.style.height = '0';
        sb.style.display = 'block';
        pendingShiftSelect = null;
      }
    }

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
        if (!groupEntered && pendingGroupEntry) {
          const { el, target, x, y } = pendingGroupEntry;
          const pointTarget = document.elementFromPoint(x, y) || target;
          const child = resolveGroupChildTarget(el, pointTarget, x, y);
          const preferParentAction = typeof shouldPreferParentGroupAction === 'function' && shouldPreferParentGroupAction(el);
          const explicitChildAction = !!(child && target && target !== el);
          const autoChildAction = typeof shouldAutoEnableChildAction === 'function' && shouldAutoEnableChildAction(el, child);
          const useChildAction = !preferParentAction || explicitChildAction || autoChildAction;
          const canExtractChild = !!(
            child &&
            !child.closest('svg') &&
            child.namespaceURI !== 'http://www.w3.org/2000/svg'
          );
          if (useChildAction && child && el.contains(child) && !el.hasAttribute('data-module-id') && canExtractChild) {
            selectedEls.forEach(s => s.classList.remove('edit-selected', 'edit-group-selected'));
            child.classList.add('child-selected');
            selectedEl = child;
            selectedEls = [child];
            selectedEl._pendingChildExtract = child;
          }
        }
        pushUndo();
        if (!(selectedEl && selectedEl._pendingChildExtract) && groupEntered && groupParent && typeof getGroupActionTarget === 'function') {
          const actionTarget = getGroupActionTarget();
          if (actionTarget && actionTarget !== groupParent) {
            selectedEl = actionTarget;
            selectedEls = [actionTarget];
            const canExtractChild = !actionTarget.closest('svg') && actionTarget.namespaceURI !== 'http://www.w3.org/2000/svg';
            if (!actionTarget._pendingChildExtract && canExtractChild) {
              actionTarget._pendingChildExtract = actionTarget;
            }
          }
        }
        // groupEntered 자식 드래그: 자식을 부모에서 추출하여 독립 요소로 전환
        if (selectedEl && selectedEl._pendingChildExtract) {
          const child = selectedEl._pendingChildExtract;
          delete selectedEl._pendingChildExtract;
          const layer = selectedEl.closest('.step-layer');
          const slide = slides[currentSlide];
          const stageRect = document.getElementById('stage').getBoundingClientRect();
          const scale = stageRect.width / 1920;
          const cr = child.getBoundingClientRect();
          const newEl = child.cloneNode(true);
          newEl.classList.remove('child-selected', 'child-action-target', 'edit-hidden-placeholder', 'layout-detached-placeholder');
          newEl.classList.add('detached-child-el');
          newEl.style.position = 'absolute';
          newEl.style.left = Math.round((cr.left - stageRect.left) / scale) + 'px';
          newEl.style.top = Math.round((cr.top - stageRect.top) / scale) + 'px';
          newEl.style.opacity = '1';
          newEl.style.visibility = 'visible';
          newEl.style.pointerEvents = 'all';
          layer.appendChild(newEl);
          child.classList.remove('child-selected', 'child-action-target');
          if (typeof removeEditableElement === 'function') {
            removeEditableElement(child, slide);
          } else {
            child.remove();
          }
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
          // flex/grid 레이아웃 자식은 left/top 이동이 안 먹으므로 드래그 시작 시 absolute로 분리
          if (typeof detachLayoutManagedElement === 'function') {
            const dragTargets = individualMode ? [selectedEl] : [...selectedEls];
            dragTargets.forEach(el => detachLayoutManagedElement(el));
            if (selectedEl) {
              elAnchor = { top: selectedEl.offsetTop, left: selectedEl.offsetLeft };
              elAnchors = (individualMode ? [selectedEl] : selectedEls).map(s => ({
                el: s,
                top: s.offsetTop,
                left: s.offsetLeft,
              }));
              svgDragAnchors = collectSvgDragAnchors(individualMode ? [selectedEl] : selectedEls);
              updateCoordPanel(selectedEl);
            }
          }
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
      const layer = selectedEl.closest('.step-layer');
      if (!layer) return;
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
        const nextSelected = selectBoxAdditive
          ? Array.from(new Set([...selectBoxSeedEls, ...hits]))
          : hits;
        clearSelection();
        selectedEls = nextSelected;
        nextSelected.forEach(h => h.classList.add('edit-selected'));
        selectedEl = nextSelected[nextSelected.length - 1] || null;
        if (selectedEl) {
          updateCoordPanel(selectedEl);
          elAnchors = selectedEls.map(s => ({ el: s, top: s.offsetTop, left: s.offsetLeft }));
        }
        updateGroupToolbar();
        if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
      }
      selectBoxAdditive = false;
      selectBoxSeedEls = [];
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
    if (pendingShiftSelect) {
      const { el, groupEls } = pendingShiftSelect;
      pendingShiftSelect = null;
      const toggleTargets = (Array.isArray(groupEls) && groupEls.length) ? groupEls : [el];
      const fullySelected = toggleTargets.every(node => selectedEls.includes(node));
      if (fullySelected) {
        toggleTargets.forEach(node => {
          node.classList.remove('edit-selected', 'edit-group-selected');
          const idx = selectedEls.indexOf(node);
          if (idx >= 0) selectedEls.splice(idx, 1);
        });
      } else {
        toggleTargets.forEach(node => {
          node.classList.remove('edit-group-selected');
          node.classList.add('edit-selected');
          if (!selectedEls.includes(node)) selectedEls.push(node);
        });
      }
      selectedEl = selectedEls[selectedEls.length - 1] || null;
      if (selectedEl) updateCoordPanel(selectedEl);
      else {
        document.getElementById('coord-panel').style.display = 'none';
        document.querySelectorAll('.resize-handle').forEach(h => h.classList.remove('visible'));
      }
      updateGroupToolbar();
      if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
    }
    if (selectedEl) delete selectedEl._pendingChildExtract;
    svgDragAnchors = [];
    document.getElementById('snap-x').style.display = 'none';
    document.getElementById('snap-y').style.display = 'none';
    ['gap-left','gap-right','gap-top','gap-bottom'].forEach(id => { document.getElementById(id).style.display = 'none'; });

    // 드래그 안 했으면 그룹 진입 (캔바 스타일)
    if (pendingGroupEntry && !wasDragging) {
      const { el, target, x, y } = pendingGroupEntry;
      pendingGroupEntry = null;
      exitGroup();
      groupEntered = true;
      groupParent = el;
      el.classList.remove('edit-selected');
      el.classList.add('group-entered-parent');
      const pointTarget = document.elementFromPoint(e.clientX, e.clientY) || document.elementFromPoint(x, y) || target;
      const child = resolveGroupChildTarget(el, pointTarget, e.clientX, e.clientY);
      const preferParentAction = typeof shouldPreferParentGroupAction === 'function' && shouldPreferParentGroupAction(el);
      const explicitChildAction = !!(child && target && target !== el);
      const autoChildAction = typeof shouldAutoEnableChildAction === 'function' && shouldAutoEnableChildAction(el, child);
      const useChildAction = !preferParentAction || explicitChildAction || autoChildAction;
      if (child && el.contains(child)) {
        child.classList.add('child-selected');
        if (typeof markGroupActionChild === 'function') markGroupActionChild(useChildAction ? child : null);
        selectedEl = useChildAction ? child : el;
        selectedEls = [selectedEl];
        updateCoordPanel(useChildAction ? child : el);
        updateFontPanel(child);
      } else {
        if (typeof markGroupActionChild === 'function') markGroupActionChild(null);
        selectedEl = el;
        selectedEls = [el];
        updateCoordPanel(el);
      }
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
    selectBoxAdditive = false;
    selectBoxSeedEls = [];
    pendingShiftSelect = null;
    isResizing = false;
    hideResizeDimLabel();
    showSnapLines(null, null);
    if (layerDragItem) { layerDragItem.style.opacity = ''; layerDragItem = null; }
  });
  // ── 레이어 패널 ──
  function getElLabel(el) {
    if (el.matches('.step-dim')) return '오버레이';
    if (el.matches('.items-row')) return '가로 컨테이너';
    if (el.matches('.items-col')) return '세로 컨테이너';
    if (el.matches('.items-grid')) return '그리드 컨테이너';
    if (el.matches('.text-area')) { const h = el.querySelector('.hl'); return h ? h.textContent.trim().slice(0, 18) : '텍스트'; }
    if (el.matches('.bubble')) return el.textContent.trim().slice(0, 18);
    if (el.matches('.bg-label')) return el.textContent.trim().slice(0, 18);
    if (el.tagName === 'IMG') return '이미지';
    if (el.matches('.corner-label')) return el.textContent.trim().slice(0, 18);
    if (el.matches('.section-badge')) return el.textContent.trim().slice(0, 18);
    if (el.matches('.emoji-icon')) return el.textContent.trim().slice(0, 6) || '이모지';
    if (el.dataset.type) {
      const inner = el.querySelector('.card-title, .num-text, .icon-label, .bar-label, .chart-title, .chart-val, .flow-text, .flow-box, .hbar-label, .check-text, .grid-title, .quote-text, .stat-num, .compare-header, .comp-label, .chapter-flow-title, .bullet-text, .split-list-title, .flow-detail-title') || el;
      return inner.textContent.trim().slice(0, 15) || el.dataset.type;
    }
    return '요소';
  }

  function getElType(el) {
    if (el.matches('.step-dim')) return 'DIM';
    if (el.matches('.items-row')) return 'FLEX-ROW';
    if (el.matches('.items-col')) return 'FLEX-COL';
    if (el.matches('.items-grid')) return 'GRID';
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

  let animSortView = false; // 메인 뷰 vs 등장 순서 뷰

  function buildAnimationTab(list, header) {
    const slide = slides[currentSlide];

    if (animSortView) {
      // ── 등장 순서 서브뷰 (캔바 "클릭하여 정렬") ──
      const backRow = document.createElement('div');
      backRow.className = 'anim-sort-back';
      backRow.innerHTML = '← &nbsp;클릭하여 정렬';
      backRow.addEventListener('click', () => { animSortView = false; buildLayerPanel(); });
      header.appendChild(backRow);

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
            if (!seenGroups.has(key)) { seenGroups.add(key); rows.push({ step, el, gid, members: [...layer.querySelectorAll(`[data-group="${CSS.escape(gid)}"]`)] }); }
          } else { rows.push({ step, el }); }
        });
      });
      const sortedForClick = [...rows].sort((a, b) => a.step - b.step);
      let clickNum = 0;
      const groupClickMap = new Map();
      sortedForClick.forEach(row => {
        if (row.gid) { const key = row.gid + '-' + row.step; if (!groupClickMap.has(key)) groupClickMap.set(key, ++clickNum); row.clickNum = groupClickMap.get(key); }
        else { row.clickNum = ++clickNum; }
      });
      rows.sort((a, b) => b.clickNum - a.clickNum);

      if (rows.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'anim-order-empty';
        empty.textContent = '등장 요소 없음';
        list.appendChild(empty);
      } else {
        rows.forEach(row => {
          const item = document.createElement('div');
          item.className = 'layer-item' + (row.el && selectedEls.includes(row.el) ? ' lyr-selected' : '');
          item._el = row.el; item._step = row.step; item._isAnimRow = true;
          item._gid = row.gid || null; item._members = row.members || null;
          const label = row.gid ? `[${escHTML(row.gid.toUpperCase())}] 그룹` : escHTML(getElLabel(row.el));
          const typeBadge = row.gid ? '' : `<span class="layer-badge">${escHTML(getElType(row.el))}</span>`;
          item.innerHTML = `<span class="layer-handle">⠿</span><span class="layer-label">${label}</span>${typeBadge}<span class="layer-step-badge">${row.clickNum}번째</span>`;
          item.addEventListener('click', () => {
            if (layerDragItem) return;
            const el = row.gid ? row.members[0] : row.el;
            selectedEls.forEach(s => { s.classList.remove('edit-selected'); s.classList.remove('edit-group-selected'); });
            if (row.gid) { selectedEls = [...row.members]; selectedEl = el; selectedEls.forEach(s => s.classList.add('edit-group-selected')); showGroupBox(row.gid); }
            else { selectedEl = el; selectedEls = [el]; el.style.left = el.offsetLeft + 'px'; el.style.top = el.offsetTop + 'px'; el.style.right = ''; el.style.bottom = ''; el.classList.add('edit-selected'); showGroupBox(null); }
            if (selectedEl) updateCoordPanel(selectedEl);
            updateGroupToolbar(); buildLayerPanel();
          });
          item.addEventListener('mousedown', ev => { ev.stopPropagation(); ev.preventDefault(); layerDragPending = item; layerDragStartY = ev.clientY; });
          list.appendChild(item);
        });
      }
      return;
    }

    // ── 메인 뷰 ──
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'anim-section-title';
    sectionTitle.textContent = '프레젠테이션 설정';
    header.appendChild(sectionTitle);

    // 클릭 시 표시 토글
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

    // 등장 효과 드롭다운
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
    ANIM_TYPES.forEach(t => { selectHTML += `<option value="${t.cls}"${t.cls === currentAnimCls ? ' selected' : ''}>${escHTML(t.label)}</option>`; });
    selectHTML += '</select>';
    animTypeRow.innerHTML = `<span class="anim-type-label">등장 효과</span>${selectHTML}`;
    if (!animTypeDisabled) {
      animTypeRow.querySelector('select').addEventListener('change', function() {
        if (currentStep === 0) moveToStep(selectedEl, 1); else pushUndo();
        ANIM_TYPES.forEach(t => { if (t.cls) selectedEl.classList.remove(t.cls); });
        if (this.value) selectedEl.classList.add(this.value);
        buildLayerPanel();
      });
    }
    header.appendChild(animTypeRow);

    // "클릭하여 정렬" 버튼 (캔바 스타일 — 누르면 서브뷰 진입)
    const sortBtn = document.createElement('div');
    sortBtn.className = 'anim-sort-btn';
    sortBtn.innerHTML = '<span class="anim-sort-icon">☰</span> 클릭하여 정렬 <span class="anim-sort-arrow">›</span>';
    sortBtn.addEventListener('click', () => { animSortView = true; buildLayerPanel(); });
    header.appendChild(sortBtn);
  }

  const FLEX_CONTAINER_SEL = '.items-row, .items-col, .items-grid';

  function buildPositionTab(list) {
    const slide = slides[currentSlide];
    // 모든 요소를 z-order 순서로 수집 (flex 자식은 컨테이너 하위로 묶음)
    const allEls = [];
    slide.querySelectorAll('.step-layer').forEach(layer => {
      const step = parseInt(layer.dataset.step);
      layer.querySelectorAll(EDITABLE_SEL).forEach(el => {
        // flex 컨테이너 내부 자식은 별도 수집 (컨테이너 항목에서 표시)
        if (el.parentElement && el.parentElement.matches(FLEX_CONTAINER_SEL)) return;
        allEls.push({ el, step, layer });
      });
    });
    // z-order: DOM 순서 기반 (뒤 = 높은 z)
    // 그룹별로 ���기
    const seen = new Set();
    const rows = []; // { type: 'single'|'group'|'flex', ... }
    allEls.forEach(({ el, step }) => {
      // flex 컨테이너 → 자식 수집하여 flex 그룹으로 표시
      if (el.matches(FLEX_CONTAINER_SEL)) {
        const children = Array.from(el.querySelectorAll('.slide-el'));
        rows.push({ type: 'flex', el, step, children });
        return;
      }
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
      if (row.type === 'flex') {
        // flex 컨테이너를 그룹처럼 표시
        const flexId = 'flex-' + row.step + '-' + (row.el.className.match(/items-\w+/)?.[0] || 'box');
        const isExpanded = expandedGroups.has(flexId);
        const flexRow = document.createElement('div');
        flexRow.className = 'layer-item-group';
        flexRow.innerHTML = `<span class="layer-handle">⠿</span><span class="grp-name">${escHTML(getElLabel(row.el))}</span><span class="layer-badge">${escHTML(getElType(row.el))}</span><span class="layer-step-badge">S${row.step}</span><span class="grp-arrow">${isExpanded ? '▲' : '▽'}</span>`;
        flexRow._el = row.el;
        flexRow._step = row.step;
        flexRow.addEventListener('click', () => {
          if (expandedGroups.has(flexId)) expandedGroups.delete(flexId);
          else expandedGroups.add(flexId);
          buildLayerPanel();
        });
        flexRow.addEventListener('mousedown', ev => {
          ev.stopPropagation(); ev.preventDefault();
          layerDragPending = flexRow;
          layerDragStartY = ev.clientY;
        });
        list.appendChild(flexRow);
        if (isExpanded) {
          row.children.forEach(child => {
            const item = makeLayerItem(child, row.step);
            item.classList.add('pos-child');
            const as = child.dataset.appearStep;
            if (as) {
              const badge = document.createElement('span');
              badge.className = 'layer-step-badge';
              badge.textContent = '#' + as;
              item.appendChild(badge);
            }
            list.appendChild(item);
          });
        }
      } else if (row.type === 'group') {
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
      const copyTarget = (typeof getGroupActionTarget === 'function' && groupEntered && groupParent)
        ? getGroupActionTarget()
        : selectedEl;
      if (copyTarget) {
        clipboardEl = copyTarget.outerHTML;
        clipboardStep = parseInt(copyTarget.closest('.step-layer')?.dataset.step || '0', 10) || 0;
        showToast('요소 복사됨', 1500);
      }
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
          const targetLayer =
            slides[currentSlide].querySelector(`.step-layer[data-step="${clipboardStep}"]`) ||
            slides[currentSlide].querySelector('.step-layer[data-step="0"]');
          if (typeof insertEditableCloneNearReference === 'function') {
            insertEditableCloneNearReference(newEl, selectedEl, targetLayer);
          } else if (selectedEl && selectedEl.parentElement === targetLayer) {
            targetLayer.insertBefore(newEl, selectedEl.nextSibling);
          } else {
            targetLayer.appendChild(newEl);
          }
          clearSelection(); selectElement(newEl);
          showToast('붙여넣기 완료', 1500);
        }
      }
    } else if (item.dataset.action === 'duplicate') {
      const duplicateTarget = (typeof getGroupActionTarget === 'function' && groupEntered && groupParent)
        ? getGroupActionTarget()
        : selectedEl;
      if (duplicateTarget) {
        clipboardEl = duplicateTarget.outerHTML;
        clipboardStep = parseInt(duplicateTarget.closest('.step-layer')?.dataset.step || '0', 10) || 0;
        pushUndo();
        const temp = document.createElement('div');
        temp.innerHTML = clipboardEl;
        const newEl = temp.firstElementChild;
        if (newEl) {
          newEl.style.left = (parseInt(newEl.style.left) || 0) + 20 + 'px';
          newEl.style.top  = (parseInt(newEl.style.top)  || 0) + 20 + 'px';
          newEl.classList.remove('edit-selected', 'edit-group-selected');
          delete newEl.dataset.group;
          const sourceLayer = duplicateTarget.closest('.step-layer');
          const targetLayer =
            sourceLayer ||
            slides[currentSlide].querySelector(`.step-layer[data-step="${clipboardStep}"]`) ||
            slides[currentSlide].querySelector('.step-layer[data-step="0"]');
          if (typeof insertEditableCloneNearReference === 'function') {
            insertEditableCloneNearReference(newEl, duplicateTarget, targetLayer);
          } else if (sourceLayer && duplicateTarget.parentElement === sourceLayer) {
            sourceLayer.insertBefore(newEl, duplicateTarget.nextSibling);
          } else {
            targetLayer.appendChild(newEl);
          }
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

  const bindToolbarClick = (id, handler) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', handler);
  };

  // ── 플로팅 서식바 이벤트 ──
  const formatBar = document.getElementById('format-bar');
  if (formatBar) {
    formatBar.addEventListener('mousedown', e => e.preventDefault()); // 포커스 유지
    formatBar.querySelectorAll('.fmt-btn').forEach(btn => {
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
  }

  // ── 상단 툴바 이벤트 ──
  bindToolbarClick('tb-exit', () => toggleEditMode());
  bindToolbarClick('tb-font-dec', () => applyFontSize(-4));
  bindToolbarClick('tb-font-inc', () => applyFontSize(4));
  const tbFontSize = document.getElementById('tb-font-size');
  if (tbFontSize) {
    tbFontSize.addEventListener('change', () => {
      if (!selectedEl) return;
      const fs = Math.max(10, Math.min(500, parseInt(tbFontSize.value) || 108));
      tbFontSize.value = fs;
      const fontSizeInput = document.getElementById('font-size-input');
      if (fontSizeInput) fontSizeInput.value = fs;
      applyFontSize(0);
    });
  }
  // B/I/U 버튼 (상단 툴바)
  bindToolbarClick('tb-bold', () => document.execCommand('bold'));
  bindToolbarClick('tb-italic', () => document.execCommand('italic'));
  bindToolbarClick('tb-underline', () => document.execCommand('underline'));
  bindToolbarClick('tb-group', () => {
    if (selectedEls.length < 2) return;
    pushUndo();
    const gid = 'g' + Date.now();
    selectedEls.forEach(el => { el.dataset.group = gid; });
    if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
  });
  bindToolbarClick('tb-ungroup', () => {
    if (!selectedEls.length) return;
    pushUndo();
    selectedEls.forEach(el => { delete el.dataset.group; });
    refreshAfterUngroup();
  });
  bindToolbarClick('tb-delete', () => {
    if (!selectedEls.length || !editMode) return;
    // groupEntered 상태에서도 기본은 parent 우선, 정말 child-only 인 경우만 자식 삭제
    if (groupEntered && groupParent && typeof getGroupActionTarget === 'function') {
      const target = getGroupActionTarget();
      if (target && target !== groupParent) {
        pushUndo();
        removeEditableElement(target, slides[currentSlide]);
        clearSelection();
        if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
        return;
      }
    }
    pushUndo();
    const slide = slides[currentSlide];
    const toDelete = individualMode ? [selectedEl] : [...selectedEls];
    toDelete.forEach(el => {
      removeEditableElement(el, slide);
    });
    clearSelection();
    if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
  });
  bindToolbarClick('tb-undo', () => doUndo());
  bindToolbarClick('tb-save', () => {
    saveToFile(true);
  });
  bindToolbarClick('tb-anim', () => {
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
        const targetLayer =
          slides[currentSlide].querySelector(`.step-layer[data-step="${clipboardStep}"]`) ||
          slides[currentSlide].querySelector('.step-layer[data-step="0"]');
        if (typeof insertEditableCloneNearReference === 'function') {
          insertEditableCloneNearReference(newEl, selectedEl, targetLayer);
        } else {
          targetLayer.appendChild(newEl);
        }
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

  let presenterNotesSaveTimer = null;
  let lastPresenterNotesDeliveryId = null;

  function buildPresenterSyncPayload() {
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
    return {
      type: 'sync',
      slide: currentSlide,
      step: currentStep,
      total: slides.length,
      currentHTML: slidePreviewHTML(slide, currentStep),
      nextHTML,
      nextSlideHTML,
      notes: slide.dataset.notes || '',
      inkActions: typeof getRuntimeInkActionsForSlide === 'function'
        ? getRuntimeInkActionsForSlide(currentSlide)
        : [],
    };
  }

  function setPresenterWindowOpenState(isOpen) {
    document.body.classList.toggle('presenter-open', !!isOpen);
    if (!isOpen && presenterWindow && presenterWindow.closed) presenterWindow = null;
  }

  window.__setPresenterWindowOpen = isOpen => setPresenterWindowOpenState(isOpen);

  function togglePresenterNotesFromMain(force) {
    let hiddenState = typeof force === 'boolean' ? force : null;
    if (!presenterWindow || presenterWindow.closed) return false;
    try {
      if (typeof presenterWindow.__togglePresenterNotesHidden === 'function') {
        hiddenState = presenterWindow.__togglePresenterNotesHidden(force);
        if (typeof window.__toggleRuntimeNotesHidden === 'function') {
          window.__toggleRuntimeNotesHidden(hiddenState);
        }
        return true;
      }
    } catch (_) {}
    if (typeof window.__toggleRuntimeNotesHidden === 'function') {
      window.__toggleRuntimeNotesHidden(hiddenState);
    }
    presenterChannel.postMessage({ type: 'presenter-ui', action: 'toggle-notes-hidden', force });
    return true;
  }

  function syncPresenter() {
    if (!presenterWindow || presenterWindow.closed) return;
    const payload = buildPresenterSyncPayload();
    presenterChannel.postMessage(payload);
    try {
      if (typeof presenterWindow.__presenterReceiveSync === 'function') {
        presenterWindow.__presenterReceiveSync(payload);
      }
    } catch (_) {}
  }

  function notifyPresenterNotesStatus(status) {
    if (!presenterWindow || presenterWindow.closed) return;
    presenterChannel.postMessage({ type: 'notes-status', status });
    try {
      if (typeof presenterWindow.__presenterReceiveNotesStatus === 'function') {
        presenterWindow.__presenterReceiveNotesStatus(status);
      }
    } catch (_) {}
  }

  function resolvePresenterNotesSavedStatus() {
    if (isGitHubPages) {
      try {
        if (typeof ghGetToken === 'function' && !ghGetToken()) return 'draft-saved';
        if (!window.__ghLastSaveOk) return 'draft-saved';
      } catch (_) {
        return 'draft-saved';
      }
    }
    return 'saved';
  }

  function applyPresenterNotes(payload) {
    if (!payload || !slides[payload.slide]) return;
    if (payload.deliveryId && payload.deliveryId === lastPresenterNotesDeliveryId) return;
    if (payload.deliveryId) lastPresenterNotesDeliveryId = payload.deliveryId;
    slides[payload.slide].dataset.notes = payload.text;
    if (typeof setSlideJumpNotesForSlide === 'function' && payload.slide === currentSlide) {
      setSlideJumpNotesForSlide(slides[payload.slide]);
    }
    if (typeof setRuntimeNotesForSlide === 'function' && payload.slide === currentSlide) {
      setRuntimeNotesForSlide(slides[payload.slide]);
    }
    if (isGitHubPages && typeof ghMarkDirty === 'function') ghMarkDirty();
    if (payload.flush) {
      clearTimeout(presenterNotesSaveTimer);
      notifyPresenterNotesStatus('saving');
      Promise.resolve(saveToFile(true))
        .then(() => notifyPresenterNotesStatus(resolvePresenterNotesSavedStatus()))
        .catch(() => notifyPresenterNotesStatus('failed'));
    } else {
      notifyPresenterNotesStatus('pending');
    }
    if (payload.source !== 'presenter') syncPresenter();
  }

  window.__applyPresenterNotes = payload => applyPresenterNotes(payload);
  window.__getPresenterSyncPayload = () => buildPresenterSyncPayload();
  function applyPresenterInkPayload(payload) {
    if (typeof setRuntimeInkStateForSlide !== 'function') return;
    setRuntimeInkStateForSlide(
      payload.slide,
      payload.actions || [],
      payload.transientAction || null,
      payload.sparkPoint || null,
      payload.cursorPoint || null,
      payload.cursorMode || 'off',
    );
  }
  window.__applyPresenterInk = payload => applyPresenterInkPayload(payload);
  window.__applyPresenterNav = action => {
    if (action === 'next') goNext();
    else if (action === 'prev') goPrev();
  };
  function refreshPresenterNotesBridge() {
    const orig = window.__applyPresenterNotes;
    window.__onPresenterNotes = payload => orig(payload);
  }
  refreshPresenterNotesBridge();

  presenterChannel.onmessage = e => {
    if (e.data.type === 'ready') { syncPresenter(); return; }
    if (e.data.type === 'nav') {
      if (e.data.action === 'next') goNext();
      else if (e.data.action === 'prev') goPrev();
    }
    if (e.data.type === 'notes') {
      applyPresenterNotes(e.data);
    }
    if (e.data.type === 'ink') {
      applyPresenterInkPayload(e.data);
    }
  };

  function openPresenterView() {
    if (presenterWindow && !presenterWindow.closed) {
      presenterWindow.close();
      presenterWindow = null;
      setPresenterWindowOpenState(false);
      return;
    }
    refreshPresenterNotesBridge();
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
#pres-current-wrap { flex: 6; padding: 12px; display: flex; flex-direction: column; gap: 8px; position: relative; }
#pres-next-wrap { flex: 4; padding: 12px; display: flex; flex-direction: column; gap: 4px; border-left: 1px solid #333; }
#pres-next-slide-wrap { flex: 1; display: flex; flex-direction: column; gap: 4px; border-top: 1px solid #333; padding-top: 8px; }
.pres-label { font-size: 11px; color: #888; font-weight: 700; flex-shrink: 0; }
.slide-preview { position: relative; overflow: hidden; flex: 1; background: #ddd; border-radius: 4px; }
.pres-scene { position: absolute; inset: 0; }
.slide-clone-wrap { position: absolute; top: 0; left: 0; transform-origin: top left; pointer-events: none; }
.slide-clone-wrap * { transition: none !important; animation: none !important; }
#pres-ink-sparks { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 13; }
#pres-ink-canvas { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 12; pointer-events: none; touch-action: none; }
#pres-current.annotate-draw #pres-ink-canvas,
#pres-current.annotate-erase #pres-ink-canvas { pointer-events: auto; cursor: crosshair; }
#pres-ink-toolbar { position: absolute; right: 24px; bottom: 24px; z-index: 18; display: flex; gap: 8px; padding: 10px; border-radius: 16px; background: rgba(15,15,15,0.9); border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 14px 32px rgba(0,0,0,0.32); }
#pres-ink-toolbar button { min-width: 46px; height: 46px; border: 0; border-radius: 12px; background: rgba(255,255,255,0.08); color: #fff; font-size: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 0 10px; }
#pres-ink-toolbar button.active { background: rgba(255,59,48,0.2); outline: 2px solid rgba(255,90,54,0.95); }
#pres-ink-toolbar button:disabled { opacity: 0.45; cursor: default; }
.pres-ink-dot { width: 16px; height: 16px; border-radius: 999px; background: #ff3b30; box-shadow: 0 0 0 2px rgba(255,255,255,0.18) inset; flex-shrink: 0; }
#pres-notes { padding: 10px 16px; background: #111; border-top: 1px solid #333; height: 160px; display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
#pres-notes-label { font-size: 11px; color: #888; font-weight: 700; }
#pres-notes-input { flex: 1; background: #222; border: 1px solid #444; border-radius: 6px; color: #fff; font-size: 13px; padding: 6px 10px; font-family: inherit; overflow-y: auto; line-height: 1.8; }
#pres-notes-meta { display:flex; justify-content:space-between; align-items:center; gap:12px; font-size:11px; color:#8a8a8a; }
#pres-notes-status[data-tone="dirty"] { color:#ffb24d; }
#pres-notes-status[data-tone="saving"] { color:#8ec5ff; }
#pres-notes-status[data-tone="saved"] { color:#7ee787; }
#pres-notes-status[data-tone="draft"] { color:#ffd866; }
#pres-notes-status[data-tone="failed"] { color:#ff7b72; }
#pres-notes-status[data-tone="hidden"] { color:#bdbdbd; }
#pres-footer { display: flex; justify-content: space-between; padding: 8px 16px; background: #111; border-top: 1px solid #333; flex-shrink: 0; }
#pres-footer button { background: #333; border: 1px solid #555; color: #fff; font-size: 14px; font-weight: 700; padding: 6px 20px; border-radius: 6px; cursor: pointer; }
#pres-footer button:hover { background: #444; }
body.pres-notes-hidden #pres-notes { display:none; }
.step-layer { position: absolute; inset: 0; pointer-events: none; }
.step-dim { position: absolute; inset: 0; }
.step-content { position: relative; z-index: 1; }
<\/style>
<\/head>
<body tabindex="-1">
<div id="presenter-root">
  <div id="pres-header">
    <div id="pres-slide-info">슬라이드 ${currentSlide + 1} / ${slides.length}</div>
    <div id="pres-timer">00:00:00</div>
  </div>
  <div id="pres-main">
    <div id="pres-current-wrap">
      <div class="pres-label">현재 슬라이드</div>
      <div class="slide-preview" id="pres-current">
        <div class="pres-scene" id="pres-current-scene"><\/div>
        <div id="pres-ink-sparks"><\/div>
        <canvas id="pres-ink-canvas" width="1920" height="1080"><\/canvas>
      <\/div>
      <div id="pres-ink-toolbar">
        <button id="pres-ink-pen" type="button" title="빨간 펜 (R)"><span class="pres-ink-dot"><\/span>펜<\/button>
        <button id="pres-ink-eraser" type="button" title="지우개 (E)">지우개<\/button>
        <button id="pres-ink-undo" type="button" title="실행 취소 (Ctrl+Z)">↶<\/button>
        <button id="pres-ink-clear" type="button" title="전체 지우기">지우기<\/button>
      <\/div>
    <\/div>
    <div id="pres-next-wrap">
      <div class="pres-label">다음 화면</div>
      <div class="slide-preview" id="pres-next" style="flex:1;"><div class="pres-scene" id="pres-next-scene"><\/div><\/div>
      <div id="pres-next-slide-wrap">
        <div class="pres-label">다음 슬라이드</div>
        <div class="slide-preview" id="pres-next-slide" style="flex:1;"><div class="pres-scene" id="pres-next-slide-scene"><\/div><\/div>
      <\/div>
    <\/div>
  <\/div>
  <div id="pres-notes">
    <div id="pres-notes-label">참고 (원고)<\/div>
    <div id="pres-notes-input" contenteditable="true" style="white-space:pre-wrap;overflow-y:auto;" placeholder="발표 노트..."><\/div>
    <div id="pres-notes-meta">
      <div id="pres-notes-status" data-tone="saved">저장됨<\/div>
      <div id="pres-notes-shortcut">저장: ⌘/Ctrl+S · 숨기기: F<\/div>
    <\/div>
  <\/div>
  <div id="pres-footer">
    <button id="pres-btn-prev">◀ 이전<\/button>
    <button id="pres-btn-next">다음 ▶<\/button>
  <\/div>
<\/div>
<script>
let ch = null;
try {
  ch = new BroadcastChannel('slide-presenter-${sessionId}');
} catch (_) {
  ch = null;
}
const PREVIEW_W = 1920;
const PREVIEW_H = 1080;
let curSlideIdx = ${currentSlide};
const startTime = Date.now();
const currentPreview = document.getElementById('pres-current');
const inkCanvas = document.getElementById('pres-ink-canvas');
const inkCtx = inkCanvas.getContext('2d');
const inkActionsBySlide = new Map();
let inkMode = 'off';
let activeInkAction = null;
let hoverInkPoint = null;
let eraseDragActive = false;
let presenterNotesEditingSlide = -1;
let presenterNotesDirty = false;
let presenterNotesHidden = false;
let inkActionSeq = 1;
let bridgeDeliverySeq = 1;
let previewRefitQueued = false;
let lastSparkAt = 0;
let lastSparkPoint = null;
setInterval(() => {
  const e2 = Math.floor((Date.now() - startTime) / 1000);
  const h = String(Math.floor(e2 / 3600)).padStart(2,'0');
  const m = String(Math.floor((e2 % 3600) / 60)).padStart(2,'0');
  const s = String(e2 % 60).padStart(2,'0');
  document.getElementById('pres-timer').textContent = h+':'+m+':'+s;
}, 1000);
function renderPreview(container, html) {
  const scene = container.querySelector('.pres-scene') || container;
  scene.innerHTML = '';
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
  scene.appendChild(wrap);
  fitPreview(container);
}
function fitPreview(container) {
  if (!container) return;
  const scene = container.querySelector('.pres-scene') || container;
  const wrap = scene.querySelector('.slide-clone-wrap');
  if (!wrap) return;
  const cw = container.offsetWidth, ch2 = container.offsetHeight;
  if (!cw || !ch2) {
    requestAnimationFrame(() => fitPreview(container));
    return;
  }
  const scale = Math.min(cw / PREVIEW_W, ch2 / PREVIEW_H);
  wrap.style.transform = 'scale(' + scale + ')';
  wrap.style.width = PREVIEW_W + 'px';
  wrap.style.height = PREVIEW_H + 'px';
  wrap.style.left = Math.max((cw - (PREVIEW_W * scale)) / 2, 0) + 'px';
  wrap.style.top = Math.max((ch2 - (PREVIEW_H * scale)) / 2, 0) + 'px';
}
function schedulePresenterPreviewRefit() {
  if (previewRefitQueued) return;
  previewRefitQueued = true;
  requestAnimationFrame(() => {
    previewRefitQueued = false;
    fitPreview(document.getElementById('pres-current'));
    fitPreview(document.getElementById('pres-next'));
    fitPreview(document.getElementById('pres-next-slide'));
  });
}
function spawnPresenterSpark(point) {
  const sparks = document.getElementById('pres-ink-sparks');
  if (!sparks || !point) return;
  for (let i = 0; i < 4; i++) {
    const spark = document.createElement('span');
    spark.className = 'runtime-ink-spark';
    spark.style.left = point.x + 'px';
    spark.style.top = point.y + 'px';
    spark.style.setProperty('--spark-x', ((Math.random() - 0.5) * 44) + 'px');
    spark.style.setProperty('--spark-y', ((Math.random() - 0.5) * 44) + 'px');
    spark.style.setProperty('--spark-scale', (0.72 + Math.random() * 0.48).toFixed(2));
    sparks.appendChild(spark);
    setTimeout(() => spark.remove(), 480);
  }
}
function createInkActionId() {
  return 'ink-' + Date.now().toString(36) + '-' + (inkActionSeq++).toString(36);
}
function createBridgeDeliveryId(prefix = 'tx') {
  return prefix + '-' + Date.now().toString(36) + '-' + (bridgeDeliverySeq++).toString(36);
}
function getCurrentInkActions() {
  const existing = inkActionsBySlide.get(curSlideIdx);
  if (existing) return existing;
  const next = [];
  inkActionsBySlide.set(curSlideIdx, next);
  return next;
}
function cloneInkActions(actions) {
  return Array.isArray(actions)
    ? actions.map(action => ({
        ...action,
        points: Array.isArray(action?.points)
          ? action.points.map(point => ({ x: Number(point.x) || 0, y: Number(point.y) || 0 }))
          : [],
      }))
    : [];
}
function pointToSegmentDistance(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (!dx && !dy) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, (((point.x - start.x) * dx) + ((point.y - start.y) * dy)) / ((dx * dx) + (dy * dy))));
  const px = start.x + (dx * t);
  const py = start.y + (dy * t);
  return Math.hypot(point.x - px, point.y - py);
}
function actionIntersectsErasePoint(action, point, radius = 28) {
  if (!action || !point || !action.points || !action.points.length) return false;
  const hitRadius = radius + ((action.width || 18) / 2);
  const points = action.shape === 'line'
    ? [action.points[0], action.points[action.points.length - 1]]
    : action.points;
  if (action.shape === 'rect' && action.points.length >= 2) {
    const start = action.points[0];
    const end = action.points[action.points.length - 1];
    const left = Math.min(start.x, end.x);
    const right = Math.max(start.x, end.x);
    const top = Math.min(start.y, end.y);
    const bottom = Math.max(start.y, end.y);
    const segments = [
      [{ x: left, y: top }, { x: right, y: top }],
      [{ x: right, y: top }, { x: right, y: bottom }],
      [{ x: right, y: bottom }, { x: left, y: bottom }],
      [{ x: left, y: bottom }, { x: left, y: top }],
    ];
    return segments.some(([a, b]) => pointToSegmentDistance(point, a, b) <= hitRadius);
  }
  if (points.length === 1) return Math.hypot(point.x - points[0].x, point.y - points[0].y) <= hitRadius;
  for (let i = 1; i < points.length; i++) {
    if (pointToSegmentDistance(point, points[i - 1], points[i]) <= hitRadius) return true;
  }
  return false;
}
function drawInkPath(ctx, points) {
  if (!points || !points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  if (points.length === 1) {
    ctx.lineTo(points[0].x + 0.01, points[0].y + 0.01);
  }
  ctx.stroke();
}
function renderInkAction(ctx, action) {
  if (!action) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = action.width || (action.mode === 'erase' ? 42 : 18);
  if (action.mode === 'erase') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = action.color || '#ff3b30';
  }
  if (action.shape === 'rect' && action.points && action.points.length >= 2) {
    const start = action.points[0];
    const end = action.points[action.points.length - 1];
    ctx.strokeRect(
      Math.min(start.x, end.x),
      Math.min(start.y, end.y),
      Math.abs(end.x - start.x),
      Math.abs(end.y - start.y),
    );
  } else if (action.shape === 'line' && action.points && action.points.length >= 2) {
    drawInkPath(ctx, [action.points[0], action.points[action.points.length - 1]]);
  } else {
    drawInkPath(ctx, action.points);
  }
  ctx.restore();
}
function redrawPresenterInk(transientAction = null) {
  inkCtx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);
  getCurrentInkActions().forEach(action => renderInkAction(inkCtx, action));
  if (transientAction) renderInkAction(inkCtx, transientAction);
}
function updateInkToolbar() {
  document.getElementById('pres-ink-pen').classList.toggle('active', inkMode === 'draw');
  document.getElementById('pres-ink-eraser').classList.toggle('active', inkMode === 'erase');
  const hasInk = getCurrentInkActions().length > 0;
  document.getElementById('pres-ink-undo').disabled = !hasInk;
  document.getElementById('pres-ink-clear').disabled = !hasInk;
}
function setInkMode(nextMode) {
  inkMode = nextMode;
  eraseDragActive = false;
  lastSparkPoint = null;
  currentPreview.classList.toggle('annotate-draw', nextMode === 'draw');
  currentPreview.classList.toggle('annotate-erase', nextMode === 'erase');
  updateInkToolbar();
  scheduleInkBroadcast(true);
}
function getSparkPoint() {
  const points = activeInkAction?.points;
  const point = points && points.length ? points[points.length - 1] : hoverInkPoint;
  if (!point || inkMode === 'off') return null;
  const now = Date.now();
  const movedEnough = (
    !lastSparkPoint ||
    Math.hypot(point.x - lastSparkPoint.x, point.y - lastSparkPoint.y) >= 18
  );
  const minGap = activeInkAction ? 70 : 120;
  if (!movedEnough || now - lastSparkAt < minGap) return null;
  lastSparkAt = now;
  lastSparkPoint = { x: point.x, y: point.y };
  return point;
}
function getCursorMode() {
  if (!hoverInkPoint) return 'off';
  if (inkMode === 'erase') return 'erase';
  if (inkMode === 'draw') return 'draw';
  return 'present';
}
function postInkState() {
  const sparkPoint = getSparkPoint();
  const payload = {
    type: 'ink',
    slide: curSlideIdx,
    actions: cloneInkActions(getCurrentInkActions()),
    transientAction: activeInkAction ? cloneInkActions([activeInkAction])[0] : null,
    sparkPoint,
    cursorPoint: hoverInkPoint,
    cursorMode: getCursorMode(),
  };
  if (sparkPoint) spawnPresenterSpark(sparkPoint);
  if (ch) ch.postMessage(payload);
  try {
    if (window.opener && !window.opener.closed && typeof window.opener.__applyPresenterInk === 'function') {
      window.opener.__applyPresenterInk(payload);
    }
  } catch (_) {}
}
let inkBroadcastQueued = false;
function scheduleInkBroadcast(force = false) {
  if (force) {
    inkBroadcastQueued = false;
    postInkState();
    return;
  }
  if (inkBroadcastQueued) return;
  inkBroadcastQueued = true;
  requestAnimationFrame(() => {
    inkBroadcastQueued = false;
    postInkState();
  });
}
function clearPresenterInk() {
  inkActionsBySlide.set(curSlideIdx, []);
  redrawPresenterInk();
  updateInkToolbar();
  scheduleInkBroadcast(true);
}
function eraseActionsAtPoint(point) {
  const actions = getCurrentInkActions();
  if (!actions.length) return false;
  const kept = [];
  let removed = false;
  actions.forEach(action => {
    if (actionIntersectsErasePoint(action, point)) removed = true;
    else kept.push(action);
  });
  if (!removed) return false;
  inkActionsBySlide.set(curSlideIdx, kept);
  redrawPresenterInk();
  updateInkToolbar();
  return true;
}
function undoPresenterInk() {
  const actions = getCurrentInkActions();
  if (!actions.length) return;
  actions.pop();
  redrawPresenterInk();
  updateInkToolbar();
  scheduleInkBroadcast(true);
}
function getInkPoint(ev) {
  const rect = inkCanvas.getBoundingClientRect();
  return {
    x: ((ev.clientX - rect.left) / rect.width) * PREVIEW_W,
    y: ((ev.clientY - rect.top) / rect.height) * PREVIEW_H,
  };
}
function finishInkAction(ev) {
  if (!activeInkAction) return;
  if (ev && activeInkAction.points.length === 1) {
    activeInkAction.points.push(getInkPoint(ev));
  }
  if (ev) hoverInkPoint = getInkPoint(ev);
  getCurrentInkActions().push(activeInkAction);
  activeInkAction = null;
  redrawPresenterInk();
  updateInkToolbar();
  scheduleInkBroadcast(true);
}
function setPresenterNotesStatus(text, tone = 'saved') {
  const el = document.getElementById('pres-notes-status');
  if (!el) return;
  el.textContent = text;
  el.dataset.tone = tone;
}
function flushNotes(reason = 'manual') {
  const notesEl = document.getElementById('pres-notes-input');
  if (!notesEl) return;
  if (!presenterNotesDirty) {
    setPresenterNotesStatus(
      presenterNotesHidden ? '원고 숨김 (F로 복귀)' : '저장됨',
      presenterNotesHidden ? 'hidden' : 'saved'
    );
    return;
  }
  presenterNotesDirty = false;
  setPresenterNotesStatus(reason === 'nav' ? '이동 전 저장 중…' : '저장 중…', 'saving');
  sendNotes(getPresenterNotesText(), true);
}
function togglePresenterNotesHidden(force) {
  presenterNotesHidden = typeof force === 'boolean' ? force : !presenterNotesHidden;
  document.body.classList.toggle('pres-notes-hidden', presenterNotesHidden);
  try {
    if (window.opener && !window.opener.closed && typeof window.opener.__toggleRuntimeNotesHidden === 'function') {
      window.opener.__toggleRuntimeNotesHidden(presenterNotesHidden);
    }
  } catch (_) {}
  if (presenterNotesHidden) setPresenterNotesStatus('원고 숨김 (F로 복귀)', 'hidden');
  else setPresenterNotesStatus(presenterNotesDirty ? '자동 저장 대기' : '저장됨', presenterNotesDirty ? 'dirty' : 'saved');
  schedulePresenterPreviewRefit();
}
window.__togglePresenterNotesHidden = force => {
  if (presenterNotesDirty) flushNotes('manual');
  togglePresenterNotesHidden(force);
  return presenterNotesHidden;
};
function postNav(action) {
  if (presenterNotesDirty) flushNotes('nav');
  if (ch) ch.postMessage({ type: 'nav', action });
  try {
    if (window.opener && !window.opener.closed && typeof window.opener.__applyPresenterNav === 'function') {
      window.opener.__applyPresenterNav(action);
    }
  } catch (_) {}
}
function handleSyncPayload(d) {
  if (!d || d.type !== 'sync') return;
  const prevSlideIdx = curSlideIdx;
  if (prevSlideIdx !== d.slide && presenterNotesDirty) {
    const dirtySlide = presenterNotesEditingSlide !== -1 ? presenterNotesEditingSlide : prevSlideIdx;
    presenterNotesDirty = false;
    setPresenterNotesStatus('이동 전 저장 중…', 'saving');
    const payload = { type: 'notes', slide: dirtySlide, text: getPresenterNotesText(), flush: true, source: 'presenter', deliveryId: createBridgeDeliveryId('note') };
    if (ch) ch.postMessage(payload);
    try {
      if (window.opener && !window.opener.closed && typeof window.opener.__applyPresenterNotes === 'function') {
        window.opener.__applyPresenterNotes(payload);
      }
    } catch (_) {}
  }
  curSlideIdx = d.slide;
  document.getElementById('pres-slide-info').textContent = '슬라이드 ' + (d.slide + 1) + ' / ' + d.total;
  renderPreview(document.getElementById('pres-current'), d.currentHTML);
  renderPreview(document.getElementById('pres-next'), d.nextHTML);
  renderPreview(document.getElementById('pres-next-slide'), d.nextSlideHTML || '');
  const el = document.getElementById('pres-notes-input');
  const fullNotes = (d.notes || '').trim();
  if (prevSlideIdx !== d.slide) presenterNotesEditingSlide = -1;
  if (!(presenterNotesEditingSlide === d.slide && document.activeElement === el)) {
    el.textContent = fullNotes;
    if (!presenterNotesHidden) {
      setPresenterNotesStatus(presenterNotesDirty ? '자동 저장 대기' : '저장됨', presenterNotesDirty ? 'dirty' : 'saved');
    }
  }
  inkActionsBySlide.set(curSlideIdx, cloneInkActions(d.inkActions || []));
  activeInkAction = null;
  eraseDragActive = false;
  hoverInkPoint = null;
  lastSparkPoint = null;
  redrawPresenterInk();
  updateInkToolbar();
  schedulePresenterPreviewRefit();
}
function handleNotesStatus(status) {
  if (status === 'pending') {
    presenterNotesDirty = true;
    setPresenterNotesStatus('자동 저장 대기', 'dirty');
  } else if (status === 'saving') {
    setPresenterNotesStatus('저장 중…', 'saving');
  } else if (status === 'draft-saved') {
    presenterNotesDirty = false;
    setPresenterNotesStatus('임시 저장됨', 'draft');
  } else if (status === 'failed') {
    presenterNotesDirty = true;
    setPresenterNotesStatus('저장 실패', 'failed');
  } else {
    presenterNotesDirty = false;
    setPresenterNotesStatus('저장됨', 'saved');
  }
}
window.__presenterReceiveSync = payload => handleSyncPayload(payload);
window.__presenterReceiveNotesStatus = status => handleNotesStatus(status);
if (ch) {
  ch.onmessage = ev => {
    const d = ev.data;
    if (d.type === 'sync') handleSyncPayload(d);
    if (d.type === 'notes-status') handleNotesStatus(d.status);
    if (d.type === 'presenter-ui' && d.action === 'toggle-notes-hidden') {
      window.__togglePresenterNotesHidden(d.force);
    }
  };
}
document.getElementById('pres-btn-prev').addEventListener('click', () => postNav('prev'));
document.getElementById('pres-btn-next').addEventListener('click', () => postNav('next'));
document.getElementById('pres-ink-pen').addEventListener('click', () => setInkMode(inkMode === 'draw' ? 'off' : 'draw'));
document.getElementById('pres-ink-eraser').addEventListener('click', () => setInkMode(inkMode === 'erase' ? 'off' : 'erase'));
document.getElementById('pres-ink-undo').addEventListener('click', undoPresenterInk);
document.getElementById('pres-ink-clear').addEventListener('click', clearPresenterInk);
currentPreview.addEventListener('pointerenter', ev => {
  hoverInkPoint = getInkPoint(ev);
  if (!activeInkAction) scheduleInkBroadcast(true);
});
currentPreview.addEventListener('pointermove', ev => {
  hoverInkPoint = getInkPoint(ev);
  if (!activeInkAction) scheduleInkBroadcast(inkMode !== 'draw');
});
currentPreview.addEventListener('pointerleave', () => {
  hoverInkPoint = null;
  lastSparkPoint = null;
  if (!activeInkAction) scheduleInkBroadcast(true);
});
inkCanvas.addEventListener('pointerdown', ev => {
  if (inkMode === 'off') return;
  ev.preventDefault();
  hoverInkPoint = getInkPoint(ev);
  if (inkMode === 'erase') {
    eraseDragActive = true;
    inkCanvas.setPointerCapture(ev.pointerId);
    eraseActionsAtPoint(hoverInkPoint);
    scheduleInkBroadcast(true);
    return;
  }
  activeInkAction = {
    id: createInkActionId(),
    mode: 'draw',
    shape: (ev.ctrlKey || ev.metaKey) ? 'rect' : (ev.shiftKey ? 'line' : 'freehand'),
    color: '#ff3b30',
    width: 18,
    points: [hoverInkPoint],
  };
  inkCanvas.setPointerCapture(ev.pointerId);
  redrawPresenterInk(activeInkAction);
  scheduleInkBroadcast();
});
inkCanvas.addEventListener('pointermove', ev => {
  const point = getInkPoint(ev);
  hoverInkPoint = point;
  if (eraseDragActive) {
    eraseActionsAtPoint(point);
    scheduleInkBroadcast(true);
    return;
  }
  if (!activeInkAction) return;
  if (activeInkAction.shape === 'rect' || activeInkAction.shape === 'line') {
    activeInkAction.points = [activeInkAction.points[0], point];
  } else {
    activeInkAction.points.push(point);
  }
  redrawPresenterInk(activeInkAction);
  scheduleInkBroadcast();
});
inkCanvas.addEventListener('pointerup', ev => {
  if (eraseDragActive) {
    eraseDragActive = false;
    hoverInkPoint = getInkPoint(ev);
    scheduleInkBroadcast(true);
    return;
  }
  finishInkAction(ev);
});
inkCanvas.addEventListener('pointercancel', () => {
  activeInkAction = null;
  eraseDragActive = false;
  redrawPresenterInk();
  scheduleInkBroadcast(true);
});
inkCanvas.addEventListener('lostpointercapture', () => {
  if (eraseDragActive) {
    eraseDragActive = false;
    scheduleInkBroadcast(true);
    return;
  }
  if (!activeInkAction) return;
  getCurrentInkActions().push(activeInkAction);
  hoverInkPoint = activeInkAction.points.length
    ? activeInkAction.points[activeInkAction.points.length - 1]
    : hoverInkPoint;
  activeInkAction = null;
  redrawPresenterInk();
  updateInkToolbar();
  scheduleInkBroadcast(true);
});
window.__getPresenterInkState = () => ({
  mode: inkMode,
  actionCount: getCurrentInkActions().length,
  cursorVisible: !!hoverInkPoint,
  cursorMode: getCursorMode(),
  eraseDragActive,
  lastShape: (() => {
    const actions = getCurrentInkActions();
    return actions.length ? actions[actions.length - 1].shape || null : null;
  })(),
});
const sendNotes = (text, flush = false) => {
  const payload = { type: 'notes', slide: curSlideIdx, text, flush, source: 'presenter', deliveryId: createBridgeDeliveryId('note') };
  if (ch) ch.postMessage(payload);
  try {
    if (window.opener && !window.opener.closed && typeof window.opener.__applyPresenterNotes === 'function') {
      window.opener.__applyPresenterNotes(payload);
    }
  } catch (_) {}
};
const getPresenterNotesText = () => {
  const notesEl = document.getElementById('pres-notes-input');
  if (!notesEl) return '';
  return String(notesEl.innerText || notesEl.textContent || '')
    .replace(/\\r\\n?/g, '\\n')
    .trimEnd();
};
document.getElementById('pres-notes-input').addEventListener('focus', () => {
  presenterNotesEditingSlide = curSlideIdx;
});
document.getElementById('pres-notes-input').addEventListener('input', ev => {
  presenterNotesEditingSlide = curSlideIdx;
  presenterNotesDirty = true;
  setPresenterNotesStatus('자동 저장 대기', 'dirty');
  sendNotes(getPresenterNotesText());
});
document.getElementById('pres-notes-input').addEventListener('blur', () => {
  presenterNotesEditingSlide = -1;
  flushNotes('manual');
});
window.addEventListener('pagehide', () => flushNotes('manual'));
window.addEventListener('beforeunload', () => flushNotes('manual'));
window.addEventListener('beforeunload', () => {
  try {
    if (window.opener && !window.opener.closed && typeof window.opener.__setPresenterWindowOpen === 'function') {
      window.opener.__setPresenterWindowOpen(false);
    }
  } catch (_) {}
});
window.addEventListener('resize', schedulePresenterPreviewRefit);
if (window.visualViewport) window.visualViewport.addEventListener('resize', schedulePresenterPreviewRefit);
if (typeof ResizeObserver === 'function') {
  const previewObserver = new ResizeObserver(() => schedulePresenterPreviewRefit());
  ['pres-current', 'pres-next', 'pres-next-slide'].forEach(id => {
    const el = document.getElementById(id);
    if (el) previewObserver.observe(el);
  });
}
// textarea 밖을 클릭하면 포커스 해제 (contenteditable는 자동 blur 안 되는 경우 있음)
document.addEventListener('click', ev => {
  const notes = document.getElementById('pres-notes-input');
  if (notes && !notes.contains(ev.target)) notes.blur();
});
// 창 로드 직후 기본 포커스를 버튼/바디로 강제 (notes가 자동 포커스 먹어서 화살표 먹히는 문제 방지)
setTimeout(() => {
  const nxt = document.getElementById('pres-btn-next');
  if (nxt) nxt.focus();
  else document.body.focus();
}, 0);
document.addEventListener('keydown', ev => {
  const ae = document.activeElement;
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
    ev.preventDefault();
    undoPresenterInk();
    return;
  }
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
    ev.preventDefault();
    flushNotes('manual');
    return;
  }
  if (ev.code === 'KeyF' || ev.key.toLowerCase() === 'f') {
    ev.preventDefault();
    if (presenterNotesDirty) flushNotes('manual');
    togglePresenterNotesHidden();
    if (!document.fullscreenElement) {
      const request = document.documentElement?.requestFullscreen;
      if (request) Promise.resolve(request.call(document.documentElement)).catch(() => {});
    } else if (document.exitFullscreen) {
      Promise.resolve(document.exitFullscreen()).catch(() => {});
    }
    return;
  }
  if (ae && ae.id === 'pres-notes-input') return;
  if (ev.key.toLowerCase() === 'r') {
    ev.preventDefault();
    setInkMode(inkMode === 'draw' ? 'off' : 'draw');
    return;
  }
  if (ev.key.toLowerCase() === 'e') {
    ev.preventDefault();
    setInkMode(inkMode === 'erase' ? 'off' : 'erase');
    return;
  }
  if (ev.key === 'Escape' && inkMode !== 'off') {
    ev.preventDefault();
    setInkMode('off');
    return;
  }
  if (ev.key === 'ArrowRight') { ev.preventDefault(); postNav('next'); }
  if (ev.key === 'ArrowLeft') { ev.preventDefault(); postNav('prev'); }
}, true);
if (ch) ch.postMessage({ type: 'ready' });
try {
  if (window.opener && !window.opener.closed && typeof window.opener.__getPresenterSyncPayload === 'function') {
    handleSyncPayload(window.opener.__getPresenterSyncPayload());
  }
} catch (_) {}
updateInkToolbar();
setPresenterNotesStatus('저장됨', 'saved');
<\/script>
<\/body><\/html>`);
    presenterWindow.document.close();
    presenterWindow.resizeTo(pw, ph);
    presenterWindow.moveTo(pl, pt);
    setPresenterWindowOpenState(true);
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
        removeEditableElement(child, slides[currentSlide]);
        clearSelection();
        groupToolbar.classList.remove('visible');
        if (document.getElementById('layer-panel').classList.contains('visible')) buildLayerPanel();
        return;
      }
    }
    pushUndo();
    const slide = slides[currentSlide];
    const toDelete = individualMode ? [selectedEl] : [...selectedEls];
    toDelete.forEach(el => {
      removeEditableElement(el, slide);
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
