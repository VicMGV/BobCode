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

    statusPill.className = 'status-pill ' + (data.mode === 'api' ? 'online' : 'mock');
    statusLabel.textContent = data.mode === 'api' ? 'API mode' : 'Mock mode';

    modeBadge.textContent = data.mode === 'api' ? 'API' : 'Mock';
    modeBadge.style.background = data.mode === 'api' ? 'rgba(63, 185, 80, 0.12)' : 'rgba(227, 179, 65, 0.12)';
    modeBadge.style.color = data.mode === 'api' ? 'var(--green)' : 'var(--orange)';
    modeBadge.style.borderColor = data.mode === 'api' ? 'rgba(63, 185, 80, 0.3)' : 'rgba(227, 179, 65, 0.3)';

    nodeBadge.textContent = data.nodeVersion || 'Node';
  } catch {
    statusPill.className = 'status-pill error';
    statusLabel.textContent = 'Offline';
  }
}

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

welcomeTime.textContent = now();
checkStatus();
chatInput.focus();
