const { planAction } = require('./planner');
const { execute } = require('./executor');

async function runAgent(userInput) {
  console.log('\x1b[90mThinking...\x1b[0m');
  const plan = await planAction(userInput);
  console.log(`\x1b[90mPlan: ${plan.tool} → ${plan.target}\x1b[0m`);
  const result = await execute(plan);
  return result;
}

module.exports = { runAgent };
