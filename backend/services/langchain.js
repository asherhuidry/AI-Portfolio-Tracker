const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const config = require('../config/config');
const logger = require('../utils/logger');

const SYSTEM_PROMPT = `You are an expert AI investment advisor. You help users analyze their 
investment portfolios, provide market insights, and suggest data-driven investment strategies. 
You have access to real-time market data and sentiment analysis. Always remind users that your 
advice is for informational purposes only and not a substitute for professional financial advice.`;

let chatModel = null;

function getChatModel() {
  if (!chatModel) {
    if (!config.openai.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    chatModel = new ChatOpenAI({
      openAIApiKey: config.openai.apiKey,
      modelName: config.openai.model,
      temperature: 0.7,
      maxTokens: 1024,
    });
  }
  return chatModel;
}

/**
 * Send a message to the AI advisor and receive a response.
 * @param {string} userMessage - The user's message
 * @param {Array}  history     - Previous messages [{role, content}]
 * @returns {Promise<string>}  The assistant's reply
 */
async function chat(userMessage, history = []) {
  try {
    const model = getChatModel();

    const messages = [new SystemMessage(SYSTEM_PROMPT)];

    for (const msg of history) {
      if (msg.role === 'user') {
        messages.push(new HumanMessage(msg.content));
      } else if (msg.role === 'assistant') {
        messages.push(new SystemMessage(`Assistant: ${msg.content}`));
      }
    }

    messages.push(new HumanMessage(userMessage));

    const response = await model.call(messages);
    return response.content;
  } catch (err) {
    logger.error('LangChain chat error:', err);
    throw err;
  }
}

/**
 * Generate investment recommendations based on portfolio data.
 * @param {Object} portfolio - Portfolio object with holdings
 * @param {Object} marketData - Current market data
 * @returns {Promise<string>} Recommendations text
 */
async function generateRecommendations(portfolio, marketData) {
  try {
    const model = getChatModel();

    const prompt = `Based on the following portfolio and market data, provide specific investment 
recommendations. Focus on diversification, risk management, and growth opportunities.

Portfolio:
${JSON.stringify(portfolio, null, 2)}

Current Market Data:
${JSON.stringify(marketData, null, 2)}

Please provide:
1. Portfolio analysis
2. Risk assessment  
3. Top 3 actionable recommendations
4. Stocks or assets to consider adding or removing`;

    const messages = [
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(prompt),
    ];

    const response = await model.call(messages);
    return response.content;
  } catch (err) {
    logger.error('LangChain recommendations error:', err);
    throw err;
  }
}

module.exports = { chat, generateRecommendations };
