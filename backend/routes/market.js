const express = require('express');
const router = express.Router();
const { getStockQuote, getHistoricalData, searchSymbols } = require('../services/openbb');
const { getTopCryptos, getTrendingStocks, getFearGreedIndex } = require('../services/publicApis');
const { getTopFinancialHeadlines } = require('../services/newsApi');
const { ApiError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * GET /api/market/quote/:symbol
 * Get real-time stock quote.
 */
router.get('/quote/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params;

    if (!symbol || symbol.trim() === '') {
      throw new ApiError('Stock symbol is required', 400);
    }

    logger.debug(`Fetching quote for ${symbol}`);
    const quote = await getStockQuote(symbol.toUpperCase());

    res.json({ success: true, data: quote });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/market/history/:symbol
 * Get historical price data for a stock.
 */
router.get('/history/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { outputsize = 'compact' } = req.query;

    if (!symbol || symbol.trim() === '') {
      throw new ApiError('Stock symbol is required', 400);
    }

    const data = await getHistoricalData(symbol.toUpperCase(), outputsize);
    res.json({ success: true, symbol: symbol.toUpperCase(), data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/market/search
 * Search for stock symbols.
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      throw new ApiError('Search query (q) is required', 400);
    }

    const results = await searchSymbols(q.trim());
    res.json({ success: true, results });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/market/crypto
 * Get top cryptocurrencies.
 */
router.get('/crypto', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const cryptos = await getTopCryptos(parseInt(limit, 10));
    res.json({ success: true, data: cryptos });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/market/trending
 * Get trending stocks.
 */
router.get('/trending', async (req, res, next) => {
  try {
    const trending = await getTrendingStocks();
    res.json({ success: true, data: trending });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/market/sentiment
 * Get overall market sentiment (Fear & Greed index).
 */
router.get('/sentiment', async (req, res, next) => {
  try {
    const [fearGreed, headlines] = await Promise.allSettled([
      getFearGreedIndex(),
      getTopFinancialHeadlines(5),
    ]);

    res.json({
      success: true,
      fearGreedIndex: fearGreed.status === 'fulfilled' ? fearGreed.value : null,
      headlines: headlines.status === 'fulfilled' ? headlines.value : [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/market/quotes
 * Get quotes for multiple symbols at once.
 */
router.post('/quotes', async (req, res, next) => {
  try {
    const { symbols } = req.body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      throw new ApiError('symbols must be a non-empty array', 400);
    }

    if (symbols.length > 20) {
      throw new ApiError('Maximum 20 symbols per request', 400);
    }

    const results = await Promise.allSettled(
      symbols.map((s) => getStockQuote(s.toUpperCase()))
    );

    const quotes = {};
    results.forEach((result, index) => {
      const symbol = symbols[index].toUpperCase();
      if (result.status === 'fulfilled') {
        quotes[symbol] = result.value;
      } else {
        quotes[symbol] = { error: result.reason.message };
      }
    });

    res.json({ success: true, quotes });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
