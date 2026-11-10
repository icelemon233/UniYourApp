import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(repo, 'work', 'package-validation-tests');
const validator = path.join(repo, 'scripts', 'validate.mjs');
const ignored = new Set(['.git', '.local', 'work', 'outputs', 'node_modules', '__pycache__']);
await fs.mkdir(base, { recursive: true });

async function fixture(t, source, basename) {
  const dir = await fs.mkdtemp(path.join(base, 'case-'));
  const target = basename ? path.join(dir, basename) : dir;
  t.after(async () => {
    const resolved = await fs.realpath(dir);
    const resolvedBase = await fs.realpath(base);
    assert.equal(path.dirname(resolved), resolvedBase, 'Cleanup must stay inside the test directory.');
    await fs.rm(resolved, { recursive: true, force: true });
  });
  await fs.mkdir(target, { recursive: true });
  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    await fs.cp(path.join(source, entry.name), path.join(target, entry.name), {
      recursive: true,
      filter: candidate => !path.relative(source, candidate).split(path.sep).some(part => ignored.has(part)),
    });
  }
  return target;
}

function validate(args) {
  return spawnSync(process.execPath, [validator, ...args], { encoding: 'utf8' });
}

for (const language of ['chinese version', 'english version']) {
  test(`${language} works when copied without the repository or sibling edition`, async t => {
    const copy = await fixture(t, path.join(repo, language, 'uni-elegant-engineering'), 'uni-elegant-engineering');
    const result = validate(['--package', copy]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  });
}

test('a package cannot depend on documentation outside its install directory', async t => {
  const copy = await fixture(t, path.join(repo, 'chinese version', 'uni-elegant-engineering'), 'uni-elegant-engineering');
  await fs.appendFile(path.join(copy, 'SKILL.md'), '\n[external package dependency](../outside.md)\n');
  await fs.writeFile(path.join(path.dirname(copy), 'outside.md'), 'This file is not part of the installed package.\n');
  assert.equal(validate(['--package', copy]).status, 1);
});

test('a removed reference is detected before publication', async t => {
  const copy = await fixture(t, path.join(repo, 'english version', 'uni-elegant-engineering'), 'uni-elegant-engineering');
  await fs.unlink(path.join(copy, 'references', 'readme.md'));
  assert.equal(validate(['--package', copy]).status, 1);
});

test('diverging shared helpers cannot pass the bilingual repository check', async t => {
  const copy = await fixture(t, repo);
  await fs.appendFile(path.join(copy, 'chinese version', 'uni-elegant-engineering', 'scripts', 'config-core.mjs'), '\n// Divergent fixture.\n');
  assert.equal(validate([copy]).status, 1);
});

test('unplanned research or preset files are rejected from the public artifact', async t => {
  const copy = await fixture(t, repo);
  await fs.mkdir(path.join(copy, 'docs'), {recursive:true});
  await fs.writeFile(path.join(copy, 'docs', 'session-notes.md'), 'Private working notes.\n');
  assert.equal(validate([copy]).status, 1);
});

test('copied language packages run the CLI without any repository dependency', async t => {
  for(const language of ['chinese version','english version']) {
    const copy = await fixture(t, path.join(repo, language, 'uni-elegant-engineering'), 'uni-elegant-engineering');
    const result = spawnSync(process.execPath, [path.join(copy,'scripts','config.mjs'),'validate','--user-dir',path.join(path.dirname(copy),'private-user')],{encoding:'utf8'});
    assert.equal(result.status,0,result.stdout+result.stderr);
  }
});
