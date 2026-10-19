(function () {
  var GA_ID = 'G-L89MYRXFG3';
  var CLARITY_ID = 'w3oagjscnh';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  function appendScript(src, onload) {
    if (document.querySelector('script[src="' + src + '"]')) return;
    var script = document.createElement('script');
    script.async = true;
    script.src = src;
    if (onload) script.onload = onload;
    document.head.appendChild(script);
  }

  function initGa() {
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, {
      linker: {
        domains: ['lst9485-alt.github.io', 'ourdongne.com']
      }
    });
  }

  function initClarity() {
    if (window.clarity) return;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r);
      t.async = 1;
      t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_ID);
  }

  function isSeen(entry) {
    var viewportH = entry.rootBounds ? entry.rootBounds.height : window.innerHeight;
    return entry.intersectionRatio >= 0.45 || entry.intersectionRect.height >= viewportH * 0.45;
  }

  function trackSections() {
    if (!('IntersectionObserver' in window)) return;
    var seen = {};
    var sections = document.querySelectorAll('[data-section]');
    if (!sections.length) return;

    // 구역의 45%가 보이거나, 화면의 45%를 채우면 본 것으로 센다.
    // 화면보다 2배 넘게 긴 구역은 45%가 한 번에 보일 수 없어서 뒤쪽 조건이 필요하다.
    var thresholds = [];
    for (var t = 0; t <= 20; t++) thresholds.push(t / 20);

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        if (!isSeen(entry)) return;
        var name = entry.target.getAttribute('data-section');
        if (!name || seen[name]) return;
        seen[name] = true;
        window.gtag('event', 'section_view', {
          section_name: name,
          page_path: window.location.pathname
        });
      });
    }, { threshold: thresholds });

    sections.forEach(function (section) {
      observer.observe(section);
    });

    trackSectionTime(sections);
  }

  // 구역별 머문 시간: 화면 가운데 줄에 걸린 구역을 "보는 중"으로 친다.
  // 가운데 줄이 다른 구역으로 넘어갈 때와 화면을 떠날 때만 계산하므로 스크롤할 때 느려지지 않는다.
  // 화면을 떠날 때(탭 숨김·닫기) section_time 이벤트로 구역마다 초를 value에 실어 보낸다.
  function trackSectionTime(sections) {
    var current = null;
    var since = 0;
    var spent = {};

    function stop() {
      if (current && since) spent[current] = (spent[current] || 0) + (Date.now() - since);
      since = 0;
    }

    function start(name) {
      current = name;
      since = document.visibilityState === 'visible' ? Date.now() : 0;
    }

    function flush() {
      Object.keys(spent).forEach(function (name) {
        var sec = Math.min(Math.round(spent[name] / 1000), 600); // 켜 두고 자리를 뜬 경우는 10분에서 자름
        if (sec < 1) return;
        window.gtag('event', 'section_time', {
          section_name: name,
          value: sec,
          page_path: window.location.pathname,
          transport_type: 'beacon'
        });
      });
      spent = {};
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var name = entry.target.getAttribute('data-section');
        if (!name) return;
        if (entry.isIntersecting) {
          stop();
          start(name);
        } else if (name === current) {
          stop();
          current = null;
        }
      });
    }, { rootMargin: '-50% 0px -49% 0px' });

    sections.forEach(function (section) {
      observer.observe(section);
    });

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        stop();
        flush();
      } else if (current) {
        since = Date.now();
      }
    });
    window.addEventListener('pagehide', function () {
      stop();
      flush();
    });
  }

  // 반송률용: 화면을 보고 있는 시간이 10초를 넘으면 stay_10s를 한 번 보낸다(구글 애널리틱스 기본 반송 기준과 같은 10초).
  // 구글이 주는 반송률은 counsel_visit(광고 전환용 중요 행동) 때문에 거의 0%로 나와서 따로 센다.
  function trackStay10s() {
    var left = 10000;
    var since = 0;
    var timer = null;
    var openedAt = Date.now();

    function send() {
      left = 0;
      timer = null;
      // 뒤에 열어 두고 25분 넘게 지나 처음 보면 구글이 새 방문으로 세서 숫자가 갈라진다 → 그때는 안 보낸다
      if (Date.now() - openedAt > 25 * 60 * 1000) return;
      window.gtag('event', 'stay_10s', { page_path: window.location.pathname });
    }

    function run() {
      if (left <= 0 || timer || document.visibilityState !== 'visible') return;
      since = Date.now();
      timer = setTimeout(send, left);
    }

    function pause() {
      if (!timer) return;
      clearTimeout(timer);
      timer = null;
      left -= Date.now() - since;
      if (left <= 0) send(); // 10초가 찼는데 타이머가 늦게 돌기 전에 화면을 떠난 경우
    }

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') pause();
      else run();
    });
    run();
  }

  appendScript('https://www.googletagmanager.com/gtag/js?id=' + GA_ID, initGa);
  trackStay10s();
  initClarity();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackSections, { once: true });
  } else {
    trackSections();
  }
})();
