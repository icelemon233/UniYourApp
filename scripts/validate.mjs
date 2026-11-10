import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { sharedFiles, languages } from './sync-packages.mjs';

const name = 'uni-elegant-engineering';
const references = ['engineering', 'ui', 'web', 'windows', 'verification', 'readme'].map(item => 'references/' + item + '.md');
const packageFiles = ['.gitignore', 'LICENSE', 'SKILL.md', 'agents/openai.yaml', ...references, ...sharedFiles].sort();
const rootFiles = ['.gitattributes', '.gitignore', '.github/workflows/validate.yml', 'AGENTS.md', 'LICENSE', 'README.md', 'README.en.md', 'scripts/sync-packages.mjs', 'scripts/validate.mjs', 'scripts/config.test.mjs', 'scripts/validate.test.mjs'];
const ignored = new Set(['.git', '.local', '.uni-elegant-engineering', 'work', 'outputs', 'node_modules', '__pycache__']);
const errors = [];
let links = 0;
async function inventory(root) {
  const result = [];
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, {withFileTypes:true})) {
      if (ignored.has(entry.name)) continue;
      const full = path.join(directory,entry.name);
      if (entry.isSymbolicLink()) errors.push('Unexpected symlink: ' + path.relative(root,full));
      else if (entry.isDirectory()) await walk(full);
      else result.push(path.relative(root,full).replaceAll('\\','/'));
    }
  }
  await walk(root);
  return result.sort();
}
function exactFiles(actual, expected, label) {
  for (const item of expected) if (!actual.includes(item)) errors.push(label + ': missing ' + item);
  for (const item of actual) if (!expected.includes(item)) errors.push(label + ': unexpected public file ' + item);
}
async function checkText(root, files, allFiles=files) {
  const names = new Set(allFiles);
  for (const file of files) {
    if (!/\.(md|yaml|yml|json|mjs|js|html|css)$/.test(file)) continue;
    const body = await fs.readFile(path.join(root,file),'utf8');
    if (body.charCodeAt(0) === 0xfeff) errors.push('UTF-8 BOM: ' + file);
    if (/[A-Za-z]:[\\/]Users[\\/]|[A-Za-z]:[\\/]Projects[\\/]/i.test(body)) errors.push('Machine-specific path: ' + file);
    if (file.endsWith('.json')) { try { JSON.parse(body); } catch { errors.push('Invalid JSON: ' + file); } }
    if (!file.endsWith('.md')) continue;
    const prose = body.replace(/^\x60\x60\x60[^\n]*\n[\s\S]*?^\x60\x60\x60\s*$/gm,'');
    for (const match of prose.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
      let target = match[1].trim().replace(/^<|>$/g,'');
      if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) continue;
      try { target = decodeURIComponent(target.split('#')[0]); } catch { errors.push('Invalid encoded link: '+file); continue; }
      if (!target) continue;
      links++;
      const relative = path.relative(root,path.resolve(root,path.dirname(file),target)).replaceAll('\\','/');
      if (relative==='..' || relative.startsWith('../') || path.isAbsolute(relative)) errors.push('Link escapes package: '+file+' -> '+target);
      else if (!names.has(relative)) errors.push('Missing/private link target: '+file+' -> '+target);
    }
  }
}
async function checkPackage(root) {
  const files = await inventory(root);
  exactFiles(files,packageFiles,'Package');
  if (path.basename(root)!==name) errors.push('Installable folder must be named '+name);
  const body = await fs.readFile(path.join(root,'SKILL.md'),'utf8');
  const front = body.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)?.[1];
  if (!front || front.match(/^name:\s*([a-z0-9-]+)\s*$/m)?.[1]!==name || !/^description:\s*\S.+$/m.test(front)) errors.push('Invalid skill identity/description.');
  const metadata = await fs.readFile(path.join(root,'agents/openai.yaml'),'utf8');
  if (!/default_prompt:.*\$uni-elegant-engineering/.test(metadata)) errors.push('Default prompt must invoke this skill.');
  const short=metadata.match(/short_description:\s*"([^"]+)"/)?.[1];
  if (!short || [...short].length<25 || [...short].length>64) errors.push('UI description must have 25-64 characters.');
  await checkText(root,files);
  return files.length;
}
async function checkRepository(root) {
  const files = await inventory(root);
  const expected=[...rootFiles,...sharedFiles.map(file=>'shared/'+file),...languages.flatMap(language=>packageFiles.map(file=>language+'/'+name+'/'+file))].sort();
  exactFiles(files,expected,'Repository');
  for (const language of languages) await checkPackage(path.join(root,language,name));
  for (const file of sharedFiles) {
    const source=await fs.readFile(path.join(root,'shared',file));
    for (const language of languages) if (!source.equals(await fs.readFile(path.join(root,language,name,file)))) errors.push('Out-of-sync runtime: '+language+'/'+file);
  }
  for (const file of ['LICENSE','.gitignore']) {
    const source=await fs.readFile(path.join(root,file));
    for (const language of languages) if (!source.equals(await fs.readFile(path.join(root,language,name,file)))) errors.push('Out-of-sync package '+file);
  }
  await checkText(root,files.filter(file=>!languages.some(language=>file.startsWith(language+'/'))),files);
  try {
    const tracked=execFileSync('git',['-C',root,'ls-files','-z'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).split('\0');
    if (tracked.some(file=>/(^|\/)(\.local|\.uni-elegant-engineering|work|outputs)\//.test(file))) errors.push('Private or generated material is tracked.');
  } catch(error) { if(error.status!==128 && error.code!=='ENOENT') throw error; }
  return files.length;
}
try {
  const standalone=process.argv[2]==='--package';
  if(standalone && !process.argv[3]) throw new Error('Supply a package path.');
  const root=path.resolve(standalone?process.argv[3]:process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)),'..'));
  const count=standalone?await checkPackage(root):await checkRepository(root);
  if(errors.length){console.error([...new Set(errors)].join('\n'));process.exitCode=1;}
  else console.log('Validated '+(standalone?'one standalone package':'two standalone generic packages')+', '+count+' public files, '+links+' local links.');
} catch(error){console.error(error.message);process.exitCode=1;}
