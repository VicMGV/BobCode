const logger = require('../config/logger');
const { planAction } = require('./planner');
const { execute } = require('./executor');

async function runAgent(userInput) {
  logger.info('Thinking...');
  const plan = await planAction(userInput);
  logger.info(`Plan: ${plan.tool} → ${plan.target} [${plan.taskType}]`);
  const result = await execute(plan);
  return result;
}

module.exports = { runAgent };
