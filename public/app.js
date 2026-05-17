marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true,
});

const apiModal      = document.getElementById('apiModal');
const apiUrlInput   = document.getElementById('apiUrl');
const apiKeyInput   = document.getElementById('apiKey');
const toggleKeyBtn  = document.getElementById('toggleKey');
const connectBtn    = document.getElementById('connectBtn');
const skipBtn       = document.getElementById('skipBtn');
const modalError    = document.getElementById('modalError');

const messagesEl    = document.getElementById('messages');
const chatInput     = document.getElementById('chatInput');
const sendBtn       = document.getElementById('sendBtn');
const typingWrapper = document.getElementById('typingWrapper');
const statusPill    = document.getElementById('statusPill');
const statusLabel   = document.getElementById('statusLabel');
const modeBadge     = document.getElementById('modeBadge');
const nodeBadge     = document.getElementById('nodeBadge');
const clearBtn      = document.getElementById('clearBtn');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar       = document.getElementById('sidebar');
const welcomeTime   = document.getElementById('welcomeTime');
const chatPanel     = document.getElementById('chatPanel');
const interviewPanel = document.getElementById('interviewPanel');

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom(smooth = true) {
  messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
}

function setLoading(loading) {
  sendBtn.disabled = loading;
  chatInput.disabled = loading;
  typingWrapper.style.display = loading ? 'block' : 'none';
  if (loading) scrollToBottom();
}

function autoResize() {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + 'px';
}

function renderMarkdown(text) {
  const html = marked.parse(text);
  const div = document.createElement('div');
  div.innerHTML = html;

  div.querySelectorAll('pre').forEach(pre => {
    const code = pre.querySelector('code');
    const lang = (code.className.match(/language-(\w+)/) || [])[1] || '';

    const header = document.createElement('div');
    header.className = 'code-block-header';

    const langTag = document.createElement('span');
    langTag.className = 'code-lang';
    langTag.textContent = lang || 'code';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(code.textContent).then(() => {
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
          copyBtn.classList.remove('copied');
        }, 2000);
      });
    });

    header.appendChild(langTag);
    header.appendChild(copyBtn);
    pre.insertBefore(header, code);
  });

  return div.innerHTML;
}

function appendMessage({ role, text, isError = false }) {
  const isUser = role === 'user';
  const msg = document.createElement('div');
  msg.className = `message ${isUser ? 'user-message' : 'bot-message'}`;

  const avatar = document.createElement('div');
  avatar.className = `message-avatar ${isUser ? 'avatar-user' : 'avatar-bot'}`;
  avatar.textContent = isUser ? '>' : 'B';

  const body = document.createElement('div');
  body.className = 'message-body';

  const header = document.createElement('div');
  header.className = 'message-header';

  const author = document.createElement('span');
  author.className = 'message-author';
  author.textContent = isUser ? 'You' : 'Bob Agent';

  const time = document.createElement('span');
  time.className = 'message-time';
  time.textContent = now();

  header.appendChild(author);
  header.appendChild(time);

  const content = document.createElement('div');
  content.className = 'message-content' + (isError ? ' error-content' : '');

  if (isError || isUser) {
    content.textContent = text;
  } else {
    content.innerHTML = renderMarkdown(text);
    content.querySelectorAll('pre code').forEach(block => {
      if (!block.classList.contains('hljs')) hljs.highlightElement(block);
    });
  }

  body.appendChild(header);
  body.appendChild(content);
  msg.appendChild(avatar);
  msg.appendChild(body);
  messagesEl.appendChild(msg);
  scrollToBottom();
}

async function sendMessage(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  appendMessage({ role: 'user', text: trimmed });
  chatInput.value = '';
  autoResize();
  setLoading(true);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: trimmed }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      appendMessage({ role: 'bot', text: data.error || 'Unknown error', isError: true });
    } else {
      appendMessage({ role: 'bot', text: data.result });
    }
  } catch (err) {
    appendMessage({ role: 'bot', text: `Connection error: ${err.message}`, isError: true });
  } finally {
    setLoading(false);
    chatInput.focus();
  }
}

async function checkStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    const isApi = data.mode === 'api';

    statusPill.className = 'status-pill ' + (isApi ? 'online' : 'mock');
    statusLabel.textContent = isApi ? 'API mode' : 'Mock mode';

    modeBadge.textContent = isApi ? 'API' : 'Mock';
    modeBadge.style.background = isApi ? 'rgba(63, 185, 80, 0.12)' : 'rgba(227, 179, 65, 0.12)';
    modeBadge.style.color = isApi ? 'var(--green)' : 'var(--orange)';
    modeBadge.style.borderColor = isApi ? 'rgba(63, 185, 80, 0.3)' : 'rgba(227, 179, 65, 0.3)';

    nodeBadge.textContent = data.nodeVersion || 'Node';

    if (!isApi) {
      apiModal.classList.remove('modal-hidden');
    }
  } catch {
    statusPill.className = 'status-pill error';
    statusLabel.textContent = 'Offline';
  }
}

function setModalError(msg) {
  modalError.textContent = msg;
  modalError.classList.toggle('modal-hidden', !msg);
}

let currentMode = 'chat';

function switchMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
  chatPanel.classList.toggle('panel-hidden', mode !== 'chat');
  interviewPanel.classList.toggle('panel-hidden', mode !== 'interview');
}

const ivState = {
  history: [],
  total: 0,
  currentIndex: 0,
};

function showIvScreen(screenId) {
  ['ivStart', 'ivActive', 'ivDone'].forEach(id => {
    document.getElementById(id).classList.toggle('panel-hidden', id !== screenId);
  });
}

function scoreClass(score) {
  if (score <= 2) return 'score-low';
  if (score === 3) return 'score-mid';
  return 'score-high';
}

function renderHistory() {
  const container = document.getElementById('ivHistory');
  container.innerHTML = '';

  let totalScore = 0;
  ivState.history.forEach((item, i) => {
    const s = item.evaluation.score || 0;
    totalScore += s;

    const el = document.createElement('div');
    el.className = 'iv-history-item';

    const hdr = document.createElement('div');
    hdr.className = 'iv-history-header';

    const qtext = document.createElement('span');
    qtext.className = 'iv-history-qtext';
    qtext.textContent = `Q${i + 1}. ${item.question}`;

    const badge = document.createElement('span');
    badge.className = `iv-score-badge ${scoreClass(s)}`;
    badge.textContent = `${s}/5`;

    hdr.appendChild(qtext);
    hdr.appendChild(badge);

    const ans = document.createElement('div');
    ans.className = 'iv-history-answer';
    ans.textContent = item.answer;

    const evalDiv = document.createElement('div');
    evalDiv.className = 'iv-history-eval';

    if (item.evaluation.feedback) {
      const fb = document.createElement('p');
      fb.className = 'iv-eval-feedback';
      fb.textContent = item.evaluation.feedback;
      evalDiv.appendChild(fb);
    }
    if (item.evaluation.correct && item.evaluation.correct !== 'N/A') {
      const cr = document.createElement('p');
      cr.className = 'iv-eval-correct';
      cr.innerHTML = `<strong>Correct:</strong> ${item.evaluation.correct}`;
      evalDiv.appendChild(cr);
    }
    if (item.evaluation.missed && item.evaluation.missed !== 'N/A') {
      const ms = document.createElement('p');
      ms.className = 'iv-eval-missed';
      ms.innerHTML = `<strong>Missed:</strong> ${item.evaluation.missed}`;
      evalDiv.appendChild(ms);
    }

    el.appendChild(hdr);
    el.appendChild(ans);
    el.appendChild(evalDiv);
    container.appendChild(el);
  });

  const avg = ivState.history.length > 0
    ? (totalScore / ivState.history.length).toFixed(1)
    : '0.0';
  document.getElementById('ivScoreSummary').textContent = `Average score: ${avg} / 5`;
}

async function startInterview() {
  const code = document.getElementById('ivCode').value.trim();
  const target = document.getElementById('ivTarget').value.trim();
  const errorEl = document.getElementById('ivStartError');

  if (!code) {
    errorEl.textContent = 'Please paste some code to start the interview.';
    errorEl.classList.remove('panel-hidden');
    return;
  }

  errorEl.classList.add('panel-hidden');
  const startBtn = document.getElementById('ivStartBtn');
  startBtn.disabled = true;
  startBtn.textContent = 'Generating questions…';

  try {
    const res = await fetch('/api/interview/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, target }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      errorEl.textContent = data.error || 'Failed to start interview.';
      errorEl.classList.remove('panel-hidden');
      return;
    }

    ivState.history = [];
    ivState.total = data.total;
    ivState.currentIndex = 0;

    showQuestion(data.question, 0, data.total);
    showIvScreen('ivActive');
  } catch (err) {
    errorEl.textContent = `Error: ${err.message}`;
    errorEl.classList.remove('panel-hidden');
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = 'Start Interview';
  }
}

function showQuestion(question, index, total) {
  document.getElementById('ivQLabel').textContent = `Question ${index + 1} of ${total}`;
  document.getElementById('ivQuestionBox').textContent = question.question;
  document.getElementById('ivAnswer').value = '';
  document.getElementById('ivProgressFill').style.width = `${(index / total) * 100}%`;
  document.getElementById('ivAnswerError').classList.add('panel-hidden');
}

async function submitAnswer() {
  const answer = document.getElementById('ivAnswer').value.trim();
  const errorEl = document.getElementById('ivAnswerError');

  if (!answer) {
    errorEl.textContent = 'Please type an answer before submitting.';
    errorEl.classList.remove('panel-hidden');
    return;
  }

  errorEl.classList.add('panel-hidden');
  const submitBtn = document.getElementById('ivSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Evaluating…';

  try {
    const currentQuestion = document.getElementById('ivQuestionBox').textContent;

    const res = await fetch('/api/interview/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      errorEl.textContent = data.error || 'Failed to evaluate answer.';
      errorEl.classList.remove('panel-hidden');
      return;
    }

    ivState.history.push({
      question: currentQuestion,
      answer,
      evaluation: data.evaluation,
    });

    ivState.currentIndex = data.nextIndex;

    if (data.done) {
      document.getElementById('ivProgressFill').style.width = '100%';
      renderHistory();
      showIvScreen('ivDone');
    } else {
      showQuestion(data.nextQuestion, data.nextIndex, ivState.total);
    }
  } catch (err) {
    errorEl.textContent = `Error: ${err.message}`;
    errorEl.classList.remove('panel-hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Answer';
  }
}

async function fetchGithubCode() {
  const url = document.getElementById('ivGithubUrl').value.trim();
  const errorEl = document.getElementById('ivStartError');

  if (!url) {
    errorEl.textContent = 'Please enter a GitHub URL first.';
    errorEl.classList.remove('panel-hidden');
    return;
  }

  errorEl.classList.add('panel-hidden');
  const fetchBtn = document.getElementById('ivFetchBtn');
  fetchBtn.disabled = true;
  fetchBtn.textContent = 'Fetching…';

  try {
    const res = await fetch('/api/fetch-github', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      errorEl.textContent = data.error || 'Failed to fetch GitHub content.';
      errorEl.classList.remove('panel-hidden');
      return;
    }

    document.getElementById('ivCode').value = data.content;
    const label = url.replace(/^https?:\/\/(?:github\.com|raw\.githubusercontent\.com)\//, '');
    document.getElementById('ivTarget').value = label;
  } catch (err) {
    errorEl.textContent = `Error: ${err.message}`;
    errorEl.classList.remove('panel-hidden');
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.textContent = 'Fetch';
  }
}

async function resetInterview() {
  try { await fetch('/api/interview/reset', { method: 'POST' }); } catch {}
  ivState.history = [];
  ivState.currentIndex = 0;
  ivState.total = 0;
  document.getElementById('ivCode').value = '';
  document.getElementById('ivTarget').value = '';
  document.getElementById('ivStartError').classList.add('panel-hidden');
  showIvScreen('ivStart');
}

toggleKeyBtn.addEventListener('click', () => {
  const isPassword = apiKeyInput.type === 'password';
  apiKeyInput.type = isPassword ? 'text' : 'password';
  toggleKeyBtn.textContent = isPassword ? 'Hide' : 'Show';
});

skipBtn.addEventListener('click', () => {
  apiModal.classList.add('modal-hidden');
});

connectBtn.addEventListener('click', async () => {
  const apiUrl = apiUrlInput.value.trim();
  const apiKey = apiKeyInput.value.trim();

  setModalError('');

  if (!apiUrl || !apiKey) {
    setModalError('Both fields are required.');
    return;
  }

  connectBtn.disabled = true;
  connectBtn.textContent = 'Connecting…';

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiUrl, apiKey }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      setModalError(data.error || 'Configuration failed.');
      connectBtn.disabled = false;
      connectBtn.textContent = 'Connect';
      return;
    }

    await checkStatus();
    apiModal.classList.add('modal-hidden');
  } catch (err) {
    setModalError(`Connection error: ${err.message}`);
    connectBtn.disabled = false;
    connectBtn.textContent = 'Connect';
  }
});

chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(chatInput.value);
  }
});

chatInput.addEventListener('input', autoResize);

sendBtn.addEventListener('click', () => sendMessage(chatInput.value));

document.querySelectorAll('.action-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tpl = btn.dataset.tpl;
    chatInput.value = tpl;
    autoResize();
    chatInput.focus();
    chatInput.setSelectionRange(tpl.length, tpl.length);
  });
});

document.querySelectorAll('.example-item').forEach(item => {
  item.addEventListener('click', () => {
    const msg = item.dataset.msg;
    if (msg) sendMessage(msg);
  });
});

clearBtn.addEventListener('click', () => {
  const welcome = document.getElementById('welcomeMsg');
  messagesEl.innerHTML = '';
  if (welcome) messagesEl.appendChild(welcome);
  chatInput.focus();
});

sidebarToggle.addEventListener('click', () => {
  if (window.innerWidth <= 700) {
    sidebar.classList.toggle('open');
    sidebar.classList.remove('collapsed');
  } else {
    sidebar.classList.toggle('collapsed');
    sidebar.classList.remove('open');
  }
});

document.addEventListener('click', e => {
  if (window.innerWidth <= 700
      && sidebar.classList.contains('open')
      && !sidebar.contains(e.target)
      && e.target !== sidebarToggle) {
    sidebar.classList.remove('open');
  }
});

document.querySelectorAll('.mode-tab').forEach(tab => {
  tab.addEventListener('click', () => switchMode(tab.dataset.mode));
});

document.getElementById('ivFetchBtn').addEventListener('click', fetchGithubCode);
document.getElementById('ivStartBtn').addEventListener('click', startInterview);
document.getElementById('ivSubmitBtn').addEventListener('click', submitAnswer);
document.getElementById('ivResetBtn').addEventListener('click', resetInterview);
document.getElementById('ivRetryBtn').addEventListener('click', resetInterview);

document.getElementById('ivGithubUrl').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); fetchGithubCode(); }
});

welcomeTime.textContent = now();
checkStatus();
chatInput.focus();
