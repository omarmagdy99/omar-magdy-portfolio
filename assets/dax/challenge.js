// Page controller for the DAX challenge: fields pane, editor, live preview vs target, submission, leaderboard, analytics.
import { Model, compile, evaluate, validate, DaxError } from './engine.js';
import { createEditor } from './editor.js';
import { tableRef } from './intellisense.js';

const app = document.getElementById('dax-app');
if (app) init(app).catch(err => { console.error(err); app.querySelector('[data-dax-editor]').textContent = 'The editor could not load. Please refresh the page.'; });

const $ = (root, sel) => root.querySelector(sel);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SVG = 'http://www.w3.org/2000/svg';

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
const monthLabel = ym => `${MONTHS[+ym.slice(5) - 1]} ${ym.slice(0, 4)}`;
const same = (a, b) => typeof a === 'number' && isFinite(a) && Math.abs(a - b) < 1e-9;

async function init(root) {
  const challenge = root.dataset.challenge;
  const visitor = visitorId();
  const [spec, target] = await Promise.all([
    fetch(root.dataset.model).then(r => r.json()),
    fetch(root.dataset.target).then(r => r.json()),
  ]);
  const model = new Model(spec);

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
  const tolerance = target.format === 'percent' ? 1e-6 : 1e-9;
  const same = (a, b) => typeof a === 'number' && isFinite(a) && Math.abs(a - b) <= tolerance;
  const fmt = v => (v === null || v === undefined ? '(blank)' : typeof v !== 'number' ? String(v)
    : target.format === 'percent' ? `${(v * 100).toFixed(1)}%  (${Math.round(v * 1e6) / 1e6})` : String(Math.round(v * 1000) / 1000));
  const fmtShort = v => (target.format === 'percent' ? `${Math.round(v * 100)}%` : String(v));
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
  for (const t of model.tables.values()) {
    const d = el('details', { open: true });
    d.append(el('summary', {}, el('span', { className: 'dax-ico dax-ico--table', ariaHidden: 'true' }), t.name));
    const ul = el('ul');
    for (const c of t.cols) {
      const b = el('button', { type: 'button', title: `Insert ${t.name}[${c.name}]` }, el('span', { className: `dax-ico dax-ico--${c.type}`, ariaHidden: 'true' }), c.name);
      b.addEventListener('click', () => editor.insert(`${tableRef(t.name)}[${c.name}]`));
      ul.append(el('li', {}, b));
    }
    for (const m of model.measures.values()) {
      if (m.table !== t.name) continue;
      const b = el('button', { type: 'button', title: `Insert [${m.name}]` }, el('span', { className: 'dax-ico dax-ico--measure', ariaHidden: 'true' }), m.name);
      b.addEventListener('click', () => editor.insert(`[${m.name}]`));
      ul.append(el('li', { className: 'is-measure' }, b));
    }
    d.append(ul); fields.append(d);
  }

  /* data preview */
  const dataBody = $(root.parentElement, '[data-dax-data]');
  if (dataBody) {
    const tabs = el('div', { className: 'dax-tabs', role: 'tablist' });
    const panel = el('div', { className: 'dax-table-wrap' });
    const show = t => {
      tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.textContent === t.name)));
      const tbl = el('table', { className: 'dax-table dax-table--mono' });
      tbl.append(el('thead', {}, el('tr', {}, ...t.cols.map(c => el('th', { scope: 'col' }, c.name)))));
      tbl.append(el('tbody', {}, ...t.rows.slice(0, 8).map(r => el('tr', {}, ...r.map(v => el('td', {}, String(v)))))));
      panel.replaceChildren(tbl, el('p', { className: 'dax-note' }, `First 8 of ${t.n.toLocaleString()} rows.`));
    };
    for (const t of model.tables.values()) {
      const b = el('button', { type: 'button', role: 'tab' }, t.name);
      b.addEventListener('click', () => show(t));
      tabs.append(b);
    }
    dataBody.append(tabs, panel);
    show([...model.tables.values()][0]);
  }
  root.parentElement.querySelectorAll('[data-dax-download]').forEach(a => a.addEventListener('click', () => track('copy_data')));
  document.querySelectorAll('[data-dax-hint]').forEach(d => d.addEventListener('toggle', () => { if (d.open) track(`hint`, true); }));

  /* running the measure against the sample data */
  const resultBox = $(root, '[data-dax-result]'), badge = $(root, '[data-dax-badge]'), runStatus = $(root, '[data-dax-run-status]');
  const chartHost = $(root, '[data-dax-chart]'), compareHost = $(root, '[data-dax-compare]');
  const contextMeasure = compile(`[${target.context.name}]`);

  function evaluateMonths(compiled) {
    return target.months.map(ym => evaluate(model, compiled, [{ table: 'Date', column: 'YearMonth', values: [ym] }], { maxSteps: 400000 }));
  }

  function run() {
    track('run', true);
    let compiled;
    try {
      compiled = compile(editor.value);
      const issues = validate(model, compiled.ast);
      if (issues.length) throw new DaxError(issues[0].message);
    } catch (e) {
      resultBox.hidden = true;
      runStatus.textContent = e instanceof DaxError ? `⚠ ${e.message}` : '⚠ Could not read that formula.';
      runStatus.className = 'dax-run-status is-error';
      return null;
    }
    let values;
    try { values = evaluateMonths(compiled); } catch (e) {
      resultBox.hidden = true;
      runStatus.textContent = e instanceof DaxError ? `⚠ ${e.message}` : '⚠ The formula could not be evaluated.';
      runStatus.className = 'dax-run-status is-error';
      return null;
    }
    const actives = target.months.map(ym => evaluate(model, contextMeasure, [{ table: 'Date', column: 'YearMonth', values: [ym] }]));
    const ok = values.map((v, i) => same(v ?? 0, target.values[i]));
    const matched = ok.filter(Boolean).length;
    renderResult(values, actives, ok);
    badge.textContent = `${matched} of ${ok.length} months match`;
    badge.className = `dax-badge ${matched === ok.length ? 'is-ok' : matched ? 'is-partial' : 'is-none'}`;
    runStatus.textContent = matched === ok.length ? '✓ Your result matches the target. Submit it below.' : 'Ran successfully. Compare with the target.';
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
    const step = target.format === 'percent' ? 0.2 : 5;
    const hi = Math.ceil(Math.max(...all) / step) * step, lo = Math.floor(Math.min(...all) / step) * step;
    const y = v => top + (H - top - bottom) * (1 - (v - lo) / (hi - lo || 1));
    const band = (W - left - 8) / target.months.length;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'compare-chart', role: 'img', 'aria-label': 'Your result compared with the target, by month' });
    for (const t of [lo, 0, hi].filter((v, k, a) => a.indexOf(v) === k)) {
      svg.append(svgEl('line', { class: t === 0 ? 'chart-grid chart-zero' : 'chart-grid', x1: left, x2: W - 8, y1: y(t), y2: y(t) }), svgEl('text', { class: 'chart-axis', x: left - 6, y: y(t) + 4, 'text-anchor': 'end' }, fmtShort(Math.round(t * 100) / 100)));
    }
    const bar = (cls, x, v, w) => svgEl('rect', { class: cls, x, y: Math.min(y(v), y(0)), width: w, height: Math.max(1, Math.abs(y(v) - y(0))), rx: 2 });
    target.months.forEach((ym, i) => {
      const x0 = left + band * i + band * 0.16, w = band * 0.34;
      const tv = target.values[i], uv = clamp(values[i]);
      svg.append(bar('bar-target', x0, tv, w), bar(ok[i] ? 'bar-yours is-ok' : 'bar-yours is-off', x0 + w + 2, uv, w));
      svg.append(svgEl('text', { class: 'chart-axis', x: left + band * i + band / 2, y: H - 10, 'text-anchor': 'middle' }, MONTHS[+ym.slice(5) - 1]));
    });
    const legend = el('p', { className: 'dax-legend' }, el('span', { className: 'key key--target' }), 'Target ', el('span', { className: 'key key--yours' }), 'Your result');
    chartHost.replaceChildren(svg, legend);

    const tbl = el('table', { className: 'dax-table' });
    tbl.append(el('thead', {}, el('tr', {}, ...['Month', target.context.label, 'Your result', 'Target', ''].map(h => el('th', { scope: 'col' }, h)))));
    tbl.append(el('tbody', {}, ...target.months.map((ym, i) => {
      const v = values[i];
      return el('tr', { className: ok[i] ? 'is-ok' : 'is-off' },
        el('th', { scope: 'row' }, monthLabel(ym)), el('td', {}, typeof actives[i] === 'number' ? Math.round(actives[i]).toLocaleString() : String(actives[i])),
        el('td', {}, fmt(v)), el('td', {}, fmt(target.values[i])),
        el('td', { className: 'dax-mark', ariaLabel: ok[i] ? 'matches' : 'does not match' }, ok[i] ? '✓' : '✗'));
    })));
    compareHost.replaceChildren(tbl);
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
    if (name.length < 2) { say('Please enter your name (2 to 32 characters).', 'is-error'); form.elements.name.focus(); return; }
    store('set', 'dax.name', name); store('set', 'dax.linkedin', linkedin);
    submitButton.disabled = true; say('Checking your measure against the data…');
    try {
      const res = await fetch('/api/dax/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challenge, visitor, name, linkedin, dax: editor.value }) });
      const data = await res.json();
      if (!data.ok) say(data.error || 'Something went wrong. Please try again.', 'is-error');
      else if (data.correct) {
        say(data.alreadySolved ? `Correct again! You’re already on the leaderboard at #${data.rank}.` : `🎉 Correct! You’re #${data.rank} on the leaderboard${data.attempts ? ` after ${data.attempts} attempt${data.attempts === 1 ? '' : 's'}` : ''}.`, 'is-success');
        await loadBoard();
        document.getElementById('leaderboard').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      } else if (data.stage === 'hidden') {
        say('Close: it works on the sample data but not on a second dataset. Look for an assumption that only holds for this data (a fixed month, a hard-coded number, an unusual case).', 'is-error');
      } else {
        say(`Not yet: ${data.matched} of ${data.total} months match the target. Run it and compare the months that are off.`, 'is-error');
      }
    } catch {
      say('Could not reach the server. Check your connection and try again.', 'is-error');
    } finally { submitButton.disabled = false; }
  });

  /* leaderboard and counters */
  const boardBody = document.querySelector('[data-dax-board]');
  const fmtMinutes = m => (m < 1 ? '< 1 min' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim());
  const fmtDate = s => new Date(s * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  async function loadBoard() {
    try {
      const data = await fetch(`/api/dax/leaderboard?challenge=${challenge}`, { headers: { 'X-Visitor': visitor }, cache: 'no-store' }).then(r => r.json());
      if (!data.ok) throw new Error('bad');
      if (!data.solvers.length) { boardBody.replaceChildren(el('tr', {}, el('td', { colSpan: 5, className: 'dax-empty' }, 'Nobody has solved it yet. Be the first.'))); return; }
      boardBody.replaceChildren(...data.solvers.map(s => {
        const name = s.linkedin ? el('a', { href: s.linkedin, target: '_blank', rel: 'nofollow noopener ugc' }, s.name) : document.createTextNode(s.name);
        const cell = el('td', {}, name);
        if (s.you) cell.append(el('span', { className: 'dax-you' }, 'you'));
        return el('tr', { className: s.you ? 'is-you' : '' }, el('th', { scope: 'row' }, String(s.rank)), cell, el('td', {}, String(s.attempts)), el('td', {}, fmtMinutes(s.minutes)), el('td', {}, fmtDate(s.solvedAt)));
      }));
    } catch {
      boardBody.replaceChildren(el('tr', {}, el('td', { colSpan: 5, className: 'dax-empty' }, 'The leaderboard is unavailable right now.')));
    }
  }
  loadBoard();

  const counters = document.querySelector('[data-dax-stats]');
  fetch(`/api/dax/stats?challenge=${challenge}`).then(r => r.json()).then(s => {
    if (!s.ok || s.visitors < 10) return;
    counters.querySelector('[data-n="visitors"]').textContent = s.visitors.toLocaleString();
    counters.querySelector('[data-n="started"]').textContent = s.started.toLocaleString();
    counters.querySelector('[data-n="solved"]').textContent = s.solved.toLocaleString();
    counters.hidden = false;
  }).catch(() => {});
}
