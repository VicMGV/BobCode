async function planAction(userInput) {
  const cleaned = userInput.replace(/^[>\s]+/, '').trim();
  const lower = cleaned.toLowerCase();
  const words = lower.split(' ');
  const lastWord = words[words.length - 1];

  if (lower.includes('test') || lower.includes('tests')) {
    const target = lower.replace('generate tests for', '').replace('generate test for', '').replace('test', '').trim().split(' ')[0] || lastWord;
    return { tool: 'read_file', target: target.trim(), instruction: cleaned, taskType: 'test' };
  }

  if (lower.includes('explain')) {
    const target = lower.replace('explain', '').trim().split(' ')[0] || lastWord;
    return { tool: 'read_file', target: target.trim(), instruction: cleaned, taskType: 'review' };
  }

  if (lower.includes('document') || lower.includes('docs') || lower.includes('jsdoc')) {
    const target = lower.replace('document', '').replace('docs', '').replace('jsdoc', '').trim().split(' ')[0] || lastWord;
    return { tool: 'read_file', target: target.trim(), instruction: cleaned, taskType: 'documentation' };
  }

  if (lower.includes('fix') || lower.includes('debug') || lower.includes('error')) {
    const target = lower.replace('fix', '').replace('debug', '').replace('error', '').trim().split(' ')[0] || lastWord;
    return { tool: 'read_file', target: target.trim(), instruction: cleaned, taskType: 'fix' };
  }

  if (lower.includes('review') || lower.includes('analyze') || lower.includes('check')) {
    const target = lower.replace('review', '').replace('analyze', '').replace('check', '').trim().split(' ')[0] || lastWord;
    return { tool: 'read_file', target: target.trim(), instruction: cleaned, taskType: 'review' };
  }

  if (lower.includes('list') || lower.includes('structure') || lower.includes('files')) {
    return { tool: 'list_files', target: '.', instruction: cleaned, taskType: 'code' };
  }

  if (lower.includes('run') || lower.includes('pnpm') || lower.includes('execute')) {
    const command = lower.replace('run', '').trim() || 'pnpm test';
    return { tool: 'run_command', target: command.trim(), instruction: cleaned, taskType: 'code' };
  }

  return { tool: 'list_files', target: '.', instruction: cleaned, taskType: 'code' };
}

module.exports = { planAction };