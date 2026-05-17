const { spawnSync } = require('child_process');
const logger = require('../config/logger');
const securityConfig = require('../config/security');

// watsonx.ai configuration
const WATSONX_API_KEY   = process.env.WATSONX_API_KEY || process.env.BOB_API_KEY || '';
const WATSONX_URL       = process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com';
const WATSONX_PROJECT_ID = process.env.WATSONX_PROJECT_ID || '';
const WATSONX_MODEL     = process.env.WATSONX_MODEL || 'ibm/granite-3-8b-instruct';
const IAM_URL           = 'https://iam.cloud.ibm.com/identity/token';

const MAX_PROMPT_LENGTH  = 50000;
const SHELL_PROMPT_LENGTH = 500;
const SHELL_TIMEOUT      = 60000;

// IAM token cache
let iamTokenCache = null;
let iamTokenExpiry = 0;

const rateLimitState = {
  requests: [],
  windowMs: securityConfig.api.rateLimit.windowMs,
  maxRequests: securityConfig.api.rateLimit.maxRequests
};

// ─── Validation ─────────────────────────────────────────────────────
function validateApiKey() {
  if (!WATSONX_API_KEY) return false;
  if (WATSONX_API_KEY.length < 10) {
    throw new Error('Invalid API key: too short (minimum 10 characters)');
  }
  return true;
}

// ─── Rate limiting ───────────────────────────────────────────────────
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

// ─── Helpers ─────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRetryDelay(attempt) {
  const baseDelay  = securityConfig.api.retryDelay;
  const maxDelay   = securityConfig.api.maxRetryDelay;
  const expDelay   = baseDelay * Math.pow(2, attempt);
  const jitter     = Math.random() * 0.3 * expDelay;
  return Math.min(expDelay + jitter, maxDelay);
}

// ─── IAM Token ───────────────────────────────────────────────────────
async function getIAMToken() {
  const now = Date.now();

  // Return cached token if still valid (with 60s buffer)
  if (iamTokenCache && now < iamTokenExpiry - 60000) {
    return iamTokenCache;
  }

  logger.info('Fetching new IAM token...');

  const response = await fetch(IAM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${WATSONX_API_KEY}`
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'Unknown error');
    throw new Error(`IAM token request failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  iamTokenCache = data.access_token;
  iamTokenExpiry = now + (data.expires_in * 1000);

  logger.info('IAM token obtained successfully');
  return iamTokenCache;
}

// ─── watsonx.ai API call ─────────────────────────────────────────────
async function fetchWatsonx(prompt, timeout) {
  const token = await getIAMToken();

  const endpoint = `${WATSONX_URL}/ml/v1/text/generation?version=2023-05-29`;

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        model_id: WATSONX_MODEL,
        input: prompt,
        parameters: {
          decoding_method: 'greedy',
          max_new_tokens: 1024,
          min_new_tokens: 1,
          stop_sequences: [],
          repetition_penalty: 1
        },
        project_id: WATSONX_PROJECT_ID
      }),
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

// ─── Bob Shell (fallback) ────────────────────────────────────────────
function sanitizePrompt(prompt) {
  return prompt
    .substring(0, SHELL_PROMPT_LENGTH)
    .replace(/[\r\n]+/g, ' ')
    .replace(/"/g, "'");
}

function extractShellOutput(stdout) {
  const match = stdout.match(/---output---([\s\S]*?)---output---/);
  if (match && match[1].trim()) return match[1].trim();
  return null;
}

function cleanShellOutput(output) {
  const excludePatterns = ['loading', 'initializing', 'connecting', 'error'];
  return output
    .split('\n')
    .filter(line => {
      const lower = line.toLowerCase();
      return !excludePatterns.some(p => lower.includes(p)) && line.trim().length > 0;
    })
    .join('\n')
    .trim();
}

function executeShellCommand(prompt) {
  const sanitizedPrompt = sanitizePrompt(prompt);
  const result = spawnSync(
    'bob',
    ['-y', '--output-format', 'text', '--chat-mode', 'ask', sanitizedPrompt],
    { encoding: 'utf-8', timeout: SHELL_TIMEOUT, cwd: process.cwd(), shell: true }
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
  if (extractedOutput) return extractedOutput;
  const cleanedOutput = cleanShellOutput(stdout);
  if (cleanedOutput) {
    logger.debug('Using cleaned stdout as response');
    return cleanedOutput;
  }
  if (result.status !== 0 && stderr) logger.warn(`Bob Shell stderr: ${stderr}`);
  logger.warn('Empty response from Bob Shell, using mock');
  return mockResponse(prompt);
}

async function askBobViaShell(prompt) {
  const result = executeShellCommand(prompt);
  return processShellResult(result, prompt);
}

// ─── Main API call via watsonx.ai ────────────────────────────────────
async function askBobViaAPI(prompt) {
  const hasValidKey = validateApiKey();
  if (!hasValidKey) {
    logger.warn('No API key configured, using mock responses');
    return mockResponse(prompt);
  }

  if (!WATSONX_PROJECT_ID) {
    logger.warn('No WATSONX_PROJECT_ID configured, using mock responses');
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

      const response = await fetchWatsonx(prompt, securityConfig.api.timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        const isClientError = response.status >= 400 && response.status < 500;
        if (isClientError) {
          throw new Error(`watsonx API client error (${response.status}): ${errorText}`);
        }
        throw new Error(`watsonx API server error (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      // watsonx.ai response format: data.results[0].generated_text
      const result =
        data?.results?.[0]?.generated_text ||
        data?.response ||
        data?.text ||
        JSON.stringify(data);

      if (!result) throw new Error('Empty response from watsonx API');

      return result;

    } catch (error) {
      lastError = error;
      const isNonRetryable =
        error.message.includes('client error') ||
        error.message.includes('Invalid') ||
        error.message.includes('Rate limit');
      if (isNonRetryable) throw error;
      if (attempt < maxRetries - 1) logger.warn(`Request failed: ${error.message}`);
    }
  }

  throw new Error(`watsonx API request failed after ${maxRetries} attempts: ${lastError.message}`);
}

// ─── Public interface ────────────────────────────────────────────────
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

// ─── Mock responses ──────────────────────────────────────────────────
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
    return JSON.stringify({ score: 3, feedback: 'Mock mode — connect watsonx API for real evaluation.', correct: 'Answer submitted successfully.', missed: 'N/A in mock mode.' });
  }
  return 'This is a mock response. Connect your watsonx.ai API key to get real code feedback and analysis.';
}

module.exports = { askBob, validateApiKey };

// Made with IBM Bob + watsonx.ai