/**
 * ai-advisor.js - AI Advisor Chat Interactions
 * Handles the chat interface, sentiment analysis, and AI recommendations.
 */

const AI_API_BASE = 'http://localhost:3000/api';

let conversationHistory = [];
let isSending = false;

// ===== Chat =====

const appendMessage = (role, content, isTyping = false) => {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  const isAI = role === 'ai';

  div.className = `message message-${isAI ? 'ai' : 'user'}${isTyping ? ' message-typing' : ''}`;
  div.innerHTML = `
    <span class="message-avatar">${isAI ? '🤖' : '👤'}</span>
    <div class="message-bubble">${escapeHtml(content).replace(/\n/g, '<br/>')}</div>`;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
};

const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
};

const sendMessage = async () => {
  if (isSending) return;

  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  isSending = true;
  document.getElementById('sendBtn').disabled = true;

  appendMessage('user', message);

  // Add user message to history
  conversationHistory.push({ role: 'user', content: message });

  // Show typing indicator
  const typingEl = appendMessage('ai', 'Thinking...', true);

  try {
    const res = await fetch(`${AI_API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversationHistory: conversationHistory.slice(0, -1) }),
    });

    const data = await res.json();
    typingEl.remove();

    if (data.success) {
      appendMessage('ai', data.message);
      conversationHistory.push({ role: 'ai', content: data.message });

      // Keep history manageable
      if (conversationHistory.length > 20) {
        conversationHistory = conversationHistory.slice(-20);
      }
    } else {
      appendMessage('ai', `Error: ${data.error}`);
    }
  } catch (err) {
    typingEl.remove();
    appendMessage('ai', 'Could not connect to the AI advisor. Please ensure the backend server is running.');
  } finally {
    isSending = false;
    document.getElementById('sendBtn').disabled = false;
    document.getElementById('chatInput').focus();
  }
};

const clearChat = () => {
  conversationHistory = [];
  const container = document.getElementById('chatMessages');
  container.innerHTML = `
    <div class="message message-ai">
      <span class="message-avatar">🤖</span>
      <div class="message-bubble">
        Chat cleared! How can I help you with your investments today?
      </div>
    </div>`;
};

// ===== Sentiment Analysis =====

const analyzeSentiment = async () => {
  const symbol = document.getElementById('sentimentSymbol').value.trim().toUpperCase();
  if (!symbol) return;

  const btn = document.getElementById('analyzeSentimentBtn');
  btn.disabled = true;
  btn.textContent = 'Analyzing...';

  try {
    const res = await fetch(`${AI_API_BASE}/sentiment/stock/${symbol}`);
    const data = await res.json();

    const el = document.getElementById('sentimentResult');
    if (data.success) {
      const s = data.sentiment;
      const badgeClass = `sentiment-${s.overall}`;
      el.innerHTML = `
        <span class="sentiment-badge ${badgeClass}">${s.overall.toUpperCase()}</span>
        <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:8px">
          Based on ${s.articleCount} articles · Score: ${(s.score * 100).toFixed(0)}%
        </div>
        ${s.breakdown ? `
        <div style="font-size:12px">
          <span class="positive">▲ ${(s.breakdown.positive * 100).toFixed(0)}% positive</span> ·
          <span class="negative">▼ ${(s.breakdown.negative * 100).toFixed(0)}% negative</span> ·
          ${(s.breakdown.neutral * 100).toFixed(0)}% neutral
        </div>` : ''}`;
      el.classList.remove('hidden');
    } else {
      el.innerHTML = `<p style="color:var(--color-danger)">${data.error}</p>`;
      el.classList.remove('hidden');
    }
  } catch (err) {
    document.getElementById('sentimentResult').innerHTML =
      '<p style="color:var(--color-danger)">Analysis failed. Is the server running?</p>';
    document.getElementById('sentimentResult').classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Analyze';
  }
};

// ===== AI Recommendations =====

const getRecommendation = async () => {
  const symbol = document.getElementById('recommendSymbol').value.trim().toUpperCase();
  if (!symbol) return;

  const btn = document.getElementById('getRecommendationBtn');
  btn.disabled = true;
  btn.textContent = 'Loading...';

  try {
    const res = await fetch(`${AI_API_BASE}/recommendations/stock/${symbol}`);
    const data = await res.json();

    const el = document.getElementById('recommendationResult');
    if (data.success) {
      const recClass = `recommend-${data.recommendation.toLowerCase()}`;
      el.innerHTML = `
        <span class="recommend-badge ${recClass}">${data.recommendation}</span>
        <p style="font-size:12px;color:var(--color-text-muted);margin-bottom:8px">${data.rationale}</p>
        ${data.stockData ? `
        <div style="font-size:12px">
          <strong>${fmtCurrency(data.stockData.price)}</strong>
          <span class="${parseFloat(data.stockData.change) >= 0 ? 'positive' : 'negative'}">
            ${parseFloat(data.stockData.change) >= 0 ? '▲' : '▼'} ${Math.abs(parseFloat(data.stockData.change)).toFixed(2)} (${data.stockData.changePercent})
          </span>
        </div>` : ''}`;
      el.classList.remove('hidden');
    } else {
      el.innerHTML = `<p style="color:var(--color-danger)">${data.error}</p>`;
      el.classList.remove('hidden');
    }
  } catch (err) {
    document.getElementById('recommendationResult').innerHTML =
      '<p style="color:var(--color-danger)">Could not get recommendation. Is the server running?</p>';
    document.getElementById('recommendationResult').classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Get Recommendation';
  }
};

// ===== Currency formatter (re-uses the fmt function from app.js) =====
const fmtCurrency = (num) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num || 0);

// ===== Init =====

document.addEventListener('DOMContentLoaded', () => {
  // Send button
  document.getElementById('sendBtn').addEventListener('click', sendMessage);

  // Enter to send (Shift+Enter for newline)
  document.getElementById('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Clear chat
  document.getElementById('clearChatBtn').addEventListener('click', clearChat);

  // Quick prompts
  document.querySelectorAll('.quick-prompt-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('chatInput').value = btn.dataset.prompt;
      sendMessage();
    });
  });

  // Sentiment analysis
  document.getElementById('analyzeSentimentBtn').addEventListener('click', analyzeSentiment);
  document.getElementById('sentimentSymbol').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') analyzeSentiment();
  });

  // Recommendations
  document.getElementById('getRecommendationBtn').addEventListener('click', getRecommendation);
  document.getElementById('recommendSymbol').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') getRecommendation();
  });
});
