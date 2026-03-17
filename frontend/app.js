/**
 * app.js - Portfolio Management
 * Handles portfolio CRUD, market data display, and tab navigation.
 */

const API_BASE = 'http://localhost:3000/api';

let currentUserId = 'demo-user';

// ===== Utility Helpers =====

const fmt = (num) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num || 0);

const fmtNum = (num, decimals = 2) =>
  typeof num === 'number' ? num.toFixed(decimals) : '—';

const showLoading = (show) => {
  document.getElementById('loadingOverlay').classList.toggle('hidden', !show);
};

const showTradeMessage = (msg, type = 'success') => {
  const el = document.getElementById('tradeMessage');
  el.textContent = msg;
  el.className = `trade-message ${type}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
};

// ===== Tab Navigation =====

const initTabs = () => {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-section').forEach((s) => {
        s.classList.remove('active');
        s.classList.add('hidden');
      });
      btn.classList.add('active');
      const section = document.getElementById(`tab-${tab}`);
      section.classList.remove('hidden');
      section.classList.add('active');

      if (tab === 'market') loadMarketData();
    });
  });
};

// ===== Portfolio =====

const loadPortfolio = async () => {
  try {
    showLoading(true);
    const res = await fetch(`${API_BASE}/portfolio/${currentUserId}`);
    const data = await res.json();

    if (!data.success) throw new Error(data.error);

    const p = data.portfolio;

    document.getElementById('totalValue').textContent = fmt(p.totalValue);
    document.getElementById('investedValue').textContent = fmt(p.investedValue);
    document.getElementById('cashBalance').textContent = fmt(p.cash);

    const gainLossEl = document.getElementById('gainLoss');
    gainLossEl.textContent = `${fmt(p.totalGainLoss)} (${p.totalGainLossPercent})`;
    gainLossEl.className = `stat-value ${p.totalGainLoss >= 0 ? 'positive' : 'negative'}`;

    renderHoldings(p.holdings);
  } catch (err) {
    console.error('Portfolio load error:', err);
  } finally {
    showLoading(false);
  }
};

const renderHoldings = (holdings) => {
  const tbody = document.getElementById('holdingsBody');

  if (!holdings || holdings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No holdings yet. Start by buying some stocks!</td></tr>';
    return;
  }

  tbody.innerHTML = holdings
    .map((h) => {
      const gl = h.gainLoss || 0;
      const glClass = gl >= 0 ? 'positive' : 'negative';
      const dayChange = h.dayChange || 0;
      const dayClass = dayChange >= 0 ? 'positive' : 'negative';

      return `
      <tr>
        <td><strong>${h.symbol}</strong></td>
        <td>${fmtNum(h.shares, 4)}</td>
        <td>${fmt(h.averagePrice)}</td>
        <td>${h.currentPrice ? fmt(h.currentPrice) : '—'}</td>
        <td>${h.currentValue ? fmt(h.currentValue) : '—'}</td>
        <td class="${glClass}">${fmt(gl)} (${h.gainLossPercent || '—'})</td>
        <td class="${dayClass}">${dayChange >= 0 ? '+' : ''}${fmtNum(dayChange)} (${h.dayChangePercent || '—'})</td>
        <td>
          <button class="btn btn-icon btn-sm" onclick="removeHolding('${h.symbol}')" title="Remove">✕</button>
        </td>
      </tr>`;
    })
    .join('');
};

const removeHolding = async (symbol) => {
  if (!confirm(`Remove ${symbol} from your portfolio?`)) return;
  try {
    const res = await fetch(`${API_BASE}/portfolio/${currentUserId}/holding/${symbol}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (data.success) loadPortfolio();
    else showTradeMessage(data.error, 'error');
  } catch (err) {
    showTradeMessage('Failed to remove holding', 'error');
  }
};

const executeTrade = async (type) => {
  const symbol = document.getElementById('tradeSymbol').value.trim().toUpperCase();
  const shares = parseFloat(document.getElementById('tradeShares').value);
  const price = parseFloat(document.getElementById('tradePrice').value) || undefined;

  if (!symbol) { showTradeMessage('Please enter a stock symbol', 'error'); return; }
  if (!shares || shares <= 0) { showTradeMessage('Please enter a valid number of shares', 'error'); return; }

  try {
    showLoading(true);
    const res = await fetch(`${API_BASE}/portfolio/${currentUserId}/${type.toLowerCase()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, shares, price }),
    });
    const data = await res.json();

    if (data.success) {
      showTradeMessage(data.message, 'success');
      document.getElementById('tradeSymbol').value = '';
      document.getElementById('tradeShares').value = '';
      document.getElementById('tradePrice').value = '';
      loadPortfolio();
    } else {
      showTradeMessage(data.error, 'error');
    }
  } catch (err) {
    showTradeMessage('Trade failed. Is the server running?', 'error');
  } finally {
    showLoading(false);
  }
};

// ===== Market Data =====

const loadMarketData = async () => {
  await Promise.allSettled([
    loadMarketSentiment(),
    loadTopCryptos(),
    loadHeadlines(),
  ]);
};

const loadMarketSentiment = async () => {
  try {
    const res = await fetch(`${API_BASE}/market/sentiment`);
    const data = await res.json();
    if (!data.success) return;

    const fg = data.fearGreedIndex;
    const el = document.getElementById('fearGreedDisplay');

    if (fg) {
      const cls = getFearGreedClass(fg.value);
      el.innerHTML = `
        <div class="fear-greed-value ${cls}">${fg.value}</div>
        <div>
          <div class="fear-greed-label ${cls}">${fg.classification}</div>
          <div style="font-size:12px;color:var(--color-text-muted)">Fear & Greed Index</div>
        </div>`;
    }
  } catch (err) {
    console.error('Market sentiment error:', err);
  }
};

const getFearGreedClass = (value) => {
  if (value <= 25) return 'fear-greed-extreme-fear';
  if (value <= 45) return 'fear-greed-fear';
  if (value <= 55) return 'fear-greed-neutral';
  if (value <= 75) return 'fear-greed-greed';
  return 'fear-greed-extreme-greed';
};

const lookupStock = async () => {
  const symbol = document.getElementById('lookupSymbol').value.trim().toUpperCase();
  if (!symbol) return;

  try {
    showLoading(true);
    const res = await fetch(`${API_BASE}/market/quote/${symbol}`);
    const data = await res.json();

    const el = document.getElementById('lookupResult');
    if (data.success) {
      const q = data.data;
      const changeNum = parseFloat(q.changePercent) || 0;
      const cls = changeNum >= 0 ? 'positive' : 'negative';
      el.innerHTML = `
        <div class="lookup-item"><div class="lookup-item-label">Symbol</div><div class="lookup-item-value">${q.symbol}</div></div>
        <div class="lookup-item"><div class="lookup-item-label">Price</div><div class="lookup-item-value">${fmt(q.price)}</div></div>
        <div class="lookup-item"><div class="lookup-item-label">Change</div><div class="lookup-item-value ${cls}">${fmt(q.change)} (${q.changePercent})</div></div>
        <div class="lookup-item"><div class="lookup-item-label">Volume</div><div class="lookup-item-value">${(q.volume || 0).toLocaleString()}</div></div>
        <div class="lookup-item"><div class="lookup-item-label">Open</div><div class="lookup-item-value">${fmt(q.open)}</div></div>
        <div class="lookup-item"><div class="lookup-item-label">High</div><div class="lookup-item-value">${fmt(q.high)}</div></div>
        <div class="lookup-item"><div class="lookup-item-label">Low</div><div class="lookup-item-value">${fmt(q.low)}</div></div>
        <div class="lookup-item"><div class="lookup-item-label">Prev Close</div><div class="lookup-item-value">${fmt(q.previousClose)}</div></div>`;
      el.classList.remove('hidden');
    } else {
      el.innerHTML = `<p style="color:var(--color-danger)">${data.error}</p>`;
      el.classList.remove('hidden');
    }
  } catch (err) {
    document.getElementById('lookupResult').innerHTML = '<p style="color:var(--color-danger)">Lookup failed. Is the server running?</p>';
    document.getElementById('lookupResult').classList.remove('hidden');
  } finally {
    showLoading(false);
  }
};

const loadTopCryptos = async () => {
  try {
    const res = await fetch(`${API_BASE}/market/crypto?limit=8`);
    const data = await res.json();

    const el = document.getElementById('cryptoGrid');
    if (data.success && data.data.length > 0) {
      el.innerHTML = data.data
        .map((c) => {
          const changeClass = c.change24h >= 0 ? 'positive' : 'negative';
          return `
          <div class="crypto-card">
            <div class="crypto-name">${c.name} <span style="color:var(--color-text-muted);font-size:11px">${c.symbol}</span></div>
            <div class="crypto-price">${fmt(c.price)}</div>
            <div class="crypto-change ${changeClass}">${c.change24h >= 0 ? '▲' : '▼'} ${Math.abs(c.change24h).toFixed(2)}%</div>
          </div>`;
        })
        .join('');
    } else {
      el.textContent = 'Could not load crypto data';
    }
  } catch (err) {
    document.getElementById('cryptoGrid').textContent = 'Could not load crypto data';
  }
};

const loadHeadlines = async () => {
  try {
    const res = await fetch(`${API_BASE}/market/sentiment`);
    const data = await res.json();

    const el = document.getElementById('headlinesList');
    if (data.success && data.headlines && data.headlines.length > 0) {
      el.innerHTML = data.headlines
        .map((h) => {
          const date = new Date(h.publishedAt).toLocaleDateString();
          return `
          <div class="headline-item">
            <div class="headline-title"><a href="${h.url}" target="_blank" rel="noopener">${h.title}</a></div>
            <div class="headline-meta">${h.source} · ${date}</div>
          </div>`;
        })
        .join('');
    } else {
      el.textContent = 'No headlines available';
    }
  } catch (err) {
    document.getElementById('headlinesList').textContent = 'Could not load headlines';
  }
};

// ===== Init =====

document.addEventListener('DOMContentLoaded', () => {
  initTabs();

  // User ID
  document.getElementById('userIdInput').addEventListener('change', (e) => {
    currentUserId = e.target.value.trim() || 'demo-user';
    loadPortfolio();
  });

  // Portfolio actions
  document.getElementById('refreshPortfolioBtn').addEventListener('click', loadPortfolio);
  document.getElementById('buyBtn').addEventListener('click', () => executeTrade('buy'));
  document.getElementById('sellBtn').addEventListener('click', () => executeTrade('sell'));

  // Market actions
  document.getElementById('refreshMarketBtn').addEventListener('click', loadMarketData);
  document.getElementById('lookupBtn').addEventListener('click', lookupStock);
  document.getElementById('lookupSymbol').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') lookupStock();
  });

  // Initial load
  loadPortfolio();
});

// Expose for inline HTML handlers
window.removeHolding = removeHolding;
