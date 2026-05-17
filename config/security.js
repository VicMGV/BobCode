/**
 * Security Configuration
 * Centralized security settings for the Bob Agent application
 */

module.exports = {
  /**
   * File operation limits
   */
  files: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxDepth: 5, // Maximum directory traversal depth
    allowedExtensions: [
      '.js', '.json', '.md', '.txt', '.yml', '.yaml',
      '.env.example', '.gitignore', '.html', '.css',
      '.ts', '.jsx', '.tsx', '.xml', '.csv'
    ],
    ignoredDirectories: [
      'node_modules',
      '.git',
      '.env',
      '.env.local',
      '.env.production',
      'dist',
      'build',
      'coverage',
      '.vscode',
      '.idea',
      'bob_sessions'
    ]
  },

  /**
   * Command execution whitelist
   */
  commands: {
    allowed: [
      'pnpm test',
      'pnpm run',
      'pnpm install',
      'pnpm add',
      'pnpm exec',
      'node',
      'git status',
      'git log',
      'git diff',
      'ls',
      'dir',
      'cat',
      'type'
    ],
    timeout: 10000, // 10 seconds
    maxBuffer: 1024 * 1024 // 1MB
  },

  /**
   * API configuration
   */
  api: {
    timeout: 30000, // 30 seconds
    maxRetries: 3,
    retryDelay: 1000, // 1 second base delay
    maxRetryDelay: 10000, // 10 seconds max delay
    rateLimit: {
      maxRequests: 60,
      windowMs: 60000 // 1 minute
    }
  },

  /**
   * Path validation patterns
   */
  paths: {
    suspicious: [
      /\.\./,           // Parent directory traversal
      /~\//,            // Home directory
      /^\/etc\//,       // System directories
      /^\/root\//,
      /^\/sys\//,
      /^\/proc\//,
      /^C:\\Windows/i,  // Windows system directories
      /^C:\\Program Files/i
    ]
  },

  /**
   * Logging configuration
   */
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    maxFiles: 10,
    maxSize: 10 * 1024 * 1024, // 10MB per log file
    directory: './logs'
  }
};

// Made with Bob
