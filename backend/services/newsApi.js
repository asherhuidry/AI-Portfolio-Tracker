const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Fetch financial news articles for a given query or symbol.
 * @param {string} query - Search query or stock symbol.
 * @param {number} pageSize - Number of articles to return (max 100).
 * @returns {Promise<Array>} Array of news articles.
 */
const getFinancialNews = async (query, pageSize = 10) => {
  try {
    if (!config.newsApi.apiKey) {
      logger.warn('News API key not configured, returning mock news');
      return getMockNews(query);
    }

    const response = await axios.get(`${config.newsApi.baseUrl}/everything`, {
      params: {
        q: query,
        language: 'en',
        sortBy: 'publishedAt',
        pageSize,
        apiKey: config.newsApi.apiKey,
      },
      timeout: 10000,
    });

    return response.data.articles.map((article) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      source: article.source.name,
      publishedAt: article.publishedAt,
      urlToImage: article.urlToImage,
    }));
  } catch (error) {
    logger.error('NewsAPI getFinancialNews error:', error.message);
    throw error;
  }
};

/**
 * Fetch top financial headlines.
 * @param {number} pageSize - Number of articles to return.
 * @returns {Promise<Array>} Array of news articles.
 */
const getTopFinancialHeadlines = async (pageSize = 10) => {
  try {
    if (!config.newsApi.apiKey) {
      logger.warn('News API key not configured, returning mock headlines');
      return getMockNews('finance');
    }

    const response = await axios.get(`${config.newsApi.baseUrl}/top-headlines`, {
      params: {
        category: 'business',
        language: 'en',
        pageSize,
        apiKey: config.newsApi.apiKey,
      },
      timeout: 10000,
    });

    return response.data.articles.map((article) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      source: article.source.name,
      publishedAt: article.publishedAt,
      urlToImage: article.urlToImage,
    }));
  } catch (error) {
    logger.error('NewsAPI getTopFinancialHeadlines error:', error.message);
    throw error;
  }
};

const getMockNews = (query) => [
  {
    title: `${query} shows strong market performance amid economic uncertainty`,
    description: 'Analysts remain cautiously optimistic about the short-term outlook.',
    url: 'https://example.com/news/1',
    source: 'Financial Times (Mock)',
    publishedAt: new Date().toISOString(),
    urlToImage: null,
  },
  {
    title: `Investors watch ${query} closely as Fed signals rate decision`,
    description: 'Market participants are awaiting guidance from Federal Reserve officials.',
    url: 'https://example.com/news/2',
    source: 'Reuters (Mock)',
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    urlToImage: null,
  },
  {
    title: `${query} trading volume surges in after-hours session`,
    description: 'Unusual trading activity has been noted by market observers.',
    url: 'https://example.com/news/3',
    source: 'Bloomberg (Mock)',
    publishedAt: new Date(Date.now() - 7200000).toISOString(),
    urlToImage: null,
  },
];

module.exports = { getFinancialNews, getTopFinancialHeadlines };
