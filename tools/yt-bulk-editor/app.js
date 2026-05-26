/* YT Bulk Editor — Web SPA (Vercel 배포용)
 * Google Identity Services Token Client + YouTube Data API v3 + Analytics API v2
 *
 * 기능:
 *   - OAuth 로그인 (GIS token client, SPA 친화)
 *   - 내 채널 영상 전체 목록 로드 (제목/설명/썸네일/핀댓글)
 *   - Analytics 조회수 로드
 *   - 설명글/핀댓글 일괄 수정 + 저장
 *   - 텍스트 일괄 교체 (미리보기 + 적용)
 *   - 검색/날짜필터/변경필터/Shorts 포함
 *   - Excel 내보내기 (SheetJS)
 */

(function () {
  'use strict';

  // ---------- 설정 ----------
  const CLIENT_ID = '427635532362-bnh9aai0p196vnv4gin2dbmdngt7rfdj.apps.googleusercontent.com';
  const REDIRECT_URI = 'https://cdn-assets-three.vercel.app/tools/yt-bulk-editor/';
  const SCOPES = [
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
  ].join(' ');
  const YT_API = 'https://www.googleapis.com/youtube/v3';
  const YTA_API = 'https://youtubeanalytics.googleapis.com/v2';
  const TOKEN_STORAGE_KEY = 'yt_bulk_editor_token';
  const STATE_STORAGE_KEY = 'yt_bulk_editor_oauth_state';

  // ---------- 상태 ----------
  const state = {
    accessToken: null,
    tokenExpiresAt: 0,
    channelId: null,
    uploadsPlaylistId: null,
    videos: [], // VideoItem[]
    filters: {
      search: '',
      years: new Set(),
      months: new Set(),
      changedOnly: false,
      includeShorts: false,
    },
    replace: { preview: null },
  };

  // ---------- DOM 참조 ----------
  const $ = (id) => document.getElementById(id);
  const els = {
    authStatus: $('auth-status'),
    btnLogin: $('btn-login'),
    btnLogout: $('btn-logout'),
    btnLoadVideos: $('btn-load-videos'),
    btnLoadAnalytics: $('btn-load-analytics'),
    btnSave: $('btn-save'),
    btnPreviewReplace: $('btn-preview-replace'),
    btnApplyReplace: $('btn-apply-replace'),
    btnExportExcel: $('btn-export-excel'),
    changeCount: $('change-count'),
    videoCount: $('video-count'),
    videoList: $('video-list'),
    searchInput: $('search-input'),
    filterChanged: $('filter-changed'),
    filterShorts: $('filter-shorts'),
    filterYears: $('filter-years'),
    filterMonths: $('filter-months'),
    replaceOld: $('replace-old'),
    replaceNew: $('replace-new'),
    replaceDesc: $('replace-desc'),
    replaceComment: $('replace-comment'),
    loadProgress: $('load-progress'),
    loadProgressFill: $('load-progress-fill'),
    loadProgressText: $('load-progress-text'),
    saveProgress: $('save-progress'),
    saveProgressFill: $('save-progress-fill'),
    saveProgressText: $('save-progress-text'),
    toastRoot: $('toast-root'),
  };

  // ---------- 토스트 ----------
  function toast(message, kind = 'info', duration = 3500) {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = message;
    els.toastRoot.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.2s';
      setTimeout(() => el.remove(), 200);
    }, duration);
  }

  // ---------- HTTP ----------
  async function ytFetch(url, options = {}) {
    if (!state.accessToken) {
      throw new Error('로그인이 필요합니다.');
    }
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${state.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (res.status === 401) {
      setAuthState(false);
      throw new Error('토큰이 만료되었습니다. 다시 로그인하세요.');
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API 오류 ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
  }

  // ---------- OAuth (수동 implicit 플로우) ----------
  function generateState() {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  function startLogin() {
    const oauthState = generateState();
    sessionStorage.setItem(STATE_STORAGE_KEY, oauthState);
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'token',
      scope: SCOPES,
      include_granted_scopes: 'true',
      state: oauthState,
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  function handleOAuthReturn() {
    // 리디렉트 후 URL 해시에 access_token이 포함됨
    if (!location.hash || location.hash.length < 2) return false;
    const hash = new URLSearchParams(location.hash.slice(1));
    const token = hash.get('access_token');
    if (!token) {
      const err = hash.get('error');
      if (err) {
        toast(`OAuth 오류: ${err}`, 'error', 6000);
        history.replaceState(null, '', location.pathname);
      }
      return false;
    }
    const returnedState = hash.get('state');
    const storedState = sessionStorage.getItem(STATE_STORAGE_KEY);
    if (!returnedState || returnedState !== storedState) {
      toast('state 검증 실패 (CSRF 방지)', 'error', 5000);
      history.replaceState(null, '', location.pathname);
      return false;
    }
    sessionStorage.removeItem(STATE_STORAGE_KEY);
    const expiresIn = parseInt(hash.get('expires_in') || '3600', 10);
    const expiresAt = Date.now() + expiresIn * 1000;
    state.accessToken = token;
    state.tokenExpiresAt = expiresAt;
    sessionStorage.setItem(
      TOKEN_STORAGE_KEY,
      JSON.stringify({ token, expiresAt }),
    );
    history.replaceState(null, '', location.pathname);
    setAuthState(true);
    toast('인증되었습니다.', 'success');
    return true;
  }

  function restoreTokenFromStorage() {
    try {
      const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
      if (!raw) return false;
      const { token, expiresAt } = JSON.parse(raw);
      if (!token || !expiresAt || Date.now() >= expiresAt - 60000) {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        return false;
      }
      state.accessToken = token;
      state.tokenExpiresAt = expiresAt;
      setAuthState(true);
      return true;
    } catch (e) {
      return false;
    }
  }

  function initAuth() {
    // 1. 리디렉트 복귀 확인
    if (handleOAuthReturn()) return;
    // 2. sessionStorage의 기존 토큰 복원
    if (restoreTokenFromStorage()) return;
    // 3. 미인증 초기 상태
    setAuthState(false);
  }

  function setAuthState(authed) {
    if (authed) {
      els.authStatus.textContent = '인증됨';
      els.authStatus.className = 'auth-pill ok';
      els.btnLogin.hidden = true;
      els.btnLogout.hidden = false;
      els.btnLoadVideos.disabled = false;
    } else {
      state.accessToken = null;
      state.tokenExpiresAt = 0;
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      els.authStatus.textContent = '미인증';
      els.authStatus.className = 'auth-pill pending';
      els.btnLogin.hidden = false;
      els.btnLogout.hidden = true;
      els.btnLoadVideos.disabled = true;
      els.btnLoadAnalytics.disabled = true;
    }
  }

  async function logout() {
    if (state.accessToken) {
      // 토큰 취소 (선택)
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(state.accessToken)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
      } catch (e) {
        /* 무시 */
      }
    }
    setAuthState(false);
    toast('로그아웃했습니다.', 'info');
  }

  // ---------- YouTube API 래퍼 ----------
  async function getChannelInfo() {
    const data = await ytFetch(`${YT_API}/channels?part=contentDetails&mine=true`);
    if (!data.items || !data.items.length) {
      throw new Error('채널을 찾을 수 없습니다.');
    }
    const channel = data.items[0];
    return {
      channelId: channel.id,
      uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads,
    };
  }

  async function getAllVideoIds(playlistId, onProgress) {
    const ids = [];
    let pageToken = null;
    do {
      const url = new URL(`${YT_API}/playlistItems`);
      url.searchParams.set('part', 'contentDetails');
      url.searchParams.set('playlistId', playlistId);
      url.searchParams.set('maxResults', '50');
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const data = await ytFetch(url.toString());
      for (const item of data.items || []) {
        ids.push(item.contentDetails.videoId);
      }
      pageToken = data.nextPageToken || null;
      if (onProgress) onProgress(ids.length);
    } while (pageToken);
    return ids;
  }

  function parseDurationSec(isoDur) {
    const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(isoDur || '');
    if (!m) return 0;
    const h = parseInt(m[1] || '0', 10);
    const mi = parseInt(m[2] || '0', 10);
    const s = parseInt(m[3] || '0', 10);
    return h * 3600 + mi * 60 + s;
  }

  async function getVideoDetails(ids, onProgress) {
    const out = [];
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      const url = new URL(`${YT_API}/videos`);
      url.searchParams.set('part', 'snippet,contentDetails');
      url.searchParams.set('id', batch.join(','));
      const data = await ytFetch(url.toString());
      for (const v of data.items || []) {
        const snippet = v.snippet || {};
        const thumbs = snippet.thumbnails || {};
        const thumb = (thumbs.medium || thumbs.default || {}).url || '';
        const desc = snippet.description || '';
        const publishedRaw = snippet.publishedAt || '';
        const publishedAt = publishedRaw.slice(0, 10);
        const durSec = parseDurationSec((v.contentDetails || {}).duration);
        out.push({
          videoId: v.id,
          title: snippet.title || '',
          thumbnailUrl: thumb,
          description: desc,
          originalDescription: desc,
          pinnedCommentId: null,
          pinnedCommentText: '',
          originalPinnedComment: '',
          publishedAt,
          isShort: durSec <= 120 && durSec > 0,
          commentsDisabled: false,
          views: null,
          snippetCategoryId: snippet.categoryId || null,
          snippetTags: snippet.tags || null,
          snippetDefaultLanguage: snippet.defaultLanguage || null,
          snippetDefaultAudioLanguage: snippet.defaultAudioLanguage || null,
        });
      }
      if (onProgress) onProgress(Math.min(i + 50, ids.length), ids.length);
    }
    return out;
  }

  // 핀댓글 식별 한계: YouTube API v3는 핀고정 여부를 직접 알려주는 필드가 없다.
  // relevance 정렬 상위 N개 중 채널 주인 댓글을 핀댓글로 간주하는 휴리스틱 사용.
  // maxResults를 충분히 키워(30) 정확도를 높였지만, 채널 주인이 일반 댓글을
  // 다수 단 영상에서는 일반 댓글이 잘못 매칭될 수 있다. 따라서 저장 전 사용자가
  // 카드에서 텍스트를 직접 확인해야 한다 (UI상 핀댓글 섹션에 안내).
  const PINNED_COMMENT_PROBE_LIMIT = 30;

  async function getPinnedComment(videoId, channelId) {
    const url = new URL(`${YT_API}/commentThreads`);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('videoId', videoId);
    url.searchParams.set('order', 'relevance');
    url.searchParams.set('maxResults', String(PINNED_COMMENT_PROBE_LIMIT));
    try {
      const data = await ytFetch(url.toString());
      for (const thread of data.items || []) {
        const top = thread.snippet.topLevelComment.snippet;
        const authorId = (top.authorChannelId || {}).value;
        if (authorId === channelId) {
          return {
            id: thread.id,
            text: top.textOriginal || top.textDisplay || '',
            disabled: false,
            error: null,
          };
        }
      }
      return { id: null, text: '', disabled: false, error: null };
    } catch (err) {
      // commentsDisabled = 영상 자체가 댓글 비활성. 정상 처리.
      if (/commentsDisabled/.test(err.message)) {
        return { id: null, text: '', disabled: true, error: null };
      }
      // 그 외 에러(네트워크/인증/quota 등)는 명시적으로 노출.
      // 호출자가 알 수 있도록 error 필드 채워서 반환 (throw하면 한 영상 실패로 전체 로드 중단됨).
      return { id: null, text: '', disabled: false, error: err.message };
    }
  }

  // YouTube Analytics API: 1회 호출당 maxResults 상한 200. 영상이 그보다 많으면
  // startIndex로 페이지네이션. YouTube 채널 생성 가능 최초 시점(2005)부터 집계해서
  // 누락 없도록 한다.
  const ANALYTICS_PAGE_SIZE = 200;
  const ANALYTICS_START_DATE = '2005-01-01';

  async function getVideoAnalytics(videoIds) {
    const today = new Date().toISOString().slice(0, 10);
    const result = {};
    const idSet = new Set(videoIds);
    let startIndex = 1;
    while (true) {
      const url = new URL(`${YTA_API}/reports`);
      url.searchParams.set('ids', 'channel==MINE');
      url.searchParams.set('startDate', ANALYTICS_START_DATE);
      url.searchParams.set('endDate', today);
      url.searchParams.set('metrics', 'views,averageViewDuration');
      url.searchParams.set('dimensions', 'video');
      url.searchParams.set('sort', '-views');
      url.searchParams.set('maxResults', String(ANALYTICS_PAGE_SIZE));
      url.searchParams.set('startIndex', String(startIndex));
      const data = await ytFetch(url.toString());
      const headers = (data.columnHeaders || []).map((h) => h.name);
      const rows = data.rows || [];
      for (const row of rows) {
        const obj = Object.fromEntries(headers.map((h, i) => [h, row[i]]));
        if (idSet.has(obj.video)) {
          result[obj.video] = {
            views: parseInt(obj.views || 0, 10),
          };
        }
      }
      if (rows.length < ANALYTICS_PAGE_SIZE) break;
      startIndex += ANALYTICS_PAGE_SIZE;
      // 모든 비디오를 이미 채웠으면 중단 (API 호출 절약)
      if (Object.keys(result).length >= videoIds.length) break;
    }
    return result;
  }

  async function updateVideoDescription(item) {
    // snippet.title + categoryId가 update 시 필수 필드
    const body = {
      id: item.videoId,
      snippet: {
        title: item.title,
        description: item.description,
        categoryId: item.snippetCategoryId || '22',
      },
    };
    if (item.snippetTags) body.snippet.tags = item.snippetTags;
    if (item.snippetDefaultLanguage) body.snippet.defaultLanguage = item.snippetDefaultLanguage;
    if (item.snippetDefaultAudioLanguage) body.snippet.defaultAudioLanguage = item.snippetDefaultAudioLanguage;
    await ytFetch(`${YT_API}/videos?part=snippet`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async function updatePinnedComment(item) {
    if (!item.pinnedCommentId) return;
    await ytFetch(`${YT_API}/comments?part=snippet`, {
      method: 'PUT',
      body: JSON.stringify({
        id: item.pinnedCommentId,
        snippet: {
          textOriginal: item.pinnedCommentText,
        },
      }),
    });
  }

  // ---------- 데이터 로드 플로우 ----------
  async function loadVideos() {
    if (!state.accessToken) return;
    els.btnLoadVideos.disabled = true;
    els.loadProgress.hidden = false;

    try {
      setLoadProgress(5, '채널 정보 가져오는 중...');
      const { channelId, uploadsPlaylistId } = await getChannelInfo();
      state.channelId = channelId;
      state.uploadsPlaylistId = uploadsPlaylistId;

      setLoadProgress(15, '영상 ID 수집 중...');
      const ids = await getAllVideoIds(uploadsPlaylistId, (n) => {
        setLoadProgress(15 + Math.min(20, n / 10), `영상 ID ${n}개 수집됨`);
      });
      if (!ids.length) {
        toast('업로드된 영상이 없습니다.', 'info');
        return;
      }

      setLoadProgress(35, `영상 상세 정보 가져오는 중... (${ids.length}개)`);
      const videos = await getVideoDetails(ids, (done, total) => {
        setLoadProgress(35 + (done / total) * 30, `상세 ${done}/${total}`);
      });

      setLoadProgress(65, '핀댓글 확인 중...');
      let pinnedDone = 0;
      const pinnedErrors = [];
      for (const item of videos) {
        const pin = await getPinnedComment(item.videoId, channelId);
        item.pinnedCommentId = pin.id;
        item.pinnedCommentText = pin.text;
        item.originalPinnedComment = pin.text;
        item.commentsDisabled = pin.disabled;
        if (pin.error) pinnedErrors.push({ title: item.title, error: pin.error });
        pinnedDone += 1;
        setLoadProgress(65 + (pinnedDone / videos.length) * 30, `핀댓글 ${pinnedDone}/${videos.length}`);
      }

      state.videos = videos;
      setLoadProgress(100, '완료');
      if (pinnedErrors.length) {
        toast(
          `영상 ${videos.length}개 로드 (핀댓글 ${pinnedErrors.length}건 조회 실패 — 콘솔 확인)`,
          'error',
          6000,
        );
        console.error('핀댓글 조회 실패:', pinnedErrors);
      } else {
        toast(`영상 ${videos.length}개 로드 완료`, 'success');
      }
      els.btnLoadAnalytics.disabled = false;
      els.btnExportExcel.disabled = false;
      buildDateFilters();
      renderVideoList();
    } catch (err) {
      console.error(err);
      toast(err.message, 'error');
    } finally {
      els.btnLoadVideos.disabled = !state.accessToken;
      setTimeout(() => {
        els.loadProgress.hidden = true;
        setLoadProgress(0, '');
      }, 800);
    }
  }

  async function loadAnalytics() {
    if (!state.videos.length) return;
    els.btnLoadAnalytics.disabled = true;
    try {
      const ids = state.videos.map((v) => v.videoId);
      const analytics = await getVideoAnalytics(ids);
      for (const item of state.videos) {
        const a = analytics[item.videoId] || {};
        item.views = a.views != null ? a.views : null;
      }
      toast('조회수 데이터 로드 완료', 'success');
      renderVideoList();
    } catch (err) {
      console.error(err);
      toast(`분석 데이터 오류: ${err.message}`, 'error');
    } finally {
      els.btnLoadAnalytics.disabled = false;
    }
  }

  function setLoadProgress(pct, text) {
    els.loadProgressFill.style.width = `${pct}%`;
    els.loadProgressText.textContent = text;
  }

  function setSaveProgress(pct, text) {
    els.saveProgressFill.style.width = `${pct}%`;
    els.saveProgressText.textContent = text;
  }

  // ---------- 변경 추적 ----------
  function isChanged(item) {
    return (
      item.description !== item.originalDescription ||
      (item.pinnedCommentText !== item.originalPinnedComment && item.pinnedCommentId)
    );
  }

  function updateChangeCount() {
    const n = state.videos.filter(isChanged).length;
    els.changeCount.textContent = String(n);
    els.btnSave.disabled = n === 0;
  }

  // ---------- 필터 ----------
  function buildDateFilters() {
    const years = new Set();
    const months = new Set();
    for (const v of state.videos) {
      if (v.publishedAt) {
        years.add(v.publishedAt.slice(0, 4));
        months.add(v.publishedAt.slice(5, 7));
      }
    }
    els.filterYears.innerHTML = [...years]
      .sort((a, b) => b.localeCompare(a))
      .map((y) => `<label class="checkbox"><input type="checkbox" data-year="${y}"> ${y}</label>`)
      .join('');
    els.filterMonths.innerHTML = [...months]
      .sort()
      .map((m) => `<label class="checkbox"><input type="checkbox" data-month="${m}"> ${parseInt(m, 10)}월</label>`)
      .join('');
    els.filterYears.querySelectorAll('input').forEach((cb) => {
      cb.addEventListener('change', () => {
        if (cb.checked) state.filters.years.add(cb.dataset.year);
        else state.filters.years.delete(cb.dataset.year);
        renderVideoList();
      });
    });
    els.filterMonths.querySelectorAll('input').forEach((cb) => {
      cb.addEventListener('change', () => {
        if (cb.checked) state.filters.months.add(cb.dataset.month);
        else state.filters.months.delete(cb.dataset.month);
        renderVideoList();
      });
    });
  }

  function filteredVideos() {
    const f = state.filters;
    const q = f.search.toLowerCase();
    return state.videos.filter((v) => {
      if (q && !v.title.toLowerCase().includes(q)) return false;
      if (f.years.size && !f.years.has((v.publishedAt || '').slice(0, 4))) return false;
      if (f.months.size && !f.months.has((v.publishedAt || '').slice(5, 7))) return false;
      if (!f.includeShorts && v.isShort) return false;
      if (f.changedOnly && !isChanged(v)) return false;
      return true;
    });
  }

  // ---------- 렌더링 ----------
  function renderVideoList() {
    const list = filteredVideos();
    els.videoCount.textContent = `영상 ${list.length} / ${state.videos.length}개`;
    if (!state.videos.length) {
      els.videoList.innerHTML = '<div class="empty-state"><p>영상 목록을 먼저 로드하세요.</p></div>';
      return;
    }
    if (!list.length) {
      els.videoList.innerHTML = '<div class="empty-state"><p>필터 조건에 맞는 영상이 없습니다.</p></div>';
      return;
    }
    els.videoList.innerHTML = list.map(renderVideoCard).join('');
    // 이벤트 바인딩 (이벤트 위임)
    els.videoList.querySelectorAll('textarea[data-field]').forEach((ta) => {
      ta.addEventListener('input', onFieldInput);
    });
    updateChangeCount();
  }

  function escapeHtml(s) {
    const el = document.createElement('div');
    el.textContent = s == null ? '' : String(s);
    return el.innerHTML;
  }

  function renderVideoCard(v) {
    const badges = [];
    if (v.description !== v.originalDescription) badges.push('설명글 수정');
    if (v.pinnedCommentText !== v.originalPinnedComment && v.pinnedCommentId) badges.push('핀댓글 수정');
    const badgeHtml = badges.length
      ? `<div class="video-badges">${badges.map((b) => `<span class="badge">${b}</span>`).join('')}</div>`
      : '';
    const stats = [];
    if (v.views != null) stats.push(`조회수 ${v.views.toLocaleString()}`);
    if (v.isShort) stats.push('Shorts');
    const descChanged = v.description !== v.originalDescription ? ' changed' : '';
    const commentChanged = v.pinnedCommentText !== v.originalPinnedComment ? ' changed' : '';

    const commentBlock = v.commentsDisabled
      ? '<div class="disabled-note">댓글 비활성화 영상입니다.</div>'
      : v.pinnedCommentId
      ? `<textarea data-field="comment" data-id="${v.videoId}" class="${commentChanged.trim()}">${escapeHtml(v.pinnedCommentText)}</textarea>`
      : '<div class="disabled-note">핀댓글 없음 (새 핀고정은 YouTube Studio에서 설정)</div>';

    return `
      <article class="video-card" data-id="${v.videoId}">
        <div>
          ${v.thumbnailUrl ? `<img class="video-thumb" src="${v.thumbnailUrl}" alt="">` : '<div class="video-thumb"></div>'}
          ${v.publishedAt ? `<span class="video-date">${v.publishedAt}</span>` : ''}
        </div>
        <div class="video-body">
          <div class="video-title"><a href="https://youtu.be/${v.videoId}" target="_blank" rel="noopener">${escapeHtml(v.title)}</a></div>
          ${badgeHtml}
          ${stats.length ? `<div class="video-stats">${stats.map(escapeHtml).join(' · ')}</div>` : ''}
          <details class="field">
            <summary>설명글</summary>
            <textarea data-field="description" data-id="${v.videoId}" rows="6" class="${descChanged.trim()}">${escapeHtml(v.description)}</textarea>
          </details>
          <details class="field">
            <summary>핀댓글</summary>
            ${commentBlock}
          </details>
        </div>
      </article>
    `;
  }

  function onFieldInput(e) {
    const ta = e.target;
    const id = ta.dataset.id;
    const field = ta.dataset.field;
    const v = state.videos.find((x) => x.videoId === id);
    if (!v) return;
    if (field === 'description') {
      v.description = ta.value;
      ta.classList.toggle('changed', v.description !== v.originalDescription);
    } else if (field === 'comment') {
      v.pinnedCommentText = ta.value;
      ta.classList.toggle('changed', v.pinnedCommentText !== v.originalPinnedComment);
    }
    // 배지 갱신
    const card = ta.closest('.video-card');
    const badgesContainer = card.querySelector('.video-badges');
    const badges = [];
    if (v.description !== v.originalDescription) badges.push('설명글 수정');
    if (v.pinnedCommentText !== v.originalPinnedComment && v.pinnedCommentId) badges.push('핀댓글 수정');
    const badgeHtml = badges.map((b) => `<span class="badge">${b}</span>`).join('');
    if (badgesContainer) {
      if (badges.length) badgesContainer.innerHTML = badgeHtml;
      else badgesContainer.remove();
    } else if (badges.length) {
      const div = document.createElement('div');
      div.className = 'video-badges';
      div.innerHTML = badgeHtml;
      card.querySelector('.video-title').after(div);
    }
    updateChangeCount();
  }

  // ---------- 저장 ----------
  // 필드 단위 원자성: 설명글 저장에 성공한 직후 originalDescription을 갱신해서,
  // 핀댓글 저장이 실패해도 다음 재시도 때 설명글이 다시 호출되지 않도록 한다.
  async function saveChanges() {
    const changed = state.videos.filter(isChanged);
    if (!changed.length) return;
    if (!confirm(`${changed.length}개 영상의 변경사항을 저장합니다. 계속할까요?`)) return;
    els.btnSave.disabled = true;
    els.saveProgress.hidden = false;
    setSaveProgress(0, `0/${changed.length}`);
    let success = 0;
    const failed = [];
    for (let i = 0; i < changed.length; i += 1) {
      const item = changed[i];
      const itemErrors = [];
      // 설명글 저장 + 즉시 original 갱신
      if (item.description !== item.originalDescription) {
        try {
          await updateVideoDescription(item);
          item.originalDescription = item.description;
        } catch (err) {
          console.error(err);
          itemErrors.push(`설명글: ${err.message}`);
        }
      }
      // 핀댓글 저장 + 즉시 original 갱신 (설명글 결과와 독립)
      if (
        item.pinnedCommentText !== item.originalPinnedComment &&
        !item.commentsDisabled &&
        item.pinnedCommentId
      ) {
        try {
          await updatePinnedComment(item);
          item.originalPinnedComment = item.pinnedCommentText;
        } catch (err) {
          console.error(err);
          itemErrors.push(`핀댓글: ${err.message}`);
        }
      }
      if (itemErrors.length) {
        failed.push({ title: item.title, errors: itemErrors });
      } else {
        success += 1;
      }
      setSaveProgress(((i + 1) / changed.length) * 100, `${i + 1}/${changed.length}`);
    }
    if (failed.length) {
      toast(`저장 완료: ${success}건 성공, ${failed.length}건 실패`, 'error', 6000);
      console.error('실패:', failed);
    } else {
      toast(`저장 완료: ${success}건 성공`, 'success');
    }
    updateChangeCount();
    renderVideoList();
    setTimeout(() => {
      els.saveProgress.hidden = true;
    }, 1200);
  }

  // ---------- 텍스트 교체 ----------
  function previewReplace() {
    const oldStr = els.replaceOld.value;
    const applyDesc = els.replaceDesc.checked;
    const applyComment = els.replaceComment.checked;
    if (!oldStr) return;
    let count = 0;
    const samples = [];
    for (const v of state.videos) {
      const hits = [];
      if (applyDesc && v.description.includes(oldStr)) hits.push('설명글');
      if (applyComment && v.pinnedCommentId && !v.commentsDisabled && v.pinnedCommentText.includes(oldStr)) hits.push('핀댓글');
      if (hits.length) {
        count += 1;
        if (samples.length < 5) samples.push(`${v.title} (${hits.join(', ')})`);
      }
    }
    if (count === 0) {
      toast('해당 텍스트를 포함한 영상이 없습니다.', 'info');
      return;
    }
    const sampleText = samples.join('\n') + (count > samples.length ? `\n...외 ${count - samples.length}개` : '');
    toast(`${count}개 영상에 적용됩니다.\n${sampleText}`, 'info', 6000);
  }

  function applyReplace() {
    const oldStr = els.replaceOld.value;
    const newStr = els.replaceNew.value;
    const applyDesc = els.replaceDesc.checked;
    const applyComment = els.replaceComment.checked;
    if (!oldStr) return;
    let count = 0;
    for (const v of state.videos) {
      let changed = false;
      if (applyDesc && v.description.includes(oldStr)) {
        v.description = v.description.split(oldStr).join(newStr);
        changed = true;
      }
      if (applyComment && v.pinnedCommentId && !v.commentsDisabled && v.pinnedCommentText.includes(oldStr)) {
        v.pinnedCommentText = v.pinnedCommentText.split(oldStr).join(newStr);
        changed = true;
      }
      if (changed) count += 1;
    }
    if (count === 0) {
      toast('교체할 영상이 없습니다.', 'info');
      return;
    }
    toast(`${count}개 영상에 텍스트를 교체했습니다. (아직 저장 전)`, 'success');
    renderVideoList();
  }

  // ---------- Excel ----------
  function exportExcel() {
    if (!window.XLSX) {
      toast('SheetJS 로드 실패', 'error');
      return;
    }
    const list = filteredVideos();
    const rows = [['제목', 'URL', '게시일', '구분', '조회수', '설명글', '핀댓글']];
    for (const v of list) {
      rows.push([
        v.title,
        `https://youtu.be/${v.videoId}`,
        v.publishedAt || '',
        v.isShort ? '쇼츠' : '일반',
        v.views != null ? v.views : '',
        v.description,
        v.commentsDisabled ? '' : v.pinnedCommentText,
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '영상 목록');
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    XLSX.writeFile(wb, `YTBulkEditor_${today}.xlsx`);
    toast(`${list.length}개 영상을 엑셀로 내보냈습니다.`, 'success');
  }

  // ---------- 이벤트 바인딩 ----------
  function bindEvents() {
    els.btnLogin.addEventListener('click', startLogin);
    els.btnLogout.addEventListener('click', logout);
    els.btnLoadVideos.addEventListener('click', loadVideos);
    els.btnLoadAnalytics.addEventListener('click', loadAnalytics);
    els.btnSave.addEventListener('click', saveChanges);
    els.btnPreviewReplace.addEventListener('click', previewReplace);
    els.btnApplyReplace.addEventListener('click', applyReplace);
    els.btnExportExcel.addEventListener('click', exportExcel);

    els.searchInput.addEventListener('input', (e) => {
      state.filters.search = e.target.value;
      renderVideoList();
    });
    els.filterChanged.addEventListener('change', (e) => {
      state.filters.changedOnly = e.target.checked;
      renderVideoList();
    });
    els.filterShorts.addEventListener('change', (e) => {
      state.filters.includeShorts = e.target.checked;
      renderVideoList();
    });
    els.replaceOld.addEventListener('input', () => {
      const has = els.replaceOld.value.length > 0 && state.videos.length > 0;
      els.btnPreviewReplace.disabled = !has;
      els.btnApplyReplace.disabled = !has;
    });

    // Ctrl/Cmd + S 로 저장
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (!els.btnSave.disabled) saveChanges();
      }
    });

    // 이탈 경고
    window.addEventListener('beforeunload', (e) => {
      if (state.videos.some(isChanged)) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  // ---------- 초기화 ----------
  document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    initAuth();
  });
})();
