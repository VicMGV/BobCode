const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

/**
 * Maximum file size allowed for reading (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Validate and sanitize file path to prevent path traversal attacks
 * @param {string} target - The file path to validate
 * @returns {string} - Validated absolute path
 * @throws {Error} - If path is invalid or outside project directory
 */
function validatePath(target) {
  if (!target || typeof target !== 'string') {
    throw new Error('Invalid path: must be a non-empty string');
  }

  // Resolve to absolute path
  const absolutePath = path.resolve(target);
  const projectRoot = process.cwd();

  // Ensure path is within project directory
  if (!absolutePath.startsWith(projectRoot)) {
    throw new Error(`Access denied: path outside project directory (${target})`);
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.\./,           // Parent directory traversal
    /~\//,            // Home directory
    /^\/etc\//,       // System directories
    /^\/root\//,
    /^\/sys\//,
    /^\/proc\//,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(target)) {
      throw new Error(`Suspicious path pattern detected: ${target}`);
    }
  }

  return absolutePath;
}

/**
 * Read file contents with security validation and size limits
 * @param {string} target - The file path to read
 * @returns {Promise<string>} - File contents
 * @throws {Error} - If file doesn't exist, is too large, or path is invalid
 */
async function run(target) {
  try {
    // Validate path
    const fullPath = validatePath(target);

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      throw new Error(`File not found: ${target}`);
    }

    // Check file size
    const stats = await fs.stat(fullPath);
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${target} (${stats.size} bytes, max ${MAX_FILE_SIZE} bytes)`);
    }

    // Check if it's a file (not a directory)
    if (!stats.isFile()) {
      throw new Error(`Not a file: ${target}`);
    }

    // Read file asynchronously
    const content = await fs.readFile(fullPath, 'utf-8');
    return content;

  } catch (err) {
    // Re-throw with context
    if (err.message.includes('Access denied') ||
        err.message.includes('File not found') ||
        err.message.includes('File too large') ||
        err.message.includes('Suspicious path')) {
      throw err;
    }
    throw new Error(`Error reading file ${target}: ${err.message}`);
  }
}

module.exports = { run, validatePath };