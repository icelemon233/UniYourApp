const blockedKeys = new Set(['__proto__', 'prototype', 'constructor']);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const clone = value => JSON.parse(JSON.stringify(value));
export class ConfigError extends Error {
  constructor(message, status = 400, details = [], code = 'operation') { super(message); this.status = status; this.details = details; this.code = code; }
}
export function createConfigTools(schema) {
// Implements the deliberately small keyword set used by the bundled schema.
// A newly introduced validation keyword must fail closed until supported here.
const supported = new Set(['$schema', 'title', 'description', 'type', 'additionalProperties', 'required', 'properties', 'const', 'enum', 'minimum', 'maximum', 'minLength', 'maxLength', 'pattern', 'items', 'maxItems', 'uniqueItems', 'propertyNames']);
function checkSchema(rule) {
  for (const key of Object.keys(rule)) if (!supported.has(key) && !key.startsWith('x-')) throw new Error(`Unsupported schema keyword: ${key}`);
  for (const child of Object.values(rule.properties || {})) checkSchema(child);
  for (const child of [rule.items, rule.propertyNames, plain(rule.additionalProperties) ? rule.additionalProperties : null]) if (child) checkSchema(child);
}
checkSchema(schema);

function validateConfig(value, { allowDraftAssets = false } = {}) {
  const errors = [];
  function visit(rule, current, at) {
    const type = rule.type;
    const validType = !type || (type === 'object' ? plain(current) : type === 'array' ? Array.isArray(current) : type === 'integer' ? Number.isInteger(current) : type === 'number' ? typeof current === 'number' && Number.isFinite(current) : typeof current === type);
    if (!validType) { errors.push({ path: at, code: 'type', expected: type }); return; }
    if ('const' in rule && current !== rule.const) errors.push({ path: at, code: 'const', expected: rule.const });
    if (rule.enum && !rule.enum.includes(current)) errors.push({ path: at, code: 'enum', expected: rule.enum });
    if (typeof current === 'number') {
      if (rule.minimum !== undefined && current < rule.minimum) errors.push({ path: at, code: 'minimum', expected: rule.minimum });
      if (rule.maximum !== undefined && current > rule.maximum) errors.push({ path: at, code: 'maximum', expected: rule.maximum });
    }
    if (typeof current === 'string') {
      if (rule.minLength !== undefined && [...current].length < rule.minLength) errors.push({ path: at, code: 'minLength', expected: rule.minLength });
      if (rule.maxLength !== undefined && [...current].length > rule.maxLength) errors.push({ path: at, code: 'maxLength', expected: rule.maxLength });
      if (rule.pattern && !new RegExp(rule.pattern).test(current)) errors.push({ path: at, code: 'pattern' });
      if (at.startsWith('assets.') && at.endsWith('.path') && !allowDraftAssets && current.startsWith('draft:')) errors.push({ path: at, code: 'unsavedAsset' });
    }
    if (Array.isArray(current)) {
      if (rule.maxItems !== undefined && current.length > rule.maxItems) errors.push({ path: at, code: 'maxItems', expected: rule.maxItems });
      if (rule.uniqueItems && new Set(current.map(item => JSON.stringify(item))).size !== current.length) errors.push({ path: at, code: 'uniqueItems' });
      current.forEach((item, i) => rule.items && visit(rule.items, item, `${at}[${i}]`));
    } else if (plain(current)) {
      for (const key of rule.required || []) if (!Object.hasOwn(current, key)) errors.push({ path: at ? `${at}.${key}` : key, code: 'required' });
      for (const [key, item] of Object.entries(current)) {
        const next = at ? `${at}.${key}` : key;
        if (blockedKeys.has(key)) { errors.push({ path: next, code: 'unknown' }); continue; }
        if (rule.propertyNames) visit(rule.propertyNames, key, next);
        if (rule.properties && Object.hasOwn(rule.properties, key)) visit(rule.properties[key], item, next);
        else if (rule.additionalProperties === false) errors.push({ path: next, code: 'unknown' });
        else if (plain(rule.additionalProperties)) visit(rule.additionalProperties, item, next);
      }
    }
  }
  visit(schema, value, '');
  return errors;
}
function assertConfig(value, options) {
  const errors = validateConfig(value, options);
  if (errors.length) throw new ConfigError('Configuration is invalid.', 422, errors, 'validation');
  return value;
}
function resolveConfig(personal = { schemaVersion: 1 }, project = { schemaVersion: 1 }, options) {
  assertConfig(personal, options); assertConfig(project, options);
  const effective = { schemaVersion: 1 }, sources = {};
  function merge(target, incoming, layer, prefix = '') {
    for (const [key, value] of Object.entries(incoming)) {
      if (key === 'schemaVersion' || blockedKeys.has(key)) continue;
      const at = prefix ? `${prefix}.${key}` : key;
      if (plain(value)) { if (!plain(target[key])) target[key] = {}; merge(target[key], value, layer, at); }
      else { target[key] = clone(value); sources[at] = layer; }
    }
  }
  merge(effective, personal, 'personal'); merge(effective, project, 'project');
  return { effective, sources };
}
function changes(before, after, prefix = '') {
  const result = [];
  for (const key of new Set([...Object.keys(before || {}), ...Object.keys(after || {})])) {
    if (key === 'schemaVersion') continue;
    const a = before?.[key], b = after?.[key], at = prefix ? `${prefix}.${key}` : key;
    if (plain(a) || plain(b)) result.push(...changes(plain(a) ? a : {}, plain(b) ? b : {}, at));
    else if (JSON.stringify(a) !== JSON.stringify(b)) result.push({ path: at, before: a, after: b });
  }
  return result;
}
function setValue(config, dotted, value, remove = false) {
  let parts = dotted.split('.');
  if (((parts[0] === 'layout' && parts[1] === 'tokens') || (parts[0] === 'appearance' && parts[1] === 'colorTokens')) && parts.length > 2) parts = [parts[0], parts[1], parts.slice(2).join('.')];
  if (!parts.length || parts.some(key => !key || blockedKeys.has(key)) || parts[0] === 'schemaVersion') throw new ConfigError('Invalid configuration key.');
  const next = clone(config);
  let node = next;
  for (const part of parts.slice(0, -1)) { if (!plain(node[part])) node[part] = {}; node = node[part]; }
  if (remove) delete node[parts.at(-1)]; else node[parts.at(-1)] = value;
  function prune(current) { for (const [key, item] of Object.entries(current)) if (plain(item)) { prune(item); if (!Object.keys(item).length) delete current[key]; } }
  prune(next); return next;
}

return {validateConfig, assertConfig, resolveConfig, changes, setValue};
}
