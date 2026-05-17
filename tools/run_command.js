const { execSync } = require('child_process');

/**
 * Whitelist of allowed command prefixes for security
 * Only these commands can be executed by the agent
 */
const ALLOWED_COMMANDS = [
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
];

/**
 * Validate and sanitize command input to prevent command injection
 * @param {string} command - The command to validate
 * @returns {boolean} - True if command is safe to execute
 * @throws {Error} - If command is not allowed or contains dangerous patterns
 */
function validateCommand(command) {
  if (!command || typeof command !== 'string') {
    throw new Error('Invalid command: must be a non-empty string');
  }

  const trimmed = command.trim();
  
  // Check against whitelist
  const isAllowed = ALLOWED_COMMANDS.some(allowed => trimmed.startsWith(allowed));
  if (!isAllowed) {
    throw new Error(`Command not allowed: ${trimmed}. Allowed commands: ${ALLOWED_COMMANDS.join(', ')}`);
  }

  // Check for dangerous patterns (command chaining, piping, redirection)
  const dangerousPatterns = [
    /[;&|`$()]/,  // Command chaining, substitution
    />\s*\/dev/,  // Device redirection
    /rm\s+-rf/,   // Dangerous delete
    />\s*~/,      // Home directory redirection
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      throw new Error(`Command contains dangerous pattern: ${trimmed}`);
    }
  }

  return true;
}

/**
 * Execute a shell command with security validation
 * @param {string} command - The command to execute
 * @returns {Promise<string>} - Command output or error message
 */
async function run(command) {
  try {
    // Validate command before execution
    validateCommand(command);
    
    // Execute with timeout and encoding
    const output = execSync(command, {
      encoding: 'utf-8',
      timeout: 10000,
      maxBuffer: 1024 * 1024 // 1MB max output
    });
    
    return output;
  } catch (err) {
    // Return user-friendly error message
    if (err.message.includes('not allowed') || err.message.includes('dangerous pattern')) {
      return `Security Error: ${err.message}`;
    }
    return `Error running command: ${err.message}`;
  }
}

module.exports = { run, validateCommand };