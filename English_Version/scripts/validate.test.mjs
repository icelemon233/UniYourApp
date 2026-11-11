import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { editionNames, findRepositoryRoot, skillName } from './sync-versions.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repository = await findRepositoryRoot(packageRoot);
const base = path.join(packageRoot, 'work', 'package-validation-tests');
const validator = path.join(packageRoot, 'scripts', 'validate.mjs');
const ignored = new Set([
  '.git', '.local', '.uni-your-app', '.uni-elegant-engineering', 'work', 'outputs', 'node_modules', '__pycache__',
]);
await fs.mkdir(base, { recursive: true });

async function copyPublicTree(source, target) {
  await fs.mkdir(target, { recursive: true });
  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Fixtures cannot follow source symlinks.');
    if (entry.isDirectory()) await copyPublicTree(from, to);
    else await fs.copyFile(from, to);
  }
}

async function fixture(t, source, basename) {
  const directory = await fs.mkdtemp(path.join(base, 'case-'));
  const target = basename ? path.join(directory, basename) : directory;
  t.after(async () => {
    const resolved = await fs.realpath(directory);
    const resolvedBase = await fs.realpath(base);
    assert.equal(path.dirname(resolved), resolvedBase, 'Cleanup stays inside the test directory.');
    await fs.rm(resolved, { recursive: true, force: true });
  });
  await copyPublicTree(source, target);
  return target;
}

function validate(args) {
  return spawnSync(process.execPath, [validator, ...args], { encoding: 'utf8' });
}

const sources = repository
  ? editionNames.map(name => ({ name, root: path.join(repository, name) }))
  : [{ name: path.basename(packageRoot), root: packageRoot }];

for (const source of sources) {
  test(`${source.name} installs independently as ${skillName}`, async t => {
    const copy = await fixture(t, source.root, skillName);
    const result = validate(['--package', copy]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  });
}

test('a package cannot depend on documentation outside its install directory', async t => {
  const copy = await fixture(t, packageRoot, skillName);
  await fs.appendFile(path.join(copy, 'SKILL.md'), '\n[external dependency](../outside.md)\n');
  await fs.writeFile(path.join(path.dirname(copy), 'outside.md'), 'Outside the installed package.\n');
  assert.equal(validate(['--package', copy]).status, 1);
});

test('a missing reference is detected before publication', async t => {
  const copy = await fixture(t, packageRoot, skillName);
  await fs.unlink(path.join(copy, 'references', 'readme.md'));
  assert.equal(validate(['--package', copy]).status, 1);
});

test('diverging common helpers fail the repository check', { skip: !repository }, async t => {
  const copy = await fixture(t, repository);
  await fs.appendFile(path.join(copy, editionNames[0], 'scripts', 'config-core.mjs'), '\n// Divergent fixture.\n');
  assert.equal(validate([copy]).status, 1);
});

test('unplanned research or preset files fail artifact validation', async t => {
  const copy = await fixture(t, repository || packageRoot, repository ? undefined : skillName);
  await fs.mkdir(path.join(copy, 'docs'));
  await fs.writeFile(path.join(copy, 'docs', 'session-notes.md'), 'Private working notes.\n');
  const result = validate(repository ? [copy] : ['--package', copy]);
  assert.equal(result.status, 1);
});

test('installed language packages run their CLI directly and through a directory link', async t => {
  for (const source of sources) {
    const copy = await fixture(t, source.root, skillName);
    const alias = path.join(path.dirname(copy), 'linked-skill');
    await fs.symlink(copy, alias, 'junction');
    for (const directory of [copy, alias]) {
      const result = spawnSync(process.execPath, [
        path.join(directory, 'scripts', 'config.mjs'),
        'validate',
        '--user-dir',
        path.join(path.dirname(copy), 'private-user'),
      ], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.match(result.stdout, /Configuration is valid\./);
    }
  }
});
