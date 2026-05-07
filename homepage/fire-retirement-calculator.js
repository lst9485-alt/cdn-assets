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
    annualIncome: 5000,
    annualExpenses: 2600,
    annualReturn: 5,
    withdrawalRate: 4
  };

  var chart = null;
  var toastTimer = null;

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
    cfg.annualIncome = Math.max(0, toNumber(cfg.annualIncome, DEFAULTS.annualIncome));
    cfg.annualExpenses = Math.max(0, toNumber(cfg.annualExpenses, DEFAULTS.annualExpenses));
    cfg.annualReturn = Math.max(-30, Math.min(50, toNumber(cfg.annualReturn, DEFAULTS.annualReturn)));
    cfg.withdrawalRate = Math.max(0.1, Math.min(20, toNumber(cfg.withdrawalRate, DEFAULTS.withdrawalRate)));
    return cfg;
  }

  function calculateFire(rawConfig) {
    var cfg = normalizeConfig(rawConfig);
    var savings = Math.max(0, cfg.annualIncome - cfg.annualExpenses);
    var savingsRate = cfg.annualIncome > 0 ? savings / cfg.annualIncome : 0;
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
        income: independent ? null : cfg.annualIncome,
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
      savingsRate: savingsRate,
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
      annualIncome: qs('annualIncome').value,
      annualExpenses: qs('annualExpenses').value,
      annualReturn: qs('annualReturn').value,
      withdrawalRate: qs('withdrawalRate').value
    });
  }

  function writeConfigToDom(cfg) {
    cfg = normalizeConfig(cfg);
    qs('currentAge').value = cfg.currentAge;
    qs('currentAssets').value = formatInput(cfg.currentAssets);
    qs('annualIncome').value = formatInput(cfg.annualIncome);
    qs('annualExpenses').value = formatInput(cfg.annualExpenses);
    qs('annualReturn').value = cfg.annualReturn;
    qs('withdrawalRate').value = cfg.withdrawalRate;
  }

  function setText(id, value) {
    var el = qs(id);
    if (el) el.textContent = value;
  }

  function renderSummary(result) {
    var ageText = result.retirementAge == null ? '80년 초과' : result.retirementAge + '세';
    setText('heroTarget', formatMoney(result.targetNetworth));
    setText('heroAge', ageText);
    setText('heroSavingRate', formatPercent(result.savingsRate));
    setText('fireTarget', formatMoney(result.targetNetworth));
    setText('targetSub', '연지출 ÷ 인출률 ' + result.config.withdrawalRate + '%');
    setText('retirementAge', ageText);
    setText('retirementSub', result.retirementYear == null ? '현재 조건으로는 오래 걸립니다' : '지금부터 ' + result.retirementYear + '년 뒤');
    setText('annualSavings', formatMoney(result.annualSavings));
    setText('savingRate', '저축률 ' + formatPercent(result.savingsRate, 1));
    setText('passiveIncome', '월 ' + formatMoney(result.monthlyPassiveIncome));
    setText('passiveIncomeSub', '인출률 기준 예상 현금흐름');
    setText('roiCoverAge', findRoiCoverText(result));
    setText('roiCoverSub', '투자수익이 연지출을 덮는 시점');

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

  function renderChart(result) {
    if (typeof Chart === 'undefined') return;
    var labels = result.rows.map(function (row) { return row.year + '년'; });
    var networth = result.rows.map(function (row) { return Math.round(row.networth); });
    var target = result.rows.map(function () { return Math.round(result.targetNetworth); });
    if (chart) chart.destroy();
    chart = new Chart(qs('projectionChart'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: '순자산',
            data: networth,
            borderColor: '#ff6b00',
            backgroundColor: 'rgba(255,107,0,.12)',
            borderWidth: 3,
            pointRadius: 0,
            tension: .24,
            fill: true
          },
          {
            label: '목표 은퇴자산',
            data: target,
            borderColor: '#0a0a0a',
            borderDash: [6, 6],
            borderWidth: 2,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 12, font: { weight: 700 } } },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ctx.dataset.label + ': ' + formatMoney(ctx.parsed.y);
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 0, maxTicksLimit: 8 } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(10,10,10,.08)' },
            ticks: { callback: function (value) { return formatMoney(value).replace('원', ''); } }
          }
        }
      }
    });
  }

  function renderTable(result) {
    qs('projectionTable').innerHTML = result.rows.map(function (row) {
      var covered = row.coveredRatio == null ? null : Math.max(0, row.coveredRatio);
      var barWidth = covered == null ? 0 : Math.min(100, covered * 100);
      var coveredText = covered == null ? '-' : formatPercent(covered);
      return '<tr' + (row.independent ? ' class="is-independent"' : '') + '>' +
        '<td>' + row.year + '</td>' +
        '<td>' + formatTableMoney(row.income) + '</td>' +
        '<td>' + formatTableMoney(row.expenses) + '</td>' +
        '<td>' + formatTableMoney(row.roi) + '</td>' +
        '<td><div class="cover-cell"><span>' + coveredText + '</span><div class="cover-bar"><i style="width:' + barWidth + '%"></i></div></div></td>' +
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
    renderSummary(result);
    renderChart(result);
    renderTable(result);
  }

  function initApp() {
    if (!qs('inputForm')) return;
    var params = new URLSearchParams(window.location.search);
    writeConfigToDom(decodeShareData(params.get('data')) || DEFAULTS);
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
    qs('copyShareTop').addEventListener('click', copyShareLink);
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
