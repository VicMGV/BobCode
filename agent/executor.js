const { askBob } = require('../bob/client');
const { getExecutorPrompt } = require('../bob/prompts');
const readFile = require('../tools/read_file');
const writeFile = require('../tools/write_file');
const listFiles = require('../tools/list_files');
const runCommand = require('../tools/run_command');

const TOOLS = {
  read_file: readFile,
  write_file: writeFile,
  list_files: listFiles,
  run_command: runCommand,
};

async function execute(plan) {
  const tool = TOOLS[plan.tool];
  if (!tool) throw new Error(`Unknown tool: ${plan.tool}`);

  const context = await tool.run(plan.target);
  const prompt = getExecutorPrompt(plan.taskType, plan.instruction, context);
  const result = await askBob(prompt);
  return result;
}

module.exports = { execute };