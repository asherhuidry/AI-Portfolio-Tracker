const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Fetch cryptocurrency prices from CoinGecko (free, no API key required).
 * @param {string[]} coinIds - Array of CoinGecko coin IDs (e.g., ['bitcoin', 'ethereum']).
 * @returns {Promise<Object>} Map of coinId -> price data.
 */
const getCryptoPrices = async (coinIds) => {
  try {
    const ids = coinIds.join(',');

    const response = await axios.get(`${config.coingecko.baseUrl}/simple/price`, {
      params: {
        ids,
        vs_currencies: 'usd',
        include_24hr_change: true,
        include_market_cap: true,
        include_24hr_vol: true,
      },
      timeout: 10000,
    });

    return response.data;
  } catch (error) {
    logger.warn(`CoinGecko getCryptoPrices unavailable: ${error.message}`);
    return {};
  }
};

/**
 * Fetch top cryptocurrencies by market cap.
 * @param {number} limit - Number of coins to fetch (max 250).
 * @returns {Promise<Array>} Array of coin market data.
 */
const getTopCryptos = async (limit = 10) => {
  try {
    const response = await axios.get(`${config.coingecko.baseUrl}/coins/markets`, {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: limit,
        page: 1,
        sparkline: false,
        price_change_percentage: '24h',
      },
      timeout: 10000,
    });

    return response.data.map((coin) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      marketCap: coin.market_cap,
      volume24h: coin.total_volume,
      change24h: coin.price_change_percentage_24h,
      image: coin.image,
    }));
  } catch (error) {
    logger.warn(`CoinGecko getTopCryptos unavailable, returning mock data: ${error.message}`);
    return getMockCryptos(limit);
  }
};

/**
 * Fetch trending stocks from a free financial data source.
 * Uses the Yahoo Finance unofficial API as a fallback.
 * @returns {Promise<Array>} Array of trending stock tickers.
 */
const getTrendingStocks = async () => {
  try {
    // Use a curated list of popular stocks as "trending"
    const popularSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'BRK.B', 'JPM', 'V'];

    return popularSymbols.map((symbol) => ({
      symbol,
      trending: true,
    }));
  } catch (error) {
    logger.error('getTrendingStocks error:', error.message);
    throw error;
  }
};

/**
 * Fetch fear & greed index data (CNN Money unofficial).
 * Returns mock data if the service is unavailable.
 * @returns {Promise<Object>} Fear & greed index data.
 */
const getFearGreedIndex = async () => {
  try {
    const response = await axios.get('https://api.alternative.me/fng/', {
      params: { limit: 1 },
      timeout: 8000,
    });

    const data = response.data.data[0];
    return {
      value: parseInt(data.value, 10),
      classification: data.value_classification,
      timestamp: data.timestamp,
    };
  } catch (error) {
    logger.warn('Fear & Greed index unavailable, returning mock data');
    return {
      value: 50,
      classification: 'Neutral',
      timestamp: Date.now().toString(),
      source: 'mock',
    };
  }
};

const getMockCryptos = (limit = 10) => {
  const coins = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 65000, change24h: 2.3 },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price: 3200, change24h: 1.8 },
    { id: 'tether', symbol: 'USDT', name: 'Tether', price: 1.0, change24h: 0.01 },
    { id: 'binancecoin', symbol: 'BNB', name: 'BNB', price: 410, change24h: -0.5 },
    { id: 'solana', symbol: 'SOL', name: 'Solana', price: 145, change24h: 4.2 },
    { id: 'ripple', symbol: 'XRP', name: 'XRP', price: 0.52, change24h: -1.1 },
    { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin', price: 1.0, change24h: 0.0 },
    { id: 'cardano', symbol: 'ADA', name: 'Cardano', price: 0.45, change24h: 0.8 },
    { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', price: 36, change24h: 3.1 },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', price: 0.12, change24h: 5.4 },
  ];

  return coins.slice(0, limit).map((c) => ({ ...c, source: 'mock' }));
};

module.exports = { getCryptoPrices, getTopCryptos, getTrendingStocks, getFearGreedIndex };
