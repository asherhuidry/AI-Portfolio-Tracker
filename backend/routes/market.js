const express = require('express');
const router = express.Router();
const { getQuote, getMultipleQuotes, searchSymbols } = require('../services/publicApis');
const { createError } = require('../utils/errorHandler');

/**
 * GET /api/market/quote/:symbol
 */
router.get('/quote/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params;
    if (!symbol) return next(createError(400, 'symbol is required'));

    const quote = await getQuote(symbol.toUpperCase());
    res.json(quote);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/market/quotes
 * Body: { symbols: string[] }
 */
router.post('/quotes', async (req, res, next) => {
  try {
    const { symbols } = req.body;
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return next(createError(400, 'symbols array is required'));
    }

    const quotes = await getMultipleQuotes(symbols.map((s) => s.toUpperCase()));
    res.json(quotes);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/market/search?q=<keywords>
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return next(createError(400, 'q query parameter is required'));

    const results = await searchSymbols(q);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
