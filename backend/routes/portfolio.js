const express = require('express');
const router = express.Router();
const { getMultipleQuotes } = require('../services/publicApis');
const { createError } = require('../utils/errorHandler');

// In-memory portfolio store (replace with a database in production)
const portfolios = new Map();

/**
 * GET /api/portfolio/:userId
 */
router.get('/:userId', (req, res, next) => {
  try {
    const { userId } = req.params;
    const portfolio = portfolios.get(userId) ?? { holdings: [], cash: 0 };
    res.json(portfolio);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/portfolio/:userId/holdings
 * Body: { symbol: string, shares: number, avgCost: number }
 * Add or update a holding.
 */
router.post('/:userId/holdings', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { symbol, shares, avgCost } = req.body;

    if (!symbol || shares == null || avgCost == null) {
      return next(createError(400, 'symbol, shares, and avgCost are required'));
    }

    if (shares <= 0) return next(createError(400, 'shares must be a positive number'));
    if (avgCost < 0) return next(createError(400, 'avgCost must be non-negative'));

    const portfolio = portfolios.get(userId) ?? { holdings: [], cash: 0 };

    const idx = portfolio.holdings.findIndex((h) => h.symbol === symbol.toUpperCase());
    if (idx >= 0) {
      portfolio.holdings[idx] = { symbol: symbol.toUpperCase(), shares, avgCost };
    } else {
      portfolio.holdings.push({ symbol: symbol.toUpperCase(), shares, avgCost });
    }

    portfolios.set(userId, portfolio);
    res.status(201).json(portfolio);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/portfolio/:userId/holdings/:symbol
 */
router.delete('/:userId/holdings/:symbol', (req, res, next) => {
  try {
    const { userId, symbol } = req.params;
    const portfolio = portfolios.get(userId);

    if (!portfolio) return next(createError(404, 'Portfolio not found'));

    portfolio.holdings = portfolio.holdings.filter(
      (h) => h.symbol !== symbol.toUpperCase()
    );

    portfolios.set(userId, portfolio);
    res.json(portfolio);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/portfolio/:userId/value
 * Calculate the current market value of the portfolio.
 */
router.get('/:userId/value', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const portfolio = portfolios.get(userId) ?? { holdings: [], cash: 0 };

    if (portfolio.holdings.length === 0) {
      return res.json({ totalValue: 0, holdings: [], cash: portfolio.cash });
    }

    const symbols = portfolio.holdings.map((h) => h.symbol);
    const quotes = await getMultipleQuotes(symbols);

    const quoteMap = Object.fromEntries(quotes.map((q) => [q.symbol, q]));

    const enriched = portfolio.holdings.map((h) => {
      const quote = quoteMap[h.symbol];
      const currentPrice = quote?.price ?? h.avgCost;
      const marketValue = currentPrice * h.shares;
      const costBasis = h.avgCost * h.shares;
      const gainLoss = marketValue - costBasis;
      const gainLossPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

      return {
        ...h,
        currentPrice,
        marketValue,
        costBasis,
        gainLoss,
        gainLossPct: parseFloat(gainLossPct.toFixed(2)),
        change: quote?.change,
        changePercent: quote?.changePercent,
      };
    });

    const totalValue = enriched.reduce((sum, h) => sum + h.marketValue, 0) + (portfolio.cash ?? 0);

    res.json({ totalValue: parseFloat(totalValue.toFixed(2)), holdings: enriched, cash: portfolio.cash });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
