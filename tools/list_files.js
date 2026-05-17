const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

/**
 * Directories and files to ignore during listing
 */
const IGNORE = [
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
];

/**
 * Maximum depth for recursive directory traversal
 */
const MAX_DEPTH = 5;

/**
 * Validate and sanitize directory path
 * @param {string} target - The directory path to validate
 * @returns {string} - Validated absolute path
 * @throws {Error} - If path is invalid or outside project directory
 */
function validatePath(target) {
  if (!target || typeof target !== 'string') {
    throw new Error('Invalid path: must be a non-empty string');
  }

  const absolutePath = path.resolve(target);
  const projectRoot = process.cwd();

  // Ensure path is within project directory
  if (!absolutePath.startsWith(projectRoot)) {
    throw new Error(`Access denied: path outside project directory (${target})`);
  }

  return absolutePath;
}

/**
 * Recursively walk directory tree and build file listing
 * @param {string} dir - Directory to walk
 * @param {number} depth - Current depth level
 * @returns {Promise<string>} - Formatted directory tree
 */
async function walk(dir, depth = 0) {
  if (depth > MAX_DEPTH) {
    return '  '.repeat(depth) + '[max depth reached]\n';
  }

  let result = '';

  try {
    const items = await fs.readdir(dir);

    for (const item of items) {
      // Skip ignored items
      if (IGNORE.includes(item)) continue;

      const fullPath = path.join(dir, item);

      try {
        const stats = await fs.stat(fullPath);
        const isDir = stats.isDirectory();

        const indent = '  '.repeat(depth);
        const prefix = isDir ? '+' : '-';
        result += `${indent}${prefix} ${item}\n`;

        // Recursively walk subdirectories
        if (isDir) {
          result += await walk(fullPath, depth + 1);
        }
      } catch (err) {
        // Skip items that can't be accessed
        result += '  '.repeat(depth) + `! ${item} (access denied)\n`;
      }
    }
  } catch (err) {
    throw new Error(`Error reading directory ${dir}: ${err.message}`);
  }

  return result;
}

/**
 * List files and directories in a given path
 * @param {string} target - The directory path to list (defaults to current directory)
 * @returns {Promise<string>} - Formatted directory tree
 * @throws {Error} - If path is invalid or inaccessible
 */
async function run(target = '.') {
  try {
    // Validate path
    const validatedPath = validatePath(target);

    // Check if path exists and is a directory
    try {
      const stats = await fs.stat(validatedPath);
      if (!stats.isDirectory()) {
        throw new Error(`Not a directory: ${target}`);
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new Error(`Directory not found: ${target}`);
      }
      throw err;
    }

    // Build and return directory tree
    const tree = await walk(validatedPath);
    return tree || '(empty directory)';

  } catch (err) {
    if (err.message.includes('Access denied') ||
        err.message.includes('Not a directory') ||
        err.message.includes('Directory not found')) {
      throw err;
    }
    throw new Error(`Error listing files in ${target}: ${err.message}`);
  }
}

module.exports = { run, validatePath };