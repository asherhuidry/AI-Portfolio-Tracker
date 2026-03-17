const express = require('express');
const router = express.Router();
const { chat } = require('../services/langchain');
const { createError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * POST /api/chat
 * Body: { message: string, history?: [{role, content}] }
 */
router.post('/', async (req, res, next) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return next(createError(400, 'message is required'));
    }

    if (history && !Array.isArray(history)) {
      return next(createError(400, 'history must be an array'));
    }

    logger.debug(`Chat request: "${message.substring(0, 80)}..."`);

    const reply = await chat(message.trim(), history ?? []);

    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
