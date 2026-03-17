const express = require('express');
const router = express.Router();
const { generateRecommendations } = require('../services/langchain');
const { getMultipleQuotes } = require('../services/publicApis');
const { createError } = require('../utils/errorHandler');

/**
 * POST /api/recommendations
 * Body: { portfolio: { holdings: [{symbol, shares, avgCost}] } }
 */
router.post('/', async (req, res, next) => {
  try {
    const { portfolio } = req.body;

    if (!portfolio || !Array.isArray(portfolio.holdings)) {
      return next(createError(400, 'portfolio.holdings array is required'));
    }

    if (portfolio.holdings.length === 0) {
      return next(createError(400, 'Portfolio has no holdings'));
    }

    const symbols = portfolio.holdings.map((h) => h.symbol).filter(Boolean);
    const marketData = await getMultipleQuotes(symbols);

    const recommendations = await generateRecommendations(portfolio, marketData);

    res.json({ recommendations, marketData });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
