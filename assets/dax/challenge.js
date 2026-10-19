// Page controller for the DAX challenge: fields pane, editor, live preview vs target, submission, leaderboard, analytics.
// Works in English and Arabic (see i18n.js); the DAX editor itself is always left-to-right.
import { Model, compile, evaluate, validate, DaxError } from './engine.js';
import { createEditor } from './editor.js';
import { tableRef } from './intellisense.js';
import { t, months, lang, serverError } from './i18n.js';
import { celebrate } from './celebrate.js';

const app = document.getElementById('dax-app');
if (app) init(app).catch(err => { console.error(err); app.querySelector('[data-dax-editor]').textContent = t('loadFail'); });

const $ = (root, sel) => root.querySelector(sel);
const SVG = 'http://www.w3.org/2000/svg';
const locale = lang === 'ar' ? 'ar-EG-u-nu-latn' : undefined; // Arabic dates, Western digits

function store(op, key, value) {
  try { return op === 'get' ? localStorage.getItem(key) : op === 'set' ? localStorage.setItem(key, value) : localStorage.removeItem(key); } catch { return null; }
}
function visitorId() {
  let id = store('get', 'dax.visitor');
  if (!id || !/^[a-f0-9-]{16,64}$/.test(id)) {
    id = (crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''));
    store('set', 'dax.visitor', id);
  }
  return id;
}
const doNotTrack = () => navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  for (const c of children) node.append(c);
  return node;
}
function svgEl(tag, attrs = {}, text) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}
const monthLabel = ym => `${months[+ym.slice(5) - 1]} ${ym.slice(0, 4)}`;

async function init(root) {
  const challenge = root.dataset.challenge;
  const visitor = visitorId();
  const [spec, target] = await Promise.all([
    fetch(root.dataset.model).then(r => r.json()),
    fetch(root.dataset.target).then(r => r.json()),
  ]);
  const model = new Model(spec);
  const contextLabel = (lang === 'ar' && target.context.labelAr) || target.context.label;

  /* analytics (counts only; skipped for Do Not Track / Global Privacy Control) */
  const params = new URLSearchParams(location.search);
  const refHost = (() => { try { const h = new URL(document.referrer).hostname; return h === location.hostname ? '' : h.replace(/^www\./, ''); } catch { return ''; } })();
  const source = params.get('utm_source') || params.get('ref') || refHost;
  const device = innerWidth < 640 ? 'mobile' : innerWidth < 1024 ? 'tablet' : 'desktop';
  const sent = new Set();
  function track(type, once = true) {
    if (doNotTrack() || (once && sent.has(type))) return;
    sent.add(type);
    fetch('/api/dax/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, body: JSON.stringify({ challenge, type, visitor, source, device }) }).catch(() => {});
  }
  track('view');

  /* editor */
  const starter = target.starter;
  const tolerance = target.format === 'count' ? 1e-9 : 1e-6;
  const same = (a, b) => typeof a === 'number' && isFinite(a) && Math.abs(a - b) <= tolerance;
  const fmt = v => (v === null || v === undefined ? t('blank') : typeof v !== 'number' ? String(v)
    : target.format === 'percent' ? `${(v * 100).toFixed(1)}%  (${Math.round(v * 1e6) / 1e6})`
      : target.format === 'money' ? v.toFixed(2) : String(Math.round(v * 1000) / 1000));
  const fmtShort = v => (target.format === 'percent' ? `${Math.round(v * 100)}%` : String(Math.round(v)));
  const niceStep = range => { const raw = range / 3 || 1, p = 10 ** Math.floor(Math.log10(raw)), m = raw / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };
  const draftKey = `dax.draft.${challenge}`;
  let started = false;
  const editor = createEditor($(root, '[data-dax-editor]'), model, {
    value: store('get', draftKey) || starter,
    onRun: run,
    onChange: text => {
      store('set', draftKey, text);
      if (!started && text.trim() && text !== starter) { started = true; track('start'); }
    },
  });

  /* fields pane */
  const fields = $(root, '[data-dax-fields]');
  for (const tbl of model.tables.values()) {
    const d = el('details', { open: true });
    d.append(el('summary', {}, el('span', { className: 'dax-ico dax-ico--table', ariaHidden: 'true' }), tbl.name));
    const ul = el('ul');
    for (const c of tbl.cols) {
      const b = el('button', { type: 'button', title: t('fieldInsert', { name: `${tbl.name}[${c.name}]` }) }, el('span', { className: `dax-ico dax-ico--${c.type}`, ariaHidden: 'true' }), c.name);
      b.addEventListener('click', () => editor.insert(`${tableRef(tbl.name)}[${c.name}]`));
      ul.append(el('li', {}, b));
    }
    for (const m of model.measures.values()) {
      if (m.table !== tbl.name) continue;
      const b = el('button', { type: 'button', title: t('fieldInsert', { name: `[${m.name}]` }) }, el('span', { className: 'dax-ico dax-ico--measure', ariaHidden: 'true' }), m.name);
      b.addEventListener('click', () => editor.insert(`[${m.name}]`));
      ul.append(el('li', { className: 'is-measure' }, b));
    }
    d.append(ul); fields.append(d);
  }

  /* data preview */
  const dataBody = $(root.parentElement, '[data-dax-data]');
  if (dataBody) {
    const tabs = el('div', { className: 'dax-tabs', role: 'group', ariaLabel: t('tabsLabel') });
    const panel = el('div', { className: 'dax-table-wrap' });
    const show = tb => {
      tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.textContent === tb.name)));
      const grid = el('table', { className: 'dax-table dax-table--mono' });
      grid.append(el('thead', {}, el('tr', {}, ...tb.cols.map(c => el('th', { scope: 'col' }, c.name)))));
      grid.append(el('tbody', {}, ...tb.rows.slice(0, 8).map(r => el('tr', {}, ...r.map(v => el('td', {}, String(v)))))));
      panel.replaceChildren(grid, el('p', { className: 'dax-note' }, t('dataRows', { n: tb.n.toLocaleString('en-US') })));
    };
    for (const tb of model.tables.values()) {
      const b = el('button', { type: 'button' }, tb.name);
      b.addEventListener('click', () => show(tb));
      tabs.append(b);
    }
    dataBody.append(tabs, panel);
    show([...model.tables.values()][0]);
  }
  root.parentElement.querySelectorAll('[data-dax-download]').forEach(a => a.addEventListener('click', () => track('copy_data')));
  document.querySelectorAll('[data-dax-hint]').forEach(d => d.addEventListener('toggle', () => { if (d.open) track('hint', true); }));

  /* running the measure against the sample data */
  const resultBox = $(root, '[data-dax-result]'), badge = $(root, '[data-dax-badge]'), runStatus = $(root, '[data-dax-run-status]');
  const chartHost = $(root, '[data-dax-chart]'), compareHost = $(root, '[data-dax-compare]');
  const contextMeasure = compile(`[${target.context.name}]`);

  function evaluateMonths(compiled) {
    return target.months.map(ym => evaluate(model, compiled, [{ table: 'Date', column: 'YearMonth', values: [ym] }], { maxSteps: 400000 }));
  }
  const runError = text => { resultBox.hidden = true; runStatus.textContent = text; runStatus.className = 'dax-run-status is-error'; return null; };

  function run() {
    track('run', true);
    let compiled;
    try {
      compiled = compile(editor.value);
      const issues = validate(model, compiled.ast);
      if (issues.length) throw new DaxError(issues[0].message);
    } catch (e) {
      return runError(e instanceof DaxError ? `⚠ ${e.message}` : t('runBadFormula'));
    }
    let values;
    try { values = evaluateMonths(compiled); } catch (e) {
      return runError(e instanceof DaxError ? `⚠ ${e.message}` : t('runBadEval'));
    }
    const actives = target.months.map(ym => evaluate(model, contextMeasure, [{ table: 'Date', column: 'YearMonth', values: [ym] }]));
    const ok = values.map((v, i) => same(v ?? 0, target.values[i]));
    const matched = ok.filter(Boolean).length;
    renderResult(values, actives, ok);
    badge.textContent = t('badge', { m: matched, n: ok.length });
    badge.className = `dax-badge ${matched === ok.length ? 'is-ok' : matched ? 'is-partial' : 'is-none'}`;
    runStatus.textContent = matched === ok.length ? t('runMatch') : t('runOk');
    runStatus.className = 'dax-run-status';
    resultBox.hidden = false;
    return { matched, total: ok.length };
  }

  function renderResult(values, actives, ok) {
    const W = 720, H = 260, left = 40, top = 20, bottom = 30;
    const num = v => (typeof v === 'number' && isFinite(v) ? v : 0);
    // Clamp wild results (e.g. a missing /100) so one bar can't flatten the target.
    const cap = Math.max(...target.values.map(Math.abs)) * 3 || 1;
    const clamp = v => Math.max(-cap, Math.min(cap, num(v)));
    const all = [...target.values, ...values.map(clamp), 0];
    const step = niceStep(Math.max(...all) - Math.min(...all));
    const hi = Math.ceil(Math.max(...all) / step) * step, lo = Math.floor(Math.min(...all) / step) * step;
    const y = v => top + (H - top - bottom) * (1 - (v - lo) / (hi - lo || 1));
    const band = (W - left - 8) / target.months.length;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'compare-chart', role: 'img', 'aria-label': t('chartLabel') });
    for (const tick of [lo, 0, hi].filter((v, k, a) => a.indexOf(v) === k)) {
      svg.append(svgEl('line', { class: tick === 0 ? 'chart-grid chart-zero' : 'chart-grid', x1: left, x2: W - 8, y1: y(tick), y2: y(tick) }), svgEl('text', { class: 'chart-axis', x: left - 6, y: y(tick) + 4, 'text-anchor': 'end' }, fmtShort(Math.round(tick * 100) / 100)));
    }
    const bar = (cls, x, v, w) => svgEl('rect', { class: cls, x, y: Math.min(y(v), y(0)), width: w, height: Math.max(1, Math.abs(y(v) - y(0))), rx: 2 });
    target.months.forEach((ym, i) => {
      const x0 = left + band * i + band * 0.16, w = band * 0.34;
      const tv = target.values[i], uv = clamp(values[i]);
      svg.append(bar('bar-target', x0, tv, w), bar(ok[i] ? 'bar-yours is-ok' : 'bar-yours is-off', x0 + w + 2, uv, w));
      svg.append(svgEl('text', { class: 'chart-axis', x: left + band * i + band / 2, y: H - 10, 'text-anchor': 'middle' }, months[+ym.slice(5) - 1]));
    });
    const legend = el('p', { className: 'dax-legend' }, el('span', { className: 'key key--target' }), `${t('legendTarget')} `, el('span', { className: 'key key--yours' }), t('legendYours'));
    chartHost.replaceChildren(svg, legend);

    const grid = el('table', { className: 'dax-table' });
    grid.append(el('thead', {}, el('tr', {}, ...[t('colMonth'), contextLabel, t('colYours'), t('colTarget'), ''].map(h => el('th', { scope: 'col' }, h)))));
    grid.append(el('tbody', {}, ...target.months.map((ym, i) => {
      const v = values[i];
      return el('tr', { className: ok[i] ? 'is-ok' : 'is-off' },
        el('th', { scope: 'row' }, monthLabel(ym)), el('td', {}, typeof actives[i] === 'number' ? Math.round(actives[i]).toLocaleString('en-US') : String(actives[i])),
        el('td', {}, fmt(v)), el('td', {}, fmt(target.values[i])),
        el('td', { className: 'dax-mark', ariaLabel: ok[i] ? t('matches') : t('noMatch') }, ok[i] ? '✓' : '✗'));
    })));
    compareHost.replaceChildren(grid);
  }

  $(root, '[data-dax-run]').addEventListener('click', run);
  $(root, '[data-dax-reset]').addEventListener('click', () => { editor.value = starter; resultBox.hidden = true; runStatus.textContent = ''; editor.focus(); });

  /* submission */
  const form = $(root, '[data-dax-submit]'), feedback = $(root, '[data-dax-feedback]'), submitButton = $(root, '[data-dax-submit-button]');
  form.elements.name.value = store('get', 'dax.name') || '';
  form.elements.linkedin.value = store('get', 'dax.linkedin') || '';
  const say = (text, kind) => { feedback.textContent = text; feedback.className = `dax-feedback ${kind ?? ''}`; };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const name = form.elements.name.value.trim(), linkedin = form.elements.linkedin.value.trim();
    if (name.length < 2) { say(t('nameShort'), 'is-error'); form.elements.name.focus(); return; }
    store('set', 'dax.name', name); store('set', 'dax.linkedin', linkedin);
    submitButton.disabled = true; say(t('checking'));
    try {
      const res = await fetch('/api/dax/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challenge, visitor, name, linkedin, dax: editor.value }) });
      const data = await res.json();
      if (!data.ok) { say(serverError(data), 'is-error'); if (data.locked) refreshProgress(); }
      else if (data.correct) {
        solved.add(challenge); store('set', 'dax.solved', JSON.stringify([...solved])); applyProgress();
        celebrate();
        say(data.alreadySolved ? t('correctAgain', { rank: data.rank }) : data.attempts === 1 ? t('correctOne', { rank: data.rank }) : data.attempts ? t('correctMany', { rank: data.rank, n: data.attempts }) : t('correctPlain', { rank: data.rank }), 'is-success');
        await loadBoard();
        document.getElementById('leaderboard').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      } else if (data.stage === 'hidden') {
        say(t('closeHidden'), 'is-error');
      } else {
        say(t('notYet', { m: data.matched, n: data.total }), 'is-error');
      }
    } catch {
      say(t('offline'), 'is-error');
    } finally { submitButton.disabled = false; }
  });

  /* leaderboard and counters */
  const boardBody = document.querySelector('[data-dax-board]');
  const fmtMinutes = m => (m < 1 ? t('lessThanMin') : m < 60 ? t('minutes', { n: m }) : m % 60 ? t('hoursMinutes', { h: Math.floor(m / 60), m: m % 60 }) : t('hours', { h: Math.floor(m / 60) }));
  const fmtDate = s => new Date(s * 1000).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  async function loadBoard() {
    try {
      const data = await fetch(`/api/dax/leaderboard?challenge=${challenge}`, { headers: { 'X-Visitor': visitor }, cache: 'no-store' }).then(r => r.json());
      if (!data.ok) throw new Error('bad');
      if (!data.solvers.length) { boardBody.replaceChildren(el('tr', {}, el('td', { colSpan: 5, className: 'dax-empty' }, t('boardEmpty')))); return; }
      boardBody.replaceChildren(...data.solvers.map(s => {
        const name = s.linkedin ? el('a', { href: s.linkedin, target: '_blank', rel: 'nofollow noopener ugc' }, s.name) : document.createTextNode(s.name);
        const cell = el('td', {}, name);
        if (s.you) cell.append(el('span', { className: 'dax-you' }, t('you')));
        return el('tr', { className: s.you ? 'is-you' : '' }, el('th', { scope: 'row' }, String(s.rank)), cell, el('td', {}, String(s.attempts)), el('td', {}, fmtMinutes(s.minutes)), el('td', {}, fmtDate(s.solvedAt)));
      }));
    } catch {
      boardBody.replaceChildren(el('tr', {}, el('td', { colSpan: 5, className: 'dax-empty' }, t('boardDown'))));
    }
  }
  loadBoard();

  /* levels: stepper state, unlock and the "next level" prompt. The server enforces the lock; this only reflects it. */
  const requires = root.dataset.requires;
  let progressKnown = false;
  let solved = new Set();
  try { solved = new Set(JSON.parse(store('get', 'dax.solved') || '[]')); } catch { /* ignore */ }
  const lockPanel = document.querySelector('[data-dax-lock]'), nextBox = $(root, '[data-dax-next]');
  function applyProgress() {
    const items = [...document.querySelectorAll('[data-dax-steps] li')];
    items.forEach((li, i) => {
      const id = li.dataset.levelId, done = solved.has(id);
      const locked = progressKnown && i > 0 && !solved.has(items[i - 1].dataset.levelId) && !done;
      li.classList.toggle('is-solved', done); li.classList.toggle('is-locked', locked);
      li.querySelector('[data-state]').textContent = done ? t('solved') : locked ? t('locked') : '';
    });
    const locked = Boolean(requires) && progressKnown && !solved.has(requires);
    if (lockPanel) lockPanel.hidden = !locked;
    root.classList.toggle('is-locked', locked);
    root.querySelectorAll('textarea, button, input').forEach(c => { c.disabled = locked; });
    if (!locked) submitButton.disabled = false;
    if (nextBox && root.dataset.nextFile) {
      nextBox.hidden = !solved.has(challenge);
      if (!nextBox.hidden && !nextBox.firstChild) nextBox.append(el('strong', {}, t('levelDone')), el('a', { className: 'button', href: root.dataset.nextFile }, t('next', { name: root.dataset.nextName })));
    }
  }
  async function refreshProgress() {
    try {
      const d = await fetch('/api/dax/progress', { headers: { 'X-Visitor': visitor }, cache: 'no-store' }).then(r => r.json());
      if (d.ok) { solved = new Set(d.solved); progressKnown = true; store('set', 'dax.solved', JSON.stringify([...solved])); }
    } catch { /* offline: leave everything unlocked, the server still checks */ }
    applyProgress();
  }
  applyProgress();
  refreshProgress();

  const counters = document.querySelector('[data-dax-stats]');
  fetch(`/api/dax/stats?challenge=${challenge}`).then(r => r.json()).then(s => {
    if (!s.ok || s.visitors < 10) return;
    counters.querySelector('[data-n="visitors"]').textContent = s.visitors.toLocaleString('en-US');
    counters.querySelector('[data-n="started"]').textContent = s.started.toLocaleString('en-US');
    counters.querySelector('[data-n="solved"]').textContent = s.solved.toLocaleString('en-US');
    counters.hidden = false;
  }).catch(() => {});
}
