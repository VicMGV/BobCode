const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Maximum file size allowed for writing (10MB)
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
 * Validate content before writing
 * @param {string} content - The content to validate
 * @throws {Error} - If content is invalid or too large
 */
function validateContent(content) {
  if (content === null || content === undefined) {
    throw new Error('Invalid content: cannot be null or undefined');
  }

  const contentStr = String(content);
  const contentSize = Buffer.byteLength(contentStr, 'utf-8');

  if (contentSize > MAX_FILE_SIZE) {
    throw new Error(`Content too large: ${contentSize} bytes (max ${MAX_FILE_SIZE} bytes)`);
  }

  return contentStr;
}

/**
 * Prompt user for confirmation before writing
 * @param {string} target - The file path
 * @param {boolean} fileExists - Whether the file already exists
 * @returns {Promise<boolean>} - True if user confirms
 */
function promptConfirmation(target, fileExists) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const action = fileExists ? 'Overwrite' : 'Create';
    const question = `\x1b[33m${action} ${target}? (y/n): \x1b[0m`;

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Write content to file with security validation and user confirmation
 * @param {string} target - The file path to write
 * @param {string} content - The content to write
 * @returns {Promise<string>} - Success or cancellation message
 * @throws {Error} - If path is invalid, content is too large, or write fails
 */
async function run(target, content) {
  try {
    // Validate path
    const fullPath = validatePath(target);

    // Validate content
    const validatedContent = validateContent(content);

    // Check if file exists
    let fileExists = false;
    try {
      await fs.access(fullPath);
      fileExists = true;
    } catch {
      // File doesn't exist, which is fine
    }

    // Ensure directory exists
    const directory = path.dirname(fullPath);
    await fs.mkdir(directory, { recursive: true });

    // Get user confirmation
    const confirmed = await promptConfirmation(target, fileExists);

    if (!confirmed) {
      return 'Changes discarded by user';
    }

    // Write file asynchronously
    await fs.writeFile(fullPath, validatedContent, 'utf-8');

    const action = fileExists ? 'Updated' : 'Created';
    return `${action} ${target} successfully`;

  } catch (err) {
    // Re-throw with context
    if (err.message.includes('Access denied') ||
        err.message.includes('Suspicious path') ||
        err.message.includes('Content too large') ||
        err.message.includes('Invalid')) {
      throw err;
    }
    throw new Error(`Error writing file ${target}: ${err.message}`);
  }
}

module.exports = { run, validatePath, validateContent };