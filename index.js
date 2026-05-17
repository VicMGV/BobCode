require('dotenv').config();
const logger = require('./config/logger');
const { startCLI } = require('./cli/interface');

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection');
  logger.error(`Reason: ${reason}`);
  if (reason instanceof Error) logger.error(reason.stack);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  logger.error(error.stack);
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('[SIGTERM] Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

logger.info('Bob Agent starting...');
logger.info(`dir  : ${process.cwd()}`);
logger.info(`node : ${process.version}`);
logger.info(`env  : ${process.env.NODE_ENV || 'development'}`);

if (!process.env.BOB_API_URL && !process.env.BOB_API_KEY) {
  logger.warn('No API credentials found — running in mock mode');
  logger.warn('Set BOB_API_URL and BOB_API_KEY in .env for full functionality');
}

try {
  startCLI();
} catch (error) {
  logger.error(`Failed to start CLI: ${error.message}`);
  process.exit(1);
}
