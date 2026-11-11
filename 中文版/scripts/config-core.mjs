import fs from 'node:fs/promises';
import { lstatSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createConfigTools, ConfigError, clone } from './config-values.mjs';
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export const runtimeRoot = path.dirname(fileURLToPath(import.meta.url));
export const schemaPath = path.join(runtimeRoot, '..', 'config.schema.json');
export const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'));
export { ConfigError, clone };
export const digest = value => crypto.createHash('sha256').update(value).digest('hex');
export const { validateConfig, assertConfig, resolveConfig, changes, setValue } = createConfigTools(schema);

function configurationDirectory(base, name, legacyName, filename) {
  const current = path.join(base, name);
  const legacy = path.join(base, legacyName);
  for (const directory of [current, legacy]) {
    try {
      lstatSync(path.join(directory, filename));
      return directory;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return current;
}
export function personalDirectory({ userDir, env = process.env, platform = process.platform } = {}) {
  if (userDir) return path.resolve(userDir);
  const base = platform === 'win32' ? env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming') : env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return configurationDirectory(base, 'uni-your-app', 'uni-elegant-engineering', 'config.json');
}
export function locations({ userDir, project, env, platform } = {}) {
  const projectDirectory = project
    ? configurationDirectory(path.resolve(project), '.uni-your-app', '.uni-elegant-engineering', 'config.local.json')
    : null;
  return {
    personal: path.join(personalDirectory({ userDir, env, platform }), 'config.json'),
    project: projectDirectory ? path.join(projectDirectory, 'config.local.json') : null,
  };
}
async function regularFile(file) {
  try { const stat = await fs.lstat(file); if (!stat.isFile() || stat.isSymbolicLink()) throw new ConfigError('Configuration must be a regular file.'); return stat; }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
export async function readLayer(file) {
  if (!file) return { file: null, revision: 'missing', data: { schemaVersion: 1 }, exists: false, errors: [] };
  if (!await regularFile(file)) return { file, revision: 'missing', data: { schemaVersion: 1 }, exists: false, errors: [] };
  const bytes = await fs.readFile(file);
  const raw = bytes.toString('utf8').replace(/^\uFEFF/, '');
  const revision = digest(bytes);
  try {
    const data = JSON.parse(raw);
    const errors = validateConfig(data);
    return { file, revision, data: errors.length ? { schemaVersion: 1 } : data, raw, exists: true, errors };
  } catch { return { file, revision, data: { schemaVersion: 1 }, raw, exists: true, errors: [{ path: '', code: 'json' }] }; }
}
export async function loadState(options = {}) {
  const paths = locations(options);
  const [personal, project] = await Promise.all([readLayer(paths.personal), readLayer(paths.project)]);
  return { paths, projectRoot: options.project ? path.resolve(options.project) : null, layers: { personal, project }, ...resolveConfig(personal.data, project.data) };
}
export async function ensurePrivateProjectDirectory(project, file = locations({ project }).project) {
  const root = await fs.realpath(project);
  const name = path.basename(path.dirname(file));
  const dir = path.join(root, name);
  if (!['.uni-your-app', '.uni-elegant-engineering'].includes(name)
      || path.resolve(file) !== path.join(dir, 'config.local.json')) {
    throw new ConfigError('Project configuration must use its private configuration directory.');
  }
  try { if ((await fs.lstat(dir)).isSymbolicLink()) throw new ConfigError('Project configuration directory cannot be a link.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  let exclude, exclusion = `/${name}/`;
  const gitOptions = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
  let gitRoot;
  try { gitRoot = execFileSync('git', ['-C', root, 'rev-parse', '--show-toplevel'], gitOptions).trim(); }
  catch { /* A project without Git receives a local ignore file. */ }
  if (gitRoot) {
    exclude = execFileSync('git', ['-C', root, 'rev-parse', '--path-format=absolute', '--git-path', 'info/exclude'], gitOptions).trim();
    const prefix = path.relative(gitRoot, root).split(path.sep).join('/');
    const escaped = prefix.replace(/([\\*?\[\]#! ])/g, '\\$1');
    exclusion = `/${escaped ? escaped + '/' : ''}${name}/`;
    const tracked = execFileSync('git', ['-C', root, 'ls-files', '--', name], gitOptions).trim();
    if (tracked) throw new ConfigError('Private configuration is already tracked by Git. Move it out of tracked content before saving.', 409, [], 'tracked');
  } else exclude = path.join(root, '.gitignore');
  let existing = ''; try { existing = await fs.readFile(exclude, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!existing.split(/\r?\n/).some(line => line.trim() === exclusion)) {
    await fs.mkdir(path.dirname(exclude), { recursive: true });
    await fs.appendFile(exclude, `${existing && !existing.endsWith('\n') ? '\n' : ''}${exclusion}\n`, { mode: 0o600 });
  }
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  if (gitRoot) {
    const relative = path.relative(gitRoot, dir).split(path.sep).join('/');
    for (const target of [relative + '/', relative + '/config.local.json']) {
      try { execFileSync('git', ['-C', gitRoot, 'check-ignore', '--no-index', '--quiet', '--', target], gitOptions); }
      catch { throw new ConfigError(`Project ignore rules expose private configuration. Add /${name}/ to the project .gitignore before saving.`, 409, [], 'notIgnored'); }
    }
  }
  return dir;
}
export async function saveConfig(file, data, expectedRevision) {
  assertConfig(data);
  if (!file) throw new ConfigError('Select a project first.');
  if (typeof expectedRevision !== 'string') throw new ConfigError('Expected file revision is required.');
  const dir = path.dirname(file);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  if ((await fs.lstat(dir)).isSymbolicLink()) throw new ConfigError('Configuration directory cannot be a link.');
  const lockFile = path.join(dir, '.config-write.lock');
  let lock;
  try { lock = await fs.open(lockFile, 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') throw new ConfigError('Another writer holds this configuration. Inspect a stale lock before removing it.', 409, [], 'locked'); throw error; }
  const temp = path.join(dir, `.config-${crypto.randomUUID()}.tmp`);
  try {
    const previous = await readLayer(file);
    if (previous.revision !== expectedRevision) throw new ConfigError('Configuration changed on disk. Reload before saving.', 409, [], 'conflict');
    if (previous.exists) {
      const backups = path.join(dir, 'backups'); await fs.mkdir(backups, { recursive: true, mode: 0o700 });
      if ((await fs.lstat(backups)).isSymbolicLink()) throw new ConfigError('Backup directory cannot be a link.');
      await fs.copyFile(file, path.join(backups, `${new Date().toISOString().replace(/[:.]/g, '-')}-${previous.revision.slice(0, 12)}-${crypto.randomUUID().slice(0, 8)}.json`));
    }
    const handle = await fs.open(temp, 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify(data, null, 2) + '\n', 'utf8'); await handle.sync(); } finally { await handle.close(); }
    await fs.rename(temp, file);
    return await readLayer(file);
  } finally {
    await lock.close(); await fs.unlink(lockFile).catch(() => {}); await fs.unlink(temp).catch(() => {});
  }
}

export async function suggestConfig(project) {
  const data = { schemaVersion: 1 }, evidence = [], notes = [], conflicts = new Set();
  if (!project) return { data, evidence, notes };
  const root = await fs.realpath(project);
  // Only explicit semantic keys in known project-owned token files are considered.
  const candidates = ['design-tokens.json', 'tokens.json', 'config/design-tokens.json', 'config/tokens.json'];
  for (const relative of candidates) {
    const file = path.join(root, relative);
    let source;
    try {
      const stat = await fs.lstat(file); if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 262144) continue;
      source = JSON.parse((await fs.readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
    } catch (error) { if (error.code !== 'ENOENT') notes.push({ file: relative, code: 'unreadableTokens' }); continue; }
    if (!plain(source)) { notes.push({ file: relative, code: 'invalidTokens' }); continue; }
    const sourceColors = source.colors || source.color;
    if (!plain(sourceColors)) continue;
    for (const role of Object.keys(schema.properties.appearance.properties.colors.properties)) {
      if (conflicts.has(role)) continue;
      const value = typeof sourceColors[role] === 'string' ? sourceColors[role] : sourceColors[role]?.$value;
      if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) continue;
      data.appearance ||= {}; data.appearance.colors ||= {};
      if (data.appearance.colors[role] && data.appearance.colors[role] !== value) {
        notes.push({ file: relative, path: `appearance.colors.${role}`, code: 'conflictingToken' });
        delete data.appearance.colors[role]; conflicts.add(role); continue;
      }
      data.appearance.colors[role] = value; evidence.push({ path: `appearance.colors.${role}`, file: relative });
    }
  }
  return { data: assertConfig(data), evidence: evidence.filter(item => !conflicts.has(item.path.split('.').at(-1))), notes };
}
