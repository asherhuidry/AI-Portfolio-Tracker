/* app.js – Portfolio management */
'use strict';

const API_BASE = 'http://localhost:3000/api';
const USER_ID  = 'default';

// ── State ──────────────────────────────────────────────────────────────────────
let portfolio = { holdings: [], cash: 0 };

// ── DOM helpers ────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function showToast(msg, type = 'info') {
  const container = $('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function showEl(id)  { $(id).classList.remove('hidden'); }
function hideEl(id)  { $(id).classList.add('hidden'); }

// ── Formatting ─────────────────────────────────────────────────────────────────
function fmt(n)      { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtPct(p)   { return (p >= 0 ? '+' : '') + p.toFixed(2) + '%'; }

// ── API helpers ────────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Portfolio ──────────────────────────────────────────────────────────────────
async function loadPortfolioValue() {
  try {
    const data = await apiFetch(`/portfolio/${USER_ID}/value`);
    portfolio.holdings = data.holdings;
    portfolio.cash     = data.cash;
    renderHoldings(data);
    updateSummary(data.totalValue);
  } catch (err) {
    console.error('loadPortfolioValue:', err);
    showToast('Could not refresh prices – using cached data', 'error');
  }
}

function updateSummary(totalValue) {
  $('total-value').textContent = fmt(totalValue);
  const totalGainLoss = portfolio.holdings.reduce((s, h) => s + h.gainLoss, 0);
  const el = $('total-gain-loss');
  if (totalGainLoss !== 0) {
    el.textContent = (totalGainLoss >= 0 ? '+' : '') + fmt(totalGainLoss);
    el.className = `summary-item ${totalGainLoss >= 0 ? 'gain' : 'loss'}`;
  } else {
    el.textContent = '';
  }
}

function renderHoldings(data) {
  const tbody = $('holdings-body');
  if (!data.holdings || data.holdings.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No holdings yet. Add one above.</td></tr>';
    return;
  }

  tbody.innerHTML = data.holdings.map((h) => {
    const glClass = h.gainLoss >= 0 ? 'gain-cell' : 'loss-cell';
    return `
      <tr>
        <td><strong>${escapeHtml(h.symbol)}</strong></td>
        <td>${h.shares}</td>
        <td>${fmt(h.avgCost)}</td>
        <td>${fmt(h.currentPrice)}</td>
        <td>${fmt(h.marketValue)}</td>
        <td class="${glClass}">${fmt(h.gainLoss)} (${fmtPct(h.gainLossPct)})</td>
        <td>
          <button class="btn btn-danger" onclick="removeHolding('${escapeHtml(h.symbol)}')">Remove</button>
        </td>
      </tr>`;
  }).join('');
}

async function addHolding(symbol, shares, avgCost) {
  try {
    await apiFetch(`/portfolio/${USER_ID}/holdings`, {
      method: 'POST',
      body: JSON.stringify({ symbol, shares: parseFloat(shares), avgCost: parseFloat(avgCost) }),
    });
    showToast(`Added ${symbol} to portfolio`, 'success');
    await loadPortfolioValue();
  } catch (err) {
    showToast(`Failed to add holding: ${err.message}`, 'error');
  }
}

async function removeHolding(symbol) {
  try {
    await apiFetch(`/portfolio/${USER_ID}/holdings/${symbol}`, { method: 'DELETE' });
    showToast(`Removed ${symbol}`, 'success');
    await loadPortfolioValue();
  } catch (err) {
    showToast(`Failed to remove holding: ${err.message}`, 'error');
  }
}

// ── Market news ─────────────────────────────────────────────────────────────────
async function fetchMarketNews() {
  try {
    const symbols = portfolio.holdings.map((h) => h.symbol);
    // Use first symbol for news if available, otherwise fall back to a broad market query
    const symbol = symbols.length > 0 ? symbols[0] : 'SPY';
    const data = await apiFetch(`/sentiment/${symbol}`);
    // The sentiment endpoint returns { symbol, articles, aggregate }
    renderNewsFeed(data.articles ?? []);
    showEl('news-feed');
  } catch (err) {
    showToast('Could not fetch news', 'error');
  }
}

function renderNewsFeed(articles) {
  const list = $('news-list');
  if (!articles || articles.length === 0) {
    list.innerHTML = '<li>No news available.</li>';
    return;
  }
  list.innerHTML = articles.map((a) => {
    const s = a.sentiment?.label ?? 'neutral';
    const badge = `<span class="news-sentiment sentiment-${s}">${s}</span>`;
    return `
      <li class="news-item">
        <a href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.title || 'Untitled')}${badge}</a>
        <div class="meta">${escapeHtml(a.source || '')} · ${a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : ''}</div>
      </li>`;
  }).join('');
}

// ── AI Recommendations ─────────────────────────────────────────────────────────
async function fetchRecommendations() {
  if (portfolio.holdings.length === 0) {
    showToast('Add some holdings first', 'error');
    return;
  }
  const btn = $('get-recommendations-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Analysing…';

  try {
    const data = await apiFetch('/recommendations', {
      method: 'POST',
      body: JSON.stringify({ portfolio: { holdings: portfolio.holdings } }),
    });
    $('recommendations-content').textContent = data.recommendations;
    showEl('recommendations-output');
  } catch (err) {
    showToast(`Could not get recommendations: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🤖 Get AI Recommendations';
  }
}

// ── Utilities ──────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Event listeners ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadPortfolioValue();

  $('add-holding-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const symbol  = $('holding-symbol').value.trim().toUpperCase();
    const shares  = $('holding-shares').value;
    const avgCost = $('holding-avg-cost').value;
    if (!symbol || !shares || !avgCost) return;
    addHolding(symbol, shares, avgCost);
    e.target.reset();
  });

  $('refresh-btn').addEventListener('click', () => loadPortfolioValue());
  $('get-recommendations-btn').addEventListener('click', fetchRecommendations);
  $('get-news-btn').addEventListener('click', () => {
    const isHidden = $('news-feed').classList.contains('hidden');
    if (isHidden) fetchMarketNews();
    else hideEl('news-feed');
  });
});
