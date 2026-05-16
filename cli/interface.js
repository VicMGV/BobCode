const readline = require('readline');
const { runAgent } = require('../agent/agent');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function prompt() {
  rl.question('\n\x1b[36m> \x1b[0m', async (input) => {
    const trimmed = input.trim();
    if (!trimmed) return prompt();
    if (trimmed === 'exit') { console.log('\x1b[33mGoodbye!\x1b[0m'); rl.close(); return; }
    try {
      const result = await runAgent(trimmed);
      console.log('\n\x1b[32m' + result + '\x1b[0m');
    } catch (err) {
      console.error('\x1b[31mError:\x1b[0m', err.message);
    }
    prompt();
  });
}

function startCLI() {
  console.log('\x1b[33mType your instruction (e.g. "generate tests for index.js")\x1b[0m');
  console.log('\x1b[90mType "exit" to quit\x1b[0m\n');
  prompt();
}

module.exports = { startCLI };