require('dotenv').config();
const express = require('express');
const path = require('path');
const { runAgent } = require('./agent/agent');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const result = await runAgent(message.trim());
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/status', (_req, res) => {
  res.json({
    status: 'ok',
    mode: process.env.BOB_API_KEY && process.env.BOB_API_URL ? 'api' : 'mock',
    nodeVersion: process.version,
    env: process.env.NODE_ENV || 'development',
  });
});

const server = app.listen(PORT, () => {
  console.log(`\nBobCode Web UI → http://localhost:${PORT}`);
  console.log(`  dir  : ${process.cwd()}`);
  if (!process.env.BOB_API_KEY) {
    console.warn('  [warn] No API key — running in mock mode');
  }
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});
