(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CompoundCalculator = api;
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', api.initApp);
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  var DEFAULTS = {
    principal: 1000,
    monthly: 0,
    annualRate: 5,
    years: 10,
    mode: 'compound'
  };
  var RATE_MIN = 0;
  var RATE_MAX = 30;
  var YEARS_MIN = 1;
  var YEARS_MAX = 50;

  var chart = null;
  var toastTimer = null;
  var tableExpanded = false;
  var lastResult = null;
  var projectionView = 'chart';
  var calcMode = 'compound';

  function qs(id) {
    return document.getElementById(id);
  }

  function toNumber(value, fallback) {
    if (fallback == null) fallback = 0;
    var cleaned = String(value == null ? '' : value).replace(/,/g, '').replace(/\s/g, '').trim();
    if (cleaned === '') return fallback;
    if (cleaned.indexOf('억') !== -1 || cleaned.indexOf('천') !== -1) {
      var total = 0;
      var rest = cleaned;
      var eok = rest.match(/(-?\d+(?:\.\d+)?)억/);
      if (eok) {
        total += Number(eok[1]) * 10000;
        rest = rest.slice(rest.indexOf(eok[0]) + eok[0].length);
      }
      var cheon = rest.match(/(-?\d+(?:\.\d+)?)천/);
      if (cheon) {
        total += Number(cheon[1]) * 1000;
        rest = rest.slice(rest.indexOf(cheon[0]) + cheon[0].length);
      }
      var man = rest.match(/(-?\d+(?:\.\d+)?)/);
      if (man) total += Number(man[1]);
      return isFinite(total) ? total : fallback;
    }
    if (cleaned.indexOf('만') !== -1) {
      cleaned = cleaned.replace(/만원|만/g, '');
    }
    var parsed = Number(cleaned);
    return isFinite(parsed) ? parsed : fallback;
  }

  function formatInput(value) {
    return Math.round(toNumber(value, 0)).toLocaleString('ko-KR');
  }

  function formatMoney(manwon) {
    var sign = manwon < 0 ? '-' : '';
    var n = Math.abs(manwon);
    if (n >= 10000) return sign + (n / 10000).toFixed(1).replace(/\.0$/, '') + '억원';
    return sign + Math.round(n).toLocaleString('ko-KR') + '만원';
  }

  function formatTableMoney(manwon) {
    if (manwon == null) return '-';
    return Math.round(manwon).toLocaleString('ko-KR');
  }

  function normalizeConfig(raw) {
    var cfg = Object.assign({}, DEFAULTS, raw || {});
    cfg.principal = Math.max(0, toNumber(cfg.principal, DEFAULTS.principal));
    cfg.monthly = Math.max(0, toNumber(cfg.monthly, DEFAULTS.monthly));
    cfg.annualRate = Math.max(RATE_MIN, Math.min(RATE_MAX, toNumber(cfg.annualRate, DEFAULTS.annualRate)));
    cfg.years = Math.max(YEARS_MIN, Math.min(YEARS_MAX, Math.round(toNumber(cfg.years, DEFAULTS.years))));
    cfg.mode = cfg.mode === 'simple' ? 'simple' : 'compound';
    return cfg;
  }

  function calculateCompound(rawConfig) {
    var cfg = normalizeConfig(rawConfig);
    var rate = cfg.annualRate / 100;
    var i = rate / 12;
    var rows = [];
    for (var y = 0; y <= cfg.years; y += 1) {
      var m = y * 12;
      var paid = cfg.principal + cfg.monthly * m;
      var lumpPart;
      var instPart;
      if (cfg.mode === 'simple') {
        lumpPart = cfg.principal * (1 + rate * y);
        instPart = cfg.monthly * m + cfg.monthly * i * (m * (m + 1) / 2);
      } else {
        lumpPart = cfg.principal * Math.pow(1 + rate, y);
        instPart = (m === 0 || i === 0) ? cfg.monthly * m : cfg.monthly * ((Math.pow(1 + i, m) - 1) / i);
      }
      var amount = lumpPart + instPart;
      rows.push({ year: y, networth: amount, principalLine: paid, interest: amount - paid });
    }
    var last = rows[rows.length - 1];
    var totalPaid = last.principalLine;
    return {
      config: cfg,
      rows: rows,
      finalAmount: last.networth,
      totalPaid: totalPaid,
      totalInterest: last.networth - totalPaid,
      multiple: totalPaid > 0 ? last.networth / totalPaid : 1
    };
  }

  function readConfigFromDom() {
    return normalizeConfig({
      principal: qs('principal').value,
      monthly: qs('monthly').value,
      annualRate: qs('annualRate').value,
      years: qs('years').value,
      mode: calcMode
    });
  }

  function setMode(mode) {
    calcMode = mode === 'simple' ? 'simple' : 'compound';
    document.querySelectorAll('[data-mode]').forEach(function (btn) {
      var active = btn.dataset.mode === calcMode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function writeConfigToDom(cfg) {
    cfg = normalizeConfig(cfg);
    qs('principal').value = formatInput(cfg.principal);
    qs('monthly').value = formatInput(cfg.monthly);
    qs('annualRate').value = cfg.annualRate;
    qs('years').value = cfg.years;
    if (qs('annualRateRange')) qs('annualRateRange').value = cfg.annualRate;
    if (qs('yearsRange')) qs('yearsRange').value = cfg.years;
    setMode(cfg.mode);
  }

  function setText(id, value) {
    var el = qs(id);
    if (el) el.textContent = value;
  }

  function renderSummary(result) {
    var cfg = result.config;
    var modeWord = cfg.mode === 'simple' ? '단리' : '복리';
    setText('resultKicker', cfg.years + '년 뒤');
    setText('finalAmount', formatMoney(result.finalAmount));
    setText('resultSummary', '넣은 돈 ' + formatMoney(result.totalPaid) + ' · 불어난 돈 ' + formatMoney(result.totalInterest));

    var insight = qs('insightCard');
    if (!insight) return;
    var how;
    if (cfg.principal > 0 && cfg.monthly > 0) {
      how = '원금 ' + formatMoney(cfg.principal) + '에 매달 ' + formatMoney(cfg.monthly) + '씩';
    } else if (cfg.monthly > 0) {
      how = '매달 ' + formatMoney(cfg.monthly) + '씩';
    } else {
      how = '원금 ' + formatMoney(cfg.principal) + '을';
    }
    if (cfg.annualRate <= 0) {
      insight.textContent = '수익률이 0%면 돈이 불어나지 않습니다. 수익률을 올려 ' + modeWord + ' 효과를 확인해 보세요.';
    } else {
      var finHtml = '<b class="hl">' + formatMoney(result.finalAmount) + '</b>';
      var grewHtml = '<b class="hl">' + formatMoney(result.totalInterest) + '</b>';
      insight.innerHTML = how + ' 연 ' + cfg.annualRate + '%로 ' + cfg.years + '년 넣으면(' + modeWord + ' 기준) ' + finHtml + '. 넣은 돈 ' + formatMoney(result.totalPaid) + ', 불어난 돈 ' + grewHtml + '입니다.';
    }
  }

  function setProjectionView(view) {
    projectionView = view || 'chart';
    var card = qs('projectionCard');
    if (card) card.classList.toggle('is-table', projectionView === 'table');
    document.querySelectorAll('[data-projection-view]').forEach(function (button) {
      var active = button.dataset.projectionView === projectionView;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function renderChart(result) {
    if (typeof Chart === 'undefined') return;
    var modeWord = result.config.mode === 'simple' ? '단리' : '복리';
    setText('chartTitle', '수익률 차트');

    var labels = result.rows.map(function (row) { return row.year + '년'; });
    var datasets = [
      {
        label: '  넣은 돈',
        data: result.rows.map(function (row) { return Math.round(row.principalLine); }),
        borderColor: '#9a93c4',
        backgroundColor: 'rgba(154,147,196,.08)',
        borderWidth: 2,
        borderDash: [4, 4],
        pointRadius: 0,
        tension: 0,
        fill: false
      },
      {
        label: '  ' + modeWord,
        data: result.rows.map(function (row) { return Math.round(row.networth); }),
        borderColor: '#5b2df0',
        backgroundColor: 'rgba(91,45,240,.10)',
        borderWidth: 2.5,
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: .2,
        fill: true
      }
    ];
    var yTick = function (value) { return formatMoney(value).replace('원', ''); };
    var tooltipLabel = function (ctx) {
      return ctx.dataset.label.trim() + ': ' + formatMoney(ctx.parsed.y);
    };

    if (chart) chart.destroy();
    chart = new Chart(qs('compoundChart'), {
      type: 'line',
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            align: 'start',
            reverse: true,
            labels: { usePointStyle: true, boxWidth: 8, padding: 22, font: { weight: 700 } }
          },
          tooltip: { callbacks: { label: tooltipLabel } }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxRotation: 0, maxTicksLimit: 9, color: '#605b83' }
          },
          y: {
            position: 'right',
            beginAtZero: true,
            grid: { color: 'rgba(23,19,57,.08)' },
            ticks: { callback: yTick, color: '#605b83' }
          }
        }
      }
    });
  }

  function getCompactRows(result) {
    if (tableExpanded) return result.rows;
    var lastIndex = result.rows.length - 1;
    return result.rows.filter(function (row, index) {
      return row.year === 0 || row.year === 1 || row.year % 5 === 0 || index === lastIndex;
    });
  }

  function renderTable(result) {
    var rows = getCompactRows(result);
    var toggle = qs('toggleRows');
    if (toggle) {
      toggle.textContent = tableExpanded ? '요약 보기' : '전체 연도 보기';
      toggle.hidden = result.rows.length <= rows.length;
    }
    qs('projectionTable').innerHTML = rows.map(function (row) {
      return '<tr>' +
        '<td>' + (row.year === 0 ? '현재' : row.year) + '</td>' +
        '<td>' + formatTableMoney(row.principalLine) + '</td>' +
        '<td>' + formatTableMoney(row.interest) + '</td>' +
        '<td>' + formatTableMoney(row.networth) + '</td>' +
        '</tr>';
    }).join('');
  }

  function encodeShareData(cfg) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(normalizeConfig(cfg)))))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function decodeShareData(value) {
    if (!value) return null;
    try {
      var base64 = value.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) base64 += '=';
      return JSON.parse(decodeURIComponent(escape(atob(base64))));
    } catch (err) {
      return null;
    }
  }

  function copyShareLink() {
    var url = new URL(window.location.href);
    url.search = '?data=' + encodeShareData(readConfigFromDom());
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url.href).then(function () {
        showToast('공유 링크를 복사했습니다.');
      });
    } else {
      showToast(url.href);
    }
  }

  function showToast(message) {
    var el = qs('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('show');
    }, 2200);
  }

  function update() {
    var result = calculateCompound(readConfigFromDom());
    lastResult = result;
    renderSummary(result);
    renderChart(result);
    renderTable(result);
  }

  function syncRangeControl(rangeId, numberId) {
    var range = qs(rangeId);
    var number = qs(numberId);
    if (!range || !number) return;
    range.addEventListener('input', function () {
      number.value = range.value;
    });
    number.addEventListener('input', function () {
      var value = toNumber(number.value, toNumber(range.value, 0));
      var min = toNumber(range.min, value);
      var max = toNumber(range.max, value);
      var bounded = Math.max(min, Math.min(max, value));
      range.value = bounded;
      if (value !== bounded) number.value = bounded;
    });
  }

  function normalizeVisibleInput(id, value) {
    var el = qs(id);
    if (!el) return;
    el.value = formatInput(value);
  }

  function initApp() {
    if (!qs('inputForm')) return;
    var params = new URLSearchParams(window.location.search);
    writeConfigToDom(decodeShareData(params.get('data')) || DEFAULTS);
    syncRangeControl('annualRateRange', 'annualRate');
    syncRangeControl('yearsRange', 'years');
    document.querySelectorAll('#inputForm input').forEach(function (el) {
      el.addEventListener('input', update);
      el.addEventListener('change', update);
    });
    qs('principal').addEventListener('change', function () {
      normalizeVisibleInput('principal', readConfigFromDom().principal);
      update();
    });
    qs('monthly').addEventListener('change', function () {
      normalizeVisibleInput('monthly', readConfigFromDom().monthly);
      update();
    });
    qs('resetInputs').addEventListener('click', function () {
      writeConfigToDom(DEFAULTS);
      update();
      showToast('기본값으로 복원했습니다.');
    });
    document.querySelectorAll('[data-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setMode(btn.dataset.mode);
        update();
      });
    });
    if (qs('copyShare')) qs('copyShare').addEventListener('click', copyShareLink);
    if (qs('copyShareTop')) qs('copyShareTop').addEventListener('click', copyShareLink);
    if (qs('toggleRows')) qs('toggleRows').addEventListener('click', function () {
      tableExpanded = !tableExpanded;
      if (lastResult) renderTable(lastResult);
    });
    document.querySelectorAll('[data-projection-view]').forEach(function (button) {
      button.addEventListener('click', function () {
        setProjectionView(button.dataset.projectionView);
      });
    });
    setProjectionView('chart');
    update();
  }

  return {
    DEFAULTS: DEFAULTS,
    normalizeConfig: normalizeConfig,
    calculateCompound: calculateCompound,
    formatMoney: formatMoney,
    initApp: initApp
  };
});
