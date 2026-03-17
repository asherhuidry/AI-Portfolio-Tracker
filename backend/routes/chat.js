const express = require('express');
const router = express.Router();
const { chat } = require('../services/langchain');
const { ApiError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * POST /api/chat
 * Send a message to the AI advisor.
 */
router.post('/', async (req, res, next) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      throw new ApiError('Message is required and must be a non-empty string', 400);
    }

    if (!Array.isArray(conversationHistory)) {
      throw new ApiError('conversationHistory must be an array', 400);
    }

    logger.debug(`Chat request received: "${message.substring(0, 50)}..."`);

    const response = await chat(message.trim(), conversationHistory);

    res.json({
      success: true,
      message: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/chat/health
 * Check if the chat service is operational.
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'chat',
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
