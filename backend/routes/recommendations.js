const express = require('express');
const router = express.Router();
const { analyzePortfolio } = require('../services/langchain');
const { getStockQuote } = require('../services/openbb');
const { analyzeNewsSentiment } = require('../services/huggingface');
const { getFinancialNews } = require('../services/newsApi');
const { ApiError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * POST /api/recommendations
 * Generate AI-powered portfolio recommendations.
 */
router.post('/', async (req, res, next) => {
  try {
    const { portfolio } = req.body;

    if (!portfolio || !Array.isArray(portfolio) || portfolio.length === 0) {
      throw new ApiError('portfolio must be a non-empty array', 400);
    }

    logger.debug(`Generating recommendations for ${portfolio.length} holdings`);

    // Fetch current market data for portfolio holdings
    const marketData = {};
    await Promise.allSettled(
      portfolio.map(async (holding) => {
        try {
          const quote = await getStockQuote(holding.symbol);
          marketData[holding.symbol] = quote;
        } catch (err) {
          logger.warn(`Could not fetch quote for ${holding.symbol}: ${err.message}`);
        }
      })
    );

    const analysis = await analyzePortfolio(portfolio, marketData);

    res.json({
      success: true,
      analysis,
      marketData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/recommendations/stock/:symbol
 * Get AI recommendation for a specific stock.
 */
router.get('/stock/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params;

    if (!symbol || symbol.trim() === '') {
      throw new ApiError('Stock symbol is required', 400);
    }

    const upperSymbol = symbol.toUpperCase();
    logger.debug(`Fetching recommendation for ${upperSymbol}`);

    const [quote, articles] = await Promise.allSettled([
      getStockQuote(upperSymbol),
      getFinancialNews(upperSymbol, 5),
    ]);

    const stockData = quote.status === 'fulfilled' ? quote.value : null;
    const newsData = articles.status === 'fulfilled' ? articles.value : [];

    const sentiment = await analyzeNewsSentiment(newsData);

    // Generate a basic recommendation based on sentiment and price change
    let recommendation = 'HOLD';
    let rationale = 'Insufficient data to make a strong recommendation.';

    if (stockData) {
      const priceChangeNum = parseFloat(stockData.changePercent);
      if (sentiment.overall === 'positive' && priceChangeNum > 0) {
        recommendation = 'BUY';
        rationale = `Positive news sentiment (${(sentiment.score * 100).toFixed(0)}%) combined with upward price momentum.`;
      } else if (sentiment.overall === 'negative' && priceChangeNum < -2) {
        recommendation = 'SELL';
        rationale = `Negative news sentiment (${(sentiment.score * 100).toFixed(0)}%) combined with downward price pressure.`;
      } else {
        rationale = `Mixed signals: ${sentiment.overall} news sentiment with ${priceChangeNum > 0 ? 'positive' : 'negative'} price movement.`;
      }
    }

    res.json({
      success: true,
      symbol: upperSymbol,
      recommendation,
      rationale,
      stockData,
      sentiment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
