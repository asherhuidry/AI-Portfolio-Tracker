require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8080',

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-3.5-turbo',
  },

  alphaVantage: {
    apiKey: process.env.ALPHA_VANTAGE_API_KEY || '',
    baseUrl: 'https://www.alphavantage.co/query',
  },

  newsApi: {
    apiKey: process.env.NEWS_API_KEY || '',
    baseUrl: 'https://newsapi.org/v2',
  },

  huggingface: {
    apiKey: process.env.HUGGINGFACE_API_KEY || '',
    baseUrl: 'https://api-inference.huggingface.co/models',
    sentimentModel: 'ProsusAI/finbert',
  },

  openbb: {
    pat: process.env.OPENBB_PAT || '',
    baseUrl: 'https://sdk.openbb.co',
  },

  cache: {
    // Default TTL in seconds
    marketDataTtl: 300,    // 5 minutes
    newsTtl: 600,          // 10 minutes
    sentimentTtl: 1800,    // 30 minutes
  },
};
