(function() {
  var DATA_URL = '../data/investment-prices.json?v=20260528-static';
  var COLORS = {
    'Buy & Hold': '#2563eb',
    'VR': '#0f766e',
    '무한매수법': '#f97316',
    invest: '#71717a',
    price: '#18181b',
    buy: '#16a34a',
    sell: '#dc2626'
  };
  var state = {
    data: null,
    custom: null,
    prices: [],
    results: [],
    charts: {},
    selectedTicker: null
  };

  var $ = function(id) { return document.getElementById(id); };

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    bindEvents();
    fetch(DATA_URL, { cache: 'no-store' })
      .then(function(res) {
        if (!res.ok) throw new Error('가격 데이터를 불러오지 못했습니다.');
        return res.json();
      })
      .then(function(data) {
        state.data = data;
        renderTickerOptions();
        $('data-updated').textContent = '데이터 ' + data.generatedAt;
        setDefaultDates();
        runBacktest();
      })
      .catch(function(err) {
        $('data-updated').textContent = '데이터 오류';
        $('metrics-body').innerHTML = '<tr><td colspan="9" class="empty">' + esc(err.message) + '</td></tr>';
      });
  }

  function bindEvents() {
    $('run').addEventListener('click', runBacktest);
    $('ticker-select').addEventListener('change', function() {
      state.custom = null;
      setDefaultDates();
      runBacktest();
    });
    $('trade-strategy').addEventListener('change', renderTradeChart);
    $('download-metrics').addEventListener('click', downloadMetrics);
    $('download-trades').addEventListener('click', downloadTrades);
    $('csv-upload').addEventListener('change', handleCsvUpload);
    document.addEventListener('click', function(event) {
      var button = event.target.closest('[data-reset-chart]');
      if (!button) return;
      resetChart(button.getAttribute('data-reset-chart'));
    });
  }

  function renderTickerOptions() {
    var tickers = Object.keys(state.data.tickers);
    $('ticker-select').innerHTML = tickers.map(function(ticker) {
      var item = state.data.tickers[ticker];
      return '<option value="' + attr(ticker) + '">' + esc(ticker + ' · ' + item.label) + '</option>';
    }).join('');
    if (tickers.indexOf('TQQQ') !== -1) {
      $('ticker-select').value = 'TQQQ';
    }
  }

  function setDefaultDates() {
    var prices = getActiveRows();
    if (!prices.length) return;
    var last = prices[prices.length - 1].date;
    var first = prices[0].date;
    var defaultStart = addYears(last, -10);
    $('start-date').min = first;
    $('start-date').max = last;
    $('end-date').min = first;
    $('end-date').max = last;
    $('start-date').value = defaultStart < first ? first : defaultStart;
    $('end-date').value = last;
  }

  function getActiveRows() {
    if (state.custom) return state.custom.rows;
    if (!state.data) return [];
    var ticker = $('ticker-select').value;
    state.selectedTicker = ticker;
    return (state.data.tickers[ticker] && state.data.tickers[ticker].rows || []).map(function(row) {
      return { date: row[0], close: Number(row[1]) };
    }).filter(function(row) {
      return row.date && Number.isFinite(row.close);
    });
  }

  function runBacktest() {
    var rows = getActiveRows();
    var start = $('start-date').value;
    var end = $('end-date').value;
    var prices = rows.filter(function(row) {
      return row.date >= start && row.date <= end && row.close > 0;
    });
    state.prices = prices;
    if (prices.length < 20) {
      renderEmpty('기간 안에 가격 데이터가 부족합니다.');
      return;
    }

    var cfg = {
      initialCash: num('initial-cash'),
      monthlyContribution: num('monthly-contribution')
    };
    var results = [];
    if ($('use-bh').checked) results.push(simulateBuyHold(prices, cfg));
    if ($('use-vr').checked) results.push(simulateVr(prices, cfg, {
      g: Math.max(1, num('vr-g')),
      band: num('vr-band'),
      initialPct: clamp(num('vr-initial'), 0, 100)
    }));
    if ($('use-ib').checked) results.push(simulateInfinite(prices, cfg, infiniteParams()));
    state.results = results;
    if (!results.length) {
      renderEmpty('선택된 전략이 없습니다.');
      return;
    }
    renderAll();
  }

  function infiniteParams() {
    var version = $('ib-version').value;
    var params = {
      version: version,
      rounds: Math.max(1, num('ib-rounds')),
      target: num('ib-target'),
      avgThreshold: -2,
      deepThreshold: -6,
      sellFraction: 25,
      rsiThreshold: 30,
      useRsi: true
    };
    if (version === 'V1') {
      params.target = 10;
      params.avgThreshold = 0;
      params.deepThreshold = -3;
      params.useRsi = false;
    } else if (version === 'V2') {
      params.target = 8;
      params.avgThreshold = -1;
      params.deepThreshold = -5;
      params.rsiThreshold = 35;
    }
    return params;
  }

  function simulateBuyHold(prices, cfg) {
    var cash = cfg.initialCash;
    var shares = 0;
    var totalContributed = cfg.initialCash;
    var history = [];
    var trades = [];
    var lastMonth = null;
    prices.forEach(function(row, i) {
      var month = row.date.slice(0, 7);
      var contribution = 0;
      if (i === 0 || month !== lastMonth) {
        if (i !== 0) {
          contribution = cfg.monthlyContribution;
          cash += contribution;
          totalContributed += contribution;
        }
        var qty = cash / row.close;
        if (qty > 0) {
          var amount = qty * row.close;
          shares += qty;
          cash -= amount;
          trades.push(trade(row.date, 'Buy & Hold', 'BUY', qty, row.close, amount, 'monthly buy'));
        }
      }
      lastMonth = month;
      history.push(hist(row.date, row.close, cash, shares, contribution));
    });
    return finish('Buy & Hold', history, trades, totalContributed, cfg.initialCash);
  }

  function simulateVr(prices, cfg, params) {
    var cash = cfg.initialCash;
    var shares = 0;
    var totalContributed = cfg.initialCash;
    var target = 0;
    var history = [];
    var trades = [];
    var lastMonth = null;
    prices.forEach(function(row, i) {
      var month = row.date.slice(0, 7);
      var contribution = 0;
      if (i === 0) {
        var initialBuy = cash * params.initialPct / 100;
        var qty = initialBuy / row.close;
        if (qty > 0) {
          var amount = qty * row.close;
          shares += qty;
          cash -= amount;
          target = shares * row.close;
          trades.push(trade(row.date, 'VR', 'BUY', qty, row.close, amount, 'initial allocation'));
        }
      } else if (month !== lastMonth) {
        contribution = cfg.monthlyContribution;
        cash += contribution;
        totalContributed += contribution;
        var positionValue = shares * row.close;
        var equity = cash + positionValue;
        target = target + equity / params.g + contribution;
        var lower = target * (1 - params.band / 100);
        var upper = target * (1 + params.band / 100);
        if (positionValue < lower && cash > 0) {
          var buyAmount = Math.min(target - positionValue, cash);
          var buyQty = buyAmount / row.close;
          shares += buyQty;
          cash -= buyAmount;
          trades.push(trade(row.date, 'VR', 'BUY', buyQty, row.close, buyAmount, 'below VR band'));
        } else if (positionValue > upper && shares > 0) {
          var sellAmount = positionValue - target;
          var sellQty = Math.min(sellAmount / row.close, shares);
          var proceeds = sellQty * row.close;
          shares -= sellQty;
          cash += proceeds;
          trades.push(trade(row.date, 'VR', 'SELL', sellQty, row.close, proceeds, 'above VR band'));
        }
      }
      lastMonth = month;
      var h = hist(row.date, row.close, cash, shares, contribution);
      h.target = target;
      history.push(h);
    });
    return finish('VR', history, trades, totalContributed, cfg.initialCash);
  }

  function simulateInfinite(prices, cfg, params) {
    var cash = cfg.initialCash;
    var shares = 0;
    var avgPrice = 0;
    var roundsUsed = 0;
    var cycleBudget = cfg.initialCash;
    var totalContributed = cfg.initialCash;
    var history = [];
    var trades = [];
    var rsi = rsiSeries(prices.map(function(row) { return row.close; }), 14);
    var lastMonth = null;
    prices.forEach(function(row, i) {
      var month = row.date.slice(0, 7);
      var contribution = 0;
      if (i !== 0 && month !== lastMonth) {
        contribution = cfg.monthlyContribution;
        cash += contribution;
        totalContributed += contribution;
        cycleBudget += contribution;
      }
      if (shares > 0 && row.close >= avgPrice * (1 + params.target / 100)) {
        var sellQty = shares * params.sellFraction / 100;
        var proceeds = sellQty * row.close;
        shares -= sellQty;
        cash += proceeds;
        trades.push(trade(row.date, '무한매수법', 'SELL', sellQty, row.close, proceeds, 'target +' + params.target.toFixed(1) + '%'));
        if (shares <= 1e-8) {
          shares = 0;
          avgPrice = 0;
          roundsUsed = 0;
          cycleBudget = cash;
        }
      }
      if (roundsUsed < params.rounds) {
        var unit = cycleBudget / params.rounds;
        var buyBudget = 0;
        var reasons = [];
        if (shares === 0) {
          buyBudget = unit;
          reasons.push('cycle start');
        } else {
          if (row.close <= avgPrice * (1 + params.avgThreshold / 100)) {
            buyBudget += unit * 0.5;
            reasons.push('LOC avg');
          }
          var deepOk = row.close <= avgPrice * (1 + params.deepThreshold / 100);
          var rsiOk = !params.useRsi || (rsi[i] || 50) <= params.rsiThreshold;
          if (deepOk && rsiOk) {
            buyBudget += unit * 0.5;
            reasons.push('LOC deep');
          }
        }
        buyBudget = Math.min(buyBudget, cash);
        if (buyBudget > 0) {
          var qty = buyBudget / row.close;
          var oldCost = shares * avgPrice;
          shares += qty;
          cash -= buyBudget;
          avgPrice = (oldCost + buyBudget) / shares;
          roundsUsed += unit ? buyBudget / unit : 0;
          trades.push(trade(row.date, '무한매수법', 'BUY', qty, row.close, buyBudget, reasons.join(', ')));
        }
      }
      lastMonth = month;
      var h = hist(row.date, row.close, cash, shares, contribution);
      h.avgPrice = avgPrice;
      h.roundsUsed = roundsUsed;
      history.push(h);
    });
    return finish('무한매수법', history, trades, totalContributed, cfg.initialCash);
  }

  function hist(date, price, cash, shares, contribution) {
    var position = shares * price;
    var equity = cash + position;
    return {
      date: date,
      price: price,
      cash: cash,
      shares: shares,
      position: position,
      equity: equity,
      cashPct: equity ? cash / equity : 0,
      contribution: contribution || 0
    };
  }

  function trade(date, strategy, action, qty, price, amount, reason) {
    return { date: date, strategy: strategy, action: action, qty: qty, price: price, amount: amount, reason: reason };
  }

  function finish(name, history, trades, totalContributed, initialCash) {
    return {
      name: name,
      history: history,
      trades: trades,
      metrics: metrics(history, trades.length, totalContributed, initialCash)
    };
  }

  function metrics(history, tradeCount, totalContributed, initialCash) {
    var first = history[0];
    var last = history[history.length - 1];
    var equity = history.map(function(h) { return h.equity; });
    var finalEquity = last.equity;
    var profit = finalEquity - totalContributed;
    var totalReturn = totalContributed ? finalEquity / totalContributed - 1 : 0;
    var years = Math.max(daysBetween(first.date, last.date) / 365.25, 1 / 365.25);
    var mwrr = moneyWeightedReturn(history, initialCash);
    var cagr = Number.isFinite(mwrr) ? mwrr : Math.pow(finalEquity / totalContributed, 1 / years) - 1;
    var dd = drawdowns(equity);
    var returns = [];
    for (var i = 1; i < equity.length; i += 1) {
      if (equity[i - 1]) returns.push(equity[i] / equity[i - 1] - 1);
    }
    var avg = mean(returns);
    var vol = std(returns) * Math.sqrt(252);
    var sharpe = vol ? avg * 252 / vol : 0;
    return {
      finalEquity: finalEquity,
      totalContributed: totalContributed,
      profit: profit,
      totalReturn: totalReturn,
      cagr: cagr,
      mdd: Math.min.apply(null, dd),
      sharpe: sharpe,
      tradeCount: tradeCount
    };
  }

  function moneyWeightedReturn(history, initialCash) {
    var flows = [{ date: history[0].date, amount: -initialCash }];
    history.forEach(function(h) {
      if (h.contribution > 0) flows.push({ date: h.date, amount: -h.contribution });
    });
    flows.push({ date: history[history.length - 1].date, amount: history[history.length - 1].equity });
    if (flows.length <= 2) return NaN;
    var low = -0.9999;
    var high = 10;
    var lowValue = npv(flows, low);
    var highValue = npv(flows, high);
    for (var i = 0; i < 20 && lowValue * highValue > 0; i += 1) {
      high *= 2;
      highValue = npv(flows, high);
    }
    if (lowValue * highValue > 0) return NaN;
    for (var j = 0; j < 80; j += 1) {
      var mid = (low + high) / 2;
      var midValue = npv(flows, mid);
      if (Math.abs(midValue) < 1e-7) return mid;
      if (lowValue * midValue <= 0) {
        high = mid;
        highValue = midValue;
      } else {
        low = mid;
        lowValue = midValue;
      }
    }
    return (low + high) / 2;
  }

  function npv(flows, rate) {
    var start = flows[0].date;
    return flows.reduce(function(total, flow) {
      var years = Math.max(daysBetween(start, flow.date) / 365.25, 0);
      return total + flow.amount / Math.pow(1 + rate, years);
    }, 0);
  }

  function renderAll() {
    renderMetricCards();
    renderMetricsTable();
    renderEquityChart();
    renderDrawdownChart();
    renderTradeSelector();
    renderTradeChart();
    renderTradesTable();
  }

  function renderMetricCards() {
    var rows = state.results.map(function(r) { return r.metrics; });
    var bestCagr = state.results.slice().sort(function(a, b) { return b.metrics.cagr - a.metrics.cagr; })[0];
    var bestMdd = state.results.slice().sort(function(a, b) { return b.metrics.mdd - a.metrics.mdd; })[0];
    var latest = state.prices[state.prices.length - 1];
    $('metric-cards').innerHTML = [
      card('최근 종가', money(latest.close), latest.date),
      card('최고 CAGR', pct(bestCagr.metrics.cagr), bestCagr.name),
      card('최소 MDD', pct(bestMdd.metrics.mdd), bestMdd.name),
      card('전략 수', state.results.length + '개', rows.length ? state.prices.length + ' 거래일' : '')
    ].join('');
  }

  function renderMetricsTable() {
    $('metrics-body').innerHTML = state.results.map(function(result) {
      var m = result.metrics;
      return '<tr>'
        + '<td>' + esc(result.name) + '</td>'
        + '<td>' + money(m.finalEquity) + '</td>'
        + '<td>' + money(m.totalContributed) + '</td>'
        + '<td class="' + (m.profit >= 0 ? 'good' : 'bad') + '">' + money(m.profit) + '</td>'
        + '<td>' + pct(m.totalReturn) + '</td>'
        + '<td>' + pct(m.cagr) + '</td>'
        + '<td class="bad">' + pct(m.mdd) + '</td>'
        + '<td>' + fixed(m.sharpe, 2) + '</td>'
        + '<td>' + m.tradeCount + '</td>'
        + '</tr>';
    }).join('');
  }

  function renderEquityChart() {
    var labels = state.prices.map(function(p) { return p.date; });
    var datasets = state.results.map(function(result) {
      return {
        label: result.name,
        data: result.history.map(function(h) { return Math.round(h.equity); }),
        borderColor: COLORS[result.name],
        backgroundColor: COLORS[result.name],
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.12
      };
    });
    var base = state.results[0].history;
    var invested = [];
    var total = num('initial-cash');
    base.forEach(function(h, i) {
      if (i > 0) total += h.contribution || 0;
      invested.push(Math.round(total));
    });
    datasets.push({
      label: '누적 투입금',
      data: invested,
      borderColor: COLORS.invest,
      backgroundColor: COLORS.invest,
      pointRadius: 0,
      borderDash: [5, 4],
      borderWidth: 1.5
    });
    state.charts.equity = drawChart('equity-chart', state.charts.equity, 'line', labels, datasets, moneyTick);
  }

  function renderDrawdownChart() {
    var labels = state.prices.map(function(p) { return p.date; });
    var datasets = state.results.map(function(result) {
      var dd = drawdowns(result.history.map(function(h) { return h.equity; })).map(function(v) { return v * 100; });
      return {
        label: result.name,
        data: dd,
        borderColor: COLORS[result.name],
        backgroundColor: COLORS[result.name],
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.12
      };
    });
    state.charts.drawdown = drawChart('drawdown-chart', state.charts.drawdown, 'line', labels, datasets, function(v) { return v.toFixed(0) + '%'; });
  }

  function renderTradeSelector() {
    var current = $('trade-strategy').value;
    $('trade-strategy').innerHTML = state.results.map(function(r) {
      return '<option value="' + attr(r.name) + '">' + esc(r.name) + '</option>';
    }).join('');
    if (state.results.some(function(r) { return r.name === current; })) {
      $('trade-strategy').value = current;
    }
  }

  function renderTradeChart() {
    if (!state.results.length) return;
    var selected = $('trade-strategy').value || state.results[0].name;
    var result = state.results.filter(function(r) { return r.name === selected; })[0] || state.results[0];
    var labels = state.prices.map(function(p) { return p.date; });
    var price = state.prices.map(function(p) { return p.close; });
    var buys = labels.map(function() { return null; });
    var sells = labels.map(function() { return null; });
    var index = {};
    labels.forEach(function(date, i) { index[date] = i; });
    result.trades.forEach(function(t) {
      if (index[t.date] === undefined) return;
      if (t.action === 'BUY') buys[index[t.date]] = t.price;
      if (t.action === 'SELL') sells[index[t.date]] = t.price;
    });
    var datasets = [
      { label: 'Close', data: price, borderColor: COLORS.price, backgroundColor: COLORS.price, pointRadius: 0, borderWidth: 1.5 },
      { label: 'BUY', data: buys, borderColor: COLORS.buy, backgroundColor: COLORS.buy, showLine: false, pointRadius: 4 },
      { label: 'SELL', data: sells, borderColor: COLORS.sell, backgroundColor: COLORS.sell, showLine: false, pointRadius: 4 }
    ];
    state.charts.trade = drawChart('trade-chart', state.charts.trade, 'line', labels, datasets, moneyTick);
    renderTradesTable();
  }

  function renderTradesTable() {
    var selected = $('trade-strategy').value || (state.results[0] && state.results[0].name);
    var result = state.results.filter(function(r) { return r.name === selected; })[0] || state.results[0];
    if (!result || !result.trades.length) {
      $('trades-body').innerHTML = '<tr><td colspan="7" class="empty">거래 없음</td></tr>';
      return;
    }
    $('trades-body').innerHTML = result.trades.slice(-250).map(function(t) {
      return '<tr>'
        + '<td>' + esc(t.date) + '</td>'
        + '<td>' + esc(t.strategy) + '</td>'
        + '<td>' + esc(t.action) + '</td>'
        + '<td>' + fixed(t.qty, 4) + '</td>'
        + '<td>' + money(t.price) + '</td>'
        + '<td>' + money(t.amount) + '</td>'
        + '<td class="reason">' + esc(t.reason) + '</td>'
        + '</tr>';
    }).join('');
  }

  function drawChart(id, existing, type, labels, datasets, yTick) {
    if (existing) existing.destroy();
    return new Chart($(id), {
      type: type,
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11, weight: '700' } } },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                var value = ctx.parsed.y;
                return ctx.dataset.label + ': ' + (id === 'drawdown-chart' ? value.toFixed(1) + '%' : money(value));
              }
            }
          },
          zoom: {
            pan: {
              enabled: true,
              mode: 'x',
              threshold: 8
            },
            zoom: {
              wheel: {
                enabled: true,
                speed: 0.08
              },
              pinch: {
                enabled: true
              },
              mode: 'x'
            }
          }
        },
        scales: {
          x: { ticks: { maxTicksLimit: 8, font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { callback: yTick, font: { size: 10 } } }
        }
      }
    });
  }

  function resetChart(key) {
    var chart = state.charts[key];
    if (chart && typeof chart.resetZoom === 'function') {
      chart.resetZoom();
    }
  }

  function renderEmpty(message) {
    $('metric-cards').innerHTML = '';
    $('metrics-body').innerHTML = '<tr><td colspan="9" class="empty">' + esc(message) + '</td></tr>';
    $('trades-body').innerHTML = '<tr><td colspan="7" class="empty">' + esc(message) + '</td></tr>';
    Object.keys(state.charts).forEach(function(key) {
      if (state.charts[key]) state.charts[key].destroy();
      state.charts[key] = null;
    });
  }

  function handleCsvUpload(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function() {
      var rows = parseCsv(String(reader.result || ''));
      if (!rows.length) {
        alert('Date, Close 컬럼이 있는 CSV가 필요합니다.');
        return;
      }
      state.custom = { label: file.name, rows: rows };
      var option = '<option value="CUSTOM">CUSTOM · ' + esc(file.name) + '</option>';
      $('ticker-select').insertAdjacentHTML('afterbegin', option);
      $('ticker-select').value = 'CUSTOM';
      setDefaultDates();
      runBacktest();
    };
    reader.readAsText(file);
  }

  function parseCsv(text) {
    var lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    var header = lines[0].split(',').map(function(v) { return v.trim().toLowerCase(); });
    var dateIdx = header.indexOf('date');
    var closeIdx = header.indexOf('close');
    if (closeIdx === -1) closeIdx = header.indexOf('adj close');
    if (dateIdx === -1 || closeIdx === -1) return [];
    return lines.slice(1).map(function(line) {
      var cells = line.split(',');
      var date = (cells[dateIdx] || '').trim();
      var close = Number((cells[closeIdx] || '').replace(/"/g, ''));
      return { date: date, close: close };
    }).filter(function(row) {
      return /^\d{4}-\d{2}-\d{2}$/.test(row.date) && Number.isFinite(row.close) && row.close > 0;
    }).sort(function(a, b) { return a.date.localeCompare(b.date); });
  }

  function rsiSeries(values, windowSize) {
    var out = values.map(function() { return null; });
    for (var i = windowSize; i < values.length; i += 1) {
      var gain = 0;
      var loss = 0;
      for (var j = i - windowSize + 1; j <= i; j += 1) {
        var diff = values[j] - values[j - 1];
        if (diff >= 0) gain += diff;
        else loss -= diff;
      }
      if (loss === 0) out[i] = 100;
      else {
        var rs = gain / loss;
        out[i] = 100 - 100 / (1 + rs);
      }
    }
    return out;
  }

  function drawdowns(values) {
    var peak = values[0] || 1;
    return values.map(function(value) {
      peak = Math.max(peak, value);
      return peak ? value / peak - 1 : 0;
    });
  }

  function downloadMetrics() {
    var rows = [['전략', '최종자산', '총투입금', '손익', '수익률', 'CAGR', 'MDD', 'Sharpe', '거래수']];
    state.results.forEach(function(r) {
      var m = r.metrics;
      rows.push([r.name, m.finalEquity, m.totalContributed, m.profit, m.totalReturn, m.cagr, m.mdd, m.sharpe, m.tradeCount]);
    });
    downloadCsv('investment_metrics.csv', rows);
  }

  function downloadTrades() {
    var selected = $('trade-strategy').value || (state.results[0] && state.results[0].name);
    var result = state.results.filter(function(r) { return r.name === selected; })[0] || state.results[0];
    var rows = [['날짜', '전략', '구분', '수량', '가격', '금액', '사유']];
    (result ? result.trades : []).forEach(function(t) {
      rows.push([t.date, t.strategy, t.action, t.qty, t.price, t.amount, t.reason]);
    });
    downloadCsv('investment_trades.csv', rows);
  }

  function downloadCsv(filename, rows) {
    var csv = rows.map(function(row) {
      return row.map(function(cell) {
        var value = String(cell == null ? '' : cell);
        return '"' + value.replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function card(label, value, sub) {
    return '<div class="metric"><span>' + esc(label) + '</span><b>' + esc(value) + '</b><em>' + esc(sub || '') + '</em></div>';
  }

  function num(id) {
    var value = Number($(id).value);
    return Number.isFinite(value) ? value : 0;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function mean(values) {
    if (!values.length) return 0;
    return values.reduce(function(a, b) { return a + b; }, 0) / values.length;
  }

  function std(values) {
    if (!values.length) return 0;
    var m = mean(values);
    var variance = mean(values.map(function(v) { return Math.pow(v - m, 2); }));
    return Math.sqrt(variance);
  }

  function daysBetween(a, b) {
    return Math.max((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000, 1);
  }

  function addYears(dateString, years) {
    var d = new Date(dateString + 'T00:00:00Z');
    d.setUTCFullYear(d.getUTCFullYear() + years);
    return d.toISOString().slice(0, 10);
  }

  function money(value) {
    return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function moneyTick(value) {
    return Number(value || 0).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 });
  }

  function pct(value) {
    return (Number(value || 0) * 100).toFixed(1) + '%';
  }

  function fixed(value, digits) {
    return Number(value || 0).toFixed(digits);
  }

  function esc(value) {
    var el = document.createElement('span');
    el.textContent = value == null ? '' : String(value);
    return el.innerHTML;
  }

  function attr(value) {
    return esc(value).replace(/"/g, '&quot;');
  }
})();
