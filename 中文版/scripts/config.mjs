#!/usr/bin/env node
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertConfig, loadState, locations, readLayer, saveConfig, ensurePrivateProjectDirectory, suggestConfig, setValue } from './config-core.mjs';

const help = `UniYourApp configuration (Node.js 24)

  ui        Open the local visual editor
  init      Create a missing configuration; inherit known project color tokens
  validate  Validate both selected layers without modifying them
  resolve   Print effective values and their personal/project origins
  set       Set or remove one preference
  import    Validate and save a supplied JSON file
  export    Print the selected layer as JSON

Options:
  --project <directory>    Select a project (never inferred from the skill folder)
  --scope personal|project Configuration to edit; default personal
  --user-dir <directory>   Override the private user directory (useful for QA)
  --file <file.json>       Import file
  --key <dotted.key> --value <JSON-or-text>  Set a preference
  --unset                 Remove --key and restore inheritance
  --lang zh|en            Visual editor language
  --port <number>         Local editor port; default random
  --no-open               Print the local URL without opening a browser

Configuration is private by default. No installation, publication, or approval
permission can be granted through preferences. Existing files are never reset by init.
`;

export async function run(argv = process.argv.slice(2)) {
  const command = argv[0] || 'help', options = {};
  const known = new Set(['project', 'scope', 'user-dir', 'file', 'key', 'value', 'lang', 'port', 'unset', 'no-open']);
  for (let i = 1; i < argv.length; i++) {
    if (!argv[i].startsWith('--') || !known.has(argv[i].slice(2))) throw new Error(`Unknown option: ${argv[i]}`);
    const key = argv[i].slice(2);
    if (['unset', 'no-open'].includes(key)) options[key] = true;
    else { if (argv[i + 1] === undefined || argv[i + 1].startsWith('--')) throw new Error(`Missing value for --${key}`); options[key] = argv[++i]; }
  }
  if (command === 'help' || command === '--help') { console.log(help); return; }
  const settings = { project: options.project ? await fs.realpath(options.project) : undefined, userDir: options['user-dir'] };
  if (settings.project && !(await fs.stat(settings.project)).isDirectory()) throw new Error('Project must be a directory.');
  const scope = options.scope || 'personal';
  if (!['personal', 'project'].includes(scope)) throw new Error('Scope must be personal or project.');
  if (command === 'ui') {
    if (options.lang && !['zh', 'en'].includes(options.lang)) throw new Error('Language must be zh or en.');
    const port = options.port === undefined ? 0 : Number(options.port);
    if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Port must be an integer between 0 and 65535.');
    const { startServer } = await import('./config-server.mjs');
    const running = await startServer({ ...settings, port, lang: options.lang });
    console.log(`Local: ${running.url}`);
    if (!options['no-open']) {
      const executable = process.platform === 'win32' ? 'rundll32.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
      const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', running.url] : [running.url];
      const child = spawn(executable, args, { detached: true, stdio: 'ignore', windowsHide: true });
      child.on('error', () => console.error('Open the Local URL in your browser.')); child.unref();
    }
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => running.close().then(() => process.exit(0)));
    return running;
  }
  const state = await loadState(settings);
  if (command === 'validate') {
    const errors = Object.entries(state.layers).flatMap(([layer, value]) => value.errors.map(error => ({ layer, ...error })));
    if (errors.length) { console.error(JSON.stringify(errors, null, 2)); process.exitCode = 1; }
    else console.log('Configuration is valid.');
    return;
  }
  if (command === 'resolve') {
    if (Object.values(state.layers).some(layer => layer.errors.length)) throw new Error('Repair invalid configuration before resolving effective values.');
    console.log(JSON.stringify({ effective: state.effective, sources: state.sources, files: state.paths, projectRoot: state.projectRoot }, null, 2)); return;
  }
  const file = locations(settings)[scope];
  if (!file) throw new Error('Select a project with --project.');
  const previous = await readLayer(file);
  if (command === 'export') { if (previous.errors.length) throw new Error('Repair invalid configuration before exporting.'); console.log(JSON.stringify(previous.data, null, 2)); return; }
  let data;
  if (command === 'init') {
    if (previous.exists) { console.log('Configuration already exists; left unchanged.'); return; }
    const suggestion = await suggestConfig(scope === 'project' ? settings.project : undefined);
    data = suggestion.data;
    if (scope === 'project') console.log(JSON.stringify({ recognized: suggestion.evidence, notes: suggestion.notes }, null, 2));
  } else if (command === 'import') {
    if (!options.file) throw new Error('Supply --file.');
    data = JSON.parse((await fs.readFile(options.file, 'utf8')).replace(/^\uFEFF/, ''));
  } else if (command === 'set') {
    if (previous.errors.length) throw new Error('Repair invalid configuration with import before changing a field.');
    if (!options.key || (!options.unset && options.value === undefined)) throw new Error('Supply --key and --value, or --key and --unset.');
    let value = options.value; if (!options.unset) { try { value = JSON.parse(options.value); } catch { /* Plain text is a valid string value. */ } }
    data = setValue(previous.data, options.key, value, options.unset);
  } else throw new Error(`Unknown command: ${command}`);
  assertConfig(data);
  if (scope === 'project') await ensurePrivateProjectDirectory(settings.project, file);
  await saveConfig(file, data, previous.revision);
  console.log(`Saved ${scope} configuration: ${file}`);
}
if (process.argv[1] && await fs.realpath(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch(error => { console.error(error.message); if (error.details?.length) console.error(JSON.stringify(error.details, null, 2)); process.exitCode = 1; });
}
