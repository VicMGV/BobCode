const https = require('https');

const MAX_CONTENT_BYTES = 150 * 1024;

function parseGithubUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const u = url.trim().replace(/\/$/, '');

  const rawRe = /^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/;
  const rawM = u.match(rawRe);
  if (rawM) return { type: 'raw_url', owner: rawM[1], repo: rawM[2], branch: rawM[3], filePath: rawM[4], rawUrl: u };

  const blobRe = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/;
  const blobM = u.match(blobRe);
  if (blobM) return { type: 'file', owner: blobM[1], repo: blobM[2], branch: blobM[3], filePath: blobM[4] };

  const treeRe = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)(?:\/(.*))?$/;
  const treeM = u.match(treeRe);
  if (treeM) return { type: 'dir', owner: treeM[1], repo: treeM[2], branch: treeM[3], filePath: treeM[4] || '' };

  const repoRe = /^https?:\/\/github\.com\/([^/]+)\/([^/?\s#]+)$/;
  const repoM = u.match(repoRe);
  if (repoM) return { type: 'repo', owner: repoM[1], repo: repoM[2] };

  return null;
}

function request(url) {
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': 'BobCode/1.0', 'Accept': 'application/vnd.github.v3+json' };
    if (process.env.GITHUB_TOKEN) headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;

    https.get(url, { headers }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return request(res.headers.location).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function apiGet(path) {
  const { status, body } = await request(`https://api.github.com${path}`);
  if (status === 403) throw new Error('GitHub API rate limit exceeded. Set GITHUB_TOKEN in .env to increase limits.');
  if (status === 404) throw new Error(`Not found on GitHub: ${path}`);
  if (status !== 200) {
    let msg = body;
    try { msg = JSON.parse(body).message || body; } catch {}
    throw new Error(`GitHub API error (${status}): ${msg}`);
  }
  return JSON.parse(body);
}

function formatDirListing(items, dirPath) {
  const lines = items
    .sort((a, b) => (a.type === 'dir' ? -1 : 1) - (b.type === 'dir' ? -1 : 1))
    .map(item => `${item.type === 'dir' ? '+' : '-'} ${item.name}`);
  return `Directory: ${dirPath || '/'}\n\n${lines.join('\n')}`;
}

async function fetchContents(owner, repo, filePath, branch) {
  const ref = branch ? `?ref=${encodeURIComponent(branch)}` : '';
  const data = await apiGet(`/repos/${owner}/${repo}/contents/${filePath}${ref}`);

  if (Array.isArray(data)) {
    return formatDirListing(data, filePath || '/');
  }

  if (data.encoding === 'base64') {
    const content = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
    return content.substring(0, MAX_CONTENT_BYTES);
  }

  if (data.download_url) {
    const { status, body } = await request(data.download_url);
    if (status !== 200) throw new Error(`Failed to download file content (${status})`);
    return body.substring(0, MAX_CONTENT_BYTES);
  }

  throw new Error('Unable to decode file content from GitHub API');
}

async function run(target) {
  const parsed = parseGithubUrl(target);
  if (!parsed) throw new Error(`Not a valid GitHub URL: ${target}`);

  if (parsed.type === 'raw_url') {
    const { status, body } = await request(parsed.rawUrl);
    if (status !== 200) throw new Error(`Failed to fetch raw content (${status})`);
    return body.substring(0, MAX_CONTENT_BYTES);
  }

  if (parsed.type === 'file') {
    return fetchContents(parsed.owner, parsed.repo, parsed.filePath, parsed.branch);
  }

  if (parsed.type === 'dir') {
    return fetchContents(parsed.owner, parsed.repo, parsed.filePath, parsed.branch);
  }

  if (parsed.type === 'repo') {
    const [repoData, rootItems] = await Promise.all([
      apiGet(`/repos/${parsed.owner}/${parsed.repo}`),
      apiGet(`/repos/${parsed.owner}/${parsed.repo}/contents/`).catch(() => []),
    ]);

    const meta = [
      `Repository: ${repoData.full_name}`,
      repoData.description ? `Description: ${repoData.description}` : null,
      `Language: ${repoData.language || 'N/A'}`,
      `Stars: ${repoData.stargazers_count}  Forks: ${repoData.forks_count}`,
      `Default branch: ${repoData.default_branch}`,
    ].filter(Boolean).join('\n');

    const listing = Array.isArray(rootItems) ? '\n\n' + formatDirListing(rootItems, '/') : '';
    return meta + listing;
  }

  throw new Error('Unsupported GitHub URL type');
}

module.exports = { run, parseGithubUrl };
