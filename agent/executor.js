const logger = require('../config/logger');
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

  logger.info(`Executing tool: ${plan.tool} on "${plan.target}"`);
  const context = await tool.run(plan.target);
  const prompt = getExecutorPrompt(plan.taskType, plan.instruction, context);
  const result = await askBob(prompt);
  logger.info(`Execution complete — response length: ${result.length} chars`);
  return result;
}

module.exports = { execute };
