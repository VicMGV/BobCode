const { spawnSync } = require('child_process');
const logger = require('../config/logger');
const securityConfig = require('../config/security');

const BOB_API_URL = process.env.BOB_API_URL || '';
const BOB_API_KEY = process.env.BOB_API_KEY || '';
const MAX_PROMPT_LENGTH = 50000;
const SHELL_PROMPT_LENGTH = 500;
const SHELL_TIMEOUT = 60000;

const rateLimitState = {
  requests: [],
  windowMs: securityConfig.api.rateLimit.windowMs,
  maxRequests: securityConfig.api.rateLimit.maxRequests
};

function validateApiKey() {
  if (!BOB_API_KEY) return false;
  if (BOB_API_KEY.length < 10) {
    throw new Error('Invalid API key: too short (minimum 10 characters)');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(BOB_API_KEY)) {
    throw new Error('Invalid API key: contains invalid characters');
  }
  return true;
}

function checkRateLimit() {
  const now = Date.now();
  rateLimitState.requests = rateLimitState.requests.filter(
    timestamp => now - timestamp < rateLimitState.windowMs
  );
  
  if (rateLimitState.requests.length >= rateLimitState.maxRequests) {
    const windowSeconds = rateLimitState.windowMs / 1000;
    throw new Error(
      `Rate limit exceeded: ${rateLimitState.maxRequests} requests per ${windowSeconds} seconds`
    );
  }
  
  rateLimitState.requests.push(now);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRetryDelay(attempt) {
  const baseDelay = securityConfig.api.retryDelay;
  const maxDelay = securityConfig.api.maxRetryDelay;
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay;
  return Math.min(exponentialDelay + jitter, maxDelay);
}

async function fetchWithTimeout(prompt, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(BOB_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BOB_API_KEY}`,
      },
      body: JSON.stringify({ prompt }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

function sanitizePrompt(prompt) {
  return prompt
    .substring(0, SHELL_PROMPT_LENGTH)
    .replace(/[\r\n]+/g, ' ')
    .replace(/"/g, "'");
}

function extractShellOutput(stdout) {
  const match = stdout.match(/---output---([\s\S]*?)---output---/);
  if (match && match[1].trim()) {
    return match[1].trim();
  }
  return null;
}

function cleanShellOutput(output) {
  const excludePatterns = ['loading', 'initializing', 'connecting', 'error'];
  
  return output
    .split('\n')
    .filter(line => {
      const lower = line.toLowerCase();
      return !excludePatterns.some(pattern => lower.includes(pattern)) && 
             line.trim().length > 0;
    })
    .join('\n')
    .trim();
}

function executeShellCommand(prompt) {
  const sanitizedPrompt = sanitizePrompt(prompt);
  
  const result = spawnSync(
    'bob',
    ['-y', '--output-format', 'text', '--chat-mode', 'ask', sanitizedPrompt],
    {
      encoding: 'utf-8',
      timeout: SHELL_TIMEOUT,
      cwd: process.cwd(),
      shell: true
    }
  );

  if (process.env.DEBUG === 'true') {
    logger.debug(`Shell STDOUT: ${result.stdout?.substring(0, 300)}`);
    logger.debug(`Shell STDERR: ${result.stderr?.substring(0, 300)}`);
    logger.debug(`Shell Status: ${result.status}`);
    logger.debug(`Shell Error: ${result.error?.message}`);
  }

  return result;
}

function processShellResult(result, prompt) {
  if (result.error) {
    logger.warn(`Shell execution failed, using mock: ${result.error.message}`);
    return mockResponse(prompt);
  }

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  
  const extractedOutput = extractShellOutput(stdout);
  if (extractedOutput) {
    return extractedOutput;
  }

  const cleanedOutput = cleanShellOutput(stdout);
  if (cleanedOutput) {
    logger.debug('Using cleaned stdout as response');
    return cleanedOutput;
  }

  if (result.status !== 0 && stderr) {
    logger.warn(`Bob Shell stderr: ${stderr}`);
  }

  logger.warn('Empty response from Bob Shell, using mock');
  return mockResponse(prompt);
}

async function askBobViaShell(prompt) {
  const result = executeShellCommand(prompt);
  return processShellResult(result, prompt);
}

async function askBobViaAPI(prompt) {
  const hasValidKey = validateApiKey();
  if (!hasValidKey) {
    logger.warn('No API key configured, using mock responses');
    return mockResponse(prompt);
  }

  checkRateLimit();

  let lastError;
  const maxRetries = securityConfig.api.maxRetries;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = getRetryDelay(attempt - 1);
        logger.info(`Retrying in ${Math.round(delay)}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delay);
      }

      const response = await fetchWithTimeout(prompt, securityConfig.api.timeout);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        const isClientError = response.status >= 400 && response.status < 500;
        
        if (isClientError) {
          throw new Error(`Bob API client error (${response.status}): ${errorText}`);
        }
        throw new Error(`Bob API server error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const result = data.response || data.text || JSON.stringify(data);
      
      if (!result) {
        throw new Error('Empty response from Bob API');
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      const isNonRetryableError = 
        error.message.includes('client error') || 
        error.message.includes('Invalid') || 
        error.message.includes('Rate limit');
      
      if (isNonRetryableError) {
        throw error;
      }
      
      if (attempt < maxRetries - 1) {
        logger.warn(`Request failed: ${error.message}`);
      }
    }
  }

  throw new Error(`Bob API request failed after ${maxRetries} attempts: ${lastError.message}`);
}

async function askBob(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Invalid prompt: must be a non-empty string');
  }
  
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new Error(`Prompt too long: maximum ${MAX_PROMPT_LENGTH} characters`);
  }

  if (process.env.BOB_USE_SHELL === 'true') {
    return askBobViaShell(prompt);
  }

  return askBobViaAPI(prompt);
}

function mockResponse(prompt) {
  if (prompt.includes('PLANNER')) {
    return JSON.stringify({ tool: 'list_files', target: '.', instruction: prompt.substring(0, 100), taskType: 'code' });
  }
  if (prompt.startsWith('You are a senior technical interviewer')) {
    return JSON.stringify([
      { id: 1, question: 'What is the overall purpose of this module and what problem does it solve?' },
      { id: 2, question: 'Walk through the main execution flow — what happens step by step when the core function is called?' },
      { id: 3, question: 'Why was this particular design decision made, and what are the trade-offs?' },
      { id: 4, question: 'How does this code handle errors and edge cases? Are there any gaps?' },
      { id: 5, question: 'What would you change or improve in this implementation and why?' },
      { id: 6, question: 'Are there any security or performance concerns in this code?' },
    ]);
  }
  if (prompt.startsWith('Evaluate this technical interview answer')) {
    return JSON.stringify({ score: 3, feedback: 'Mock mode — connect IBM Bob for real evaluation.', correct: 'Answer submitted successfully.', missed: 'N/A in mock mode.' });
  }
  return 'This is a mock response. Connect your IBM Bob API key to get real code feedback and analysis.';
}

module.exports = { askBob, validateApiKey };

// Made with Bob
