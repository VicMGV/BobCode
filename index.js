require('dotenv').config();
const { startCLI } = require('./cli/interface');

/**
 * Global error handler for unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ Unhandled Promise Rejection:');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  
  // Log stack trace if available
  if (reason instanceof Error) {
    console.error('Stack:', reason.stack);
  }
  
  // Exit gracefully
  console.error('\n⚠️  Application will exit due to unhandled rejection');
  process.exit(1);
});

/**
 * Global error handler for uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  console.error('\n❌ Uncaught Exception:');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  
  // Exit gracefully
  console.error('\n⚠️  Application will exit due to uncaught exception');
  process.exit(1);
});

/**
 * Handle graceful shutdown on SIGTERM
 */
process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

/**
 * Handle graceful shutdown on SIGINT (Ctrl+C)
 */
process.on('SIGINT', () => {
  console.log('\n\n👋 Goodbye! Shutting down gracefully...');
  process.exit(0);
});

/**
 * Log startup information
 */
console.log('🤖 Bob Agent starting...');
console.log(`📁 Working directory: ${process.cwd()}`);
console.log(`🔧 Node version: ${process.version}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

// Validate environment variables
if (!process.env.BOB_API_URL && !process.env.BOB_API_KEY) {
  console.warn('⚠️  No API credentials found - running in mock mode');
  console.warn('   Set BOB_API_URL and BOB_API_KEY in .env file for full functionality');
}

console.log('');

// Start the CLI
try {
  startCLI();
} catch (error) {
  console.error('❌ Failed to start CLI:', error.message);
  process.exit(1);
}