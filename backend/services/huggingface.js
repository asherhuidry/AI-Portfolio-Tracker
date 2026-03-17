const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const HF_API_URL = `${config.huggingface.baseUrl}/${config.huggingface.sentimentModel}`;

/**
 * Analyse the sentiment of one or more text strings using FinBERT via HuggingFace.
 * Returns an array of objects: { label, score }
 * Labels: 'positive' | 'negative' | 'neutral'
 *
 * @param {string|string[]} texts
 * @returns {Promise<Array<{label: string, score: number}>>}
 */
async function analyzeSentiment(texts) {
  const inputs = Array.isArray(texts) ? texts : [texts];

  try {
    const response = await axios.post(
      HF_API_URL,
      { inputs },
      {
        headers: {
          Authorization: `Bearer ${config.huggingface.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    // HuggingFace returns [[{label, score},...], ...] – pick the highest-score label per input
    const results = response.data.map((predictions) => {
      const best = predictions.reduce((a, b) => (a.score > b.score ? a : b));
      return { label: best.label.toLowerCase(), score: best.score };
    });

    return results;
  } catch (err) {
    logger.error('HuggingFace sentiment error:', err.message);

    // Return neutral fallback so the rest of the pipeline can continue
    return inputs.map(() => ({ label: 'neutral', score: 0 }));
  }
}

/**
 * Summarise an array of sentiment results into an aggregate score.
 * Score range: -1 (very negative) → +1 (very positive)
 *
 * @param {Array<{label: string, score: number}>} sentiments
 * @returns {{ aggregate: number, breakdown: Object }}
 */
function aggregateSentiment(sentiments) {
  const counts = { positive: 0, negative: 0, neutral: 0 };
  let weightedSum = 0;

  for (const { label, score } of sentiments) {
    const key = label in counts ? label : 'neutral';
    counts[key] += 1;
    const sign = key === 'positive' ? 1 : key === 'negative' ? -1 : 0;
    weightedSum += sign * score;
  }

  const aggregate = sentiments.length > 0 ? weightedSum / sentiments.length : 0;
  return { aggregate: parseFloat(aggregate.toFixed(4)), breakdown: counts };
}

module.exports = { analyzeSentiment, aggregateSentiment };
