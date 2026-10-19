// Editor intelligence without any DOM: completions, signature help, token classes and diagnostics.
// Everything is a pure function of (text, caret, model) so it can be unit-tested in Node.
import { lex, compile, validate, findMeasureHead, DaxError } from './engine.js';
import { FUNCTIONS, FUNCTION_MAP, KEYWORDS, INTERVALS } from './functions.js';

const needsQuotes = (name, fnNames) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || fnNames.has(name.toUpperCase());
const FN_NAMES = new Set(FUNCTIONS.map(f => f.name));
export const tableRef = name => (needsQuotes(name, FN_NAMES) ? `'${name.replace(/'/g, "''")}'` : name);
const bracket = name => `[${name.replace(/]/g, ']]')}]`;

function tableOfModel(model, name) { return model.tables.get(String(name).toLowerCase()); }

/** Variables declared before the caret: VAR Name = … */
function declaredVars(text, caret) {
  const out = [];
  const tokens = lex(text.slice(0, caret));
  for (let i = 0; i < tokens.length - 1; i++) {
    if (tokens[i].type === 'word' && tokens[i].text.toUpperCase() === 'VAR' && tokens[i + 1].type === 'word') out.push(tokens[i + 1].text);
  }
  return out;
}

/** Finds the function call the caret is inside, and which argument it is in. */
export function callContext(text, caret) {
  const tokens = lex(text.slice(0, caret), { trivia: false });
  const stack = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type !== 'op') continue;
    if (t.text === '(') {
      const prev = tokens[i - 1];
      stack.push({ name: prev && prev.type === 'word' ? prev.text.toUpperCase() : null, arg: 0, open: t.start });
    } else if (t.text === ')') stack.pop();
    else if ((t.text === ',' || t.text === ';') && stack.length) stack[stack.length - 1].arg++;
  }
  for (let k = stack.length - 1; k >= 0; k--) if (stack[k].name) return stack[k];
  return null;
}

function paramFor(fn, argIndex) {
  if (!fn) return null;
  const last = fn.params[fn.params.length - 1];
  if (argIndex < fn.params.length) return fn.params[argIndex];
  return last && last.repeat ? last : null;
}

/**
 * Suggestions at the caret.
 * Returns null (nothing to suggest) or { from, to, items:[{label, insert, kind, detail, doc, caretBack?}] }
 */
export function complete(text, caret, model, { force = false } = {}) {
  const before = text.slice(0, caret);
  // inside a comment or string → nothing
  const toks = lex(before, { trivia: true });
  const last = toks[toks.length - 1];
  if (last && last.end === caret && ((last.type === 'comment' && (last.unterminated || !/\n/.test(last.text) && !last.text.startsWith('/*'))) || (last.type === 'string' && last.unterminated))) return null;

  const tables = [...model.tables.values()];
  const measures = [...model.measures.values()];
  const call = callContext(text, caret);
  const fn = call ? FUNCTION_MAP.get(call.name) : null;
  const param = paramFor(fn, call ? call.arg : 0);

  // 1) inside [ … ]
  if (last && last.type === 'bracket' && last.unterminated && last.end === caret) {
    const typed = last.value;
    const prev = toks.filter(t => t.type !== 'ws' && t.type !== 'comment');
    const owner = prev.length >= 2 ? prev[prev.length - 2] : null;
    let items = [];
    if (owner && (owner.type === 'word' || owner.type === 'quoted') && owner.end <= last.start) {
      const ownerName = owner.type === 'quoted' ? owner.value : owner.text;
      const t = tableOfModel(model, ownerName);
      if (t) items = t.cols.map(c => ({ label: c.name, insert: `${bracketBody(c.name)}`, kind: 'column', detail: `${t.name} · ${c.type}`, closeBracket: true }));
      else return null;
    } else {
      items = measures.map(m => ({ label: m.name, insert: bracketBody(m.name), kind: 'measure', detail: `Measure · ${m.table}`, doc: m.expr, closeBracket: true }));
      for (const t of tables) for (const c of t.cols) items.push({ label: `${t.name}[${c.name}]`, insert: `${tableRef(t.name)}[${bracketBody(c.name)}`, kind: 'column', detail: c.type, closeBracket: true, replaceBracket: true });
    }
    const from = last.start + 1;
    return rank(items, typed, { from, to: caret, forceAll: true });
  }

  // 2) 'quoted table name
  if (last && last.type === 'quoted' && last.unterminated && last.end === caret) {
    const items = tables.map(t => ({ label: t.name, insert: `${t.name.replace(/'/g, "''")}'`, kind: 'table', detail: `Table · ${t.cols.length} columns` }));
    return rank(items, last.value, { from: last.start + 1, to: caret, forceAll: true });
  }

  // 3) identifier prefix
  let from = caret;
  while (from > 0 && /[A-Za-z0-9_.]/.test(text[from - 1])) from--;
  const prefix = text.slice(from, caret);
  const afterOp = /(\[|'|")$/.test(text.slice(0, from));
  if (afterOp) return null;
  const fresh = prefix === '';
  if (fresh && !force && !(param && param.kind === 'interval')) return null;
  if (!fresh && /^[0-9]/.test(prefix)) return null;

  if (param && param.kind === 'interval') {
    const items = INTERVALS.map(n => ({ label: n, insert: n, kind: 'keyword', detail: 'Interval' }));
    return rank(items, prefix, { from, to: caret, forceAll: fresh });
  }

  const items = [];
  const wantTables = !param || ['table', 'tableOrColumn', 'expression'].includes(param.kind);
  const wantColumns = !param || ['column', 'tableOrColumn', 'expression'].includes(param.kind);
  for (const v of declaredVars(text, from)) items.push({ label: v, insert: v, kind: 'variable', detail: 'Variable', boost: 3 });
  if (wantTables || fresh) for (const t of tables) items.push({ label: t.name, insert: tableRef(t.name), kind: 'table', detail: `Table · ${t.cols.length} columns`, boost: param && (param.kind === 'table' || param.kind === 'tableOrColumn') ? 4 : 1 });
  if (wantColumns) for (const t of tables) for (const c of t.cols) items.push({ label: `${t.name}[${c.name}]`, match: c.name, insert: `${tableRef(t.name)}[${c.name}]`, kind: 'column', detail: c.type, boost: param && (param.kind === 'column' || param.kind === 'tableOrColumn') ? 4 : 0, minPrefix: 2 });
  for (const m of measures) items.push({ label: `[${m.name}]`, match: m.name, insert: `[${m.name}]`, kind: 'measure', detail: `Measure · ${m.table}`, doc: m.expr, boost: 1 });
  for (const f of FUNCTIONS) items.push({ label: f.name, insert: `${f.name}(`, kind: 'function', detail: f.category, doc: f.doc, signature: f.signature, caretInside: true, boost: param && ['table', 'expression'].includes(param.kind) ? 0 : 0 });
  for (const k of KEYWORDS) items.push({ label: k.name, insert: `${k.name} `, kind: 'keyword', detail: 'Keyword', doc: k.doc });
  return rank(items, prefix, { from, to: caret, forceAll: fresh });
}

const bracketBody = name => name.replace(/]/g, ']]');
const KIND_ORDER = { variable: 0, table: 1, column: 2, measure: 3, function: 4, keyword: 5 };

function rank(items, typed, { from, to, forceAll }) {
  const q = typed.toLowerCase();
  const scored = [];
  for (const it of items) {
    const hay = (it.match ?? it.label).toLowerCase();
    if (it.minPrefix && q.length < it.minPrefix) continue;
    let s;
    if (!q) s = forceAll ? 2 : null;
    else if (hay.startsWith(q)) s = 0;
    else if (hay.includes(q)) s = 1;
    else if (it.kind === 'column' && it.label.toLowerCase().includes(q)) s = 1.5;
    else s = null;
    if (s === null) continue;
    scored.push({ it, s: s - (it.boost ?? 0) * 0.3 });
  }
  if (!scored.length) return null;
  scored.sort((a, b) => a.s - b.s || KIND_ORDER[a.it.kind] - KIND_ORDER[b.it.kind] || a.it.label.localeCompare(b.it.label));
  const out = scored.slice(0, 14).map(x => x.it);
  if (out.length === 1 && out[0].label.toLowerCase() === q && out[0].kind !== 'function') return null;
  return { from, to, items: out };
}

/** Signature help for the call around the caret. */
export function signatureHelp(text, caret) {
  const call = callContext(text, caret);
  if (!call) return null;
  const fn = FUNCTION_MAP.get(call.name);
  if (!fn) return null;
  const active = Math.min(call.arg, fn.params.length - 1 < 0 ? 0 : fn.params.length - 1);
  const idx = call.arg < fn.params.length ? call.arg : (fn.params[fn.params.length - 1]?.repeat ? fn.params.length - 1 : -1);
  return { fn, active: idx, argIndex: call.arg, activeLabel: idx >= 0 ? fn.params[idx].label : null, _active: active };
}

/**
 * Colours the text. Returns [{start,end,cls}] for non-whitespace tokens; cls ∈ fn | kw | tbl | col | meas | var | num | str | cmt | op | err.
 */
export function highlight(text, model) {
  const tokens = lex(text, { trivia: true });
  const real = tokens.filter(t => t.type !== 'ws' && t.type !== 'comment');
  const idxOf = new Map(real.map((t, i) => [t, i]));
  const vars = new Set();
  real.forEach((t, i) => { if (t.type === 'word' && t.text.toUpperCase() === 'VAR' && real[i + 1]?.type === 'word') vars.add(real[i + 1].text.toLowerCase()); });
  const head = findMeasureHead(real, text);
  const headEnd = head ? real[head.eq].start : -1;
  const out = [];
  for (const t of tokens) {
    if (t.type === 'ws') continue;
    if (head && t.end <= headEnd && t.type !== 'comment') { out.push({ start: t.start, end: t.end, cls: 'meas' }); continue; }
    let cls = null;
    const i = idxOf.get(t);
    const next = i !== undefined ? real[i + 1] : null;
    const prev = i !== undefined ? real[i - 1] : null;
    switch (t.type) {
      case 'comment': cls = 'cmt'; break;
      case 'number': cls = 'num'; break;
      case 'string': cls = t.unterminated ? 'err' : 'str'; break;
      case 'op': cls = 'op'; break;
      case 'word': {
        const up = t.text.toUpperCase();
        if (up === 'VAR' || up === 'RETURN' || up === 'IN') cls = 'kw';
        else if (next && next.type === 'op' && next.text === '(') cls = FUNCTION_MAP.has(up) ? 'fn' : 'err';
        else if (next && next.type === 'bracket') cls = tableOfModel(model, t.text) ? 'tbl' : 'err';
        else if (vars.has(t.text.toLowerCase())) cls = 'var';
        else if (tableOfModel(model, t.text)) cls = 'tbl';
        else if (INTERVALS.includes(up) || up === 'TRUE' || up === 'FALSE') cls = 'kw';
        else cls = 'err';
        break;
      }
      case 'quoted': cls = tableOfModel(model, t.value) && !t.unterminated ? 'tbl' : 'err'; break;
      case 'bracket': {
        if (t.unterminated) { cls = 'err'; break; }
        const owner = prev && (prev.type === 'word' || prev.type === 'quoted') && prev.end <= t.start ? prev : null;
        if (owner) {
          const tb = tableOfModel(model, owner.type === 'quoted' ? owner.value : owner.text);
          cls = tb && tb.colMap.has(t.value.toLowerCase()) ? 'col' : 'err';
        } else cls = model.measures.has(t.value.toLowerCase()) ? 'meas' : 'meas';
        break;
      }
      default: cls = t.text === '%' ? 'op' : 'err';
    }
    out.push({ start: t.start, end: t.end, cls });
  }
  return out;
}

/** Syntax + name problems for the status bar. */
export function diagnose(text, model) {
  if (!text.trim()) return { ok: false, empty: true, issues: [] };
  let compiled;
  try { compiled = compile(text); } catch (e) {
    if (e instanceof DaxError) return { ok: false, issues: [{ message: e.message, start: e.start ?? 0, end: e.end ?? (e.start ?? 0) + 1 }] };
    throw e;
  }
  const issues = validate(model, compiled.ast);
  return { ok: issues.length === 0, issues, compiled };
}

export function lineCol(text, offset) {
  const before = text.slice(0, Math.max(0, Math.min(offset, text.length)));
  const lines = before.split('\n');
  return { line: lines.length, col: lines[lines.length - 1].length + 1 };
}
