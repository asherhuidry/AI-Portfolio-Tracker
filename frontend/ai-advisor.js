/* ai-advisor.js – Chat interactions & sentiment analysis */
'use strict';

// Share the API base URL if already defined by app.js, otherwise define it
const ADVISOR_API_BASE = (typeof API_BASE !== 'undefined') ? API_BASE : 'http://localhost:3000/api';

// ── State ──────────────────────────────────────────────────────────────────────
let chatHistory = [];
let isTyping    = false;

// ── DOM helpers ────────────────────────────────────────────────────────────────
const _id = (id) => document.getElementById(id);
const esc = (s)  => {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

// ── Chat ───────────────────────────────────────────────────────────────────────
function appendMessage(role, text, id = null) {
  const container = _id('chat-messages');
  const el = document.createElement('div');
  el.className = `message ${role}`;
  if (id) el.id = id;

  const avatar = role === 'user' ? '👤' : '🤖';
  el.innerHTML = `
    <span class="avatar">${avatar}</span>
    <div class="bubble">${esc(text)}</div>`;

  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  return el;
}

function showTypingIndicator() {
  const container = _id('chat-messages');
  const el = document.createElement('div');
  el.id = 'typing-indicator';
  el.className = 'message assistant typing-indicator';
  el.innerHTML = `
    <span class="avatar">🤖</span>
    <div class="bubble">
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </div>`;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
  const el = _id('typing-indicator');
  if (el) el.remove();
}

async function sendMessage() {
  const input = _id('chat-input');
  const message = input.value.trim();
  if (!message || isTyping) return;

  input.value = '';
  isTyping = true;
  _id('send-btn').disabled = true;

  appendMessage('user', message);
  chatHistory.push({ role: 'user', content: message });

  showTypingIndicator();

  try {
    const res = await fetch(`${ADVISOR_API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: chatHistory.slice(-10) }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    removeTypingIndicator();

    const reply = data.reply || 'Sorry, I could not generate a response.';
    appendMessage('assistant', reply);
    chatHistory.push({ role: 'assistant', content: reply });

    setStatus('online');
  } catch (err) {
    removeTypingIndicator();
    appendMessage('assistant', `⚠️ Error: ${err.message}. Please check the backend is running and your API keys are configured.`);
    setStatus('offline');
  } finally {
    isTyping = false;
    _id('send-btn').disabled = false;
    input.focus();
  }
}

// ── Sentiment ─────────────────────────────────────────────────────────────────
async function analyseSentiment() {
  const input  = _id('sentiment-symbol');
  const symbol = input.value.trim().toUpperCase();
  if (!symbol) return;

  const result = _id('sentiment-result');
  result.classList.remove('hidden');
  result.textContent = 'Analysing…';

  try {
    const res = await fetch(`${ADVISOR_API_BASE}/sentiment/${encodeURIComponent(symbol)}`);
    const data = await res.json();

    const score     = data.aggregate?.aggregate ?? 0;
    const breakdown = data.aggregate?.breakdown ?? {};
    const label     = score > 0.1 ? 'Positive' : score < -0.1 ? 'Negative' : 'Neutral';
    const emoji     = score > 0.1 ? '📈' : score < -0.1 ? '📉' : '➡️';
    const cls       = score > 0.1 ? 'gain-cell' : score < -0.1 ? 'loss-cell' : '';

    result.innerHTML = `
      <div class="sentiment-score ${cls}">${emoji} ${label}</div>
      <div style="font-size:.8rem;color:var(--color-text-muted);margin-top:.4rem">
        Score: ${score.toFixed(4)} &nbsp;|&nbsp;
        Positive: ${breakdown.positive ?? 0} &nbsp;
        Negative: ${breakdown.negative ?? 0} &nbsp;
        Neutral: ${breakdown.neutral ?? 0}
      </div>
      <div style="font-size:.75rem;color:var(--color-text-muted);margin-top:.25rem">
        Based on ${data.articles?.length ?? 0} recent news articles
      </div>`;
  } catch (err) {
    result.textContent = `Error: ${err.message}`;
  }
}

// ── Status indicator ─────────────────────────────────────────────────────────
function setStatus(status) {
  const dot = _id('chat-status');
  dot.className = `status-dot ${status}`;
  dot.title = status === 'online' ? 'Connected' : 'Disconnected';
}

// ── Event listeners ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const sendBtn       = _id('send-btn');
  const chatInput     = _id('chat-input');
  const sentimentBtn  = _id('analyse-sentiment-btn');

  sendBtn.addEventListener('click', sendMessage);

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sentimentBtn.addEventListener('click', analyseSentiment);

  _id('sentiment-symbol').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') analyseSentiment();
  });

  // Suggestion chips
  document.querySelectorAll('.suggestion-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      chatInput.value = chip.dataset.text;
      chatInput.focus();
    });
  });

  // Health check on load
  fetch(`${ADVISOR_API_BASE.replace('/api', '')}/health`)
    .then((r) => r.ok && setStatus('online'))
    .catch(() => setStatus('offline'));
});
