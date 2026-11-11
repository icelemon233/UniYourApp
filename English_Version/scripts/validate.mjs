import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import {
  commonFiles,
  editionNames,
  findRepositoryRoot,
  skillName,
} from './sync-versions.mjs';

const referenceFiles = ['engineering', 'ui', 'web', 'windows', 'verification', 'readme']
  .map(name => `references/${name}.md`);
const packageFiles = [
  'SKILL.md',
  'AGENTS.md',
  'agents/openai.yaml',
  ...referenceFiles,
  ...commonFiles,
].sort();
const ignoredDirectories = new Set([
  '.git', '.local', '.uni-your-app', '.uni-elegant-engineering', 'work', 'outputs', 'node_modules', '__pycache__',
]);
const errors = [];
let linkCount = 0;

async function inventory(root) {
  const files = [];
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (ignoredDirectories.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        errors.push(`Unexpected package symlink: ${path.relative(root, absolute)}`);
      } else if (entry.isDirectory()) {
        await walk(absolute);
      } else {
        files.push(path.relative(root, absolute).split(path.sep).join('/'));
      }
    }
  }
  await walk(root);
  return files.sort();
}

function checkInventory(actual, expected, label) {
  for (const file of expected) {
    if (!actual.includes(file)) errors.push(`${label}: missing ${file}`);
  }
  for (const file of actual) {
    if (!expected.includes(file)) errors.push(`${label}: unexpected public file ${file}`);
  }
}

async function checkText(root, files, availableFiles = files) {
  const targets = new Set(availableFiles);
  for (const file of files) {
    if (!/\.(md|yaml|yml|json|mjs|js|html|css)$/.test(file)) continue;
    const body = await fs.readFile(path.join(root, file), 'utf8');
    if (body.charCodeAt(0) === 0xfeff) errors.push(`UTF-8 BOM: ${file}`);
    if (/[A-Za-z]:[\\/]Users[\\/]|[A-Za-z]:[\\/]Projects[\\/]/i.test(body)) {
      errors.push(`Machine-specific path: ${file}`);
    }
    if (file.endsWith('.json')) {
      try {
        JSON.parse(body);
      } catch {
        errors.push(`Invalid JSON: ${file}`);
      }
    }
    if (!file.endsWith('.md')) continue;
    const prose = body.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '');
    for (const match of prose.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
      let target = match[1].trim().replace(/^<|>$/g, '');
      if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) continue;
      try {
        target = decodeURIComponent(target.split('#')[0]);
      } catch {
        errors.push(`Invalid encoded link: ${file}`);
        continue;
      }
      if (!target) continue;
      linkCount++;
      const absolute = path.resolve(root, path.dirname(file), target);
      const relative = path.relative(root, absolute).split(path.sep).join('/');
      if (relative === '..' || relative.startsWith('../') || path.isAbsolute(relative)) {
        errors.push(`Link escapes package: ${file} -> ${target}`);
      } else if (!targets.has(relative)) {
        errors.push(`Missing/private link target: ${file} -> ${target}`);
      }
    }
  }
}

async function checkPackage(root) {
  const files = await inventory(root);
  checkInventory(files, packageFiles, 'Package');
  if (![skillName, ...editionNames].includes(path.basename(root))) {
    errors.push(`Use an edition source folder or the installed name ${skillName}.`);
  }
  const body = await fs.readFile(path.join(root, 'SKILL.md'), 'utf8');
  const frontmatter = body.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)?.[1];
  if (frontmatter?.match(/^name:\s*([a-z0-9-]+)\s*$/m)?.[1] !== skillName) {
    errors.push('Invalid skill identity.');
  }
  if (!frontmatter || !/^description:\s*\S.+$/m.test(frontmatter)) {
    errors.push('Missing skill description.');
  }
  const metadata = await fs.readFile(path.join(root, 'agents/openai.yaml'), 'utf8');
  if (!/default_prompt:.*\$uni-your-app/.test(metadata)) {
    errors.push('Default prompt must invoke this skill.');
  }
  const description = metadata.match(/short_description:\s*"([^"]+)"/)?.[1];
  if (!description || [...description].length < 25 || [...description].length > 64) {
    errors.push('UI description must have 25–64 characters.');
  }
  await checkText(root, files);
  return files.length;
}

async function checkRepository(root) {
  const rootEntries = (await fs.readdir(root)).filter(name => name !== '.git').sort();
  checkInventory(rootEntries, ['README.md', ...editionNames].sort(), 'Repository root');
  const files = await inventory(root);
  const expected = [
    'README.md',
    ...editionNames.flatMap(name => packageFiles.map(file => `${name}/${file}`)),
  ].sort();
  checkInventory(files, expected, 'Repository');
  for (const name of editionNames) await checkPackage(path.join(root, name));
  for (const file of commonFiles) {
    const [left, right] = await Promise.all(
      editionNames.map(name => fs.readFile(path.join(root, name, file))),
    );
    if (!left.equals(right)) errors.push(`Language editions differ in common file ${file}`);
  }
  await checkText(root, ['README.md'], files);
  try {
    const tracked = execFileSync('git', ['-C', root, 'ls-files', '-z'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).split('\0');
    if (tracked.some(file => /(^|\/)(\.local|\.uni-your-app|\.uni-elegant-engineering|work|outputs)\//.test(file))) {
      errors.push('Private or generated material is tracked.');
    }
  } catch (error) {
    if (error.status !== 128 && error.code !== 'ENOENT') throw error;
  }
  return files.length;
}

try {
  const standalone = process.argv[2] === '--package';
  if (standalone && !process.argv[3]) throw new Error('Supply a package path.');
  const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const selected = path.resolve(standalone ? process.argv[3] : process.argv[2] || defaultRoot);
  const repository = standalone ? null : await findRepositoryRoot(selected);
  const count = repository ? await checkRepository(repository) : await checkPackage(selected);
  if (errors.length) {
    console.error([...new Set(errors)].join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`Validated ${repository ? 'two language editions' : 'one standalone package'}, ${count} files, ${linkCount} local links.`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
