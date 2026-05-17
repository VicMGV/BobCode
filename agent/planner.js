function extractTarget(lower, removePatterns) {
  let s = lower;
  removePatterns.forEach(p => { s = s.replace(p, ''); });
  return s.trim().split(/\s+/).find(w => w.length > 1) || '.';
}

function detectTaskType(lower) {
  if (lower.includes('test')) return 'test';
  if (lower.includes('explain') || lower.includes('what') || lower.includes('how')) return 'explain';
  if (lower.includes('bug') || lower.includes('bugs')) return 'bugs';
  if (lower.includes('security') || lower.includes('vulnerab')) return 'security';
  if (lower.includes('doc') || lower.includes('jsdoc')) return 'documentation';
  return 'feedback';
}

async function planAction(userInput) {
  const cleaned = userInput.replace(/^[>\s]+/, '').trim();
  const lower = cleaned.toLowerCase();

  const githubRe = /https?:\/\/(?:github\.com|raw\.githubusercontent\.com)\/\S+/;
  const githubMatch = cleaned.match(githubRe);
  if (githubMatch) {
    return { tool: 'fetch_github', target: githubMatch[0], instruction: cleaned, taskType: detectTaskType(lower) };
  }

  if (lower.includes('test') || lower.includes('tests')) {
    const target = extractTarget(lower, ['generate tests for', 'generate test for', 'tests', 'test']);
    return { tool: 'read_file', target, instruction: cleaned, taskType: 'test' };
  }

  if (lower.includes('jsdoc') || lower.includes('document') || lower.includes('docs')) {
    const target = extractTarget(lower, ['add jsdoc to', 'jsdoc', 'document', 'docs']);
    return { tool: 'read_file', target, instruction: cleaned, taskType: 'documentation' };
  }

  if (lower.includes('explain') || lower.includes('what does') || lower.includes('how does')) {
    const target = extractTarget(lower, ['explain', 'what does', 'how does', 'what is']);
    return { tool: 'read_file', target, instruction: cleaned, taskType: 'explain' };
  }

  if (lower.includes('security') || lower.includes('vulnerab')) {
    const target = extractTarget(lower, ['security check', 'security', 'vulnerability']);
    return { tool: 'read_file', target, instruction: cleaned, taskType: 'security' };
  }

  if (lower.includes('bug') || lower.includes('bugs') || lower.includes('find bug')) {
    const target = extractTarget(lower, ['find bugs in', 'find bugs', 'bugs', 'bug']);
    return { tool: 'read_file', target, instruction: cleaned, taskType: 'bugs' };
  }

  if (lower.includes('fix') || lower.includes('debug') || lower.includes('error')) {
    const target = extractTarget(lower, ['fix the bug in', 'fix the', 'fix', 'debug', 'error']);
    return { tool: 'read_file', target, instruction: cleaned, taskType: 'fix' };
  }

  if (lower.includes('review') || lower.includes('feedback') || lower.includes('analyze') || lower.includes('check')) {
    const target = extractTarget(lower, ['review the code in', 'review', 'feedback', 'analyze', 'check']);
    return { tool: 'read_file', target, instruction: cleaned, taskType: 'feedback' };
  }

  if (lower.includes('list') || lower.includes('structure') || lower.includes('files')) {
    return { tool: 'list_files', target: '.', instruction: cleaned, taskType: 'code' };
  }

  if (lower.includes('run') || lower.includes('pnpm') || lower.includes('execute')) {
    const command = lower.replace('run', '').trim() || 'pnpm test';
    return { tool: 'run_command', target: command.trim(), instruction: cleaned, taskType: 'code' };
  }

  const pathToken = lower.split(/\s+/).find(w => w.includes('/') || w.includes('.js') || w.includes('.ts'));
  if (pathToken) {
    return { tool: 'read_file', target: pathToken, instruction: cleaned, taskType: 'feedback' };
  }

  return { tool: 'list_files', target: '.', instruction: cleaned, taskType: 'code' };
}

module.exports = { planAction };
