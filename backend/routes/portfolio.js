const express = require('express');
const router = express.Router();
const { getStockQuote } = require('../services/openbb');
const { ApiError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

// In-memory portfolio store (replace with a database in production)
const portfolios = new Map();

const getPortfolio = (userId) => portfolios.get(userId) || { holdings: [], cash: 10000 };
const savePortfolio = (userId, portfolio) => portfolios.set(userId, portfolio);

/**
 * GET /api/portfolio/:userId
 * Get a user's portfolio.
 */
router.get('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const portfolio = getPortfolio(userId);

    // Enrich with current market data
    const enrichedHoldings = await Promise.all(
      portfolio.holdings.map(async (holding) => {
        try {
          const quote = await getStockQuote(holding.symbol);
          const currentValue = quote.price * holding.shares;
          const costBasis = holding.averagePrice * holding.shares;
          const gainLoss = currentValue - costBasis;
          const gainLossPercent = ((gainLoss / costBasis) * 100).toFixed(2);

          return {
            ...holding,
            currentPrice: quote.price,
            currentValue,
            costBasis,
            gainLoss,
            gainLossPercent: `${gainLossPercent}%`,
            dayChange: quote.change,
            dayChangePercent: quote.changePercent,
          };
        } catch (err) {
          logger.warn(`Could not fetch quote for ${holding.symbol}: ${err.message}`);
          return holding;
        }
      })
    );

    const totalValue = enrichedHoldings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
    const totalCostBasis = enrichedHoldings.reduce((sum, h) => sum + (h.costBasis || 0), 0);
    const totalGainLoss = totalValue - totalCostBasis;

    res.json({
      success: true,
      portfolio: {
        ...portfolio,
        holdings: enrichedHoldings,
        totalValue: totalValue + portfolio.cash,
        investedValue: totalValue,
        totalGainLoss,
        totalGainLossPercent: totalCostBasis > 0
          ? `${((totalGainLoss / totalCostBasis) * 100).toFixed(2)}%`
          : '0%',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/portfolio/:userId/buy
 * Buy shares of a stock.
 */
router.post('/:userId/buy', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { symbol, shares, price } = req.body;

    if (!symbol || !shares || shares <= 0) {
      throw new ApiError('symbol and shares (> 0) are required', 400);
    }

    const portfolio = getPortfolio(userId);
    const buyPrice = price || (await getStockQuote(symbol.toUpperCase())).price;
    const totalCost = buyPrice * shares;

    if (totalCost > portfolio.cash) {
      throw new ApiError('Insufficient cash balance', 400);
    }

    const upperSymbol = symbol.toUpperCase();
    const existingIndex = portfolio.holdings.findIndex((h) => h.symbol === upperSymbol);

    if (existingIndex >= 0) {
      const existing = portfolio.holdings[existingIndex];
      const totalShares = existing.shares + shares;
      const totalCostBasis = existing.averagePrice * existing.shares + buyPrice * shares;
      portfolio.holdings[existingIndex] = {
        ...existing,
        shares: totalShares,
        averagePrice: totalCostBasis / totalShares,
      };
    } else {
      portfolio.holdings.push({
        symbol: upperSymbol,
        shares,
        averagePrice: buyPrice,
        purchaseDate: new Date().toISOString(),
      });
    }

    portfolio.cash -= totalCost;
    savePortfolio(userId, portfolio);

    logger.info(`User ${userId} bought ${shares} shares of ${upperSymbol} at $${buyPrice}`);

    res.json({
      success: true,
      message: `Successfully bought ${shares} shares of ${upperSymbol} at $${buyPrice.toFixed(2)}`,
      transaction: { symbol: upperSymbol, shares, price: buyPrice, total: totalCost, type: 'BUY' },
      remainingCash: portfolio.cash,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/portfolio/:userId/sell
 * Sell shares of a stock.
 */
router.post('/:userId/sell', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { symbol, shares, price } = req.body;

    if (!symbol || !shares || shares <= 0) {
      throw new ApiError('symbol and shares (> 0) are required', 400);
    }

    const portfolio = getPortfolio(userId);
    const upperSymbol = symbol.toUpperCase();
    const holdingIndex = portfolio.holdings.findIndex((h) => h.symbol === upperSymbol);

    if (holdingIndex < 0) {
      throw new ApiError(`No holdings found for ${upperSymbol}`, 404);
    }

    const holding = portfolio.holdings[holdingIndex];

    if (holding.shares < shares) {
      throw new ApiError(
        `Insufficient shares. You own ${holding.shares} shares of ${upperSymbol}`,
        400
      );
    }

    const sellPrice = price || (await getStockQuote(upperSymbol)).price;
    const proceeds = sellPrice * shares;

    if (holding.shares === shares) {
      portfolio.holdings.splice(holdingIndex, 1);
    } else {
      portfolio.holdings[holdingIndex] = {
        ...holding,
        shares: holding.shares - shares,
      };
    }

    portfolio.cash += proceeds;
    savePortfolio(userId, portfolio);

    logger.info(`User ${userId} sold ${shares} shares of ${upperSymbol} at $${sellPrice}`);

    res.json({
      success: true,
      message: `Successfully sold ${shares} shares of ${upperSymbol} at $${sellPrice.toFixed(2)}`,
      transaction: { symbol: upperSymbol, shares, price: sellPrice, total: proceeds, type: 'SELL' },
      remainingCash: portfolio.cash,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/portfolio/:userId/holding/:symbol
 * Remove a holding from the portfolio.
 */
router.delete('/:userId/holding/:symbol', (req, res, next) => {
  try {
    const { userId, symbol } = req.params;
    const portfolio = getPortfolio(userId);
    const upperSymbol = symbol.toUpperCase();

    const index = portfolio.holdings.findIndex((h) => h.symbol === upperSymbol);
    if (index < 0) {
      throw new ApiError(`No holdings found for ${upperSymbol}`, 404);
    }

    portfolio.holdings.splice(index, 1);
    savePortfolio(userId, portfolio);

    res.json({ success: true, message: `Removed ${upperSymbol} from portfolio` });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/portfolio/:userId/cash
 * Add or update cash balance.
 */
router.put('/:userId/cash', (req, res, next) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;

    if (amount === undefined || isNaN(amount) || amount < 0) {
      throw new ApiError('amount must be a non-negative number', 400);
    }

    const portfolio = getPortfolio(userId);
    portfolio.cash = parseFloat(amount);
    savePortfolio(userId, portfolio);

    res.json({ success: true, cash: portfolio.cash });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
