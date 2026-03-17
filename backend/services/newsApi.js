const axios = require('axios');
const NodeCache = require('node-cache');
const config = require('../config/config');
const logger = require('../utils/logger');

const cache = new NodeCache({ stdTTL: config.cache.newsTtl });

/**
 * Fetch the latest financial news articles.
 *
 * @param {Object} options
 * @param {string}   [options.query='finance stocks market']   Search query
 * @param {number}   [options.pageSize=10]                     Number of articles
 * @param {string}   [options.language='en']                   Language code
 * @returns {Promise<Array<{title, description, url, source, publishedAt}>>}
 */
async function getFinancialNews({ query = 'finance stocks market', pageSize = 10, language = 'en' } = {}) {
  const cacheKey = `news_${query}_${pageSize}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  if (!config.newsApi.apiKey) {
    logger.warn('NEWS_API_KEY not configured – returning empty news list');
    return [];
  }

  try {
    const response = await axios.get(`${config.newsApi.baseUrl}/everything`, {
      params: {
        q: query,
        language,
        pageSize,
        sortBy: 'publishedAt',
        apiKey: config.newsApi.apiKey,
      },
      timeout: 10000,
    });

    const articles = (response.data?.articles ?? []).map((a) => ({
      title: a.title,
      description: a.description,
      url: a.url,
      source: a.source?.name,
      publishedAt: a.publishedAt,
      urlToImage: a.urlToImage,
    }));

    cache.set(cacheKey, articles);
    return articles;
  } catch (err) {
    logger.error('getFinancialNews error:', err.message);
    return [];
  }
}

/**
 * Fetch news articles specific to one or more ticker symbols.
 *
 * @param {string|string[]} symbols
 * @param {number} [pageSize=5]
 * @returns {Promise<Array>}
 */
async function getNewsForSymbols(symbols, pageSize = 5) {
  const syms = Array.isArray(symbols) ? symbols : [symbols];
  const query = syms.join(' OR ');
  return getFinancialNews({ query, pageSize });
}

module.exports = { getFinancialNews, getNewsForSymbols };
