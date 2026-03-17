require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-4o-mini',
  },
  huggingface: {
    apiKey: process.env.HUGGINGFACE_API_KEY || '',
    sentimentModel: 'ProsusAI/finbert',
    baseUrl: 'https://api-inference.huggingface.co/models',
  },
  newsApi: {
    apiKey: process.env.NEWS_API_KEY || '',
    baseUrl: 'https://newsapi.org/v2',
  },
  alphaVantage: {
    apiKey: process.env.ALPHA_VANTAGE_API_KEY || '',
    baseUrl: 'https://www.alphavantage.co/query',
  },
  coingecko: {
    baseUrl: process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3',
  },
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5500',
  },
};

module.exports = config;
