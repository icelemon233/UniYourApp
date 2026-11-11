import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import http from 'node:http';
import { validateConfig, resolveConfig, setValue, readLayer, saveConfig, loadState, ensurePrivateProjectDirectory, suggestConfig } from './config-core.mjs';
import { startServer } from './config-server.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'work', 'configuration-tests');
await fs.mkdir(base, { recursive: true });
async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(base, 'case-'));
  const userDir = path.join(dir, 'user'), project = path.join(dir, 'project');
  await fs.mkdir(project, { recursive: true });
  execFileSync('git', ['init', '-q', project]);
  t.after(async () => {
    const resolved = await fs.realpath(dir), parent = await fs.realpath(base);
    assert.equal(path.dirname(resolved), parent);
    await fs.rm(resolved, { recursive: true, force: true });
  });
  return { dir, userDir, project };
}
const empty = () => ({ schemaVersion: 1 });

test('preferences remain optional and cannot introduce execution or approval rules', () => {
  assert.deepEqual(validateConfig(empty()), []);
  for (const key of ['commands', 'instructions', 'autoApprove', 'publishToken', '__proto__']) {
    const value = JSON.parse(`{"schemaVersion":1,"${key}":true}`);
    assert.ok(validateConfig(value).length);
  }
  assert.ok(validateConfig({ schemaVersion: 1, appearance: { colors: { accent: 'red' } } }).length);
  assert.ok(validateConfig({ schemaVersion: 1, platforms: { web: { touchTarget: 20 } } }).length);
});
test('project overrides merge by field and removing an override restores personal values', () => {
  const personal = { schemaVersion: 1, appearance: { colors: { accent: '#345678', text: '#123456' } }, verification: { themes: ['light', 'dark'] } };
  const project = { schemaVersion: 1, appearance: { colors: { accent: '#567890' } }, verification: { themes: ['dark'] } };
  const result = resolveConfig(personal, project);
  assert.equal(result.effective.appearance.colors.text, '#123456');
  assert.equal(result.effective.appearance.colors.accent, '#567890');
  assert.deepEqual(result.effective.verification.themes, ['dark']);
  assert.equal(result.sources['appearance.colors.accent'], 'project');
  assert.equal(result.sources['appearance.colors.text'], 'personal');
  const reset = setValue(project, 'appearance.colors.accent', undefined, true);
  assert.equal(resolveConfig(personal, reset).effective.appearance.colors.accent, '#345678');
  const tokens = setValue(empty(), 'layout.tokens.window.toolbar.gap', 13);
  assert.equal(tokens.layout.tokens['window.toolbar.gap'], 13);
  assert.deepEqual(validateConfig(tokens), []);
});
test('saves retain backups and reject stale revisions without overwriting user changes', async t => {
  const { userDir } = await fixture(t), file = path.join(userDir, 'config.json');
  const first = await saveConfig(file, empty(), 'missing');
  const second = await saveConfig(file, { schemaVersion: 1, appearance: { theme: 'dark' } }, first.revision);
  await assert.rejects(saveConfig(file, { schemaVersion: 1, appearance: { theme: 'light' } }, first.revision), error => error.status === 409);
  assert.equal((await readLayer(file)).revision, second.revision);
  const backups = await fs.readdir(path.join(userDir, 'backups'));
  assert.equal(backups.length, 1);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(userDir, 'backups', backups[0]), 'utf8')), empty());
});
test('invalid existing JSON is visible and can be repaired while preserving its original bytes', async t => {
  const { userDir } = await fixture(t), file = path.join(userDir, 'config.json');
  await fs.mkdir(userDir); await fs.writeFile(file, '{broken');
  const invalid = await readLayer(file); assert.equal(invalid.errors[0].code, 'json');
  await saveConfig(file, empty(), invalid.revision);
  const backups = await fs.readdir(path.join(userDir, 'backups'));
  assert.equal(await fs.readFile(path.join(userDir, 'backups', backups[0]), 'utf8'), '{broken');
});
test('project preferences are excluded locally, including projects nested within a Git repository', async t => {
  const { project } = await fixture(t), nested = path.join(project, 'packages', 'sample');
  await fs.mkdir(nested, { recursive: true });
  await ensurePrivateProjectDirectory(nested);
  await saveConfig(path.join(nested, '.uni-elegant-engineering', 'config.local.json'), empty(), 'missing');
  const result = execFileSync('git', ['-C', project, 'check-ignore', 'packages/sample/.uni-elegant-engineering/config.local.json'], { encoding: 'utf8' });
  assert.match(result, /config\.local\.json/);
  assert.equal((await fs.readdir(project)).includes('.gitignore'), false);
});
test('already tracked private project values are not modified by configuration commands', async t => {
  const { project } = await fixture(t), dir = path.join(project, '.uni-elegant-engineering');
  await fs.mkdir(dir); await fs.writeFile(path.join(dir, 'config.local.json'), JSON.stringify(empty()));
  execFileSync('git', ['-C', project, 'add', '.uni-elegant-engineering/config.local.json']);
  await assert.rejects(ensurePrivateProjectDirectory(project), error => error.status === 409);
});
test('Git-special project names remain excluded and negated privacy rules fail before writing', async t => {
  const { project } = await fixture(t), nested = path.join(project, 'packages', '[app]');
  await fs.mkdir(nested, { recursive: true });
  await ensurePrivateProjectDirectory(nested);
  const privateFile = path.join(nested, '.uni-elegant-engineering', 'config.local.json');
  await saveConfig(privateFile, empty(), 'missing');
  assert.equal(execFileSync('git', ['-C', project, 'ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' }).trim(), '');
  await fs.writeFile(path.join(project, '.gitignore'), '!.uni-elegant-engineering/\n');
  await assert.rejects(ensurePrivateProjectDirectory(project), error => error.code === 'notIgnored');
  assert.equal((await readLayer(path.join(project, '.uni-elegant-engineering', 'config.local.json'))).exists, false);
});
test('automatic recognition uses explicit tokens and does not choose conflicting project values', async t => {
  const { project } = await fixture(t);
  await fs.writeFile(path.join(project, 'tokens.json'), JSON.stringify({ colors: { accent: '#345678', text: { $value: '#123456' }, unrecognizedBrand: '#abcdef' } }));
  let result = await suggestConfig(project);
  assert.deepEqual(result.data.appearance.colors, { accent: '#345678', text: '#123456' });
  await fs.mkdir(path.join(project, 'config'));
  await fs.writeFile(path.join(project, 'config', 'tokens.json'), JSON.stringify({ colors: { accent: '#abcdef' } }));
  result = await suggestConfig(project);
  assert.equal(result.data.appearance.colors.accent, undefined);
  assert.ok(result.notes.some(note => note.code === 'conflictingToken'));
  assert.ok(!result.evidence.some(item => item.path.endsWith('.accent')));
});
test('unsupported token-file roots produce notes rather than aborting initialization', async t => {
  const { project } = await fixture(t);
  for (const value of [null, [], 'tokens']) {
    await fs.writeFile(path.join(project, 'tokens.json'), JSON.stringify(value));
    const result = await suggestConfig(project);
    assert.deepEqual(result.data, empty());
    assert.ok(result.notes.some(note => note.code === 'invalidTokens'));
  }
});
test('CLI init is repeatable without resetting existing values', async t => {
  const settings = await fixture(t), cli = path.join(root, 'scripts/config.mjs');
  const run = args => spawnSync(process.execPath, [cli, ...args, '--user-dir', settings.userDir], { encoding: 'utf8' });
  assert.equal(run(['init']).status, 0);
  assert.equal(run(['set', '--key', 'appearance.theme', '--value', 'dark']).status, 0);
  assert.equal(run(['init']).status, 0);
  assert.equal((await loadState(settings)).layers.personal.data.appearance.theme, 'dark');
  assert.equal(run(['set', '--key', 'autoApprove', '--value', 'true']).status, 1);
});

async function browserFixture(t) {
  const settings = await fixture(t), running = await startServer(settings);
  t.after(() => running.close());
  const html = await (await fetch(running.url)).text();
  const token = html.match(/name="config-session" content="([a-f0-9]+)"/)[1];
  const request = (route, options = {}) => fetch(new URL(route, running.url), { ...options, headers: { 'X-Config-Session': token, ...(options.body && typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  return { ...settings, running, request, token };
}
test('local server rejects unauthorized, cross-origin, and arbitrary file requests', async t => {
  const { running, request, token } = await browserFixture(t);
  assert.equal((await fetch(new URL('/api/state', running.url))).status, 403);
  assert.equal((await request('/api/state', { headers: { Origin: 'https://example.org' } })).status, 403);
  const wrongHost = await new Promise((resolve, reject) => {
    const req = http.get(new URL('/api/state', running.url), { headers: { Host: 'example.org', 'X-Config-Session': token } }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
    req.on('error', reject);
  });
  assert.equal(wrongHost, 403);
  assert.equal((await request('/api/state', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await request('/config.json')).status, 404);
  const state = await (await request('/api/state')).json(); assert.deepEqual(state.effective, empty());
});
test('visual editor saves only the selected layer and rejects stale drafts', async t => {
  const { request, userDir, project } = await browserFixture(t);
  const data = { schemaVersion: 1, appearance: { theme: 'dark' } };
  let result = await request('/api/save', { method: 'POST', body: JSON.stringify({ scope: 'personal', data, expectedRevision: 'missing' }) });
  assert.equal(result.status, 200); await result.json();
  assert.equal((await readLayer(path.join(userDir, 'config.json'))).data.appearance.theme, 'dark');
  assert.equal((await readLayer(path.join(project, '.uni-elegant-engineering', 'config.local.json'))).exists, false);
  result = await request('/api/save', { method: 'POST', body: JSON.stringify({ scope: 'personal', data: empty(), expectedRevision: 'missing' }) });
  assert.equal(result.status, 409);
});
test('a failed project selection keeps the previously selected project', async t => {
  const { request, dir, project } = await browserFixture(t), rejected = path.join(dir, 'rejected');
  await fs.mkdir(path.join(rejected, '.uni-elegant-engineering', 'config.local.json'), { recursive: true });
  const response = await request('/api/project', { method: 'POST', body: JSON.stringify({ path: rejected }) });
  assert.notEqual(response.status, 200); await response.json();
  const state = await (await request('/api/state')).json();
  assert.equal(state.projectRoot, await fs.realpath(project));
});
test('a concurrent project switch cannot redirect an in-flight save or its Git protection', async t => {
  const { request, project, dir } = await browserFixture(t), second = path.join(dir, 'second');
  await fs.mkdir(second); execFileSync('git', ['init', '-q', second]);
  const file = path.join(project, '.uni-elegant-engineering', 'config.local.json');
  await fs.mkdir(path.dirname(file)); await fs.writeFile(file, JSON.stringify(empty()));
  const revision = (await readLayer(file)).revision;
  const originalRead = fs.readFile;
  let signal, release, intercepted = false;
  const paused = new Promise(resolve => { signal = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  fs.readFile = async (...args) => {
    if (!intercepted && path.resolve(String(args[0])) === file) { intercepted = true; signal(); await gate; }
    return originalRead(...args);
  };
  let pending;
  try {
    pending = request('/api/save', { method: 'POST', body: JSON.stringify({ scope: 'project', projectRoot: await fs.realpath(project), expectedRevision: revision, data: { schemaVersion: 1, appearance: { theme: 'dark' } } }) });
    let timeout; try { await Promise.race([paused, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Save did not reach the disk-read barrier.')), 3000); })]); } finally { clearTimeout(timeout); }
    const selected = await request('/api/project', { method: 'POST', body: JSON.stringify({ path: second }) }); assert.equal(selected.status, 200); await selected.json();
    release();
    const saved = await pending; assert.equal(saved.status, 200); const result = await saved.json();
    assert.equal(result.projectRoot, await fs.realpath(project));
    assert.equal((await readLayer(file)).data.appearance.theme, 'dark');
    assert.equal(execFileSync('git', ['-C', project, 'ls-files', '--others', '--exclude-standard', '--', '.uni-elegant-engineering'], { encoding: 'utf8' }).trim(), '');
    assert.equal((await readLayer(path.join(second, '.uni-elegant-engineering', 'config.local.json'))).exists, false);
  } finally { release(); fs.readFile = originalRead; if (pending) await pending.catch(() => {}); }
});
test('images stay in memory until save, then enter private asset storage', async t => {
  const { request, userDir, dir } = await browserFixture(t);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8WQAAAAASUVORK5CYII=', 'base64');
  const uploaded = await (await request('/api/assets?scope=personal&role=logo', { method: 'POST', body: png })).json();
  assert.match(uploaded.path, /^draft:/);
  assert.equal((await readLayer(path.join(userDir, 'config.json'))).exists, false);
  const saved = await request('/api/save', { method: 'POST', body: JSON.stringify({ scope: 'personal', expectedRevision: 'missing', data: { schemaVersion: 1, assets: { logo: { path: uploaded.path } } } }) });
  assert.equal(saved.status, 200); const state = await saved.json();
  assert.match(state.layers.personal.data.assets.logo.path, /^assets\//);
  const image = await request('/api/preview-asset', { method: 'POST', body: JSON.stringify({ scope: 'personal', role: 'logo', path: state.layers.personal.data.assets.logo.path }) });
  assert.equal(image.status, 200); assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
  const textFile = path.join(dir, 'not-an-image.txt'); await fs.writeFile(textFile, 'private text fixture');
  assert.equal((await request('/api/preview-asset', { method: 'POST', body: JSON.stringify({ scope: 'personal', role: 'logo', path: textFile }) })).status, 415);
  assert.equal((await request('/api/preview-asset', { method: 'POST', body: JSON.stringify({ scope: 'personal', role: 'logo', path: 'https://example.org/image.png' }) })).status, 400);
});
test('saved images release capacity and identical uploads keep separate draft identities', async t => {
  const { request, project } = await browserFixture(t);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8WQAAAAASUVORK5CYII=', 'base64');
  let revision = 'missing';
  for (let i = 0; i < 14; i++) {
    const upload = await request('/api/assets?scope=personal&role=logo', { method: 'POST', body: Buffer.concat([png, Buffer.from([i])]) });
    assert.equal(upload.status, 200); const draft = await upload.json();
    const saved = await request('/api/save', { method: 'POST', body: JSON.stringify({ scope: 'personal', expectedRevision: revision, data: { schemaVersion: 1, assets: { logo: { path: draft.path } } } }) });
    assert.equal(saved.status, 200); revision = (await saved.json()).layers.personal.revision;
  }
  const personal = await (await request('/api/assets?scope=personal&role=logo', { method: 'POST', body: png })).json();
  const scoped = await (await request('/api/assets?scope=project&role=logo', { method: 'POST', body: png })).json();
  assert.notEqual(personal.path, scoped.path);
  const discard = await request('/api/drafts/discard', { method: 'POST', body: JSON.stringify({ ids: [personal.path.slice(6)] }) }); assert.equal(discard.status, 200); await discard.json();
  const saved = await request('/api/save', { method: 'POST', body: JSON.stringify({ scope: 'project', projectRoot: await fs.realpath(project), expectedRevision: 'missing', data: { schemaVersion: 1, assets: { logo: { path: scoped.path } } } }) });
  assert.equal(saved.status, 200); await saved.json();
});
