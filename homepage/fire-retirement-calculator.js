(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FireCalculator = api;
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', api.initApp);
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  var DEFAULTS = {
    currentAge: 35,
    currentAssets: 0,
    monthlySavings: 200,
    annualExpenses: 2600,
    annualReturn: 5,
    withdrawalRate: 4
  };

  var chart = null;
  var toastTimer = null;
  var tableExpanded = false;
  var lastResult = null;
  var projectionView = 'chart';
  var goalLabelPlugin = {
    id: 'goalLabel',
    afterDatasetsDraw: function (chart, args, options) {
      if (!options || !options.text) return;
      var y = chart.scales.y.getPixelForValue(options.value);
      var x = chart.chartArea.left + 22;
      var ctx = chart.ctx;
      var text = options.text;
      ctx.save();
      ctx.font = '700 12px Pretendard, sans-serif';
      var width = ctx.measureText(text).width + 20;
      var height = 26;
      var radius = 13;
      var top = y - height / 2;
      ctx.fillStyle = '#197a54';
      ctx.beginPath();
      ctx.moveTo(x + radius, top);
      ctx.lineTo(x + width - radius, top);
      ctx.quadraticCurveTo(x + width, top, x + width, top + radius);
      ctx.lineTo(x + width, top + height - radius);
      ctx.quadraticCurveTo(x + width, top + height, x + width - radius, top + height);
      ctx.lineTo(x + radius, top + height);
      ctx.quadraticCurveTo(x, top + height, x, top + height - radius);
      ctx.lineTo(x, top + radius);
      ctx.quadraticCurveTo(x, top, x + radius, top);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, x + 10, y + 4);
      ctx.restore();
    }
  };

  function qs(id) {
    return document.getElementById(id);
  }

  function toNumber(value, fallback) {
    if (fallback == null) fallback = 0;
    var cleaned = String(value == null ? '' : value).replace(/,/g, '').trim();
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
    if (n >= 1000) return sign + Math.round(n / 1000) + '천만원';
    return sign + Math.round(n).toLocaleString('ko-KR') + '만원';
  }

  function formatTableMoney(manwon) {
    if (manwon == null) return '-';
    return Math.round(manwon).toLocaleString('ko-KR');
  }

  function formatPercent(value, digits) {
    if (digits == null) digits = 0;
    return (value * 100).toFixed(digits).replace(/\.0$/, '') + '%';
  }

  function normalizeConfig(raw) {
    var cfg = Object.assign({}, DEFAULTS, raw || {});
    cfg.currentAge = Math.max(10, Math.min(99, Math.round(toNumber(cfg.currentAge, DEFAULTS.currentAge))));
    cfg.currentAssets = Math.max(0, toNumber(cfg.currentAssets, DEFAULTS.currentAssets));
    cfg.monthlySavings = Math.max(0, toNumber(
      cfg.monthlySavings,
      raw && raw.annualIncome != null ? Math.max(0, toNumber(raw.annualIncome, 0) - toNumber(raw.annualExpenses, DEFAULTS.annualExpenses)) / 12 : DEFAULTS.monthlySavings
    ));
    cfg.annualExpenses = Math.max(0, toNumber(cfg.annualExpenses, DEFAULTS.annualExpenses));
    cfg.annualReturn = Math.max(-30, Math.min(50, toNumber(cfg.annualReturn, DEFAULTS.annualReturn)));
    cfg.withdrawalRate = Math.max(0.1, Math.min(20, toNumber(cfg.withdrawalRate, DEFAULTS.withdrawalRate)));
    return cfg;
  }

  function calculateFire(rawConfig) {
    var cfg = normalizeConfig(rawConfig);
    var savings = cfg.monthlySavings * 12;
    var returnRate = cfg.annualReturn / 100;
    var targetNetworth = cfg.annualExpenses / (cfg.withdrawalRate / 100);
    var roiTargetNetworth = returnRate > 0 ? cfg.annualExpenses / returnRate : Infinity;
    var networth = cfg.currentAssets;
    var rows = [{
      year: 0,
      age: cfg.currentAge,
      income: null,
      expenses: null,
      roi: null,
      coveredRatio: null,
      change: null,
      networth: networth,
      independent: networth >= targetNetworth
    }];
    var retirementYear = networth >= targetNetworth ? 0 : null;

    for (var year = 1; year <= 80; year += 1) {
      var roi = (networth + savings / 2) * returnRate;
      var change = savings + roi;
      networth = Math.max(0, networth + change);
      var coveredRatio = cfg.annualExpenses > 0 ? roi / cfg.annualExpenses : 1;
      var independent = networth >= targetNetworth;
      if (retirementYear == null && independent) retirementYear = year;
      rows.push({
        year: year,
        age: cfg.currentAge + year,
        income: independent ? null : savings,
        expenses: independent ? null : cfg.annualExpenses,
        roi: roi,
        coveredRatio: coveredRatio,
        change: change,
        networth: networth,
        independent: independent
      });
      if (year > 12 && coveredRatio >= 1.25 && independent) break;
      if (year >= 60 && retirementYear != null) break;
    }

    return {
      config: cfg,
      rows: rows,
      annualSavings: savings,
      savingsRate: 0,
      targetNetworth: targetNetworth,
      roiTargetNetworth: roiTargetNetworth,
      retirementYear: retirementYear,
      retirementAge: retirementYear == null ? null : cfg.currentAge + retirementYear,
      monthlyPassiveIncome: targetNetworth * (cfg.withdrawalRate / 100) / 12
    };
  }

  function readConfigFromDom() {
    return normalizeConfig({
      currentAge: qs('currentAge').value,
      currentAssets: qs('currentAssets').value,
      monthlySavings: qs('monthlySavings').value,
      annualExpenses: qs('annualExpenses').value,
      annualReturn: qs('annualReturn').value,
      withdrawalRate: qs('withdrawalRate').value
    });
  }

  function writeConfigToDom(cfg) {
    cfg = normalizeConfig(cfg);
    qs('currentAge').value = cfg.currentAge;
    qs('currentAssets').value = formatInput(cfg.currentAssets);
    qs('monthlySavings').value = formatInput(cfg.monthlySavings);
    qs('annualExpenses').value = formatInput(cfg.annualExpenses);
    qs('annualReturn').value = cfg.annualReturn;
    qs('withdrawalRate').value = cfg.withdrawalRate;
    if (qs('annualReturnRange')) qs('annualReturnRange').value = cfg.annualReturn;
    if (qs('withdrawalRange')) qs('withdrawalRange').value = cfg.withdrawalRate;
  }

  function setText(id, value) {
    var el = qs(id);
    if (el) el.textContent = value;
  }

  function renderSummary(result) {
    var ageText = result.retirementAge == null ? '80년 초과' : result.retirementAge + '세';
    setText('fireTarget', formatMoney(result.targetNetworth));
    setText('targetSub', '연지출 ÷ 인출률 ' + result.config.withdrawalRate + '%');
    setText('retirementAge', ageText);
    setText('retirementSub', result.retirementYear == null ? '현재 조건으로는 오래 걸립니다' : '지금부터 ' + result.retirementYear + '년 뒤');
    setText('annualSavings', formatMoney(result.annualSavings));
    setText('savingRate', '월 저축액 ' + formatMoney(result.config.monthlySavings));
    setText('roiCoverAge', findRoiCoverText(result));
    setText('withdrawalPreview', result.config.withdrawalRate + '%');
    setText('returnPreview', result.config.annualReturn + '%');
    setText('returnInlinePreview', result.config.annualReturn + '%');

    var insight = qs('insightCard');
    if (result.retirementYear == null) {
      insight.textContent = '현재 조건으로는 목표 은퇴자산에 도달하기 어렵습니다. 연지출을 줄이거나 저축률을 높이면 은퇴 시점이 크게 당겨집니다.';
    } else {
      insight.textContent = '현재 조건이면 ' + result.retirementAge + '세에 목표 은퇴자산에 도달합니다. 아래 표에서 매년 투자수익이 지출의 몇 퍼센트를 커버하는지 확인할 수 있습니다.';
    }
  }

  function findRoiCoverText(result) {
    var row = result.rows.find(function (item) {
      return item.coveredRatio != null && item.coveredRatio >= 1;
    });
    return row ? row.age + '세' : '80년 초과';
  }

  function findRetirementIndex(result) {
    return result.rows.findIndex(function (row) {
      return row.year === result.retirementYear;
    });
  }

  function getChartMeta() {
    return { kicker: '여정', title: '나의 FIRE 예상 경로' };
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
    var meta = getChartMeta();
    setText('chartKicker', meta.kicker);
    setText('chartTitle', meta.title);

    var labels = result.rows.map(function (row) { return 'Y' + row.year; });
    var datasets = [
      {
        label: '저축누적 ' + formatMoney(result.config.monthlySavings) + '/월',
        data: result.rows.map(function (row) {
          return Math.round(result.config.currentAssets + result.annualSavings * row.year);
        }),
        borderColor: '#5b2df0',
        backgroundColor: 'rgba(91,45,240,.08)',
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: .2,
        fill: false
      },
      {
        label: '투자성장 ' + result.config.annualReturn.toFixed(1).replace(/\.0$/, '') + '%/년',
        data: result.rows.map(function (row) { return Math.round(row.networth); }),
        borderColor: '#5a7118',
        backgroundColor: 'rgba(90,113,24,.08)',
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: .2,
        fill: false
      },
      {
        label: '목표',
        data: result.rows.map(function () { return Math.round(result.targetNetworth); }),
        borderColor: '#197a54',
        borderDash: [3, 3],
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      }
    ];
    var yTick = function (value) { return formatMoney(value).replace('원', ''); };
    var tooltipLabel = function (ctx) {
      return ctx.dataset.label + ': ' + formatMoney(ctx.parsed.y);
    };
    var legendFilter = function (item) { return item.text !== '목표'; };

    if (chart) chart.destroy();
    chart = new Chart(qs('projectionChart'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      plugins: [goalLabelPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          goalLabel: {
            value: result.targetNetworth,
            text: '목표: ' + formatMoney(result.targetNetworth)
          },
          legend: {
            position: 'bottom',
            align: 'start',
            labels: {
              filter: legendFilter,
              usePointStyle: true,
              boxWidth: 8,
              padding: 22,
              font: { weight: 700 }
            }
          },
          tooltip: {
            callbacks: {
              label: tooltipLabel
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: '오늘부터 지난 연수', color: '#605b83', font: { weight: 700 } },
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
    var keep = new Set();
    var lastIndex = result.rows.length - 1;
    for (var i = 0; i <= lastIndex; i += 1) {
      if (i === 0 || i === 1 || i % 5 === 0 || i === lastIndex) keep.add(i);
    }
    return result.rows.filter(function (_, index) { return keep.has(index); });
  }

  function renderTable(result) {
    var rows = getCompactRows(result);
    var toggle = qs('toggleRows');
    if (toggle) {
      toggle.textContent = tableExpanded ? '5년 단위 보기' : '전체 연도 보기';
      toggle.hidden = result.rows.length <= rows.length;
    }
    qs('projectionTable').innerHTML = rows.map(function (row) {
      var covered = row.coveredRatio == null ? null : Math.max(0, row.coveredRatio);
      var barWidth = covered == null ? 0 : Math.min(100, covered / 1.25 * 100);
      var coveredText = covered == null ? '-' : covered >= 1.25 ? '125%+' : formatPercent(covered);
      var rowClass = row.independent ? ' class="is-independent"' : covered >= 1 ? ' class="is-covered"' : '';
      var barClass = covered >= 1 ? ' cover-bar is-covered' : ' cover-bar';
      var title = covered == null ? '' : ' title="' + formatPercent(covered, 1) + '"';
      return '<tr' + rowClass + '>' +
        '<td>' + row.year + '</td>' +
        '<td>' + formatTableMoney(row.income) + '</td>' +
        '<td>' + formatTableMoney(row.expenses) + '</td>' +
        '<td>' + formatTableMoney(row.roi) + '</td>' +
        '<td><div class="cover-cell"><span' + title + '>' + coveredText + '</span><div class="' + barClass + '"><i style="width:' + barWidth + '%"></i></div></div></td>' +
        '<td>' + formatTableMoney(row.change) + '</td>' +
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
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('show');
    }, 2200);
  }

  function update() {
    var result = calculateFire(readConfigFromDom());
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
      range.value = Math.max(min, Math.min(max, value));
    });
  }

  function initApp() {
    if (!qs('inputForm')) return;
    var params = new URLSearchParams(window.location.search);
    writeConfigToDom(decodeShareData(params.get('data')) || DEFAULTS);
    syncRangeControl('annualReturnRange', 'annualReturn');
    syncRangeControl('withdrawalRange', 'withdrawalRate');
    document.querySelectorAll('#inputForm input').forEach(function (el) {
      el.addEventListener('input', update);
      el.addEventListener('change', update);
    });
    qs('resetInputs').addEventListener('click', function () {
      writeConfigToDom(DEFAULTS);
      update();
      showToast('기본값으로 복원했습니다.');
    });
    qs('copyShare').addEventListener('click', copyShareLink);
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
    calculateFire: calculateFire,
    formatMoney: formatMoney,
    initApp: initApp
  };
});
