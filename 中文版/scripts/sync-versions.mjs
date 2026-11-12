import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const editionNames = ['中文版', 'English_Version'];
export const skillName = 'uni-your-app';
export const runtimeFiles = [
  'config.schema.json',
  'scripts/config.mjs',
  'scripts/config-core.mjs',
  'scripts/config-values.mjs',
  'scripts/config-server.mjs',
  'web/index.html',
  'web/styles.css',
  'web/app.js',
  'web/locales.js',
];
export const maintenanceFiles = [
  '.gitattributes',
  '.gitignore',
  'LICENSE',
  '.github/workflows/validate.yml',
  'scripts/sync-versions.mjs',
  'scripts/validate.mjs',
  'scripts/config.test.mjs',
  'scripts/validate.test.mjs',
];
export const commonFiles = [...runtimeFiles, ...maintenanceFiles, 'assets/readme-hero.png'];

async function isFile(file) {
  try {
    return (await fs.stat(file)).isFile();
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function findRepositoryRoot(start) {
  const location = path.resolve(start);
  for (const candidate of [location, path.dirname(location)]) {
    const entries = ['README.md', ...editionNames.map(name => path.join(name, 'SKILL.md'))];
    const present = await Promise.all(entries.map(file => isFile(path.join(candidate, file))));
    if (present.every(Boolean)) return candidate;
  }
  return null;
}

export async function syncVersions(sourceDirectory) {
  const source = path.resolve(sourceDirectory);
  const repository = await findRepositoryRoot(source);
  if (!repository || !editionNames.includes(path.basename(source))) {
    throw new Error('Run synchronization from a checkout containing both language editions.');
  }
  const targetName = editionNames.find(name => name !== path.basename(source));
  const target = path.join(repository, targetName);
  for (const relative of commonFiles) {
    const sourceFile = path.join(source, relative);
    if ((await fs.lstat(sourceFile)).isSymbolicLink()) {
      throw new Error(`Common source must be a regular file: ${relative}`);
    }
    await fs.mkdir(path.dirname(path.join(target, relative)), { recursive: true });
    await fs.copyFile(sourceFile, path.join(target, relative));
  }
  return { source: path.basename(source), target: targetName, files: commonFiles.length };
}

if (process.argv[1] && await fs.realpath(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  console.log(await syncVersions(source));
}
