require('dotenv').config();
const express = require('express');
const path = require('path');
const logger = require('./config/logger');
const { runAgent } = require('./agent/agent');
const { askBob } = require('./bob/client');
const { INTERVIEW_GENERATE_PROMPT, INTERVIEW_EVALUATE_PROMPT } = require('./bob/prompts');
const { run: fetchGithub, parseGithubUrl } = require('./tools/fetch_github');

const app = express();
const PORT = process.env.PORT || 3000;

const interviewSession = {
  active: false,
  code: '',
  target: '',
  questions: [],
  currentIndex: 0,
  answers: [],
};

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

app.get('/api/status', (_req, res) => {
  res.json({
    status: 'ok',
    mode: process.env.BOB_API_KEY && process.env.BOB_API_URL ? 'api' : 'mock',
    nodeVersion: process.version,
    env: process.env.NODE_ENV || 'development',
  });
});

app.post('/api/config', (req, res) => {
  const { apiKey, apiUrl } = req.body;

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
    return res.status(400).json({ error: 'Invalid API key: minimum 10 characters required' });
  }
  if (!apiUrl || typeof apiUrl !== 'string' || !apiUrl.trim()) {
    return res.status(400).json({ error: 'MCP Server URL is required' });
  }
  try {
    new URL(apiUrl.trim());
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  process.env.BOB_API_KEY = apiKey.trim();
  process.env.BOB_API_URL = apiUrl.trim();

  logger.info('Credentials set — mode switched to api');
  res.json({ success: true, mode: 'api' });
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const result = await runAgent(message.trim());
    res.json({ result });
  } catch (error) {
    logger.error(`Chat error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/fetch-github', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const parsed = parseGithubUrl(url.trim());
  if (!parsed) {
    return res.status(400).json({ error: 'Invalid GitHub URL. Supported: github.com/owner/repo, github.com/owner/repo/blob/branch/file, raw.githubusercontent.com/...' });
  }

  try {
    const content = await fetchGithub(url.trim());
    res.json({ content });
  } catch (error) {
    logger.error(`GitHub fetch error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/interview/start', async (req, res) => {
  const { code, target } = req.body;

  if (!code || typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'Code is required' });
  }

  try {
    interviewSession.code = code.trim();
    interviewSession.target = target || 'provided code';
    interviewSession.currentIndex = 0;
    interviewSession.answers = [];
    interviewSession.active = true;

    const raw = await askBob(INTERVIEW_GENERATE_PROMPT(interviewSession.code));

    let questions;
    try {
      questions = JSON.parse(raw);
    } catch {
      return res.status(500).json({ error: 'Failed to parse questions from Bob' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(500).json({ error: 'Invalid questions format from Bob' });
    }

    interviewSession.questions = questions;

    res.json({ total: questions.length, currentIndex: 0, question: questions[0] });
  } catch (error) {
    logger.error(`Interview start error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/interview/answer', async (req, res) => {
  const { answer } = req.body;

  if (!interviewSession.active) {
    return res.status(400).json({ error: 'No active interview session' });
  }
  if (!answer || typeof answer !== 'string' || !answer.trim()) {
    return res.status(400).json({ error: 'Answer is required' });
  }

  const { currentIndex, questions, code } = interviewSession;

  if (currentIndex >= questions.length) {
    return res.status(400).json({ error: 'Interview already complete' });
  }

  try {
    const currentQuestion = questions[currentIndex];
    const raw = await askBob(INTERVIEW_EVALUATE_PROMPT(currentQuestion.question, answer.trim(), code));

    let evaluation;
    try {
      evaluation = JSON.parse(raw);
    } catch {
      evaluation = { score: 3, feedback: raw, correct: 'N/A', missed: 'N/A' };
    }

    interviewSession.answers.push({ question: currentQuestion, answer: answer.trim(), evaluation });
    interviewSession.currentIndex++;

    const nextIndex = interviewSession.currentIndex;
    const done = nextIndex >= questions.length;
    if (done) interviewSession.active = false;

    res.json({
      evaluation,
      done,
      nextIndex,
      nextQuestion: done ? null : questions[nextIndex],
      total: questions.length,
    });
  } catch (error) {
    logger.error(`Interview answer error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/interview/reset', (_req, res) => {
  interviewSession.active = false;
  interviewSession.code = '';
  interviewSession.target = '';
  interviewSession.questions = [];
  interviewSession.currentIndex = 0;
  interviewSession.answers = [];
  res.json({ success: true });
});

app.get('/api/interview/status', (_req, res) => {
  res.json({
    active: interviewSession.active,
    total: interviewSession.questions.length,
    currentIndex: interviewSession.currentIndex,
    target: interviewSession.target,
    answersCount: interviewSession.answers.length,
  });
});

const server = app.listen(PORT, () => {
  logger.info(`BobCode Web UI → http://localhost:${PORT}`);
  logger.info(`dir: ${process.cwd()}`);
  if (!process.env.BOB_API_KEY) {
    logger.warn('No API key — running in mock mode');
  } else {
    logger.info('API key detected — running in api mode');
  }
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => {
  logger.info('Shutting down...');
  server.close(() => process.exit(0));
});
