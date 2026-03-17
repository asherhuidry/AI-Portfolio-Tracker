const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Analyze sentiment of financial text using HuggingFace FinBERT model.
 * @param {string|string[]} texts - Text or array of texts to analyze.
 * @returns {Promise<Array>} Sentiment results with label and score.
 */
const analyzeSentiment = async (texts) => {
  try {
    const inputs = Array.isArray(texts) ? texts : [texts];

    if (!config.huggingface.apiKey) {
      logger.warn('HuggingFace API key not configured, returning mock sentiment');
      return inputs.map((text) => ({
        text,
        label: 'neutral',
        score: 0.5,
        source: 'mock',
      }));
    }

    const url = `${config.huggingface.baseUrl}/${config.huggingface.sentimentModel}`;

    const response = await axios.post(
      url,
      { inputs },
      {
        headers: {
          Authorization: `Bearer ${config.huggingface.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const results = response.data;

    return inputs.map((text, index) => {
      const predictions = Array.isArray(results[index]) ? results[index] : results;
      const topPrediction = predictions.reduce((best, current) =>
        current.score > best.score ? current : best
      );

      return {
        text,
        label: topPrediction.label.toLowerCase(),
        score: topPrediction.score,
        allScores: predictions,
      };
    });
  } catch (error) {
    logger.error('HuggingFace sentiment analysis error:', error.message);
    throw error;
  }
};

/**
 * Analyze sentiment for a list of news articles about a stock.
 * @param {Array} articles - News articles with title and description.
 * @returns {Promise<Object>} Aggregated sentiment summary.
 */
const analyzeNewsSentiment = async (articles) => {
  try {
    if (!articles || articles.length === 0) {
      return { overall: 'neutral', score: 0.5, articleCount: 0 };
    }

    const texts = articles
      .slice(0, 10)
      .map((a) => `${a.title}. ${a.description || ''}`.trim());

    const sentiments = await analyzeSentiment(texts);

    const scores = { positive: 0, negative: 0, neutral: 0 };
    sentiments.forEach((s) => {
      scores[s.label] = (scores[s.label] || 0) + s.score;
    });

    const total = sentiments.length;
    const avgPositive = scores.positive / total;
    const avgNegative = scores.negative / total;

    let overall = 'neutral';
    let overallScore = 0.5;

    if (avgPositive > avgNegative && avgPositive > 0.4) {
      overall = 'positive';
      overallScore = avgPositive;
    } else if (avgNegative > avgPositive && avgNegative > 0.4) {
      overall = 'negative';
      overallScore = avgNegative;
    }

    return {
      overall,
      score: overallScore,
      articleCount: total,
      breakdown: {
        positive: Math.round((scores.positive / total) * 100) / 100,
        negative: Math.round((scores.negative / total) * 100) / 100,
        neutral: Math.round((scores.neutral / total) * 100) / 100,
      },
    };
  } catch (error) {
    logger.error('News sentiment analysis error:', error);
    throw error;
  }
};

module.exports = { analyzeSentiment, analyzeNewsSentiment };
