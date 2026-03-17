const express = require('express');
const router = express.Router();
const { analyzeSentiment, analyzeNewsSentiment } = require('../services/huggingface');
const { getFinancialNews } = require('../services/newsApi');
const { ApiError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * POST /api/sentiment/analyze
 * Analyze sentiment of provided text(s).
 */
router.post('/analyze', async (req, res, next) => {
  try {
    const { texts } = req.body;

    if (!texts || (typeof texts !== 'string' && !Array.isArray(texts))) {
      throw new ApiError('texts field is required (string or array of strings)', 400);
    }

    const results = await analyzeSentiment(texts);

    res.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sentiment/stock/:symbol
 * Get sentiment analysis for a stock based on recent news.
 */
router.get('/stock/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params;

    if (!symbol || symbol.trim() === '') {
      throw new ApiError('Stock symbol is required', 400);
    }

    logger.debug(`Fetching sentiment for ${symbol}`);

    const articles = await getFinancialNews(symbol.toUpperCase(), 10);
    const sentiment = await analyzeNewsSentiment(articles);

    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      sentiment,
      articles: articles.slice(0, 5),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
