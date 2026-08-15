// dsh-plus host：视觉(modlens) / 记忆(mneme) 配置 + 插件市场 后端
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import yaml from 'js-yaml';

export const name = 'dsh-plus';
export const inject = ['webServer'];

const MODLENS_CONFIG = join(homedir(), '.modlens', 'config.json');

const MNEME_DEFAULTS = {
  memoryDir: '~/.dsh/memory',
  autoInject: true,
  autoSummarize: true,
  maxInjectedItems: 5,
  importanceThreshold: 3,
  autoDream: true,
  dreamThresholdCount: 10,
  dreamThresholdChars: 5000,
  dreamDelayMs: 2000,
};

const MNEME_KEYS = Object.keys(MNEME_DEFAULTS);

function profileDir() {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh');
  return join(home, 'profiles', 'web');
}

function profilePatchPath() {
  return join(profileDir(), 'cordis.patch.yml');
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => resolve(body));
    req.on('error', () => resolve(''));
  });
}

function parseBody(text) {
  try { return JSON.parse(text || '{}'); } catch { return {}; }
}

function maskKey(key) {
  if (!key) return '';
  if (key.length <= 8) return '***';
  return key.slice(0, 3) + '***' + key.slice(-4);
}

function readModlens() {
  try { return JSON.parse(readFileSync(MODLENS_CONFIG, 'utf8')); } catch { return {}; }
}

function maskedModlens(cfg) {
  const out = JSON.parse(JSON.stringify(cfg || {}));
  const providers = out.providers || {};
  for (const name of Object.keys(providers)) {
    const p = providers[name];
    if (p && p.apiKey) p.apiKey = maskKey(p.apiKey);
  }
  return out;
}

function writeModlens(next) {
  const cur = readModlens();
  const nextProviders = next.providers || {};
  for (const name of Object.keys(nextProviders)) {
    const np = nextProviders[name] || {};
    const cp = (cur.providers && cur.providers[name]) || {};
    if (np.apiKey && np.apiKey.indexOf('***') >= 0) np.apiKey = cp.apiKey || '';
  }
  mkdirSync(dirname(MODLENS_CONFIG), { recursive: true });
  writeFileSync(MODLENS_CONFIG, JSON.stringify(next, null, 2));
  return next;
}

function readMneme() {
  const cfg = Object.assign({}, MNEME_DEFAULTS);
  try {
    const parsed = yaml.load(readFileSync(profilePatchPath(), 'utf8'));
    if (!Array.isArray(parsed)) return cfg;
    for (const e of parsed) {
      if (e && e.id === 'dsh-mneme' && e.config && typeof e.config === 'object') {
        for (const k of MNEME_KEYS) if (e.config[k] !== undefined) cfg[k] = e.config[k];
      }
    }
  } catch {}
  return cfg;
}

function writeMneme(next) {
  const overrides = {};
  for (const k of MNEME_KEYS) if (next[k] !== MNEME_DEFAULTS[k]) overrides[k] = next[k];
  const path = profilePatchPath();
  let entries = [];
  try {
    const parsed = yaml.load(readFileSync(path, 'utf8'));
    if (Array.isArray(parsed)) entries = parsed.filter((e) => !(e && e.id === 'dsh-mneme'));
  } catch {
    return { ok: false, error: 'cordis.patch.yml 解析失败（可能含 !!js 等自定义标签），已取消写入' };
  }
  if (Object.keys(overrides).length > 0) entries.push({ id: 'dsh-mneme', config: overrides });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, yaml.dump(entries, { lineWidth: -1 }));
  return { ok: true };
}

const GITHUB_API = 'https://api.github.com';
const CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function searchPlugins(query, limit) {
  limit = limit || 8;
  const key = (query || '').toLowerCase().trim() + '::' + limit;
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data;
  const q = encodeURIComponent((query ? query + ' ' : '') + 'topic:dsh-plugin');
  const url = GITHUB_API + '/search/repositories?q=' + q + '&sort=stars&order=desc&per_page=' + Math.min(limit * 2, 30);
  const res = await fetch(url, {
    headers: { accept: 'application/vnd.github+json', 'user-agent': 'dsh-plus' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error('GitHub HTTP ' + res.status);
  const body = await res.json();
  const data = (body.items || []).map((it) => ({
    name: String(it.name || ''),
    owner: String((it.owner && it.owner.login) || ''),
    url: String(it.html_url || ''),
    description: String(it.description || ''),
    stars: Number(it.stargazers_count || 0),
    install: 'github:' + String(it.full_name || ''),
  }));
  CACHE.set(key, { at: Date.now(), data });
  return data;
}

function resolvePnpm() {
  const base = process.env.APPDATA || '';
  const cand = [base ? join(base, 'npm', 'pnpm.cmd') : '', 'pnpm.cmd', 'pnpm'];
  return cand.find((c) => !!c) || 'pnpm';
}

function reconcileBundles() {
  const dir = profileDir();
  const pkgPath = join(dir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const deps = Object.keys(pkg.dependencies || {});
  const bundles = (pkg.dsh && pkg.dsh.profile && pkg.dsh.profile.bundles) || [];
  for (const name of deps) {
    const p = join(dir, 'node_modules', name, 'package.json');
    if (!existsSync(p)) continue;
    let m;
    try { m = JSON.parse(readFileSync(p, 'utf8')); } catch { continue; }
    if (m.dsh && m.dsh.bundle && m.dsh.bundle.patch && !bundles.includes(name)) bundles.push(name);
  }
  pkg.dsh = pkg.dsh || {};
  pkg.dsh.profile = pkg.dsh.profile || {};
  pkg.dsh.profile.bundles = bundles;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

function runInstall(spec) {
  return new Promise((resolve) => {
    const pnpm = resolvePnpm();
    const child = spawn(pnpm, ['add', spec], {
      cwd: profileDir(),
      shell: process.platform === 'win32',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d) => { out += String(d); });
    child.stderr.on('data', (d) => { out += String(d); });
    const timer = setTimeout(() => { try { child.kill(); } catch {} }, 180000);
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        try { reconcileBundles(); } catch (e) { out += '\nreconcile: ' + e.message; }
      }
      resolve({ ok: code === 0, code, output: out.slice(-4000) });
    });
    child.on('error', (e) => { clearTimeout(timer); resolve({ ok: false, code: -1, output: e.message }); });
  });
}

function listInstalled() {
  const dir = profileDir();
  const pkgPath = join(dir, 'package.json');
  let pkg = {};
  try { pkg = JSON.parse(readFileSync(pkgPath, 'utf8')); } catch {}
  const bundles = (pkg.dsh && pkg.dsh.profile && pkg.dsh.profile.bundles) || [];
  const deps = pkg.dependencies || {};
  return Object.keys(deps).map((name) => {
    let version = deps[name] || '';
    const p = join(dir, 'node_modules', name, 'package.json');
    if (existsSync(p)) {
      try { version = JSON.parse(readFileSync(p, 'utf8')).version || version; } catch {}
    }
    return { name, version, isBundle: bundles.includes(name) };
  });
}

// ---- 本地模型 ----
function homeDir() {
  return process.env.DSH_HOME || join(homedir(), '.dsh');
}

const LOCAL_SERVERS = [
  { id: 'ollama', name: 'Ollama', baseURL: 'http://127.0.0.1:11434/v1' },
  { id: 'lmstudio', name: 'LM Studio', baseURL: 'http://127.0.0.1:1234/v1' },
];

async function detectLocalServers() {
  const out = [];
  for (const s of LOCAL_SERVERS) {
    try {
      const res = await fetch(s.baseURL + '/models', { signal: AbortSignal.timeout(3000) });
      if (!res.ok) continue;
      const data = await res.json();
      const models = ((data && data.data) || []).map(function (m) { return m && m.id ? String(m.id) : null; }).filter(Boolean);
      if (models.length) out.push({ id: s.id, name: s.name, baseURL: s.baseURL, models });
    } catch (e) { /* 未运行或不可达 */ }
  }
  return out;
}

function settingsPath() {
  return join(homeDir(), 'settings.yaml');
}

function readSettings() {
  try {
    const doc = yaml.load(readFileSync(settingsPath(), 'utf8'));
    return (doc && typeof doc === 'object') ? doc : {};
  } catch { return {}; }
}

function writeSettings(doc) {
  writeFileSync(settingsPath(), yaml.dump(doc, { lineWidth: -1 }));
}

function readLocalProviders() {
  const doc = readSettings();
  const providers = (doc['llm-pi-ai'] && doc['llm-pi-ai'].providers) || {};
  const out = [];
  for (const id of Object.keys(providers)) {
    const p = providers[id] || {};
    const base = String(p.baseURL || '');
    if (p.api === 'openai-completions' && (base.indexOf('127.0.0.1') >= 0 || base.indexOf('localhost') >= 0)) {
      out.push({ id, displayName: p.displayName || id, baseURL: base, models: p.models || [] });
    }
  }
  return out;
}

function addLocalProvider(p) {
  const doc = readSettings();
  doc['llm-pi-ai'] = doc['llm-pi-ai'] || {};
  doc['llm-pi-ai'].providers = doc['llm-pi-ai'].providers || {};
  doc['llm-pi-ai'].providers[p.id] = {
    displayName: p.displayName || p.id,
    api: 'openai-completions',
    baseURL: p.baseURL,
    models: (p.models || []).map(function (m) { return { id: m.id, name: m.name || m.id }; }),
  };
  writeSettings(doc);
  return { ok: true };
}

function removeLocalProvider(id) {
  const doc = readSettings();
  const providers = (doc['llm-pi-ai'] && doc['llm-pi-ai'].providers) || {};
  if (providers[id]) { delete providers[id]; writeSettings(doc); return { ok: true }; }
  return { ok: false, error: '未找到该 provider' };
}

export const apply = (ctx) => {
  const disposers = [];
  const route = (kind, path, handler) => {
    disposers.push(ctx.webServer.register({ kind, path, handler }));
  };

  route('exact', '/api/dsh-plus/modlens', async (req, res) => {
    if (req.method === 'GET') sendJson(res, 200, { config: maskedModlens(readModlens()) });
    else if (req.method === 'PUT') {
      writeModlens(parseBody(await readBody(req)));
      sendJson(res, 200, { ok: true, config: maskedModlens(readModlens()) });
    } else sendJson(res, 405, { error: 'method-not-allowed' });
  });

  route('exact', '/api/dsh-plus/mneme', async (req, res) => {
    if (req.method === 'GET') sendJson(res, 200, { config: readMneme() });
    else if (req.method === 'PUT') {
      const result = writeMneme(parseBody(await readBody(req)));
      if (result.ok) sendJson(res, 200, { ok: true, config: readMneme() });
      else sendJson(res, 500, { error: result.error });
    } else sendJson(res, 405, { error: 'method-not-allowed' });
  });

  route('exact', '/api/dsh-plus/plugins', async (req, res) => {
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'method-not-allowed' });
    try {
      const url = new URL(req.url, 'http://localhost');
      const q = url.searchParams.get('q') || '';
      const limit = Number(url.searchParams.get('limit') || 12);
      const items = await searchPlugins(q, limit);
      sendJson(res, 200, { items });
    } catch (e) {
      sendJson(res, 200, { items: [], error: String(e.message || e) });
    }
  });

  route('exact', '/api/dsh-plus/plugins/install', async (req, res) => {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'method-not-allowed' });
    const body = parseBody(await readBody(req));
    const spec = (body.spec || '').trim();
    if (!spec) return sendJson(res, 400, { error: '缺少 spec' });
    const result = await runInstall(spec);
    sendJson(res, result.ok ? 200 : 500, result);
  });

  route('exact', '/api/dsh-plus/plugins/installed', (req, res) => {
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'method-not-allowed' });
    sendJson(res, 200, { items: listInstalled() });
  });

  route('exact', '/api/dsh-plus/local-models', async (req, res) => {
    if (req.method === 'GET') {
      const servers = await detectLocalServers();
      sendJson(res, 200, { servers, configured: readLocalProviders() });
    } else if (req.method === 'POST') {
      const body = parseBody(await readBody(req));
      if (!body.id || !body.baseURL) return sendJson(res, 400, { error: '缺少 id/baseURL' });
      sendJson(res, 200, addLocalProvider(body));
    } else if (req.method === 'DELETE') {
      const url = new URL(req.url, 'http://localhost');
      const id = url.searchParams.get('id') || '';
      sendJson(res, 200, removeLocalProvider(id));
    } else {
      sendJson(res, 405, { error: 'method-not-allowed' });
    }
  });

  // 重启引擎：延迟 2 秒杀掉自身进程，桌面端主进程会自动拉起新引擎并刷新窗口
  route('exact', '/api/dsh-plus/restart', (req, res) => {
    sendJson(res, 200, { ok: true });
    const pid = process.pid;
    const args = ['/c', 'timeout /t 2 /nobreak >nul & taskkill /F /PID ' + pid + ' /T'];
    try {
      const child = spawn('cmd.exe', args, { detached: true, stdio: 'ignore', windowsHide: true });
      child.unref();
    } catch (e) {
      console.error('[dsh-plus] restart spawn error:', e.message);
    }
  });

  return () => { for (const d of disposers) if (typeof d === 'function') d(); };
};
