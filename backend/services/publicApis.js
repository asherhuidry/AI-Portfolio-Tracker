const axios = require('axios');
const NodeCache = require('node-cache');
const config = require('../config/config');
const logger = require('../utils/logger');

const cache = new NodeCache({ stdTTL: config.cache.marketDataTtl });

/**
 * Fetch a real-time quote for one or more symbols using Alpha Vantage.
 * When the API key is absent, returns a mock quote so the UI still works.
 *
 * @param {string} symbol
 * @returns {Promise<Object>}
 */
async function getQuote(symbol) {
  const cacheKey = `quote_${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  if (!config.alphaVantage.apiKey) {
    logger.warn('ALPHA_VANTAGE_API_KEY not configured – returning mock quote');
    return buildMockQuote(symbol);
  }

  try {
    const response = await axios.get(config.alphaVantage.baseUrl, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol,
        apikey: config.alphaVantage.apiKey,
      },
      timeout: 10000,
    });

    const raw = response.data?.['Global Quote'];
    if (!raw || !raw['01. symbol']) {
      logger.warn(`Alpha Vantage returned no data for ${symbol}`);
      return buildMockQuote(symbol);
    }

    const quote = {
      symbol: raw['01. symbol'],
      price: parseFloat(raw['05. price']),
      open: parseFloat(raw['02. open']),
      high: parseFloat(raw['03. high']),
      low: parseFloat(raw['04. low']),
      previousClose: parseFloat(raw['08. previous close']),
      change: parseFloat(raw['09. change']),
      changePercent: raw['10. change percent'],
      volume: parseInt(raw['06. volume'], 10),
      latestTradingDay: raw['07. latest trading day'],
    };

    cache.set(cacheKey, quote);
    return quote;
  } catch (err) {
    logger.error(`getQuote(${symbol}) error:`, err.message);
    return buildMockQuote(symbol);
  }
}

/**
 * Fetch quotes for multiple symbols concurrently.
 *
 * @param {string[]} symbols
 * @returns {Promise<Object[]>}
 */
async function getMultipleQuotes(symbols) {
  return Promise.all(symbols.map(getQuote));
}

/**
 * Search for symbols by keyword using Alpha Vantage's SYMBOL_SEARCH endpoint.
 *
 * @param {string} keywords
 * @returns {Promise<Array<{symbol: string, name: string, type: string, region: string}>>}
 */
async function searchSymbols(keywords) {
  if (!config.alphaVantage.apiKey) return [];

  try {
    const response = await axios.get(config.alphaVantage.baseUrl, {
      params: {
        function: 'SYMBOL_SEARCH',
        keywords,
        apikey: config.alphaVantage.apiKey,
      },
      timeout: 10000,
    });

    return (response.data?.bestMatches ?? []).map((m) => ({
      symbol: m['1. symbol'],
      name: m['2. name'],
      type: m['3. type'],
      region: m['4. region'],
    }));
  } catch (err) {
    logger.error(`searchSymbols(${keywords}) error:`, err.message);
    return [];
  }
}

function buildMockQuote(symbol) {
  const price = parseFloat((Math.random() * 200 + 50).toFixed(2));
  const change = parseFloat((Math.random() * 10 - 5).toFixed(2));
  return {
    symbol,
    price,
    open: price - change * 0.5,
    high: price + Math.abs(change) * 0.8,
    low: price - Math.abs(change) * 0.8,
    previousClose: price - change,
    change,
    changePercent: `${((change / (price - change)) * 100).toFixed(2)}%`,
    volume: Math.floor(Math.random() * 10000000),
    latestTradingDay: new Date().toISOString().split('T')[0],
    isMock: true,
  };
}

module.exports = { getQuote, getMultipleQuotes, searchSymbols };
