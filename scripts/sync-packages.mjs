import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const sharedFiles = ['config.schema.json', 'scripts/config.mjs', 'scripts/config-core.mjs', 'scripts/config-values.mjs', 'scripts/config-server.mjs', 'web/index.html', 'web/styles.css', 'web/app.js', 'web/locales.js'];
export const languages = ['chinese version', 'english version'];
export async function syncPackages(root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')) {
  for (const language of languages) {
    const destination = path.join(root, language, 'uni-elegant-engineering');
    await fs.access(path.join(destination, 'SKILL.md'));
    for (const file of sharedFiles) {
      const source = path.join(root, 'shared', file);
      if ((await fs.lstat(source)).isSymbolicLink()) throw new Error(`Shared source cannot be a symlink: ${file}`);
      await fs.mkdir(path.dirname(path.join(destination, file)), { recursive: true });
      await fs.copyFile(source, path.join(destination, file));
    }
  }
  return { packages: languages.length, sharedFiles: sharedFiles.length };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(await syncPackages());
