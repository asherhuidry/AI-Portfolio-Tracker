const express = require('express');
const router = express.Router();
const { analyzeSentiment, aggregateSentiment } = require('../services/huggingface');
const { getNewsForSymbols } = require('../services/newsApi');
const { createError } = require('../utils/errorHandler');

/**
 * POST /api/sentiment
 * Body: { texts: string[] }
 * Analyse arbitrary text strings directly.
 */
router.post('/', async (req, res, next) => {
  try {
    const { texts } = req.body;
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return next(createError(400, 'texts array is required'));
    }

    const sentiments = await analyzeSentiment(texts);
    const aggregate = aggregateSentiment(sentiments);

    res.json({ sentiments, aggregate });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/sentiment/:symbol
 * Fetch news for the symbol and return its sentiment.
 */
router.get('/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params;
    if (!symbol) return next(createError(400, 'symbol is required'));

    const articles = await getNewsForSymbols(symbol.toUpperCase(), 10);
    if (articles.length === 0) {
      return res.json({ symbol, sentiments: [], aggregate: { aggregate: 0, breakdown: {} } });
    }

    const texts = articles
      .map((a) => [a.title, a.description].filter(Boolean).join('. '))
      .filter((t) => t.length > 0);

    const sentiments = await analyzeSentiment(texts);
    const aggregate = aggregateSentiment(sentiments);

    const enriched = articles.map((article, i) => ({
      ...article,
      sentiment: sentiments[i] ?? { label: 'neutral', score: 0 },
    }));

    res.json({ symbol: symbol.toUpperCase(), articles: enriched, aggregate });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
