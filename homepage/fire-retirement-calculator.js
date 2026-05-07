(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FireCalculator = api;
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      api.initApp();
    });
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  var DEFAULTS = {
    currentAge: 35,
    currentAssets: 10000,
    monthlySaving: 250,
    savingGrowthRate: 2,
    annualIncome: 7000,
    annualExpenses: 4000,
    retirementSpending: 4800,
    targetMode: 'withdrawal',
    withdrawalRate: 4,
    lifeExpectancy: 90,
    inflationRate: 2.5,
    paradiseYears: 15,
    taxMode: 'korea',
    customTaxRate: 15.4,
    stockAllocation: 70,
    stockReturn: 8,
    stockVolatility: 18,
    bondAllocation: 20,
    bondReturn: 3.5,
    bondVolatility: 6,
    cashAllocation: 10,
    cashReturn: 1.5,
    cashVolatility: 1,
    simulationMode: 'fixed',
    basisMode: 'real',
    streams: [
      { type: 'income', amount: 1200, startAge: 65, endAge: 90 },
      { type: 'expense', amount: 1000, startAge: 45, endAge: 55 }
    ]
  };

  var HISTORICAL_RETURNS = [
    { y: 1975, stock: 37.2, bond: 3.6, cash: 5.8, inflation: 9.1 },
    { y: 1976, stock: 23.8, bond: 15.6, cash: 5.1, inflation: 5.8 },
    { y: 1977, stock: -7.2, bond: 1.2, cash: 5.2, inflation: 6.5 },
    { y: 1978, stock: 6.6, bond: -0.8, cash: 7.2, inflation: 7.6 },
    { y: 1979, stock: 18.4, bond: 0.7, cash: 10.4, inflation: 11.3 },
    { y: 1980, stock: 32.4, bond: -2.9, cash: 11.2, inflation: 13.5 },
    { y: 1981, stock: -4.9, bond: 6.3, cash: 14.7, inflation: 10.3 },
    { y: 1982, stock: 21.6, bond: 32.6, cash: 10.5, inflation: 6.1 },
    { y: 1983, stock: 22.6, bond: 8.4, cash: 8.8, inflation: 3.2 },
    { y: 1984, stock: 6.3, bond: 15.2, cash: 9.9, inflation: 4.3 },
    { y: 1985, stock: 31.7, bond: 22.1, cash: 7.7, inflation: 3.5 },
    { y: 1986, stock: 18.7, bond: 15.3, cash: 6.1, inflation: 1.9 },
    { y: 1987, stock: 5.2, bond: 2.8, cash: 5.5, inflation: 3.7 },
    { y: 1988, stock: 16.8, bond: 7.9, cash: 6.4, inflation: 4.1 },
    { y: 1989, stock: 31.5, bond: 14.5, cash: 8.4, inflation: 4.8 },
    { y: 1990, stock: -3.1, bond: 8.6, cash: 7.8, inflation: 5.4 },
    { y: 1991, stock: 30.5, bond: 15.5, cash: 5.6, inflation: 4.2 },
    { y: 1992, stock: 7.6, bond: 7.2, cash: 3.5, inflation: 3.0 },
    { y: 1993, stock: 10.1, bond: 9.8, cash: 3.0, inflation: 3.0 },
    { y: 1994, stock: 1.3, bond: -2.9, cash: 4.2, inflation: 2.6 },
    { y: 1995, stock: 37.6, bond: 18.5, cash: 5.5, inflation: 2.8 },
    { y: 1996, stock: 23.0, bond: 3.6, cash: 5.0, inflation: 2.9 },
    { y: 1997, stock: 33.4, bond: 9.6, cash: 5.1, inflation: 2.3 },
    { y: 1998, stock: 28.6, bond: 8.7, cash: 4.8, inflation: 1.6 },
    { y: 1999, stock: 21.0, bond: -0.8, cash: 4.7, inflation: 2.2 },
    { y: 2000, stock: -9.1, bond: 11.6, cash: 5.9, inflation: 3.4 },
    { y: 2001, stock: -11.9, bond: 8.4, cash: 3.8, inflation: 2.8 },
    { y: 2002, stock: -22.1, bond: 10.3, cash: 1.7, inflation: 1.6 },
    { y: 2003, stock: 28.7, bond: 4.1, cash: 1.0, inflation: 2.3 },
    { y: 2004, stock: 10.9, bond: 4.3, cash: 1.2, inflation: 2.7 },
    { y: 2005, stock: 4.9, bond: 2.4, cash: 3.0, inflation: 3.4 },
    { y: 2006, stock: 15.8, bond: 4.3, cash: 4.7, inflation: 3.2 },
    { y: 2007, stock: 5.5, bond: 7.0, cash: 4.6, inflation: 2.9 },
    { y: 2008, stock: -37.0, bond: 5.2, cash: 1.6, inflation: 3.8 },
    { y: 2009, stock: 26.5, bond: 5.9, cash: 0.1, inflation: -0.3 },
    { y: 2010, stock: 15.1, bond: 6.5, cash: 0.1, inflation: 1.6 },
    { y: 2011, stock: 2.1, bond: 7.8, cash: 0.0, inflation: 3.2 },
    { y: 2012, stock: 16.0, bond: 4.2, cash: 0.1, inflation: 2.1 },
    { y: 2013, stock: 32.4, bond: -2.0, cash: 0.1, inflation: 1.5 },
    { y: 2014, stock: 13.7, bond: 5.9, cash: 0.0, inflation: 1.6 },
    { y: 2015, stock: 1.4, bond: 0.6, cash: 0.1, inflation: 0.1 },
    { y: 2016, stock: 12.0, bond: 2.7, cash: 0.3, inflation: 1.3 },
    { y: 2017, stock: 21.8, bond: 3.5, cash: 0.9, inflation: 2.1 },
    { y: 2018, stock: -4.4, bond: 0.0, cash: 1.9, inflation: 2.4 },
    { y: 2019, stock: 31.5, bond: 8.7, cash: 2.2, inflation: 1.8 },
    { y: 2020, stock: 18.4, bond: 7.5, cash: 0.4, inflation: 1.2 },
    { y: 2021, stock: 28.7, bond: -1.5, cash: 0.0, inflation: 4.7 },
    { y: 2022, stock: -18.1, bond: -13.0, cash: 1.5, inflation: 8.0 },
    { y: 2023, stock: 26.3, bond: 5.5, cash: 5.0, inflation: 4.1 },
    { y: 2024, stock: 24.0, bond: 1.3, cash: 5.1, inflation: 3.0 }
  ];

  var charts = {};
  var appState = null;
  var toastTimer = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function toNumber(value, fallback) {
    if (fallback == null) fallback = 0;
    if (typeof value === 'number') return isFinite(value) ? value : fallback;
    var cleaned = String(value == null ? '' : value).replace(/,/g, '').trim();
    if (!cleaned) return fallback;
    var parsed = Number(cleaned);
    return isFinite(parsed) ? parsed : fallback;
  }

  function pct(value) {
    return toNumber(value, 0) / 100;
  }

  function formatMoney(manwon) {
    var sign = manwon < 0 ? '-' : '';
    var n = Math.abs(manwon);
    if (!isFinite(n)) return '0원';
    if (n >= 100000000) return sign + (n / 100000000).toFixed(1).replace(/\.0$/, '') + '조원';
    if (n >= 10000) return sign + (n / 10000).toFixed(1).replace(/\.0$/, '') + '억원';
    if (n >= 1000) return sign + Math.round(n / 1000) + '천만원';
    return sign + Math.round(n).toLocaleString('ko-KR') + '만원';
  }

  function formatCompact(manwon) {
    var n = Math.round(manwon);
    return n.toLocaleString('ko-KR');
  }

  function formatPercent(value, digits) {
    if (digits == null) digits = 1;
    return (value * 100).toFixed(digits).replace(/\.0$/, '') + '%';
  }

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }

  function normalizeConfig(raw) {
    var d = cloneDefaults();
    var cfg = Object.assign(d, raw || {});
    cfg.currentAge = clamp(Math.round(toNumber(cfg.currentAge, d.currentAge)), 10, 99);
    cfg.currentAssets = Math.max(0, toNumber(cfg.currentAssets, d.currentAssets));
    cfg.monthlySaving = Math.max(0, toNumber(cfg.monthlySaving, d.monthlySaving));
    cfg.savingGrowthRate = clamp(toNumber(cfg.savingGrowthRate, d.savingGrowthRate), -20, 50);
    cfg.annualIncome = Math.max(0, toNumber(cfg.annualIncome, d.annualIncome));
    cfg.annualExpenses = Math.max(0, toNumber(cfg.annualExpenses, d.annualExpenses));
    cfg.retirementSpending = Math.max(0, toNumber(cfg.retirementSpending, d.retirementSpending));
    cfg.targetMode = cfg.targetMode === 'life' ? 'life' : 'withdrawal';
    cfg.withdrawalRate = clamp(toNumber(cfg.withdrawalRate, d.withdrawalRate), .1, 20);
    cfg.lifeExpectancy = clamp(Math.round(toNumber(cfg.lifeExpectancy, d.lifeExpectancy)), 50, 120);
    cfg.inflationRate = clamp(toNumber(cfg.inflationRate, d.inflationRate), -10, 20);
    cfg.paradiseYears = clamp(Math.round(toNumber(cfg.paradiseYears, d.paradiseYears)), 0, 80);
    cfg.taxMode = ['none', 'korea', 'custom'].indexOf(cfg.taxMode) >= 0 ? cfg.taxMode : d.taxMode;
    cfg.customTaxRate = clamp(toNumber(cfg.customTaxRate, d.customTaxRate), 0, 60);
    ['stockAllocation', 'bondAllocation', 'cashAllocation'].forEach(function (key) {
      cfg[key] = clamp(toNumber(cfg[key], d[key]), 0, 100);
    });
    ['stockReturn', 'bondReturn', 'cashReturn'].forEach(function (key) {
      cfg[key] = clamp(toNumber(cfg[key], d[key]), -60, 80);
    });
    ['stockVolatility', 'bondVolatility', 'cashVolatility'].forEach(function (key) {
      cfg[key] = clamp(toNumber(cfg[key], d[key]), 0, 80);
    });
    cfg.simulationMode = ['fixed', 'montecarlo', 'historical'].indexOf(cfg.simulationMode) >= 0 ? cfg.simulationMode : d.simulationMode;
    cfg.basisMode = cfg.basisMode === 'nominal' ? 'nominal' : 'real';
    cfg.streams = (Array.isArray(cfg.streams) ? cfg.streams : []).map(function (s) {
      return {
        type: s.type === 'expense' ? 'expense' : 'income',
        amount: Math.max(0, toNumber(s.amount, 0)),
        startAge: clamp(Math.round(toNumber(s.startAge, cfg.currentAge)), cfg.currentAge, 120),
        endAge: clamp(Math.round(toNumber(s.endAge, cfg.currentAge + 1)), cfg.currentAge, 120)
      };
    }).filter(function (s) {
      return s.amount > 0 && s.endAge >= s.startAge;
    });
    return cfg;
  }

  function getTaxRate(cfg) {
    if (cfg.taxMode === 'none') return 0;
    if (cfg.taxMode === 'korea') return 0.154;
    return pct(cfg.customTaxRate);
  }

  function normalizeAllocations(cfg) {
    var total = cfg.stockAllocation + cfg.bondAllocation + cfg.cashAllocation;
    if (total <= 0) {
      return { stock: 1, bond: 0, cash: 0, total: 0 };
    }
    return {
      stock: cfg.stockAllocation / total,
      bond: cfg.bondAllocation / total,
      cash: cfg.cashAllocation / total,
      total: total
    };
  }

  function afterTaxReturn(rawReturn, taxRate) {
    return rawReturn > 0 ? rawReturn * (1 - taxRate) : rawReturn;
  }

  function annualReturnFromInputs(cfg, override) {
    var alloc = normalizeAllocations(cfg);
    var taxRate = getTaxRate(cfg);
    var stock = override ? override.stock : cfg.stockReturn;
    var bond = override ? override.bond : cfg.bondReturn;
    var cash = override ? override.cash : cfg.cashReturn;
    var inflation = override && override.inflation != null ? override.inflation : cfg.inflationRate;
    var nominal =
      alloc.stock * afterTaxReturn(pct(stock), taxRate) +
      alloc.bond * afterTaxReturn(pct(bond), taxRate) +
      alloc.cash * afterTaxReturn(pct(cash), taxRate);
    if (cfg.basisMode === 'real') {
      return ((1 + nominal) / (1 + pct(inflation || cfg.inflationRate))) - 1;
    }
    return nominal;
  }

  function weightedVolatility(cfg) {
    var alloc = normalizeAllocations(cfg);
    return Math.sqrt(
      Math.pow(alloc.stock * pct(cfg.stockVolatility), 2) +
      Math.pow(alloc.bond * pct(cfg.bondVolatility), 2) +
      Math.pow(alloc.cash * pct(cfg.cashVolatility), 2)
    );
  }

  function targetForAge(cfg, age) {
    var spending = cfg.retirementSpending;
    if (cfg.basisMode === 'nominal') {
      spending = spending * Math.pow(1 + pct(cfg.inflationRate), Math.max(0, age - cfg.currentAge));
    }
    if (cfg.targetMode === 'life') {
      if (age >= cfg.lifeExpectancy) return Infinity;
      return spending * Math.max(1, cfg.lifeExpectancy - age);
    }
    return spending / pct(cfg.withdrawalRate);
  }

  function streamAnnualAmount(cfg, age) {
    return cfg.streams.reduce(function (sum, s) {
      if (age < s.startAge || age > s.endAge) return sum;
      return sum + (s.type === 'income' ? s.amount : -s.amount);
    }, 0);
  }

  function annualContributionForYear(cfg, yearIndex) {
    var base = cfg.monthlySaving * 12 * Math.pow(1 + pct(cfg.savingGrowthRate), yearIndex);
    var age = cfg.currentAge + yearIndex;
    return base + streamAnnualAmount(cfg, age);
  }

  function growOneYear(startAssets, annualReturn, annualContribution) {
    var monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;
    var assets = startAssets;
    var monthlyContribution = annualContribution / 12;
    for (var m = 0; m < 12; m += 1) {
      assets = assets * (1 + monthlyReturn) + monthlyContribution;
    }
    return assets;
  }

  function buildProjection(cfg, yearsLimit, returnProvider) {
    if (yearsLimit == null) yearsLimit = 70;
    var rows = [];
    var assets = cfg.currentAssets;
    var retireYear = null;
    var fireTargetAtRetirement = targetForAge(cfg, cfg.currentAge);
    for (var year = 0; year <= yearsLimit; year += 1) {
      var age = cfg.currentAge + year;
      var target = targetForAge(cfg, age);
      if (year === 0) {
        rows.push({
          year: 0,
          age: age,
          contribution: 0,
          growth: 0,
          startAssets: assets,
          endingAssets: assets,
          target: target,
          gap: assets - target,
          annualReturn: 0
        });
      } else {
        var contribution = annualContributionForYear(cfg, year - 1);
        var startAssets = assets;
        var annualReturn = returnProvider ? returnProvider(year - 1, cfg) : annualReturnFromInputs(cfg);
        assets = Math.max(0, growOneYear(assets, annualReturn, contribution));
        var growth = assets - startAssets - contribution;
        rows.push({
          year: year,
          age: age,
          contribution: contribution,
          growth: growth,
          startAssets: startAssets,
          endingAssets: assets,
          target: target,
          gap: assets - target,
          annualReturn: annualReturn
        });
      }
      if (retireYear == null && assets >= target) {
        retireYear = year;
        fireTargetAtRetirement = target;
      }
    }
    return {
      rows: rows,
      retireYear: retireYear,
      retirementAge: retireYear == null ? null : cfg.currentAge + retireYear,
      fireTarget: fireTargetAtRetirement
    };
  }

  function seededRandom(seed) {
    var s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = s * 16807 % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function normalRandom(rand) {
    var u = 0;
    var v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function percentile(values, p) {
    if (!values.length) return 0;
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    var idx = (sorted.length - 1) * p;
    var lo = Math.floor(idx);
    var hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }

  function runMonteCarlo(cfg, trials, yearsLimit) {
    if (trials == null) trials = 2000;
    if (yearsLimit == null) yearsLimit = 70;
    var mean = annualReturnFromInputs(cfg);
    var vol = weightedVolatility(cfg);
    var perYear = [];
    for (var y = 0; y <= yearsLimit; y += 1) perYear.push([]);
    var retireYears = [];
    var rand = seededRandom(20260507);
    for (var t = 0; t < trials; t += 1) {
      var projection = buildProjection(cfg, yearsLimit, function () {
        return clamp(mean + normalRandom(rand) * vol, -.85, 1.2);
      });
      projection.rows.forEach(function (row, idx) {
        perYear[idx].push(row.endingAssets);
      });
      if (projection.retireYear != null) retireYears.push(projection.retireYear);
    }
    var base = buildProjection(cfg, yearsLimit);
    var bands = perYear.map(function (items, idx) {
      return {
        year: idx,
        age: cfg.currentAge + idx,
        p10: percentile(items, .10),
        p25: percentile(items, .25),
        p50: percentile(items, .50),
        p75: percentile(items, .75),
        p90: percentile(items, .90),
        target: targetForAge(cfg, cfg.currentAge + idx)
      };
    });
    return {
      rows: base.rows,
      bands: bands,
      retireYear: retireYears.length ? Math.round(percentile(retireYears, .5)) : null,
      retirementAge: retireYears.length ? cfg.currentAge + Math.round(percentile(retireYears, .5)) : null,
      fireTarget: targetForAge(cfg, retireYears.length ? cfg.currentAge + Math.round(percentile(retireYears, .5)) : cfg.currentAge),
      successRate: retireYears.length / trials,
      p10RetireYear: retireYears.length ? Math.round(percentile(retireYears, .1)) : null,
      p90RetireYear: retireYears.length ? Math.round(percentile(retireYears, .9)) : null
    };
  }

  function runHistoricalCycles(cfg, yearsLimit) {
    if (yearsLimit == null) yearsLimit = 70;
    var starts = HISTORICAL_RETURNS.length;
    var perYear = [];
    for (var y = 0; y <= yearsLimit; y += 1) perYear.push([]);
    var retireYears = [];
    for (var start = 0; start < starts; start += 1) {
      var projection = buildProjection(cfg, yearsLimit, function (yearIndex) {
        var sample = HISTORICAL_RETURNS[(start + yearIndex) % HISTORICAL_RETURNS.length];
        return annualReturnFromInputs(cfg, sample);
      });
      projection.rows.forEach(function (row, idx) {
        perYear[idx].push(row.endingAssets);
      });
      if (projection.retireYear != null) retireYears.push(projection.retireYear);
    }
    var base = buildProjection(cfg, yearsLimit);
    var bands = perYear.map(function (items, idx) {
      return {
        year: idx,
        age: cfg.currentAge + idx,
        p10: percentile(items, .10),
        p25: percentile(items, .25),
        p50: percentile(items, .50),
        p75: percentile(items, .75),
        p90: percentile(items, .90),
        target: targetForAge(cfg, cfg.currentAge + idx)
      };
    });
    return {
      rows: base.rows,
      bands: bands,
      retireYear: retireYears.length ? Math.round(percentile(retireYears, .5)) : null,
      retirementAge: retireYears.length ? cfg.currentAge + Math.round(percentile(retireYears, .5)) : null,
      fireTarget: targetForAge(cfg, retireYears.length ? cfg.currentAge + Math.round(percentile(retireYears, .5)) : cfg.currentAge),
      successRate: retireYears.length / starts,
      p10RetireYear: retireYears.length ? Math.round(percentile(retireYears, .1)) : null,
      p90RetireYear: retireYears.length ? Math.round(percentile(retireYears, .9)) : null
    };
  }

  function calculateFire(rawConfig) {
    var cfg = normalizeConfig(rawConfig);
    var projection;
    if (cfg.simulationMode === 'montecarlo') {
      projection = runMonteCarlo(cfg);
    } else if (cfg.simulationMode === 'historical') {
      projection = runHistoricalCycles(cfg);
    } else {
      projection = buildProjection(cfg);
    }
    var annualSavings = cfg.monthlySaving * 12;
    var savingsRate = cfg.annualIncome > 0 ? annualSavings / cfg.annualIncome : 0;
    var paradiseRow = buildProjection(cfg, Math.max(cfg.paradiseYears, 0)).rows[cfg.paradiseYears] || buildProjection(cfg, 0).rows[0];
    var paradiseAssets = paradiseRow.endingAssets;
    var paradiseMonthlyIncome = paradiseAssets * pct(cfg.withdrawalRate) / 12;
    return {
      config: cfg,
      projection: projection,
      annualSavings: annualSavings,
      savingsRate: savingsRate,
      effectiveReturn: annualReturnFromInputs(cfg),
      nominalReturn: annualReturnFromInputs(Object.assign({}, cfg, { basisMode: 'nominal' })),
      allocation: normalizeAllocations(cfg),
      paradiseAssets: paradiseAssets,
      paradiseMonthlyIncome: paradiseMonthlyIncome
    };
  }

  function yearsToFireForSavingsRate(cfg, savingsRate) {
    var c = normalizeConfig(cfg);
    var income = c.annualIncome || 0;
    c.annualExpenses = income * (1 - savingsRate);
    c.retirementSpending = Math.max(0, c.annualExpenses);
    c.monthlySaving = Math.max(0, income * savingsRate / 12);
    var projection = buildProjection(c, 70);
    return projection.retireYear == null ? null : projection.retireYear;
  }

  function qs(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    var el = qs(id);
    if (el) el.textContent = value;
  }

  function readConfigFromDom() {
    var cfg = cloneDefaults();
    Object.keys(cfg).forEach(function (key) {
      var el = qs(key);
      if (!el || key === 'streams') return;
      cfg[key] = el.value;
    });
    var active = document.querySelector('.seg.active');
    cfg.targetMode = active ? active.dataset.mode : 'withdrawal';
    cfg.streams = Array.prototype.slice.call(document.querySelectorAll('.stream-row')).map(function (row) {
      return {
        type: row.querySelector('[data-stream="type"]').value,
        amount: row.querySelector('[data-stream="amount"]').value,
        startAge: row.querySelector('[data-stream="startAge"]').value,
        endAge: row.querySelector('[data-stream="endAge"]').value
      };
    });
    return normalizeConfig(cfg);
  }

  function writeConfigToDom(cfg) {
    cfg = normalizeConfig(cfg);
    Object.keys(cfg).forEach(function (key) {
      var el = qs(key);
      if (!el || key === 'streams' || key === 'targetMode') return;
      el.value = typeof cfg[key] === 'number' && key.indexOf('Age') < 0 && key.indexOf('Rate') < 0 && key.indexOf('Return') < 0 && key.indexOf('Volatility') < 0 && key.indexOf('Allocation') < 0 && key !== 'paradiseYears'
        ? formatCompact(cfg[key])
        : cfg[key];
    });
    document.querySelectorAll('.seg').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.mode === cfg.targetMode);
    });
    renderStreams(cfg.streams);
    updateModeFields();
  }

  function updateModeFields() {
    var mode = document.querySelector('.seg.active').dataset.mode;
    document.querySelectorAll('.mode-withdrawal').forEach(function (el) {
      el.classList.toggle('hidden', mode !== 'withdrawal');
    });
    document.querySelectorAll('.mode-life').forEach(function (el) {
      el.classList.toggle('hidden', mode !== 'life');
    });
    var taxMode = qs('taxMode').value;
    qs('customTaxWrap').classList.toggle('hidden', taxMode !== 'custom');
  }

  function createStreamRow(stream) {
    var row = document.createElement('div');
    row.className = 'stream-row';
    row.innerHTML = [
      '<label>구분<select data-stream="type"><option value="income">수입</option><option value="expense">지출</option></select></label>',
      '<label>금액<input data-stream="amount" type="text" inputmode="decimal"></label>',
      '<label>시작<input data-stream="startAge" type="number" min="10" max="120" step="1"></label>',
      '<label>종료<input data-stream="endAge" type="number" min="10" max="120" step="1"></label>',
      '<button class="remove-stream" type="button" aria-label="항목 삭제">x</button>'
    ].join('');
    row.querySelector('[data-stream="type"]').value = stream.type || 'income';
    row.querySelector('[data-stream="amount"]').value = formatCompact(toNumber(stream.amount, 0));
    row.querySelector('[data-stream="startAge"]').value = stream.startAge || DEFAULTS.currentAge;
    row.querySelector('[data-stream="endAge"]').value = stream.endAge || DEFAULTS.currentAge + 1;
    row.querySelector('.remove-stream').addEventListener('click', function () {
      row.remove();
      update();
    });
    row.querySelectorAll('input,select').forEach(function (el) {
      el.addEventListener('input', update);
      el.addEventListener('change', update);
    });
    return row;
  }

  function renderStreams(streams) {
    var container = qs('streams');
    container.innerHTML = '';
    streams.forEach(function (stream) {
      container.appendChild(createStreamRow(stream));
    });
  }

  function renderSummary(result) {
    var cfg = result.config;
    var p = result.projection;
    var fireTarget = p.fireTarget || targetForAge(cfg, cfg.currentAge);
    setText('heroTarget', formatMoney(fireTarget));
    setText('fireTarget', formatMoney(fireTarget));
    setText('targetSub', cfg.targetMode === 'life'
      ? '기대수명 ' + cfg.lifeExpectancy + '세 기준'
      : '인출률 ' + cfg.withdrawalRate + '% 기준');
    var ageText = p.retirementAge == null ? '70년 초과' : p.retirementAge + '세';
    setText('heroAge', ageText);
    setText('retirementAge', ageText);
    setText('retirementSub', p.retireYear == null ? '현재 입력값으로는 목표 달성이 어렵습니다.' : '지금부터 ' + p.retireYear + '년 뒤');
    setText('annualSavings', formatMoney(result.annualSavings));
    setText('savingRate', 'Networthify 저축률 ' + formatPercent(result.savingsRate, 1));
    setText('heroSavingRate', formatPercent(result.savingsRate, 0));
    setText('paradiseAssets', formatMoney(result.paradiseAssets));
    setText('paradiseIncome', cfg.paradiseYears + '년 뒤 월 ' + formatMoney(result.paradiseMonthlyIncome));
    setText('effectiveReturn', formatPercent(result.effectiveReturn, 1));
    setText('returnSub', cfg.basisMode === 'real'
      ? '세후·물가 반영, 명목 ' + formatPercent(result.nominalReturn, 1)
      : '명목 기준, 세후 반영');

    var insight = qs('insightCard');
    var gap = (p.rows[0] ? p.rows[0].gap : 0);
    if (gap >= 0) {
      insight.textContent = '이미 FIRE 목표를 넘었습니다. 은퇴 후 지출, 인출률, 세금, 현금 비중을 보수적으로 조정해 안전마진을 확인하세요.';
    } else if (p.retireYear == null) {
      insight.textContent = '현재 저축액과 수익률로는 70년 안에 목표 도달이 어렵습니다. 월 저축액을 늘리거나 은퇴 후 지출·목표 인출률을 다시 잡아야 합니다.';
    } else {
      var monthlyNeed = Math.max(0, -gap / Math.max(1, p.retireYear) / 12);
      insight.textContent = '지금 기준 부족액은 ' + formatMoney(-gap) + '입니다. 현재 계획대로라면 ' + p.retireYear + '년 뒤 목표에 도달하며, 단순 평균으로는 월 ' + formatMoney(monthlyNeed) + '씩 격차를 줄이는 흐름입니다.';
    }
  }

  function lineData(rows, key) {
    return rows.map(function (row) { return Math.round(row[key]); });
  }

  function renderProjectionChart(result) {
    if (typeof Chart === 'undefined') return;
    var ctx = qs('projectionChart');
    var cfg = result.config;
    var labels;
    var datasets;
    if (result.projection.bands) {
      var bands = result.projection.bands;
      labels = bands.map(function (row) { return row.age + '세'; });
      datasets = [
        { label: '상위 10%', data: bands.map(function (r) { return Math.round(r.p90); }), borderColor: 'rgba(0,85,255,.18)', backgroundColor: 'rgba(0,85,255,.08)', pointRadius: 0, borderWidth: 1, fill: '+1' },
        { label: '하위 10%', data: bands.map(function (r) { return Math.round(r.p10); }), borderColor: 'rgba(0,85,255,.18)', backgroundColor: 'rgba(0,85,255,.08)', pointRadius: 0, borderWidth: 1, fill: false },
        { label: '상위 25%', data: bands.map(function (r) { return Math.round(r.p75); }), borderColor: 'rgba(255,107,0,.25)', backgroundColor: 'rgba(255,107,0,.12)', pointRadius: 0, borderWidth: 1, fill: '+1' },
        { label: '하위 25%', data: bands.map(function (r) { return Math.round(r.p25); }), borderColor: 'rgba(255,107,0,.25)', backgroundColor: 'rgba(255,107,0,.12)', pointRadius: 0, borderWidth: 1, fill: false },
        { label: '중앙값 자산', data: bands.map(function (r) { return Math.round(r.p50); }), borderColor: '#ff6b00', backgroundColor: '#ff6b00', pointRadius: 0, borderWidth: 3, tension: .22 },
        { label: 'FIRE 목표', data: bands.map(function (r) { return Math.round(r.target); }), borderColor: '#0a0a0a', pointRadius: 0, borderDash: [6, 6], borderWidth: 2, tension: .1 }
      ];
    } else {
      var rows = result.projection.rows;
      labels = rows.map(function (row) { return row.age + '세'; });
      datasets = [
        { label: '예상 자산', data: lineData(rows, 'endingAssets'), borderColor: '#ff6b00', backgroundColor: 'rgba(255,107,0,.10)', pointRadius: 0, borderWidth: 3, tension: .25, fill: true },
        { label: 'FIRE 목표', data: lineData(rows, 'target'), borderColor: '#0a0a0a', pointRadius: 0, borderDash: [6, 6], borderWidth: 2, tension: .1 },
        { label: '납입 누계', data: rows.map(function (row, idx) {
          var total = cfg.currentAssets;
          for (var i = 1; i <= idx; i += 1) total += rows[i].contribution;
          return Math.round(total);
        }), borderColor: '#0055ff', pointRadius: 0, borderWidth: 2, tension: .2 }
      ];
    }
    if (charts.projection) charts.projection.destroy();
    charts.projection = new Chart(ctx, {
      type: 'line',
      data: { labels: labels, datasets: datasets },
      options: chartOptions('만원')
    });
  }

  function chartOptions(unit) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true, font: { weight: 700 } } },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              return ctx.dataset.label + ': ' + formatMoney(ctx.parsed.y);
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 9 } },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(10,10,10,.08)' },
          ticks: {
            callback: function (value) { return formatMoney(value).replace('원', ''); }
          },
          title: { display: !!unit, text: unit }
        }
      }
    };
  }

  function renderTable(result) {
    var body = qs('projectionTable');
    body.innerHTML = result.projection.rows.slice(0, 71).map(function (row) {
      return '<tr>' +
        '<td>' + row.age + '세</td>' +
        '<td>' + formatMoney(row.contribution) + '</td>' +
        '<td>' + formatMoney(row.growth) + '</td>' +
        '<td>' + formatMoney(row.endingAssets) + '</td>' +
        '<td>' + formatMoney(row.target) + '</td>' +
        '<td>' + formatMoney(row.gap) + '</td>' +
        '</tr>';
    }).join('');
  }

  function renderSavingsRateChart(result) {
    if (typeof Chart === 'undefined') return;
    var cfg = result.config;
    var rates = [10, 20, 30, 40, 50, 60, 70, 80];
    var values = rates.map(function (rate) {
      var years = yearsToFireForSavingsRate(cfg, rate / 100);
      return years == null ? 75 : years;
    });
    if (charts.savingsRate) charts.savingsRate.destroy();
    charts.savingsRate = new Chart(qs('savingsRateChart'), {
      type: 'bar',
      data: {
        labels: rates.map(function (r) { return r + '%'; }),
        datasets: [{
          label: '은퇴까지 걸리는 기간',
          data: values,
          backgroundColor: rates.map(function (r) { return r / 100 <= result.savingsRate ? '#ff6b00' : '#d8d1c4'; }),
          borderRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: function (ctx) { return ctx.parsed.y >= 75 ? '70년 초과' : ctx.parsed.y + '년'; } } }
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, max: 75, ticks: { callback: function (v) { return v >= 75 ? '70+' : v + '년'; } } }
        }
      }
    });
  }

  function renderModeNote(result) {
    var p = result.projection;
    if (!p.bands) return;
    var ageText = p.retirementAge == null ? '70년 초과' : p.retirementAge + '세';
    var range = p.p10RetireYear != null && p.p90RetireYear != null
      ? '빠른 경우 ' + (result.config.currentAge + p.p10RetireYear) + '세, 늦은 경우 ' + (result.config.currentAge + p.p90RetireYear) + '세'
      : '목표 달성 표본이 부족합니다';
    qs('insightCard').textContent = (result.config.simulationMode === 'montecarlo' ? '몬테카를로' : '과거 수익률 사이클') +
      ' 기준 중앙값 은퇴 나이는 ' + ageText + '입니다. 목표 달성 표본 비율은 ' + formatPercent(p.successRate, 0) + '이며, ' + range + '입니다.';
  }

  function renderAll(result) {
    renderSummary(result);
    renderModeNote(result);
    renderProjectionChart(result);
    renderTable(result);
    renderSavingsRateChart(result);
    qs('allocationWarning').hidden = Math.round(result.allocation.total) === 100;
  }

  function update() {
    appState = calculateFire(readConfigFromDom());
    renderAll(appState);
  }

  function attachInputHandlers() {
    document.querySelectorAll('#inputForm input, #inputForm select').forEach(function (el) {
      el.addEventListener('input', update);
      el.addEventListener('change', function () {
        updateModeFields();
        update();
      });
    });
    document.querySelectorAll('.seg').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.seg').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        updateModeFields();
        update();
      });
    });
    document.querySelectorAll('.chart-tabs button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.chart-tabs button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        qs('chartView').classList.toggle('hidden', btn.dataset.view !== 'chart');
        qs('tableView').classList.toggle('hidden', btn.dataset.view !== 'table');
      });
    });
    qs('addStream').addEventListener('click', function () {
      qs('streams').appendChild(createStreamRow({ type: 'income', amount: 600, startAge: readConfigFromDom().currentAge, endAge: readConfigFromDom().currentAge + 5 }));
      update();
    });
    qs('resetInputs').addEventListener('click', function () {
      writeConfigToDom(cloneDefaults());
      update();
      showToast('기본값으로 복원했습니다.');
    });
    qs('copyShare').addEventListener('click', copyShareLink);
    qs('copyShareTop').addEventListener('click', copyShareLink);
  }

  function encodeShareData(cfg) {
    var json = JSON.stringify(normalizeConfig(cfg));
    var encoded = btoa(unescape(encodeURIComponent(json)));
    return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
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

  function configFromUrl() {
    if (typeof URLSearchParams === 'undefined') return null;
    var params = new URLSearchParams(window.location.search);
    return decodeShareData(params.get('data'));
  }

  function copyShareLink() {
    var data = encodeShareData(readConfigFromDom());
    var url = new URL(window.location.href);
    url.search = '?data=' + data;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url.href).then(function () {
        showToast('공유 링크를 복사했습니다.');
      }).catch(function () {
        showToast(url.href);
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

  function initApp() {
    if (!qs('inputForm')) return;
    var initial = configFromUrl() || cloneDefaults();
    writeConfigToDom(initial);
    attachInputHandlers();
    update();
  }

  return {
    DEFAULTS: DEFAULTS,
    HISTORICAL_RETURNS: HISTORICAL_RETURNS,
    normalizeConfig: normalizeConfig,
    calculateFire: calculateFire,
    buildProjection: buildProjection,
    runMonteCarlo: runMonteCarlo,
    runHistoricalCycles: runHistoricalCycles,
    yearsToFireForSavingsRate: yearsToFireForSavingsRate,
    formatMoney: formatMoney,
    initApp: initApp
  };
});
