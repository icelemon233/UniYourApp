import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { runtimeRoot, schema, ConfigError, clone, digest, assertConfig, loadState, locations, readLayer, saveConfig, ensurePrivateProjectDirectory, suggestConfig } from './config-core.mjs';

const maxBody = 8 * 1024 * 1024;
const roles = new Set(Object.keys(schema.properties.assets.properties));
function imageType(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return ['png', 'image/png'];
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return ['jpg', 'image/jpeg'];
  if (['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString())) return ['gif', 'image/gif'];
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return ['webp', 'image/webp'];
  throw new ConfigError('Use a PNG, JPEG, GIF, or WebP image.', 415);
}
async function bodyOf(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > maxBody) throw new ConfigError('File is too large (8 MiB maximum).', 413); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
async function jsonBody(req) {
  if (!String(req.headers['content-type']).startsWith('application/json')) throw new ConfigError('JSON request required.', 415);
  try { return JSON.parse((await bodyOf(req)).toString('utf8')); } catch (error) { if (error instanceof ConfigError) throw error; throw new ConfigError('Invalid JSON request.'); }
}
function selectedScope(value, options) {
  if (!['personal', 'project'].includes(value)) throw new ConfigError('Invalid configuration layer.');
  if (value === 'project' && !options.project) throw new ConfigError('Select a project first.');
  return value;
}
export async function startServer(initial = {}) {
  const options = { userDir: initial.userDir, project: initial.project ? await fs.realpath(initial.project) : undefined };
  if (options.project && !(await fs.stat(options.project)).isDirectory()) throw new ConfigError('Project must be a directory.');
  const token = crypto.randomBytes(32).toString('hex');
  const drafts = new Map();
  const webRoot = path.join(runtimeRoot, '..', 'web');
  const assets = new Map([
    ['/', ['index.html', 'text/html; charset=utf-8']],
    ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
    ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
    ['/locales.js', ['locales.js', 'text/javascript; charset=utf-8']],
  ]);
  let origin, selectionSequence = 0;
  const server = http.createServer(async (req, res) => {
    const reply = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    try {
      if (req.headers.host !== new URL(origin).host) throw new ConfigError('Unexpected host.', 403);
      if (req.headers.origin && req.headers.origin !== origin) throw new ConfigError('Cross-origin access is not allowed.', 403);
      if (req.headers['sec-fetch-site'] && !['none', 'same-origin'].includes(req.headers['sec-fetch-site'])) throw new ConfigError('Cross-site access is not allowed.', 403);
      const url = new URL(req.url, origin);
      const context = { ...options };
      if (req.method === 'GET' && assets.has(url.pathname)) {
        const [file, type] = assets.get(url.pathname);
        let body = await fs.readFile(path.join(webRoot, file));
        if (url.pathname === '/') body = Buffer.from(body.toString('utf8').replace('__SESSION_TOKEN__', token));
        res.writeHead(200, { 'Content-Type': type }); res.end(body); return;
      }
      if (req.method === 'GET' && url.pathname === '/values.mjs') {
        res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' }); res.end(await fs.readFile(path.join(runtimeRoot, 'config-values.mjs'))); return;
      }
      const provided = String(req.headers['x-config-session'] || '');
      if (provided.length !== token.length || !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(token))) throw new ConfigError('Session token required.', 403);
      if (req.method === 'GET' && url.pathname === '/api/state') { reply(200, { schema, ...await loadState(context) }); return; }
      if (req.method === 'GET' && url.pathname === '/api/suggest') { reply(200, await suggestConfig(context.project)); return; }
      if (req.method === 'POST' && url.pathname === '/api/project') {
        const ticket = ++selectionSequence;
        const request = await jsonBody(req);
        if (typeof request.path !== 'string' || !path.isAbsolute(request.path)) throw new ConfigError('Enter an absolute project directory.');
        const project = await fs.realpath(request.path);
        if (!(await fs.stat(project)).isDirectory()) throw new ConfigError('Project must be a directory.');
        const candidate = { ...context, project };
        const loaded = await loadState(candidate);
        if (ticket !== selectionSequence) throw new ConfigError('Project selection was superseded.', 409, [], 'conflict');
        options.project = project;
        reply(200, { schema, ...loaded }); return;
      }
      if (req.method === 'POST' && url.pathname === '/api/assets') {
        const scope = selectedScope(url.searchParams.get('scope'), context);
        const role = url.searchParams.get('role'); if (!roles.has(role)) throw new ConfigError('Unknown asset role.');
        const bytes = await bodyOf(req), [ext, mime] = imageType(bytes), id = `${digest(bytes).slice(0, 16)}-${crypto.randomUUID()}.${ext}`;
        if (drafts.size >= 12 && !drafts.has(id)) throw new ConfigError('Too many unsaved images. Save or restart the editor.', 413);
        drafts.set(id, { bytes, mime, scope, project: scope === 'project' ? context.project : null });
        reply(200, { path: `draft:${id}` }); return;
      }
      if (req.method === 'POST' && url.pathname === '/api/drafts/discard') {
        const request = await jsonBody(req);
        if (!Array.isArray(request.ids) || request.ids.length > 12 || request.ids.some(id => typeof id !== 'string' || !/^[a-f0-9-]+\.(png|jpg|gif|webp)$/.test(id))) throw new ConfigError('Invalid draft identifiers.');
        for (const id of request.ids) drafts.delete(id);
        reply(200, { discarded: request.ids.length }); return;
      }
      if (req.method === 'GET' && url.pathname === '/api/asset') {
        const draftId = url.searchParams.get('draft');
        let bytes, mime;
        if (draftId) {
          const draft = drafts.get(draftId); if (!draft) throw new ConfigError('Draft image is unavailable.', 404);
          bytes = draft.bytes; mime = draft.mime;
        } else {
          const scope = selectedScope(url.searchParams.get('scope'), context);
          const role = url.searchParams.get('role'); if (!roles.has(role)) throw new ConfigError('Unknown asset role.');
          const layer = await readLayer(locations(context)[scope]);
          const assetPath = layer.data.assets?.[role]?.path;
          if (!assetPath) throw new ConfigError('No image configured.', 404);
          const resolved = path.resolve(path.dirname(layer.file), assetPath);
          const stat = await fs.stat(resolved); if (!stat.isFile() || stat.size > maxBody) throw new ConfigError('Image is unavailable or too large.', 415);
          bytes = await fs.readFile(resolved); [, mime] = imageType(bytes);
        }
        res.writeHead(200, { 'Content-Type': mime }); res.end(bytes); return;
      }
      if (req.method === 'POST' && url.pathname === '/api/preview-asset') {
        const request = await jsonBody(req), scope = selectedScope(request.scope, context);
        if (!roles.has(request.role) || typeof request.path !== 'string' || !request.path || request.path.length > 2048) throw new ConfigError('Invalid local asset reference.');
        if (/^[\\/]{2}/.test(request.path) || request.path.includes('\0') || (/^[a-z][a-z0-9+.-]*:/i.test(request.path) && !/^[a-z]:[\\/]/i.test(request.path))) throw new ConfigError('Use a local filesystem image path.');
        const resolved = path.resolve(path.dirname(locations(context)[scope]), request.path);
        const stat = await fs.stat(resolved); if (!stat.isFile() || stat.size > maxBody) throw new ConfigError('Image is unavailable or too large.', 415);
        const bytes = await fs.readFile(resolved), [, mime] = imageType(bytes);
        res.writeHead(200, { 'Content-Type': mime }); res.end(bytes); return;
      }
      if (req.method === 'POST' && url.pathname === '/api/save') {
        const request = await jsonBody(req), scope = selectedScope(request.scope, context);
        if (scope === 'project' && request.projectRoot !== context.project) throw new ConfigError('Selected project changed. Reload before saving.', 409, [], 'conflict');
        const data = clone(assertConfig(request.data, { allowDraftAssets: true }));
        const file = locations(context)[scope];
        if ((await readLayer(file)).revision !== request.expectedRevision) throw new ConfigError('Configuration changed on disk. Reload before saving.', 409, [], 'conflict');
        const consumed = [];
        for (const role of roles) {
          const value = data.assets?.[role]?.path;
          if (!value?.startsWith('draft:')) continue;
          const item = drafts.get(value.slice(6));
          if (!item || item.scope !== scope || (scope === 'project' && item.project !== context.project)) throw new ConfigError('Draft image belongs to another configuration.');
        }
        if (scope === 'project') await ensurePrivateProjectDirectory(context.project);
        for (const role of roles) {
          const value = data.assets?.[role]?.path;
          if (!value?.startsWith('draft:')) continue;
          const id = value.slice(6), draft = drafts.get(id);
          if (!draft || draft.scope !== scope || (scope === 'project' && draft.project !== context.project)) throw new ConfigError('Draft image belongs to another configuration.');
          const assetDir = path.join(path.dirname(file), 'assets'); await fs.mkdir(assetDir, { recursive: true, mode: 0o700 });
          if ((await fs.lstat(assetDir)).isSymbolicLink()) throw new ConfigError('Asset directory cannot be a link.');
          await fs.writeFile(path.join(assetDir, id), draft.bytes, { mode: 0o600 });
          data.assets[role].path = `assets/${id}`; consumed.push(id);
        }
        await saveConfig(file, data, request.expectedRevision);
        for (const id of consumed) drafts.delete(id);
        reply(200, { schema, ...await loadState(context) }); return;
      }
      throw new ConfigError('Not found.', 404);
    } catch (error) {
      if (!res.headersSent) reply(error.status || 500, { error: error instanceof ConfigError ? error.message : 'Local operation failed.', details: error.details || [], code: error instanceof ConfigError ? error.code : 'operation' });
      else res.end();
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(initial.port || 0, '127.0.0.1', resolve); });
  origin = `http://127.0.0.1:${server.address().port}`;
  return { server, url: origin + (initial.lang ? `/?lang=${encodeURIComponent(initial.lang)}` : '/'), close: () => new Promise((resolve, reject) => { server.closeIdleConnections(); server.close(error => error ? reject(error) : resolve()); }) };
}
