require('dotenv').config();
const express = require('express');
const cors = require('cors');
const config = require('./config/config');
const logger = require('./utils/logger');
const { errorHandler } = require('./utils/errorHandler');

// Route imports
const chatRoutes = require('./routes/chat');
const sentimentRoutes = require('./routes/sentiment');
const recommendationsRoutes = require('./routes/recommendations');
const marketRoutes = require('./routes/market');
const portfolioRoutes = require('./routes/portfolio');

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.originalUrl}`);
  next();
});

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/chat', chatRoutes);
app.use('/api/sentiment', sentimentRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/portfolio', portfolioRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404 handler
app.use((_req, res) => res.status(404).json({ error: { message: 'Not found' } }));

// Error handler (must be last)
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const port = config.port;
  app.listen(port, () => {
    logger.info(`AI Portfolio Tracker API running on port ${port} [${config.nodeEnv}]`);
  });
}

module.exports = app;
