const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage, AIMessage } = require('@langchain/core/messages');
const config = require('../config/config');
const logger = require('../utils/logger');

let chatModel = null;

const getModel = () => {
  if (!chatModel) {
    if (!config.openai.apiKey) {
      throw new Error('OpenAI API key is not configured');
    }
    chatModel = new ChatOpenAI({
      openAIApiKey: config.openai.apiKey,
      modelName: config.openai.model,
      temperature: 0.7,
    });
  }
  return chatModel;
};

const SYSTEM_PROMPT = `You are an expert AI investment portfolio advisor. You provide clear, 
data-driven financial insights and recommendations. You help users understand market trends, 
analyze their portfolio performance, and make informed investment decisions. Always remind users 
that your advice is for educational purposes and they should consult a licensed financial advisor 
before making investment decisions. Be concise, professional, and helpful.`;

/**
 * Chat with the LangChain-powered AI advisor.
 * @param {string} userMessage - The user's message.
 * @param {Array} conversationHistory - Previous messages in the conversation.
 * @returns {Promise<string>} AI response text.
 */
const chat = async (userMessage, conversationHistory = []) => {
  try {
    const model = getModel();

    const messages = [
      new SystemMessage(SYSTEM_PROMPT),
      ...conversationHistory.map((msg) =>
        msg.role === 'user'
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content)
      ),
      new HumanMessage(userMessage),
    ];

    const response = await model.invoke(messages);
    return response.content;
  } catch (error) {
    logger.error('LangChain chat error:', error);
    throw error;
  }
};

/**
 * Generate portfolio analysis and recommendations using LangChain.
 * @param {Array} portfolio - User portfolio array.
 * @param {Object} marketData - Current market data.
 * @returns {Promise<string>} AI-generated analysis.
 */
const analyzePortfolio = async (portfolio, marketData = {}) => {
  try {
    const model = getModel();

    const portfolioSummary = portfolio
      .map(
        (h) =>
          `${h.symbol}: ${h.shares} shares at $${h.averagePrice} avg (current: $${
            marketData[h.symbol]?.price || 'N/A'
          })`
      )
      .join('\n');

    const prompt = `Analyze the following investment portfolio and provide actionable recommendations:

Portfolio Holdings:
${portfolioSummary}

Please provide:
1. Overall portfolio assessment
2. Diversification analysis
3. Risk assessment
4. Top 3 actionable recommendations
5. Key risks to watch

Keep the response concise and practical.`;

    const messages = [new SystemMessage(SYSTEM_PROMPT), new HumanMessage(prompt)];

    const response = await model.invoke(messages);
    return response.content;
  } catch (error) {
    logger.error('LangChain portfolio analysis error:', error);
    throw error;
  }
};

module.exports = { chat, analyzePortfolio };
