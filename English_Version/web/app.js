import { createConfigTools, clone } from '/values.mjs';
import { messages } from '/locales.js';

const $ = id => document.getElementById(id);
const session = document.querySelector('meta[name=config-session]').content;
let language = new URLSearchParams(location.search).get('lang') || (navigator.language.startsWith('zh') ? 'zh' : 'en');
if (!messages[language]) language = 'en';
let state, schema, tools, scope = 'personal', section = 'appearance', draft, baseline;
let jsonMode = false, jsonError = false, saving = false, uploading = false, mobile = false, uploadRole, palette = 'common', touched = false;
const imageCache = new Map();
const draftNames = new Map();
const disabledBeforeBusy = new WeakMap();
const t = key => messages[language][key] || key;
const title = rule => language === 'zh' ? rule['x-title-zh'] || rule.title : rule.title;
const icons = {
  appearance:'M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 0-4h-1a1 1 0 0 1 0-2h2a7 7 0 0 0 0-12h-2M7 9h.01M10 6h.01M15 7h.01M17 11h.01',
  layout:'M3 4h18v16H3zM8 4v16M8 10h13',
  assets:'M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4M15 8h.01',
  platforms:'M3 4h18v12H3zM8 20h8M12 16v4',
  verification:'M9 12l2 2 4-5M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z'
};
function element(tag, attributes = {}, text) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'className') node.className = value;
    else if (key in node && !key.startsWith('aria-') && !key.startsWith('data-')) node[key] = value;
    else node.setAttribute(key, value);
  }
  if (text !== undefined) node.textContent = text;
  return node;
}
function button(text, action, attributes = {}) { const node = element('button', { type: 'button', ...attributes }, text); node.addEventListener('click', action); return node; }
function svgIcon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
  const shape = document.createElementNS(svg.namespaceURI, 'path'); shape.setAttribute('d', icons[name]); svg.append(shape); return svg;
}
function get(object, dotted) { return dotted.split('.').reduce((value, key) => value?.[key], object); }
function ruleFor(dotted) { return dotted.split('.').reduce((value, key) => value?.properties?.[key], schema); }
function fieldName(dotted) { const rule = ruleFor(dotted); return rule ? title(rule) : dotted; }
function own(dotted) { return get(draft, dotted); }
function inherited(dotted) { return scope === 'project' ? get(state.layers.personal.data, dotted) : undefined; }
function activeValue(dotted) { return own(dotted) ?? inherited(dotted); }
function currentChanges() { return tools ? tools.changes(baseline, draft) : []; }
function dirty() { return state?.layers[scope]?.errors.length ? touched : jsonError || currentChanges().length > 0; }
function errors() { return jsonError ? [{ path: '', code: 'jsonError' }] : tools.validateConfig(draft, { allowDraftAssets: true }); }
async function api(url, { method = 'GET', body, blob = false } = {}) {
  const headers = { 'X-Config-Session': session };
  if (body !== undefined && !(body instanceof Blob)) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
  const response = await fetch(url, { method, headers, body });
  if (!response.ok) { const payload = await response.json().catch(() => ({})); const error = new Error(payload.error || t('requestFailed')); error.status = response.status; error.details = payload.details; error.code = payload.code; throw error; }
  return blob ? response.blob() : response.json();
}
let noticeTimer;
function notify(message, bad = false) { clearTimeout(noticeTimer); $('notice').hidden = !message; $('notice').textContent = message; $('notice').classList.toggle('failure', bad); if (message && !bad) noticeTimer = setTimeout(() => { $('notice').hidden = true; }, 5000); }
function report(error) {
  if (error.details?.length) { showErrors(error.details); return; }
  const message = ['tracked','notIgnored','locked'].includes(error.code) ? t(error.code) : error.status === 409 ? t('conflict') : error.status === 403 ? t('session') : error.status === 413 ? t('assetTooLarge') : error.status === 415 ? t('assetType') : language === 'en' ? error.message : t('requestFailed');
  notify(message, true);
}
function showErrors(items) {
  $('errors').replaceChildren(); $('errors').hidden = !items.length;
  if (items.length) {
    const list = element('ul');
    for (const issue of items.slice(0, 8)) {
      let detail = t(issue.code); if (['minimum', 'maximum'].includes(issue.code)) detail += ` ${issue.expected}`;
      list.append(element('li', {}, `${issue.path ? fieldName(issue.path) + ': ' : ''}${detail}`));
    }
    $('errors').append(list);
  }
  document.querySelectorAll('.field-row').forEach(row => row.classList.toggle('invalid', items.some(issue => issue.path === row.dataset.path)));
}
function effective() {
  return scope === 'personal' ? tools.resolveConfig(draft, { schemaVersion: 1 }, { allowDraftAssets: true }) : tools.resolveConfig(state.layers.personal.data, draft, { allowDraftAssets: true });
}
function draftIds(value) { return new Set(Object.values(value?.assets || {}).map(asset => asset?.path).filter(value => typeof value === 'string' && value.startsWith('draft:')).map(value => value.slice(6))); }
function releaseDrafts(previous, next) {
  const retained = draftIds(next), ids = [...draftIds(previous)].filter(id => !retained.has(id));
  if (ids.length) api('/api/drafts/discard', { method: 'POST', body: { ids } }).catch(() => {});
}
function lockEditing(locked) {
  for (const control of document.querySelectorAll('.shell button,.shell input,.shell select,.shell textarea')) {
    if (locked) { if (!disabledBeforeBusy.has(control)) disabledBeforeBusy.set(control, control.disabled); control.disabled = true; }
    else if (disabledBeforeBusy.has(control)) { control.disabled = disabledBeforeBusy.get(control); disabledBeforeBusy.delete(control); }
  }
}
function updateFieldState(row, dotted) {
  const badge = row.querySelector('.source');
  const explicit = own(dotted) !== undefined;
  const parent = inherited(dotted);
  badge.textContent = explicit ? t(scope === 'personal' ? 'sourcePersonal' : 'sourceProject') : parent !== undefined ? t('sourcePersonal') : '';
  badge.hidden = !badge.textContent;
  const picker = row.querySelector('input[type=color]');
  if (picker) picker.classList.toggle('unset', !explicit && parent === undefined);
  row.querySelector('.reset').disabled = !explicit;
}
function update(dotted, value, remove = false, row) {
  notify('');
  const previous = draft;
  draft = tools.setValue(draft, dotted, value, remove); jsonError = false; touched = true;
  releaseDrafts(previous, draft);
  if (row) updateFieldState(row, dotted);
  refresh();
}
function refresh() {
  if (!saving && !uploading) lockEditing(false);
  const invalid = errors(); showErrors(invalid);
  const otherInvalid = Object.entries(state.layers).some(([key, layer]) => key !== scope && layer.errors.length);
  $('save-button').disabled = saving || uploading || !dirty() || invalid.length > 0 || (scope === 'project' && !state.projectRoot);
  $('save-button').textContent = saving ? t('busy') : t('save');
  $('discard-button').textContent = dirty() ? t('discard') : t('reload');
  $('save-status').textContent = saving ? t('busy') : uploading ? t('uploading') : dirty() ? `${currentChanges().length || 1} ${t('unsaved')}` : state.layers[scope].errors.length ? t('repairStatus') : t('unchanged');
  $('file-path').textContent = state.paths[scope] || t('missingProject');
  $('file-path').title = state.paths[scope] || '';
  if (otherInvalid) notify(t('otherLayerInvalid'), true);
  renderPreview();
  if (saving || uploading) lockEditing(true);
}
function field(dotted, rule) {
  const row = element('div', { className: 'field-row', 'data-path': dotted });
  const id = `field-${dotted.replaceAll('.', '-')}`;
  const label = element('label', { className: 'field-label', htmlFor: id });
  label.append(element('span', {}, title(rule)), element('span', { className: 'source', id: `source-${id}`, 'aria-hidden': 'true' }));
  const control = element('div', { className: 'field-control' });
  const value = own(dotted), parent = inherited(dotted);
  const reset = button('↶', () => { update(dotted, undefined, true); renderFields(); }, { className: 'reset', 'aria-label': `${t('reset')}: ${title(rule)}`, title: t('reset') });
  row.append(label, control, reset);
  if (rule.enum) {
    const select = element('select', { id });
    const fallback = parent !== undefined ? `${t('inheritPersonal')} · ${enumLabel(rule, parent)}` : t('inherit');
    select.append(element('option', { value: '' }, fallback));
    rule.enum.forEach(option => select.append(element('option', { value: option }, enumLabel(rule, option))));
    select.value = value ?? ''; select.addEventListener('change', () => update(dotted, select.value, select.value === '', row)); control.append(select);
  } else if (rule.type === 'array' && rule.items.enum) {
    control.classList.add('checks'); control.setAttribute('role', 'group'); control.setAttribute('aria-label', title(rule));
    for (const item of rule.items.enum) {
      const input = element('input', { type: 'checkbox', checked: (value ?? parent ?? []).includes(item), 'aria-label': enumLabel(rule.items, item) });
      input.addEventListener('change', () => {
        const selected = new Set(activeValue(dotted) ?? []); input.checked ? selected.add(item) : selected.delete(item);
        update(dotted, [...selected], false, row);
      });
      const itemLabel = element('label'); itemLabel.append(input, element('span', {}, enumLabel(rule.items, item))); control.append(itemLabel);
    }
    label.removeAttribute('for');
  } else if (rule['x-widget'] === 'color') {
    const current = activeValue(dotted);
    const picker = element('input', { type: 'color', value: /^#[\da-f]{6}$/i.test(current) ? current : '#3c61dd', 'aria-label': `${title(rule)} ${language === 'zh' ? '取色器' : 'picker'}` });
    const input = element('input', { id, type: 'text', value: value ?? '', placeholder: parent ?? '#RRGGBB', maxLength: 7, spellcheck: false });
    picker.addEventListener('input', () => { input.value = picker.value; update(dotted, picker.value, false, row); });
    input.addEventListener('input', () => { if (/^#[\da-f]{6}$/i.test(input.value)) picker.value = input.value; update(dotted, input.value, !input.value, row); });
    control.append(picker, input);
  } else {
    const isNumber = ['number', 'integer'].includes(rule.type), isList = rule.type === 'array';
    const draftAsset = dotted.startsWith('assets.') && dotted.endsWith('.path') && typeof value === 'string' && value.startsWith('draft:');
    const input = element('input', { id, type: isNumber ? 'number' : 'text', value: draftAsset ? draftNames.get(value) || t('selectedImage') : isList ? (value || []).join(', ') : value ?? '', placeholder: parent !== undefined ? Array.isArray(parent) ? parent.join(', ') : String(parent) : isList ? t('listPlaceholder') : t('inherit'), readOnly: draftAsset });
    if (isNumber) { input.min = rule.minimum; input.max = rule.maximum; input.step = rule.type === 'integer' ? '1' : 'any'; }
    if (rule.maxLength) input.maxLength = rule.maxLength;
    input.addEventListener('input', () => {
      let next = input.value;
      if (isNumber) next = input.validity.badInput ? Number.NaN : Number(next);
      if (isList) next = input.value.split(/[,，\n]/).map(item => item.trim()).filter(Boolean).map(item => ['integer', 'number'].includes(rule.items.type) ? Number(item) : item);
      update(dotted, next, input.value === '' && !input.validity.badInput, row);
    }); control.append(input);
  }
  for (const input of control.querySelectorAll('input,select')) input.setAttribute('aria-describedby', `source-${id}`);
  updateFieldState(row, dotted); return row;
}
function enumLabel(rule, value) { const index = rule.enum.indexOf(value); return language === 'zh' ? rule['x-enum-zh']?.[index] || value : value.charAt(0).toUpperCase() + value.slice(1).replaceAll('-', ' '); }
function sectionNode(name) { const node = element('fieldset', { className: 'form-section' }); if (name) node.append(element('legend', {}, name)); return node; }
function renderObject(container, rule, prefix, showLegend = true) {
  const block = sectionNode(showLegend ? title(rule) : '');
  for (const [key, child] of Object.entries(rule.properties || {})) {
    const dotted = prefix ? `${prefix}.${key}` : key;
    if (child['x-widget'] === 'tokens') { if (block.childElementCount > (showLegend ? 1 : 0) && !block.parentNode) container.append(block); container.append(renderTokens(dotted, child)); continue; }
    if (child['x-widget'] === 'palettes') continue;
    if (dotted === 'appearance.colors') { if (block.childElementCount > (showLegend ? 1 : 0) && !block.parentNode) container.append(block); container.append(renderPalettes(child)); continue; }
    if (child.type === 'object') {
      if (block.childElementCount > (showLegend ? 1 : 0) && !block.parentNode) container.append(block);
      if (child['x-widget'] === 'asset') container.append(renderAsset(dotted, child));
      else renderObject(container, child, dotted);
    } else block.append(field(dotted, child));
  }
  if (block.childElementCount > (showLegend ? 1 : 0) && !block.parentNode) container.append(block);
}
function renderTokens(dotted, rule) {
  const details = element('details', { className: 'token-details' });
  details.append(element('summary', {}, title(rule)));
  const block = element('div'); details.append(block);
  const numeric = rule.additionalProperties.type === 'number';
  const values = own(dotted) ?? {};
  for (const [initialKey, initialValue] of Object.entries(values)) {
    let key = initialKey;
    const row = element('div', { className: 'token-row' });
    const name = element('input', { value: key, placeholder: t('tokenName'), 'aria-label': t('tokenName') });
    const value = element('input', { type: numeric ? 'number' : 'text', value: initialValue, 'aria-label': t('tokenValue') });
    if (numeric) { value.min = 0; value.max = 8192; value.step = 'any'; }
    const commit = () => {
      const entries = Object.entries(own(dotted) ?? {}).filter(([entry]) => entry !== key); entries.push([name.value, numeric ? Number(value.value) : value.value]);
      key = name.value; update(dotted, Object.fromEntries(entries));
    };
    name.addEventListener('input', commit); value.addEventListener('input', commit);
    row.append(name, value, button('×', () => { const entries = Object.entries(own(dotted) ?? {}).filter(([entry]) => entry !== key); update(dotted, Object.fromEntries(entries), !entries.length); renderFields(); }, { className: 'icon-button', 'aria-label': t('remove') })); block.append(row);
  }
  block.append(button('+ ' + t('addToken'), () => { const values = own(dotted) ?? {}; let index = 1; while (Object.hasOwn(values, `token${index}`)) index++; update(dotted, { ...values, [`token${index}`]: numeric ? 0 : '#808080' }); renderFields(); document.querySelectorAll('.token-details').forEach(node => node.open = true); }, { className: 'quiet add-token' }));
  return details;
}
function renderPalettes(rule) {
  const block = sectionNode(''), heading = element('div', { className: 'palette-heading' });
  const select = element('select', { 'aria-label': t('palette') });
  for (const key of ['common', 'light', 'dark']) select.append(element('option', { value: key }, t(key)));
  select.value = palette; select.addEventListener('change', () => { palette = select.value; renderFields(); renderPreview(); });
  heading.append(element('span', { className: 'section-title' }, title(rule)), select); block.append(heading);
  const prefix = palette === 'common' ? 'appearance.colors' : `appearance.palettes.${palette}`;
  for (const [role, color] of Object.entries(rule.properties)) block.append(field(`${prefix}.${role}`, color));
  return block;
}
function renderAsset(dotted, rule) {
  const block = sectionNode(title(rule)), role = dotted.split('.')[1];
  block.append(field(dotted + '.path', rule.properties.path));
  const actions = element('div', { className: 'asset-actions' });
  const thumb = element('img', { className: 'asset-thumb', alt: title(rule), hidden: true });
  const value = activeValue(dotted + '.path');
  if (value) imageUrl(value, own(dotted + '.path') !== undefined ? scope : 'personal', role).then(url => { thumb.src = url; thumb.hidden = false; }).catch(() => { thumb.title = t('imageError'); });
  actions.append(thumb, button(t('chooseImage'), () => { uploadRole = role; $('asset-file').click(); }, { className: 'quiet' })); block.append(actions);
  const row = element('div', { className: 'wide-row' }), id = `description-${role}`;
  const description = element('textarea', { id, value: own(dotted + '.description') ?? '', placeholder: inherited(dotted + '.description') ?? '', maxLength: 3000 });
  description.addEventListener('input', () => update(dotted + '.description', description.value, !description.value));
  row.append(element('label', { htmlFor: id }, title(rule.properties.description)), description); block.append(row, field(dotted + '.source', rule.properties.source)); return block;
}
function renderFields() {
  $('fields').replaceChildren(); $('fields').hidden = jsonMode; $('json-view').hidden = !jsonMode;
  if (scope === 'project' && !state.projectRoot) { $('fields').append(element('p', { className: 'blank-note' }, t('projectFirst'))); return; }
  renderObject($('fields'), schema.properties[section], section, false);
  showErrors(errors());
}
function renderChrome() {
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'; $('language').value = language;
  $('project-picker').textContent = state.projectRoot ? state.projectRoot.split(/[\\/]/).filter(Boolean).at(-1) : t('selectProject');
  $('project-picker').title = state.projectRoot || t('selectProject');
  $('scope-switch').setAttribute('aria-label', t('chooseScope'));
  $('scope-switch').replaceChildren(...['personal', 'project'].map(item => button(t(item), () => changeScope(item), { role: 'tab', 'aria-selected': String(scope === item) })));
  $('navigation').replaceChildren(...Object.keys(icons).map(key => { const item = button('', () => { section = key; renderChrome(); renderFields(); }, { 'aria-current': key === section ? 'page' : 'false' }); item.append(svgIcon(key), element('span', {}, title(schema.properties[key]))); return item; }));
  $('heading').textContent = jsonMode ? 'JSON' : title(schema.properties[section]);
  $('import-button').textContent = t('import'); $('export-button').textContent = t('export');
  $('suggest-button').textContent = t('suggest'); $('suggest-button').hidden = scope !== 'project' || !state.projectRoot || jsonMode || section !== 'appearance';
  $('json-button').textContent = jsonMode ? t('form') : 'JSON';
  $('preview-title').textContent = t('preview');
  $('preview-mode').replaceChildren(...[false, true].map(value => button(t(value ? 'mobile' : 'desktop'), () => { mobile = value; renderChrome(); renderPreview(); }, { 'aria-pressed': String(mobile === value) })));
  for (const [id, key] of Object.entries({ 'sample-app-name': 'sampleApp', 'sample-title': 'sampleTitle', 'sample-name-label': 'sampleName', 'sample-notify-label': 'sampleNotify', 'sample-row-label': 'sampleRow', 'sample-state': 'sampleState', 'sample-primary': 'samplePrimary', 'sample-secondary': 'sampleSecondary' })) $(id).textContent = t(key);
  $('sample-name').value = t('sampleApp');
}
function lum(color) { const values = color.slice(1).match(/../g).map(hex => parseInt(hex, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4); return values[0] * .2126 + values[1] * .7152 + values[2] * .0722; }
function contrast(a, b) { return (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05); }
function renderPreview() {
  const invalidDraft = errors().length > 0;
  const unavailable = invalidDraft || (scope === 'project' && state.layers.personal.errors.length > 0);
  $('preview-unavailable').hidden = !unavailable; $('preview-unavailable').textContent = t(invalidDraft ? 'invalidPreview' : 'previewUnavailable');
  for (const id of ['preview-stage','preview-colors','contrast']) $(id).hidden = unavailable;
  if (unavailable) return;
  let data, sources; try { ({ effective: data, sources } = effective()); } catch { return; }
  const theme = palette === 'common' ? data.appearance?.theme ?? 'system' : palette;
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  const colors = { background: dark ? '#20242d' : '#ffffff', surface: dark ? '#292f3a' : '#ffffff', text: dark ? '#edf0f6' : '#273045', muted: dark ? '#b2bdcf' : '#69748b', border: dark ? '#4a5363' : '#dbe0e8', accent: '#3c61dd', ...data.appearance?.colors, ...data.appearance?.palettes?.[dark ? 'dark' : 'light'] };
  const sample = $('sample'); sample.classList.toggle('mobile', mobile);
  for (const role of ['background', 'surface', 'text', 'muted', 'border', 'accent']) sample.style.setProperty(`--p-${role === 'background' ? 'bg' : role}`, colors[role]);
  sample.style.setProperty('--p-button-text', contrast('#ffffff', colors.accent) >= contrast('#111111', colors.accent) ? '#ffffff' : '#111111');
  const compact = data.layout?.density === 'compact';
  for (const [key, value] of Object.entries({ radius: data.layout?.controlRadius ?? 7, panel: data.layout?.panelRadius ?? 10, height: data.layout?.controlHeight ?? (compact ? 30 : 36), gap: data.layout?.sectionGap ?? (compact ? 10 : 16), pad: data.layout?.pagePadding ?? (compact ? 14 : 22) })) sample.style.setProperty(`--p-${key}`, value + 'px');
  sample.style.fontFamily = data.appearance?.fonts?.family || 'inherit'; sample.style.fontSize = (data.appearance?.fonts?.size ?? 14) + 'px';
  $('preview-colors').replaceChildren(...Object.entries(colors).filter(([role]) => ['accent', 'background', 'surface', 'text', 'border'].includes(role)).map(([role, color]) => { const swatch = element('span', { className: 'color-swatch', title: `${title(schema.properties.appearance.properties.colors.properties[role])}: ${color}`, 'aria-label': `${role}: ${color}` }); swatch.style.backgroundColor = color; return swatch; }));
  const ratio = contrast(colors.text, colors.background); $('contrast').textContent = `${t('contrast')} ${ratio.toFixed(2)}:1${ratio < 4.5 ? ' · ' + t('contrastLow') : ''}`; $('contrast').classList.toggle('bad', ratio < 4.5);
  for (const [role, id] of [['logo', 'sample-logo'], ['illustration', 'sample-illustration']]) {
    const value = data.assets?.[role]?.path, img = $(id); img.hidden = true;
    if (value) imageUrl(value, sources[`assets.${role}.path`] || scope, role).then(url => { if (get(effective().effective, `assets.${role}.path`) === value) { img.src = url; img.hidden = false; } }).catch(() => {});
  }
}
function imageUrl(value, layer, role) {
  const key = `${layer}|${role}|${value}`;
  if (!imageCache.has(key)) {
    const request = value.startsWith('draft:') ? api(`/api/asset?draft=${encodeURIComponent(value.slice(6))}`, { blob: true }) : api('/api/preview-asset', { method: 'POST', body: { scope: layer, role, path: value }, blob: true });
    imageCache.set(key, request.then(blob => URL.createObjectURL(blob)));
  }
  return imageCache.get(key);
}
function dialog(titleText, body, confirmText = t('confirm'), beforeAccept) {
  $('dialog-title').textContent = titleText; $('dialog-body').replaceChildren(typeof body === 'string' ? element('p', {}, body) : body);
  $('dialog-cancel').textContent = t('cancel'); $('dialog-confirm').textContent = confirmText; $('dialog-close').setAttribute('aria-label', t('cancel'));
  return new Promise(resolve => {
    let accepted = false;
    $('dialog-confirm').onclick = async () => {
      $('dialog-confirm').disabled = true;
      try { if (beforeAccept) await beforeAccept(); accepted = true; $('dialog').close(); }
      catch (error) { let message = $('dialog-body').querySelector('.dialog-error'); if (!message) { message = element('p', { className: 'dialog-error', role: 'alert' }); $('dialog-body').append(message); } message.textContent = language === 'zh' ? t('invalidProject') : error.message; }
      finally { $('dialog-confirm').disabled = false; }
    };
    $('dialog').onclose = () => resolve(accepted);
    $('dialog').showModal();
  });
}
async function allowDiscard() { return !dirty() || await dialog(t('discardTitle'), t('discardBody'), t('discard')); }
async function changeScope(next) {
  if (next === scope) return;
  if (next === 'project' && !state.projectRoot) { await pickProject(); return; }
  if (!await allowDiscard()) return;
  scope = next; useState(state); notify('');
}
function useState(next, first = false) {
  const previousDraft = draft;
  for (const cached of imageCache.values()) cached.then(url => URL.revokeObjectURL(url)).catch(() => {});
  imageCache.clear();
  state = next; schema = state.schema; tools = createConfigTools(schema);
  if (first) scope = state.projectRoot ? 'project' : 'personal';
  baseline = clone(state.layers[scope].data); draft = clone(baseline); jsonError = false; touched = false;
  releaseDrafts(previousDraft, draft);
  if (state.layers[scope].errors.length) { jsonMode = true; try { draft = JSON.parse(state.layers[scope].raw); } catch { jsonError = true; } notify(t('repair'), true); }
  $('json-editor').value = state.layers[scope].errors.length ? state.layers[scope].raw : JSON.stringify(draft, null, 2);
  renderChrome(); renderFields(); refresh();
}
async function pickProject() {
  if (!await allowDiscard()) return;
  const input = element('input', { value: state.projectRoot || '', placeholder: t('projectHint'), 'aria-label': t('projectPath') });
  input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); $('dialog-confirm').click(); } });
  let next;
  if (!await dialog(t('projectPath'), input, t('select'), async () => { next = await api('/api/project', { method: 'POST', body: { path: input.value } }); })) return;
  scope = 'project'; useState(next); notify('');
}
async function save() {
  if (errors().length || saving || !dirty()) return;
  const body = element('div');
  if (state.layers[scope].errors.length) body.append(element('p', {}, t('repairDiff')));
  for (const change of currentChanges()) {
    const row = element('div', { className: 'diff-row' }), values = element('div', { className: 'diff-values' });
    const format = value => value === undefined ? t('inherit') : typeof value === 'string' && value.startsWith('draft:') ? t('chooseImage') : JSON.stringify(value);
    row.append(element('div', { className: 'diff-key' }, fieldName(change.path))); values.append(element('span', {}, format(change.before)), element('span', {}, '→'), element('span', {}, format(change.after))); row.append(values); body.append(row);
  }
  if (!await dialog(t('reviewChanges'), body, t('saveChanges'))) return;
  saving = true; refresh();
  try { const next = await api('/api/save', { method: 'POST', body: { scope, data: draft, expectedRevision: state.layers[scope].revision, projectRoot: state.projectRoot } }); useState(next); notify(t('saved')); }
  catch (error) { report(error); }
  finally { saving = false; refresh(); }
}
$('language').addEventListener('change', () => { language = $('language').value; notify(''); renderChrome(); renderFields(); refresh(); });
$('project-picker').addEventListener('click', pickProject);
$('json-button').addEventListener('click', () => { if (jsonMode && jsonError) { showErrors(errors()); return; } jsonMode = !jsonMode; if (jsonMode) $('json-editor').value = JSON.stringify(draft, null, 2); renderChrome(); renderFields(); });
$('json-editor').addEventListener('input', () => { notify(''); touched = true; try { const next = JSON.parse($('json-editor').value); releaseDrafts(draft, next); draft = next; jsonError = false; } catch { jsonError = true; } refresh(); });
$('save-button').addEventListener('click', save);
$('discard-button').addEventListener('click', async () => { if (!await allowDiscard()) return; try { useState(await api('/api/state')); notify(''); } catch (error) { report(error); } });
$('suggest-button').addEventListener('click', async () => {
  try {
    const result = await api('/api/suggest');
    let applied = 0;
    for (const [role, value] of Object.entries(result.data.appearance?.colors || {})) if (own(`appearance.colors.${role}`) === undefined) { draft = tools.setValue(draft, `appearance.colors.${role}`, value); applied++; }
    if (applied) touched = true;
    renderFields(); refresh(); notify((applied ? `${t('suggested')} · ${[...new Set(result.evidence.map(item => item.file))].join(', ')}` : result.evidence.length ? t('existingKept') : t('nothingRecognized')) + (result.notes.length ? ' ' + t('recognitionNotes') : ''));
  } catch (error) { report(error); }
});
$('import-button').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', async () => {
  const file = $('import-file').files[0]; if (!file) return;
  try {
    const data = JSON.parse((await file.text()).replace(/^\uFEFF/, '')); tools.assertConfig(data);
    if (!await dialog(t('importTitle'), t('importBody'), t('import'))) return;
    releaseDrafts(draft, data); draft = data; jsonError = false; touched = true; $('json-editor').value = JSON.stringify(draft, null, 2); renderFields(); refresh(); notify(t('imported'));
  } catch (error) { if (error instanceof SyntaxError) notify(t('invalidJson'), true); else report(error); }
  finally { $('import-file').value = ''; }
});
$('export-button').addEventListener('click', () => {
  try { tools.assertConfig(draft); } catch (error) { if (error.details?.some(issue => issue.code === 'unsavedAsset')) notify(t('exportDraft'), true); else showErrors(error.details || errors()); return; }
  const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2) + '\n'], { type: 'application/json' }));
  const anchor = element('a', { href: url, download: `${scope}-config.json` }); anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('asset-file').addEventListener('change', async () => {
  const file = $('asset-file').files[0]; if (!file) return;
  const targetRole = uploadRole, targetScope = scope;
  uploading = true; refresh();
  try { const result = await api(`/api/assets?scope=${targetScope}&role=${targetRole}`, { method: 'POST', body: file }); draftNames.set(result.path, file.name); update(`assets.${targetRole}.path`, result.path); renderFields(); }
  catch (error) { report(error); }
  finally { $('asset-file').value = ''; uploading = false; refresh(); }
});
addEventListener('beforeunload', event => { if (state && dirty()) { event.preventDefault(); event.returnValue = ''; } });
addEventListener('pagehide', event => { const ids = [...draftIds(draft)]; if (!event.persisted && ids.length) fetch('/api/drafts/discard', { method: 'POST', keepalive: true, headers: { 'X-Config-Session': session, 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) }).catch(() => {}); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => state && renderPreview());
notify(t('loading'));
api('/api/state').then(next => { notify(''); useState(next, true); }).catch(report);
