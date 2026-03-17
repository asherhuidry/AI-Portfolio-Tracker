const path = require('path');
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./config/config');
const logger = require('./utils/logger');
const { errorHandler } = require('./utils/errorHandler');

// Routes
const chatRoutes = require('./routes/chat');
const sentimentRoutes = require('./routes/sentiment');
const recommendationsRoutes = require('./routes/recommendations');
const marketRoutes = require('./routes/market');
const portfolioRoutes = require('./routes/portfolio');

const app = express();

// Middleware
app.use(
  cors({
    origin: config.cors.origin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP request logging
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// Serve frontend static files
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: config.server.env,
  });
});

// API Routes
app.use('/api/chat', chatRoutes);
app.use('/api/sentiment', sentimentRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/portfolio', portfolioRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.path} not found` });
});

// Central error handler (must be last)
app.use(errorHandler);

const PORT = config.server.port;

const server = app.listen(PORT, () => {
  logger.info(`AI Portfolio Tracker server running on port ${PORT} (${config.server.env})`);
});

module.exports = { app, server };
