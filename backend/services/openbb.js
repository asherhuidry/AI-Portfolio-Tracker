const axios = require('axios');
const NodeCache = require('node-cache');
const config = require('../config/config');
const logger = require('../utils/logger');

const cache = new NodeCache({ stdTTL: config.cache.marketDataTtl });

/**
 * Fetch a historical time-series (daily) for a ticker using the OpenBB platform REST API.
 * Falls back gracefully to an empty array when the PAT is not configured.
 *
 * @param {string} symbol   Stock / ETF ticker symbol
 * @param {number} [days=30] Number of trading days to retrieve
 * @returns {Promise<Array<{date: string, open: number, high: number, low: number, close: number, volume: number}>>}
 */
async function getStockHistory(symbol, days = 30) {
  const cacheKey = `openbb_history_${symbol}_${days}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  if (!config.openbb.pat) {
    logger.warn('OPENBB_PAT not configured – returning empty history');
    return [];
  }

  try {
    const response = await axios.get(`${config.openbb.baseUrl}/api/v1/equity/price/historical`, {
      params: {
        symbol,
        interval: '1d',
        chart: false,
      },
      headers: {
        Authorization: `Bearer ${config.openbb.pat}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const data = response.data?.results ?? [];
    const trimmed = data.slice(-days);
    cache.set(cacheKey, trimmed);
    return trimmed;
  } catch (err) {
    logger.error(`OpenBB getStockHistory(${symbol}) error:`, err.message);
    return [];
  }
}

/**
 * Fetch key fundamental metrics for a ticker.
 *
 * @param {string} symbol
 * @returns {Promise<Object>}
 */
async function getFundamentals(symbol) {
  const cacheKey = `openbb_fundamentals_${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  if (!config.openbb.pat) {
    logger.warn('OPENBB_PAT not configured – returning empty fundamentals');
    return {};
  }

  try {
    const response = await axios.get(`${config.openbb.baseUrl}/api/v1/equity/fundamental/overview`, {
      params: { symbol },
      headers: {
        Authorization: `Bearer ${config.openbb.pat}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const data = response.data?.results?.[0] ?? {};
    cache.set(cacheKey, data);
    return data;
  } catch (err) {
    logger.error(`OpenBB getFundamentals(${symbol}) error:`, err.message);
    return {};
  }
}

module.exports = { getStockHistory, getFundamentals };
