const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Fetch stock quote data using Alpha Vantage (OpenBB-compatible endpoint).
 * @param {string} symbol - Stock ticker symbol.
 * @returns {Promise<Object>} Stock quote data.
 */
const getStockQuote = async (symbol) => {
  try {
    if (!config.alphaVantage.apiKey) {
      logger.warn('Alpha Vantage API key not configured, returning mock data');
      return getMockStockData(symbol);
    }

    const response = await axios.get(config.alphaVantage.baseUrl, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: symbol.toUpperCase(),
        apikey: config.alphaVantage.apiKey,
      },
      timeout: 10000,
    });

    const quote = response.data['Global Quote'];

    if (!quote || Object.keys(quote).length === 0) {
      throw new Error(`No data found for symbol: ${symbol}`);
    }

    return {
      symbol: quote['01. symbol'],
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: quote['10. change percent'],
      volume: parseInt(quote['06. volume'], 10),
      latestTradingDay: quote['07. latest trading day'],
      previousClose: parseFloat(quote['08. previous close']),
      open: parseFloat(quote['02. open']),
      high: parseFloat(quote['03. high']),
      low: parseFloat(quote['04. low']),
    };
  } catch (error) {
    logger.error(`OpenBB getStockQuote error for ${symbol}:`, error.message);
    throw error;
  }
};

/**
 * Fetch historical daily price data for a stock.
 * @param {string} symbol - Stock ticker symbol.
 * @param {string} outputsize - 'compact' (100 days) or 'full' (20+ years).
 * @returns {Promise<Array>} Array of daily price data.
 */
const getHistoricalData = async (symbol, outputsize = 'compact') => {
  try {
    if (!config.alphaVantage.apiKey) {
      logger.warn('Alpha Vantage API key not configured, returning mock historical data');
      return getMockHistoricalData(symbol);
    }

    const response = await axios.get(config.alphaVantage.baseUrl, {
      params: {
        function: 'TIME_SERIES_DAILY',
        symbol: symbol.toUpperCase(),
        outputsize,
        apikey: config.alphaVantage.apiKey,
      },
      timeout: 15000,
    });

    const timeSeries = response.data['Time Series (Daily)'];

    if (!timeSeries) {
      throw new Error(`No historical data found for symbol: ${symbol}`);
    }

    return Object.entries(timeSeries)
      .slice(0, 30)
      .map(([date, values]) => ({
        date,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume'], 10),
      }))
      .reverse();
  } catch (error) {
    logger.error(`OpenBB getHistoricalData error for ${symbol}:`, error.message);
    throw error;
  }
};

/**
 * Search for symbols matching a query.
 * @param {string} keywords - Search keywords.
 * @returns {Promise<Array>} Matching symbols and company names.
 */
const searchSymbols = async (keywords) => {
  try {
    if (!config.alphaVantage.apiKey) {
      return [];
    }

    const response = await axios.get(config.alphaVantage.baseUrl, {
      params: {
        function: 'SYMBOL_SEARCH',
        keywords,
        apikey: config.alphaVantage.apiKey,
      },
      timeout: 10000,
    });

    const matches = response.data['bestMatches'] || [];

    return matches.map((m) => ({
      symbol: m['1. symbol'],
      name: m['2. name'],
      type: m['3. type'],
      region: m['4. region'],
      currency: m['8. currency'],
    }));
  } catch (error) {
    logger.error('OpenBB searchSymbols error:', error.message);
    throw error;
  }
};

const getMockStockData = (symbol) => ({
  symbol: symbol.toUpperCase(),
  price: 150.0 + Math.random() * 50,
  change: (Math.random() - 0.5) * 10,
  changePercent: `${((Math.random() - 0.5) * 5).toFixed(2)}%`,
  volume: Math.floor(Math.random() * 10000000),
  latestTradingDay: new Date().toISOString().split('T')[0],
  previousClose: 148.0 + Math.random() * 50,
  open: 149.0 + Math.random() * 50,
  high: 155.0 + Math.random() * 50,
  low: 145.0 + Math.random() * 50,
  source: 'mock',
});

const getMockHistoricalData = (symbol) => {
  const data = [];
  let price = 150;
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    price = price + (Math.random() - 0.5) * 5;

    data.push({
      date: date.toISOString().split('T')[0],
      open: price - Math.random() * 2,
      high: price + Math.random() * 3,
      low: price - Math.random() * 3,
      close: price,
      volume: Math.floor(Math.random() * 5000000),
      source: 'mock',
    });
  }

  return data;
};

module.exports = { getStockQuote, getHistoricalData, searchSymbols };
