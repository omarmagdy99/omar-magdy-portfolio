// A small DAX engine: lexer, parser and evaluator for the subset of DAX used by the challenges.
// The same file runs in the browser (live preview, diagnostics) and in the Worker (authoritative grading).
// It models filter context, row context, context transition and the relationships of a star schema.

export class DaxError extends Error {
  constructor(message, start = null, end = null) { super(message); this.name = 'DaxError'; this.start = start; this.end = end; }
}
class BudgetError extends DaxError {}

/* ───────────────────────────── lexer ───────────────────────────── */

const WORD_START = /[A-Za-z_À-￿]/;
const WORD_PART = /[A-Za-z0-9_.À-￿]/;
const OPS3 = new Set(['<>', '<=', '>=', '&&', '||', '==']);
const OPS1 = new Set('+-*/^&=<>(),{}!;'.split(''));

/** Tokenises DAX. With `trivia: true` whitespace and comments are returned too (used by the highlighter). */
export function lex(src, { trivia = false } = {}) {
  const out = [];
  const n = src.length;
  let i = 0;
  const push = (type, start, end, extra) => out.push({ type, start, end, text: src.slice(start, end), ...extra });
  while (i < n) {
    const c = src[i];
    if (/\s/.test(c)) { let j = i + 1; while (j < n && /\s/.test(src[j])) j++; if (trivia) push('ws', i, j); i = j; continue; }
    if ((c === '/' && src[i + 1] === '/') || (c === '-' && src[i + 1] === '-')) {
      let j = i + 2; while (j < n && src[j] !== '\n') j++;
      if (trivia) push('comment', i, j); i = j; continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const k = src.indexOf('*/', i + 2); const end = k === -1 ? n : k + 2;
      if (trivia) push('comment', i, end, { unterminated: k === -1 }); i = end; continue;
    }
    if (c === '"') {
      let j = i + 1, value = '';
      for (;;) {
        if (j >= n) { push('string', i, n, { value, unterminated: true }); i = n; break; }
        if (src[j] === '"') { if (src[j + 1] === '"') { value += '"'; j += 2; continue; } push('string', i, j + 1, { value }); i = j + 1; break; }
        value += src[j++];
      }
      continue;
    }
    if (c === "'" || c === '[') {
      const close = c === "'" ? "'" : ']';
      let j = i + 1, value = '';
      for (;;) {
        if (j >= n) { push(c === "'" ? 'quoted' : 'bracket', i, n, { value, unterminated: true }); i = n; break; }
        if (src[j] === close) { if (src[j + 1] === close) { value += close; j += 2; continue; } push(c === "'" ? 'quoted' : 'bracket', i, j + 1, { value }); i = j + 1; break; }
        value += src[j++];
      }
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      const m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(src.slice(i));
      push('number', i, i + m[0].length, { value: Number(m[0]) }); i += m[0].length; continue;
    }
    if (WORD_START.test(c)) {
      let j = i + 1; while (j < n && WORD_PART.test(src[j])) j++;
      while (src[j - 1] === '.') j--;
      push('word', i, j); i = j; continue;
    }
    const two = src.slice(i, i + 2);
    if (OPS3.has(two)) { push('op', i, i + 2); i += 2; continue; }
    if (OPS1.has(c)) { push('op', i, i + 1); i++; continue; }
    push('unknown', i, i + 1); i++;
  }
  return out;
}

/* ───────────────────────────── parser ───────────────────────────── */

const PREC = { '||': 1, '&&': 2, IN: 3, '=': 3, '==': 3, '<>': 3, '<': 3, '<=': 3, '>': 3, '>=': 3, '&': 4, '+': 5, '-': 5, '*': 6, '/': 6, '^': 7 };

const MAX_TOKENS = 3000, MAX_DEPTH = 100;

function parseTokens(tokens, src) {
  if (tokens.length > MAX_TOKENS) throw new DaxError(`This formula is too long (more than ${MAX_TOKENS} tokens).`, tokens[MAX_TOKENS].start, tokens[tokens.length - 1].end);
  let p = 0, depth = 0;
  const peek = (k = 0) => tokens[p + k];
  const here = () => peek() ?? { start: src.length, end: src.length, text: '' };
  const fail = (message, tok = here()) => { throw new DaxError(message, tok.start, tok.end); };
  const isOp = (t, text) => t && t.type === 'op' && t.text === text;
  const isWord = (t, text) => t && t.type === 'word' && t.text.toUpperCase() === text;
  const expectOp = (text) => {
    const t = peek();
    if (!isOp(t, text)) fail(t ? `Expected '${text}' but found '${t.text}'.` : `Expected '${text}' but the formula ended.`, t ?? { start: src.length, end: src.length });
    p++; return t;
  };

  function parseExpr(min) {
    if (++depth > MAX_DEPTH) fail('This formula is nested too deeply. Split it into variables (VAR) or simplify it.');
    try { return parseExprInner(min); } finally { depth--; }
  }

  function parseExprInner(min) {
    let left = parseUnary();
    for (;;) {
      const t = peek();
      if (!t) break;
      let op = null;
      if (t.type === 'op') op = t.text === ';' ? null : t.text;
      else if (isWord(t, 'IN')) op = 'IN';
      const prec = op && PREC[op];
      if (!prec || prec < min) break;
      p++;
      const right = parseExpr(op === '^' ? prec : prec + 1);
      left = { t: 'bin', op, l: left, r: right, start: left.start, end: right.end };
    }
    return left;
  }

  function parseUnary() {
    const t = peek();
    if (t && t.type === 'op' && (t.text === '-' || t.text === '+')) { p++; const e = parseExpr(7); return { t: 'un', op: t.text, e, start: t.start, end: e.end }; }
    if (t && t.type === 'op' && t.text === '!') { p++; const e = parseExpr(4); return { t: 'un', op: '!', e, start: t.start, end: e.end }; }
    // DAX also accepts NOT as a prefix operator, e.g. NOT ISEMPTY ( … ).
    if (isWord(t, 'NOT') && !isOp(peek(1), '(')) { p++; const e = parseExpr(4); return { t: 'un', op: '!', e, start: t.start, end: e.end }; }
    return parsePrimary();
  }

  function parsePrimary() {
    const t = peek();
    if (!t) fail('The formula ended unexpectedly. Something is missing at the end.', { start: src.length, end: src.length });
    if (t.type === 'number') { p++; return { t: 'num', v: t.value, start: t.start, end: t.end }; }
    if (t.type === 'string') { if (t.unterminated) fail('This text is missing its closing quote (").', t); p++; return { t: 'str', v: t.value, start: t.start, end: t.end }; }
    if (t.type === 'op' && t.text === '(') {
      p++; const e = parseExpr(0); expectOp(')'); return e;
    }
    if (t.type === 'op' && t.text === '{') {
      p++; const items = [];
      if (!isOp(peek(), '}')) for (;;) { items.push(parseExpr(0)); if (isOp(peek(), ',')) { p++; continue; } break; }
      const close = expectOp('}');
      return { t: 'list', items, start: t.start, end: close.end };
    }
    if (t.type === 'bracket') {
      if (t.unterminated) fail("This reference is missing its closing bracket ']'.", t);
      p++; return { t: 'meas', name: t.value, start: t.start, end: t.end };
    }
    if (t.type === 'quoted') {
      if (t.unterminated) fail("This table name is missing its closing quote (').", t);
      p++;
      const b = peek();
      if (b && b.type === 'bracket') { if (b.unterminated) fail("This reference is missing its closing bracket ']'.", b); p++; return { t: 'col', table: t.value, col: b.value, start: t.start, end: b.end }; }
      return { t: 'name', name: t.value, quoted: true, start: t.start, end: t.end };
    }
    if (t.type === 'word') {
      const up = t.text.toUpperCase();
      if (up === 'VAR') return parseVars();
      if (up === 'RETURN') fail("'RETURN' must come after at least one VAR.", t);
      if (['DEFINE', 'EVALUATE', 'MEASURE'].includes(up)) fail(`Write just the measure formula. You don't need ${up}.`, t);
      p++;
      if (isOp(peek(), '(')) {
        p++; const args = [];
        if (!isOp(peek(), ')')) {
          for (;;) {
            if (isOp(peek(), ',') || isOp(peek(), ';')) args.push({ t: 'empty', start: here().start, end: here().start });
            else args.push(parseExpr(0));
            if (isOp(peek(), ',') || isOp(peek(), ';')) { p++; continue; }
            break;
          }
        }
        const close = expectOp(')');
        return { t: 'call', name: up, args, start: t.start, end: close.end };
      }
      const b = peek();
      if (b && b.type === 'bracket') { if (b.unterminated) fail("This reference is missing its closing bracket ']'.", b); p++; return { t: 'col', table: t.text, col: b.value, start: t.start, end: b.end }; }
      if (up === 'TRUE') return { t: 'bool', v: true, start: t.start, end: t.end };
      if (up === 'FALSE') return { t: 'bool', v: false, start: t.start, end: t.end };
      return { t: 'name', name: t.text, start: t.start, end: t.end };
    }
    if (t.type === 'op') fail(`Unexpected '${t.text}' here. An expression, column or function was expected.`, t);
    fail(`Unexpected '${t.text}'.`, t);
  }

  function parseVars() {
    const first = peek(); const vars = [];
    while (isWord(peek(), 'VAR')) {
      p++;
      const name = peek();
      if (!name || name.type !== 'word') fail('A name is needed after VAR, for example VAR Total = …', name ?? here());
      p++;
      expectOp('=');
      vars.push({ name: name.text, expr: parseExpr(0), start: name.start, end: name.end });
    }
    if (!isWord(peek(), 'RETURN')) fail("After the VAR declarations, add RETURN followed by the result.", peek() ?? { start: src.length, end: src.length });
    p++;
    const body = parseExpr(0);
    return { t: 'let', vars, body, start: first.start, end: body.end };
  }

  const ast = parseExpr(0);
  if (p < tokens.length) fail(`Unexpected '${tokens[p].text}'. Check for a missing comma, operator or an extra parenthesis.`, tokens[p]);
  return ast;
}

/** Parses a bare expression (a measure body). */
export function parseExpression(src) {
  const tokens = lex(src);
  if (!tokens.length) throw new DaxError('The formula is empty.', 0, 0);
  return parseTokens(tokens, src);
}

/** Finds a leading `Measure Name =`. Returns { eq, name } (eq = index of the `=` token) or null. */
export function findMeasureHead(tokens, src) {
  let depth = 0, eq = -1;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === 'op' && (t.text === '(' || t.text === '{')) depth++;
    else if (t.type === 'op' && (t.text === ')' || t.text === '}')) depth--;
    else if (depth === 0 && t.type === 'op' && t.text === '=') { eq = i; break; }
  }
  if (eq <= 0) return null;
  const head = tokens.slice(0, eq);
  // Power BI lets a measure name contain spaces, digits and symbols such as %, e.g. `Sales MoM % = …`.
  const wordsOnly = head[0].type === 'word' && head.every(t => (t.type === 'word' && !['VAR', 'RETURN', 'IN'].includes(t.text.toUpperCase())) || t.type === 'unknown' || t.type === 'number');
  const single = head.length === 1 && (head[0].type === 'bracket' || head[0].type === 'quoted');
  if (!wordsOnly && !single) return null;
  const name = single ? head[0].value : src.slice(head[0].start, head[head.length - 1].end).replace(/\s+/g, ' ');
  return { eq, name };
}

/** Parses `Name = expression` or a bare expression. */
export function compile(src) {
  const tokens = lex(src);
  if (!tokens.length) throw new DaxError('Write your measure in the editor first.', 0, 0);
  const head = findMeasureHead(tokens, src);
  let name = null, from = 0;
  if (head) {
    if (head.eq + 1 >= tokens.length) throw new DaxError('Add the formula after the = sign.', tokens[head.eq].start, tokens[head.eq].end);
    name = head.name; from = head.eq + 1;
  }
  const ast = parseTokens(tokens.slice(from), src);
  return { name, ast, src };
}

/* ───────────────────────────── values ───────────────────────────── */

const isDateStr = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const pad = (n, l = 2) => String(n).padStart(l, '0');
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const fmtDate = (y, m, d) => `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
const parseDate = s => ({ y: +s.slice(0, 4), m: +s.slice(5, 7), d: +s.slice(8, 10) });
const fromUTC = t => { const d = new Date(t); return fmtDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); };
const toUTC = s => { const { y, m, d } = parseDate(s); return Date.UTC(y, m - 1, d); };
const addDays = (s, k) => fromUTC(toUTC(s) + k * 86400000);
const monthIndex = s => { const { y, m } = parseDate(s); return y * 12 + (m - 1); };
const fromMonthIndex = (t, d) => { const y = Math.floor(t / 12), m = ((t % 12) + 12) % 12 + 1; return fmtDate(y, m, Math.min(d, daysIn(y, m))); };
const addMonthsClamp = (s, k) => fromMonthIndex(monthIndex(s) + k, parseDate(s).d);
const addMonthsMonthEnd = (s, k) => {
  const { y, m, d } = parseDate(s); const t = monthIndex(s) + k;
  const ny = Math.floor(t / 12), nm = ((t % 12) + 12) % 12 + 1;
  return fmtDate(ny, nm, d === daysIn(y, m) ? daysIn(ny, nm) : Math.min(d, daysIn(ny, nm)));
};

const keyOf = v => (v === null || v === undefined ? '\u0000' : typeof v === 'string' ? v : String(v));
const rowKey = row => row.map(keyOf).join('\u0001');

export class Tbl {
  constructor(cols, rows, opts = {}) {
    this.cols = cols; this.rows = rows;
    this.base = opts.base ?? null; this.ids = opts.ids ?? null; this.timeIntel = !!opts.timeIntel;
    this._ix = null;
  }
  indexOf(table, col) {
    if (!this._ix) {
      this._ix = new Map();
      this.cols.forEach((c, i) => {
        if (c.t) this._ix.set(`${c.t}\u0001${c.c}`.toLowerCase(), i);
        else this._ix.set(`\u0001${c.c}`.toLowerCase(), i);
      });
    }
    const v = this._ix.get(`${table ?? ''}\u0001${col}`.toLowerCase());
    return v === undefined ? -1 : v;
  }
}

function toNumber(v, node) {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v);
  throw new DaxError(`Can't convert the text "${v}" to a number.`, node?.start, node?.end);
}
function toBool(v, node) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  throw new DaxError('A true/false value was expected here.', node?.start, node?.end);
}
function compareValues(a, b) {
  if (a === null || a === undefined) a = typeof b === 'string' ? '' : typeof b === 'boolean' ? false : 0;
  if (b === null || b === undefined) b = typeof a === 'string' ? '' : typeof a === 'boolean' ? false : 0;
  if (typeof a === 'string' && typeof b === 'string') { const x = a.toLowerCase(), y = b.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; }
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : a > b ? 1 : 0;
  if (typeof a === 'number' && typeof b === 'string' && b.trim() !== '' && !isNaN(Number(b))) return compareValues(a, Number(b));
  if (typeof b === 'number' && typeof a === 'string' && a.trim() !== '' && !isNaN(Number(a))) return compareValues(Number(a), b);
  const x = String(a).toLowerCase(), y = String(b).toLowerCase();
  return x < y ? -1 : x > y ? 1 : 0;
}

/* ───────────────────────────── model ───────────────────────────── */

export class Model {
  /** spec: {tables:[{name,columns:[{name,type}],rows}], relationships:[{from:'Sales[CustomerID]',to:'Customers[CustomerID]'}], measures:[{name,table,expr}]} */
  constructor(spec) {
    this.spec = spec;
    this.tables = new Map();
    for (const t of spec.tables) {
      const cols = t.columns.map((c, i) => ({ name: c.name, type: c.type, i }));
      const table = { name: t.name, cols, colMap: new Map(cols.map(c => [c.name.toLowerCase(), c])), rows: t.rows, n: t.rows.length, keys: cols.map(() => null), unique: undefined };
      this.tables.set(t.name.toLowerCase(), table);
    }
    this.rels = [];
    for (const r of spec.relationships ?? []) {
      const many = this.refCol(r.from), one = this.refCol(r.to);
      const index = new Map();
      one.table.rows.forEach((row, i) => { const k = keyOf(row[one.col.i]); if (!index.has(k)) index.set(k, i); });
      const fk = new Int32Array(many.table.n);
      many.table.rows.forEach((row, i) => { const j = index.get(keyOf(row[many.col.i])); fk[i] = j === undefined ? -1 : j; });
      this.rels.push({ many: many.table, manyCol: many.col, one: one.table, oneCol: one.col, fk });
    }
    this.measures = new Map();
    for (const m of spec.measures ?? []) this.measures.set(m.name.toLowerCase(), { name: m.name, table: m.table, expr: m.expr, ast: null });
  }
  refCol(ref) {
    const m = /^'?([^'\[]+)'?\[(.+)\]$/.exec(ref);
    const table = this.tables.get(m[1].toLowerCase());
    return { table, col: table.colMap.get(m[2].toLowerCase()) };
  }
  table(name) { return this.tables.get(String(name).toLowerCase()); }
  colKeys(table, ci) {
    return table.keys[ci] ??= table.rows.map(r => keyOf(r[ci]));
  }
  uniqueCol(table) {
    if (table.unique !== undefined) return table.unique;
    table.unique = -1;
    for (const c of table.cols) {
      if (new Set(this.colKeys(table, c.i)).size === table.n) { table.unique = c.i; break; }
    }
    return table.unique;
  }
  measure(name) {
    const m = this.measures.get(String(name).toLowerCase());
    if (m && !m.ast) m.ast = parseExpression(m.expr);
    return m;
  }
}

/* ─────────────────────── filter context ─────────────────────── */

function newCtx(filters = []) { return { filters, cache: new Map() }; }
function cloneCtx(ctx) { return newCtx(ctx.filters.slice()); }

function removeEntries(ctx, pred) { ctx.filters = ctx.filters.filter(e => !pred(e)); }
function addEntry(ctx, entry, keep = false) {
  if (!keep) removeEntries(ctx, e => e.tbl === entry.tbl && (entry.replaceAll || e.cols.some(c => entry.cols.includes(c))));
  ctx.filters.push(entry);
}

let ENTRY_SEQ = 0;
const MASK_CACHE_LIMIT = 4000;

/** A mask only depends on the filter entries that reach the table, so entries get ids and masks are shared between contexts. */
function maskKey(model, ctx, table) {
  let own = '';
  for (const e of ctx.filters) if (e.tbl === table) own += `${(e.id ??= ++ENTRY_SEQ)},`;
  let key = `${table.name}:${own}`;
  for (const r of model.rels) if (r.many === table) key += `|${maskKey(model, ctx, r.one)}`;
  return key;
}

function visibleMask(model, ctx, table) {
  if (ctx.cache.has(table)) return ctx.cache.get(table);
  const shared = (model.maskCache ??= new Map());
  const key = maskKey(model, ctx, table);
  if (shared.has(key)) { const hit = shared.get(key); ctx.cache.set(table, hit); return hit; }
  const B = model.budget;
  if (B) { B.n += (table.n >> 2) + 1; if (B.n > B.max) throw new BudgetError('This formula needs too much work to evaluate. Try a simpler approach.'); }
  let mask = null;
  for (const e of ctx.filters) {
    if (e.tbl !== table) continue;
    mask ??= new Uint8Array(table.n).fill(1);
    if (e.cols.length === 1) {
      const keys = model.colKeys(table, e.cols[0]);
      for (let i = 0; i < table.n; i++) if (mask[i] && !e.set.has(keys[i])) mask[i] = 0;
    } else {
      const ks = e.cols.map(c => model.colKeys(table, c));
      for (let i = 0; i < table.n; i++) if (mask[i] && !e.set.has(ks.map(k => k[i]).join(''))) mask[i] = 0;
    }
  }
  for (const r of model.rels) {
    if (r.many !== table) continue;
    const parent = visibleMask(model, ctx, r.one);
    if (!parent) continue;
    mask ??= new Uint8Array(table.n).fill(1);
    for (let i = 0; i < table.n; i++) if (mask[i] && (r.fk[i] < 0 || !parent[r.fk[i]])) mask[i] = 0;
  }
  if (shared.size >= MASK_CACHE_LIMIT) shared.clear();
  shared.set(key, mask);
  ctx.cache.set(table, mask);
  return mask;
}
function visibleIds(model, ctx, table) {
  const mask = visibleMask(model, ctx, table);
  const ids = [];
  if (!mask) for (let i = 0; i < table.n; i++) ids.push(i);
  else for (let i = 0; i < table.n; i++) if (mask[i]) ids.push(i);
  return ids;
}

function baseTbl(table, ids) {
  return new Tbl(table.cols.map(c => ({ t: table.name, c: c.name })), ids.map(i => table.rows[i]), { base: table, ids });
}

/* ───────────────────────────── evaluator ───────────────────────────── */

const FUNCS = {};
const KNOWN_UNSUPPORTED = new Set(['RANKX', 'EARLIER', 'EARLIEST', 'FORMAT', 'CONCATENATEX', 'GENERATE', 'GENERATEALL', 'CROSSJOIN', 'ISINSCOPE', 'ISFILTERED', 'ISCROSSFILTERED', 'SUMMARIZECOLUMNS', 'USERELATIONSHIP', 'TOTALYTD', 'TOTALQTD', 'TOTALMTD', 'GROUPBY', 'NATURALINNERJOIN', 'NATURALLEFTOUTERJOIN', 'PATH', 'PATHITEM', 'ROW', 'DATATABLE', 'CALENDAR', 'CALENDARAUTO', 'GENERATESERIES', 'SELECTEDMEASURE', 'LEFT', 'RIGHT', 'MID', 'LEN', 'UPPER', 'LOWER', 'TRIM', 'SEARCH', 'FIND', 'SUBSTITUTE', 'REPLACE', 'CONCATENATE', 'VALUE', 'TODAY', 'NOW', 'CLOSINGBALANCEMONTH', 'OPENINGBALANCEMONTH', 'FIRSTNONBLANK', 'LASTNONBLANK', 'MEDIAN', 'PERCENTILE.INC', 'STDEV.S', 'COUNTAX', 'PRODUCT', 'RANK', 'WINDOW', 'OFFSET', 'INDEX', 'DISTINCTCOUNTNOBLANK', 'ALLNOBLANKROW', 'ISONORAFTER', 'CURRENCY', 'WEEKDAY', 'WEEKNUM', 'NEXTQUARTER', 'NEXTYEAR', 'STARTOFMONTH', 'ENDOFMONTH', 'STARTOFYEAR', 'ENDOFYEAR', 'MOD', 'POWER', 'SQRT', 'CEILING', 'FLOOR', 'TRUNC', 'ROUNDUP', 'ROUNDDOWN']);
export const SUPPORTED = FUNCS;

function step(env, n = 1) {
  env.B.n += n;
  if (env.B.n > env.B.max) throw new BudgetError('This formula needs too much work to evaluate. Try a simpler approach.');
}
function mkEnv(env, patch) { return { ...env, ...patch }; }
function lookupVar(env, name) {
  const key = name.toLowerCase();
  for (let v = env.vars; v; v = v.parent) if (v.key === key) return v;
  return null;
}

function resolveTable(env, node, name = node.table ?? node.name) {
  const t = env.model.table(name);
  if (!t) throw new DaxError(`The table '${name}' doesn't exist in this model.`, node.start, node.end);
  return t;
}
function resolveCol(env, node) {
  const t = resolveTable(env, node, node.table);
  const c = t.colMap.get(node.col.toLowerCase());
  if (!c) throw new DaxError(`The column '${t.name}[${node.col}]' doesn't exist. Check the Fields pane for the columns of ${t.name}.`, node.start, node.end);
  return { t, c };
}

function visibleValues(env, t, ci) {
  const mask = visibleMask(env.model, env.ctx, t);
  const out = [];
  step(env, t.n >> 3);
  if (!mask) for (const r of t.rows) out.push(r[ci]);
  else for (let i = 0; i < t.n; i++) if (mask[i]) out.push(t.rows[i][ci]);
  return out;
}
function distinct(values) {
  const seen = new Set(), out = [];
  for (const v of values) { const k = keyOf(v); if (!seen.has(k)) { seen.add(k); out.push(v); } }
  return out;
}
function colTbl(t, ci, values) {
  return new Tbl([{ t: t.name, c: t.cols[ci].name }], values.map(v => [v]));
}

function evalNode(node, env) {
  step(env);
  switch (node.t) {
    case 'num': case 'str': case 'bool': return node.v;
    case 'empty': return null;
    case 'name': return evalName(node, env);
    case 'col': return evalColumn(node, env);
    case 'meas': return evalMeasureRef(node, env);
    case 'bin': return evalBinary(node, env);
    case 'un': {
      const v = evalNode(node.e, env);
      if (node.op === '!') return !toBool(v, node.e);
      return node.op === '-' ? -toNumber(v, node.e) : toNumber(v, node.e);
    }
    case 'list': return new Tbl([{ t: null, c: 'Value' }], node.items.map(i => [evalNode(i, env)]));
    case 'let': {
      let e = env;
      for (const v of node.vars) {
        const value = evalNode(v.expr, e);
        e = mkEnv(e, { vars: { key: v.name.toLowerCase(), value, parent: e.vars } });
      }
      return evalNode(node.body, e);
    }
    case 'call': return evalCall(node, env);
    default: throw new DaxError('Unsupported expression.', node.start, node.end);
  }
}

function evalName(node, env) {
  const v = lookupVar(env, node.name);
  if (v && !node.quoted) return v.value;
  const t = env.model.table(node.name);
  if (t) return baseTbl(t, visibleIds(env.model, env.ctx, t));
  throw new DaxError(`'${node.name}' isn't a table, variable or measure in this model.`, node.start, node.end);
}

function evalColumn(node, env) {
  const { t, c } = resolveCol(env, node);
  for (let k = env.frames.length - 1; k >= 0; k--) {
    const f = env.frames[k];
    const ix = f.tbl.indexOf(t.name, c.name);
    if (ix >= 0) return f.tbl.rows[f.i][ix];
  }
  // No row context: DAX returns the value only when the filter context leaves a single one.
  const vals = distinct(visibleValues(env, t, c.i));
  if (vals.length === 0) return null;
  if (vals.length === 1) return vals[0];
  throw new DaxError(`A single value for '${t.name}[${c.name}]' can't be determined: several values are visible. Aggregate it (for example with VALUES, MAX or DISTINCTCOUNT) or iterate over it.`, node.start, node.end);
}

function transitionEntries(env) {
  const entries = [];
  for (const f of env.frames) {
    const row = f.tbl.rows[f.i];
    if (f.tbl.base) {
      const bt = f.tbl.base, uc = env.model.uniqueCol(bt);
      if (uc >= 0) entries.push({ tbl: bt, cols: [uc], set: new Set([keyOf(row[uc])]), replaceAll: true });
      else entries.push({ tbl: bt, cols: bt.cols.map(c => c.i), set: new Set([row.slice(0, bt.cols.length).map(keyOf).join('\u0001')]), replaceAll: true });
      continue;
    }
    const groups = new Map();
    f.tbl.cols.forEach((c, i) => {
      if (!c.t) return;
      const t = env.model.table(c.t); if (!t) return;
      const ci = t.colMap.get(c.c.toLowerCase())?.i; if (ci === undefined) return;
      if (!groups.has(t)) groups.set(t, []);
      groups.get(t).push([ci, i]);
    });
    for (const [t, pairs] of groups) entries.push({ tbl: t, cols: pairs.map(p => p[0]), set: new Set([pairs.map(p => keyOf(row[p[1]])).join('\u0001')]) });
  }
  return entries;
}
function transitioned(env) {
  if (!env.frames.length) return env.ctx;
  const ctx = cloneCtx(env.ctx);
  for (const e of transitionEntries(env)) addEntry(ctx, e);
  return ctx;
}

function evalMeasureRef(node, env) {
  for (let k = env.frames.length - 1; k >= 0; k--) {
    const f = env.frames[k];
    const ix = f.tbl.indexOf(null, node.name);
    if (ix >= 0) return f.tbl.rows[f.i][ix];
  }
  const m = env.model.measure(node.name);
  if (!m) throw new DaxError(`The measure [${node.name}] doesn't exist. To use a column, write it with its table, like Sales[${node.name}].`, node.start, node.end);
  if (env.depth > 60) throw new DaxError(`The measure [${m.name}] refers to itself.`, node.start, node.end);
  return evalNode(m.ast, mkEnv(env, { ctx: transitioned(env), frames: [], vars: null, depth: env.depth + 1 }));
}

function evalBinary(node, env) {
  const { op } = node;
  if (op === '&&') return toBool(evalNode(node.l, env), node.l) && toBool(evalNode(node.r, env), node.r);
  if (op === '||') return toBool(evalNode(node.l, env), node.l) || toBool(evalNode(node.r, env), node.r);
  const a = evalNode(node.l, env);
  if (op === 'IN') {
    const t = evalNode(node.r, env);
    if (!(t instanceof Tbl)) throw new DaxError('IN needs a table or a list like {1, 2, 3} on the right.', node.r.start, node.r.end);
    const keys = new Set(t.rows.map(r => keyOf(r[0])));
    return keys.has(keyOf(a)) || t.rows.some(r => compareValues(r[0], a) === 0);
  }
  const b = evalNode(node.r, env);
  if (a instanceof Tbl || b instanceof Tbl) throw new DaxError('A table was used where a single value is expected.', node.start, node.end);
  switch (op) {
    case '=': case '==': return compareValues(a, b) === 0;
    case '<>': return compareValues(a, b) !== 0;
    case '<': return compareValues(a, b) < 0;
    case '<=': return compareValues(a, b) <= 0;
    case '>': return compareValues(a, b) > 0;
    case '>=': return compareValues(a, b) >= 0;
    case '&': return `${a ?? ''}${b ?? ''}`;
    case '+':
      if (isDateStr(a) && typeof b === 'number') return addDays(a, b);
      if (isDateStr(b) && typeof a === 'number') return addDays(b, a);
      return toNumber(a, node.l) + toNumber(b, node.r);
    case '-':
      if (isDateStr(a) && isDateStr(b)) return Math.round((toUTC(a) - toUTC(b)) / 86400000);
      if (isDateStr(a) && typeof b === 'number') return addDays(a, -b);
      return toNumber(a, node.l) - toNumber(b, node.r);
    case '*': return toNumber(a, node.l) * toNumber(b, node.r);
    case '/': { const d = toNumber(b, node.r); if (d === 0) return toNumber(a) === 0 ? NaN : Infinity; return toNumber(a, node.l) / d; }
    case '^': return Math.pow(toNumber(a, node.l), toNumber(b, node.r));
    default: throw new DaxError(`Unsupported operator ${op}.`, node.start, node.end);
  }
}

function evalCall(node, env) {
  const fn = Object.hasOwn(FUNCS, node.name) ? FUNCS[node.name] : null;
  if (!fn) {
    if (KNOWN_UNSUPPORTED.has(node.name)) throw new DaxError(`${node.name} is a real DAX function, but this challenge's checker doesn't support it yet. Try solving it with other functions.`, node.start, node.end);
    throw new DaxError(`Unknown function '${node.name}'. Check the spelling.`, node.start, node.end);
  }
  return fn(node, env, node.args);
}

/* helpers used by function implementations */
const E = (n, env) => evalNode(n, env);
function needArgs(node, min, max = min) {
  const n = node.args.length;
  if (n < min || n > max) throw new DaxError(`${node.name} expects ${min === max ? min : `${min}-${max === Infinity ? 'many' : max}`} argument${max === 1 ? '' : 's'} but got ${n}.`, node.start, node.end);
}
function tableArg(node, env, what = 'a table') {
  const v = evalNode(node, env);
  if (!(v instanceof Tbl)) throw new DaxError(`${what[0].toUpperCase() + what.slice(1)} was expected here, but this is a single value.`, node.start, node.end);
  return v;
}
function scalarArg(node, env) {
  const v = evalNode(node, env);
  if (v instanceof Tbl) {
    if (v.rows.length === 1 && v.cols.length === 1) return v.rows[0][0];
    throw new DaxError('A table was used where a single value is expected.', node.start, node.end);
  }
  return v;
}
function colArg(node, env, fn) {
  if (node.t !== 'col') throw new DaxError(`${fn} needs a column such as Sales[Amount].`, node.start, node.end);
  return resolveCol(env, node);
}
function rowEnv(env, tbl, i) { return mkEnv(env, { frames: [...env.frames, { tbl, i }] }); }

function numbersOf(values) { return values.filter(v => typeof v === 'number' || (typeof v === 'boolean')).map(Number); }

/* aggregations over a column */
FUNCS.SUM = (n, env) => { needArgs(n, 1); const { t, c } = colArg(n.args[0], env, 'SUM'); const v = numbersOf(visibleValues(env, t, c.i)); return v.length ? v.reduce((a, b) => a + b, 0) : null; };
FUNCS.AVERAGE = (n, env) => { needArgs(n, 1); const { t, c } = colArg(n.args[0], env, 'AVERAGE'); const v = numbersOf(visibleValues(env, t, c.i)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
FUNCS.MIN = (n, env) => aggMinMax(n, env, -1);
FUNCS.MAX = (n, env) => aggMinMax(n, env, 1);
function aggMinMax(n, env, dir) {
  needArgs(n, 1, 2);
  if (n.args.length === 2) {
    const a = scalarArg(n.args[0], env), b = scalarArg(n.args[1], env);
    if (a === null) return b; if (b === null) return a;
    return compareValues(a, b) * dir >= 0 ? a : b;
  }
  const arg = n.args[0];
  let values;
  if (arg.t === 'col') { const { t, c } = resolveCol(env, arg); values = visibleValues(env, t, c.i); }
  else { const tb = evalNode(arg, env); values = tb instanceof Tbl ? tb.rows.map(r => r[0]) : [tb]; }
  values = values.filter(v => v !== null && v !== undefined);
  if (!values.length) return null;
  return values.reduce((a, b) => (compareValues(b, a) * dir > 0 ? b : a));
}
FUNCS.COUNT = (n, env) => { needArgs(n, 1); const { t, c } = colArg(n.args[0], env, 'COUNT'); const v = visibleValues(env, t, c.i).filter(x => typeof x === 'number').length; return v || null; };
FUNCS.COUNTA = (n, env) => { needArgs(n, 1); const { t, c } = colArg(n.args[0], env, 'COUNTA'); const v = visibleValues(env, t, c.i).filter(x => x !== null && x !== undefined).length; return v || null; };
FUNCS.COUNTBLANK = (n, env) => { needArgs(n, 1); const { t, c } = colArg(n.args[0], env, 'COUNTBLANK'); return visibleValues(env, t, c.i).filter(x => x === null || x === undefined || x === '').length || null; };
FUNCS.DISTINCTCOUNT = (n, env) => { needArgs(n, 1); const { t, c } = colArg(n.args[0], env, 'DISTINCTCOUNT'); return distinct(visibleValues(env, t, c.i)).length; };
FUNCS.COUNTROWS = (n, env) => { needArgs(n, 1); const tb = tableArg(n.args[0], env); return tb.rows.length || null; };

/* iterators */
function iterate(n, env, fn) {
  needArgs(n, 2);
  const tb = tableArg(n.args[0], env);
  const out = [];
  for (let i = 0; i < tb.rows.length; i++) { step(env); out.push(scalarArg(n.args[1], rowEnv(env, tb, i))); }
  return fn(out);
}
FUNCS.SUMX = (n, env) => iterate(n, env, v => { const x = numbersOf(v); return x.length ? x.reduce((a, b) => a + b, 0) : null; });
FUNCS.AVERAGEX = (n, env) => iterate(n, env, v => { const x = numbersOf(v); return x.length ? x.reduce((a, b) => a + b, 0) / x.length : null; });
FUNCS.MINX = (n, env) => iterate(n, env, v => { const x = v.filter(a => a !== null); return x.length ? x.reduce((a, b) => (compareValues(b, a) < 0 ? b : a)) : null; });
FUNCS.MAXX = (n, env) => iterate(n, env, v => { const x = v.filter(a => a !== null); return x.length ? x.reduce((a, b) => (compareValues(b, a) > 0 ? b : a)) : null; });
FUNCS.COUNTX = (n, env) => iterate(n, env, v => v.filter(x => typeof x === 'number').length || null);

/* filter context */
function collectCols(node, out = new Map()) {
  if (!node || typeof node !== 'object') return out;
  if (node.t === 'col') out.set(`${node.table}\u0001${node.col}`.toLowerCase(), node);
  for (const k of ['l', 'r', 'e']) if (node[k]) collectCols(node[k], out);
  if (node.args) node.args.forEach(a => collectCols(a, out));
  if (node.items) node.items.forEach(a => collectCols(a, out));
  return out;
}
const MODIFIERS = new Set(['ALL', 'ALLEXCEPT', 'ALLSELECTED', 'REMOVEFILTERS']);

function tblToEntries(env, tb) {
  const byTbl = (env.model.entryByTbl ??= new WeakMap());
  const seen = byTbl.get(tb);
  if (seen) return seen;
  const result = tblToEntriesShared(env, tb);
  byTbl.set(tb, result);
  return result;
}
function tblToEntriesShared(env, tb) {
  const memo = (env.model.entryMemo ??= new Map());
  const memoKey = tb.rows.length <= 800 ? `${tb.base ? tb.base.name : ''}|${tb.cols.map(c => `${c.t}.${c.c}`).join(',')}|${tb.timeIntel ? 1 : 0}|${tb.rows.map(r => r.map(keyOf).join('')).join('')}` : null;
  if (memoKey && memo.has(memoKey)) return memo.get(memoKey);
  const entries = tblToEntriesUncached(env, tb);
  if (memoKey) { if (memo.size > 2000) memo.clear(); memo.set(memoKey, entries); }
  return entries;
}
function tblToEntriesUncached(env, tb) {
  const entries = [];
  if (tb.base) {
    const uc = env.model.uniqueCol(tb.base);
    if (uc >= 0) entries.push({ tbl: tb.base, cols: [uc], set: new Set(tb.rows.map(r => keyOf(r[uc]))), replaceAll: true });
    else entries.push({ tbl: tb.base, cols: tb.base.cols.map(c => c.i), set: new Set(tb.rows.map(r => r.slice(0, tb.base.cols.length).map(keyOf).join('\u0001'))), replaceAll: true });
    return entries;
  }
  const groups = new Map();
  tb.cols.forEach((c, i) => {
    if (!c.t) return;
    const t = env.model.table(c.t); const ci = t?.colMap.get(c.c.toLowerCase())?.i;
    if (ci === undefined) return;
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t).push([ci, i]);
  });
  if (!groups.size) throw new DaxError("This filter table doesn't carry any model columns, so it can't filter anything. Use TREATAS or a column from the model.");
  for (const [t, pairs] of groups) entries.push({ tbl: t, cols: pairs.map(p => p[0]), set: new Set(tb.rows.map(r => pairs.map(p => keyOf(r[p[1]])).join('\u0001'))), timeIntel: tb.timeIntel });
  return entries;
}

function booleanFilter(node, env) {
  const cols = [...collectCols(node).values()];
  if (!cols.length) throw new DaxError('A filter condition must reference a column, for example Sales[Amount] > 100.', node.start, node.end);
  const resolved = cols.map(c => resolveCol(env, c));
  const tables = new Set(resolved.map(r => r.t));
  if (tables.size > 1) throw new DaxError('A filter condition can only reference columns from one table. Use FILTER instead.', node.start, node.end);
  const t = resolved[0].t;
  const idxs = [...new Set(resolved.map(r => r.c.i))];
  let rows;
  if (idxs.length === 1) {
    rows = distinct(t.rows.map(r => r[idxs[0]])).map(v => [v]);
  } else {
    const seen = new Set(); rows = [];
    for (const r of t.rows) { const k = idxs.map(i => keyOf(r[i])).join('\u0001'); if (!seen.has(k)) { seen.add(k); rows.push(idxs.map(i => r[i])); } }
  }
  const tb = new Tbl(idxs.map(i => ({ t: t.name, c: t.cols[i].name })), rows);
  const kept = new Set();
  for (let i = 0; i < rows.length; i++) {
    step(env);
    if (toBool(evalNode(node, rowEnv(env, tb, i)), node)) kept.add(rows[i].map(keyOf).join('\u0001'));
  }
  return { tbl: t, cols: idxs, set: kept };
}

function buildContext(env, filterNodes) {
  const base = transitioned(env);
  const argEnv = mkEnv(env, { ctx: base });
  const removals = [], adds = [];
  for (const arg of filterNodes) {
    if (arg.t === 'empty') continue;
    let node = arg, keep = false;
    if (node.t === 'call' && node.name === 'KEEPFILTERS') { keep = true; node = node.args[0]; }
    if (node.t === 'call' && MODIFIERS.has(node.name)) { removals.push(node); continue; }
    if ((node.t === 'bin' && node.op !== '+' && node.op !== '-' && node.op !== '*' && node.op !== '/' && node.op !== '^' && node.op !== '&') || (node.t === 'un' && node.op === '!')) {
      adds.push({ keep, entries: [booleanFilter(node, argEnv)] }); continue;
    }
    const v = evalNode(node, argEnv);
    if (!(v instanceof Tbl)) throw new DaxError('A filter must be a true/false condition on a column, or a table.', node.start, node.end);
    adds.push({ keep, entries: tblToEntries(env, v) });
  }
  const ctx = cloneCtx(base);
  for (const m of removals) applyRemoval(env, ctx, m);
  for (const { keep, entries } of adds) for (const e of entries) {
    if (e.timeIntel) removeEntries(ctx, x => x.tbl === e.tbl);
    addEntry(ctx, e, keep);
  }
  return ctx;
}

function applyRemoval(env, ctx, m) {
  const a = m.args;
  if (m.name === 'ALLEXCEPT') {
    const t = resolveTable(env, a[0], a[0].name ?? a[0].table);
    const keepCols = new Set(a.slice(1).map(x => resolveCol(env, x).c.i));
    removeEntries(ctx, e => e.tbl === t && !e.cols.every(c => keepCols.has(c)));
    return;
  }
  if (!a.length) { ctx.filters = []; ctx.cache = new Map(); return; }
  for (const x of a) {
    if (x.t === 'col') { const { t, c } = resolveCol(env, x); removeEntries(ctx, e => e.tbl === t && e.cols.includes(c.i)); }
    else if (x.t === 'name') { const t = resolveTable(env, x); removeEntries(ctx, e => e.tbl === t); }
    else throw new DaxError(`${m.name} needs a table or columns.`, x.start, x.end);
  }
}

FUNCS.CALCULATE = (n, env) => {
  if (n.args.length < 1) throw new DaxError('CALCULATE needs an expression.', n.start, n.end);
  const ctx = buildContext(env, n.args.slice(1));
  return evalNode(n.args[0], mkEnv(env, { ctx, frames: [] }));
};
FUNCS.CALCULATETABLE = (n, env) => {
  if (n.args.length < 1) throw new DaxError('CALCULATETABLE needs a table expression.', n.start, n.end);
  const ctx = buildContext(env, n.args.slice(1));
  const v = evalNode(n.args[0], mkEnv(env, { ctx, frames: [] }));
  if (!(v instanceof Tbl)) throw new DaxError('The first argument of CALCULATETABLE must be a table.', n.args[0].start, n.args[0].end);
  return v;
};
FUNCS.KEEPFILTERS = (n, env) => evalNode(n.args[0], env);
const noMod = name => (n) => { throw new DaxError(`${name} is a filter modifier. Use it as a filter argument inside CALCULATE.`, n.start, n.end); };
FUNCS.REMOVEFILTERS = noMod('REMOVEFILTERS');

function allTable(n, env) {
  const a = n.args;
  if (!a.length) throw new DaxError(`${n.name} needs a table or column.`, n.start, n.end);
  if (a[0].t === 'col') {
    const cols = a.map(x => colArg(x, env, n.name));
    const t = cols[0].t;
    if (cols.some(c => c.t !== t)) throw new DaxError('All columns must come from the same table.', n.start, n.end);
    const seen = new Set(), rows = [];
    for (const r of t.rows) { const row = cols.map(c => r[c.c.i]); const k = rowKey(row); if (!seen.has(k)) { seen.add(k); rows.push(row); } }
    return new Tbl(cols.map(c => ({ t: t.name, c: c.c.name })), rows);
  }
  const t = resolveTable(env, a[0], a[0].name ?? a[0].table);
  return baseTbl(t, t.rows.map((_, i) => i));
}
FUNCS.ALL = allTable;
FUNCS.ALLSELECTED = allTable;
FUNCS.ALLEXCEPT = (n, env) => {
  const t = resolveTable(env, n.args[0], n.args[0].name ?? n.args[0].table);
  const keepCols = n.args.slice(1).map(x => resolveCol(env, x).c.i);
  const ctx = cloneCtx(env.ctx);
  removeEntries(ctx, e => e.tbl === t && !e.cols.every(c => keepCols.includes(c)));
  return baseTbl(t, visibleIds(env.model, ctx, t));
};

FUNCS.VALUES = FUNCS.DISTINCT = (n, env) => {
  needArgs(n, 1);
  const arg = n.args[0];
  if (arg.t === 'col') {
    const { t, c } = resolveCol(env, arg);
    return colTbl(t, c.i, distinct(visibleValues(env, t, c.i)));
  }
  const v = evalNode(arg, env);
  if (!(v instanceof Tbl)) throw new DaxError(`${n.name} needs a column or table.`, arg.start, arg.end);
  if (n.name === 'VALUES' && v.base) return v;
  const seen = new Set(), rows = [], ids = [];
  v.rows.forEach((r, i) => { const k = rowKey(r); if (!seen.has(k)) { seen.add(k); rows.push(r); if (v.ids) ids.push(v.ids[i]); } });
  return new Tbl(v.cols, rows, { base: v.base, ids: v.ids ? ids : null, timeIntel: v.timeIntel });
};

FUNCS.FILTER = (n, env) => {
  needArgs(n, 2);
  const tb = tableArg(n.args[0], env);
  const rows = [], ids = [];
  for (let i = 0; i < tb.rows.length; i++) {
    step(env);
    if (toBool(scalarArg(n.args[1], rowEnv(env, tb, i)), n.args[1])) { rows.push(tb.rows[i]); if (tb.ids) ids.push(tb.ids[i]); }
  }
  return new Tbl(tb.cols, rows, { base: tb.base, ids: tb.ids ? ids : null, timeIntel: tb.timeIntel });
};

function namedPairs(n, env, from) {
  const out = [];
  for (let i = from; i < n.args.length; i += 2) {
    const nm = n.args[i];
    if (nm.t !== 'str') throw new DaxError(`${n.name} expects a column name in quotes, followed by an expression.`, nm.start, nm.end);
    if (!n.args[i + 1]) throw new DaxError(`The column "${nm.v}" needs an expression.`, nm.start, nm.end);
    out.push({ name: nm.v, expr: n.args[i + 1] });
  }
  return out;
}
FUNCS.ADDCOLUMNS = (n, env) => {
  const tb = tableArg(n.args[0], env);
  const extra = namedPairs(n, env, 1);
  const rows = tb.rows.map((r, i) => { step(env); const e = rowEnv(env, tb, i); return [...r, ...extra.map(x => scalarArg(x.expr, e))]; });
  return new Tbl([...tb.cols, ...extra.map(x => ({ t: null, c: x.name }))], rows, { base: tb.base, ids: tb.ids });
};
FUNCS.SELECTCOLUMNS = (n, env) => {
  const tb = tableArg(n.args[0], env);
  const cols = namedPairs(n, env, 1);
  const rows = tb.rows.map((_, i) => { step(env); const e = rowEnv(env, tb, i); return cols.map(x => scalarArg(x.expr, e)); });
  return new Tbl(cols.map(x => {
    const lineage = x.expr.t === 'col' ? resolveCol(env, x.expr) : null;
    return { t: lineage ? lineage.t.name : null, c: lineage ? lineage.c.name : x.name, alias: x.name };
  }), rows);
};
FUNCS.SUMMARIZE = (n, env) => {
  const tb = tableArg(n.args[0], env);
  const groupCols = [];
  let i = 1;
  for (; i < n.args.length && n.args[i].t === 'col'; i++) groupCols.push(resolveCol(env, n.args[i]));
  const extra = namedPairs(n, env, i);
  const idx = groupCols.map(g => tb.indexOf(g.t.name, g.c.name));
  if (idx.some(x => x < 0)) throw new DaxError('SUMMARIZE can only group by columns of the table given as the first argument.', n.start, n.end);
  const groups = new Map();
  tb.rows.forEach(r => { const k = idx.map(x => keyOf(r[x])).join('\u0001'); if (!groups.has(k)) groups.set(k, idx.map(x => r[x])); });
  const cols = [...groupCols.map(g => ({ t: g.t.name, c: g.c.name })), ...extra.map(x => ({ t: null, c: x.name }))];
  const sub = new Tbl(cols.slice(0, groupCols.length), [...groups.values()]);
  const rows = sub.rows.map((r, k) => { step(env); const e = mkEnv(env, { frames: [...env.frames, { tbl: sub, i: k }] }); return [...r, ...extra.map(x => scalarArg(x.expr, mkEnv(e, { ctx: transitioned(e), frames: [] })))]; });
  return new Tbl(cols, rows);
};
FUNCS.TOPN = (n, env) => {
  needArgs(n, 3, 4);
  const count = toNumber(scalarArg(n.args[0], env));
  const tb = tableArg(n.args[1], env);
  const desc = n.args[3] ? !(String(scalarArg(n.args[3], env)).toUpperCase() === 'ASC' || scalarArg(n.args[3], env) === 1) : true;
  const scored = tb.rows.map((r, i) => ({ i, s: scalarArg(n.args[2], rowEnv(env, tb, i)) }));
  scored.sort((a, b) => (desc ? -1 : 1) * compareValues(a.s, b.s));
  const keep = [];
  for (let k = 0; k < scored.length; k++) { if (k < count || (k > 0 && compareValues(scored[k].s, scored[count - 1]?.s) === 0)) keep.push(scored[k].i); else break; }
  return new Tbl(tb.cols, keep.map(i => tb.rows[i]), { base: tb.base, ids: tb.ids ? keep.map(i => tb.ids[i]) : null });
};

function sameShape(a, b, n) {
  if (a.cols.length !== b.cols.length) throw new DaxError(`${n.name} needs both tables to have the same number of columns.`, n.start, n.end);
}
FUNCS.INTERSECT = (n, env) => {
  needArgs(n, 2); const a = tableArg(n.args[0], env), b = tableArg(n.args[1], env); sameShape(a, b, n);
  const keys = new Set(b.rows.map(rowKey));
  const idxs = a.rows.map((r, i) => i).filter(i => keys.has(rowKey(a.rows[i])));
  return new Tbl(a.cols, idxs.map(i => a.rows[i]), { base: a.base, ids: a.ids ? idxs.map(i => a.ids[i]) : null, timeIntel: a.timeIntel });
};
FUNCS.EXCEPT = (n, env) => {
  needArgs(n, 2); const a = tableArg(n.args[0], env), b = tableArg(n.args[1], env); sameShape(a, b, n);
  const keys = new Set(b.rows.map(rowKey));
  const idxs = a.rows.map((r, i) => i).filter(i => !keys.has(rowKey(a.rows[i])));
  return new Tbl(a.cols, idxs.map(i => a.rows[i]), { base: a.base, ids: a.ids ? idxs.map(i => a.ids[i]) : null, timeIntel: a.timeIntel });
};
FUNCS.UNION = (n, env) => {
  if (n.args.length < 2) throw new DaxError('UNION needs at least two tables.', n.start, n.end);
  const tabs = n.args.map(a => tableArg(a, env)); tabs.forEach(t => sameShape(tabs[0], t, n));
  const seen = new Set(), rows = [];
  for (const t of tabs) for (const r of t.rows) { const k = rowKey(r); if (!seen.has(k)) { seen.add(k); rows.push(r); } }
  return new Tbl(tabs[0].cols, rows);
};
FUNCS.TREATAS = (n, env) => {
  if (n.args.length < 2) throw new DaxError('TREATAS needs a table and the columns to apply it to.', n.start, n.end);
  const tb = tableArg(n.args[0], env);
  const cols = n.args.slice(1).map(a => colArg(a, env, 'TREATAS'));
  if (cols.length !== tb.cols.length) throw new DaxError('TREATAS needs one target column for each column of the table.', n.start, n.end);
  return new Tbl(cols.map(c => ({ t: c.t.name, c: c.c.name })), tb.rows);
};
FUNCS.ISEMPTY = (n, env) => { needArgs(n, 1); return tableArg(n.args[0], env).rows.length === 0; };
FUNCS.CONTAINSROW = (n, env) => {
  if (n.args.length < 2) throw new DaxError('CONTAINSROW needs a table and a value.', n.start, n.end);
  const tb = tableArg(n.args[0], env); const vals = n.args.slice(1).map(a => scalarArg(a, env));
  return tb.rows.some(r => vals.every((v, i) => compareValues(r[i], v) === 0));
};
FUNCS.CONTAINS = (n, env) => {
  if (n.args.length < 3 || n.args.length % 2 === 0) throw new DaxError('CONTAINS needs a table, then column/value pairs.', n.start, n.end);
  const tb = tableArg(n.args[0], env); const pairs = [];
  for (let i = 1; i < n.args.length; i += 2) {
    const c = colArg(n.args[i], env, 'CONTAINS'); const ix = tb.indexOf(c.t.name, c.c.name);
    if (ix < 0) throw new DaxError('That column is not part of the table.', n.args[i].start, n.args[i].end);
    pairs.push([ix, scalarArg(n.args[i + 1], env)]);
  }
  return tb.rows.some(r => pairs.every(([ix, v]) => compareValues(r[ix], v) === 0));
};
FUNCS.HASONEVALUE = (n, env) => { needArgs(n, 1); const { t, c } = colArg(n.args[0], env, 'HASONEVALUE'); return distinct(visibleValues(env, t, c.i)).length === 1; };
FUNCS.SELECTEDVALUE = (n, env) => {
  needArgs(n, 1, 2); const { t, c } = colArg(n.args[0], env, 'SELECTEDVALUE');
  const v = distinct(visibleValues(env, t, c.i));
  return v.length === 1 ? v[0] : (n.args[1] ? scalarArg(n.args[1], env) : null);
};
FUNCS.LOOKUPVALUE = (n, env) => {
  if (n.args.length < 3 || n.args.length % 2 === 0) throw new DaxError('LOOKUPVALUE needs a result column, then search column/value pairs.', n.start, n.end);
  const { t, c } = colArg(n.args[0], env, 'LOOKUPVALUE');
  const pairs = [];
  for (let i = 1; i < n.args.length; i += 2) { const s = colArg(n.args[i], env, 'LOOKUPVALUE'); pairs.push([s.c.i, scalarArg(n.args[i + 1], env)]); }
  const hit = t.rows.find(r => pairs.every(([ci, v]) => compareValues(r[ci], v) === 0));
  return hit ? hit[c.i] : null;
};
FUNCS.RELATED = (n, env) => {
  needArgs(n, 1); const { t, c } = colArg(n.args[0], env, 'RELATED');
  for (let k = env.frames.length - 1; k >= 0; k--) {
    const f = env.frames[k];
    const direct = f.tbl.indexOf(t.name, c.name);
    if (direct >= 0) return f.tbl.rows[f.i][direct];
    if (f.tbl.base && f.tbl.ids) {
      let table = f.tbl.base, row = f.tbl.ids[f.i];
      for (let hop = 0; hop < 4 && row >= 0; hop++) {
        const rel = env.model.rels.find(r => r.many === table);
        if (!rel) break;
        row = rel.fk[row]; table = rel.one;
        if (row >= 0 && table === t) return t.rows[row][c.i];
      }
    }
  }
  throw new DaxError('RELATED needs a row context, for example inside SUMX, FILTER or ADDCOLUMNS over a table that is related to this one.', n.start, n.end);
};
FUNCS.RELATEDTABLE = (n, env) => {
  needArgs(n, 1); const t = resolveTable(env, n.args[0], n.args[0].name ?? n.args[0].table);
  const ctx = transitioned(env);
  return baseTbl(t, visibleIds(env.model, ctx, t));
};

/* logic */
FUNCS.IF = (n, env) => { needArgs(n, 2, 3); return toBool(scalarArg(n.args[0], env), n.args[0]) ? scalarArg(n.args[1], env) : (n.args[2] ? scalarArg(n.args[2], env) : null); };
FUNCS.SWITCH = (n, env) => {
  if (n.args.length < 3) throw new DaxError('SWITCH needs an expression and at least one value/result pair.', n.start, n.end);
  const v = scalarArg(n.args[0], env);
  let i = 1;
  for (; i + 1 < n.args.length; i += 2) if (compareValues(scalarArg(n.args[i], env), v) === 0) return scalarArg(n.args[i + 1], env);
  return i < n.args.length ? scalarArg(n.args[i], env) : null;
};
FUNCS.AND = (n, env) => { needArgs(n, 2); return toBool(scalarArg(n.args[0], env)) && toBool(scalarArg(n.args[1], env)); };
FUNCS.OR = (n, env) => { needArgs(n, 2); return toBool(scalarArg(n.args[0], env)) || toBool(scalarArg(n.args[1], env)); };
FUNCS.NOT = (n, env) => { needArgs(n, 1); return !toBool(scalarArg(n.args[0], env), n.args[0]); };
FUNCS.TRUE = () => true;
FUNCS.FALSE = () => false;
FUNCS.BLANK = () => null;
FUNCS.ISBLANK = (n, env) => { needArgs(n, 1); const v = scalarArg(n.args[0], env); return v === null || v === undefined; };
FUNCS.IFERROR = (n, env) => { needArgs(n, 2); try { const v = scalarArg(n.args[0], env); if (typeof v === 'number' && !isFinite(v)) throw new DaxError('math'); return v; } catch (e) { if (e instanceof BudgetError || !(e instanceof DaxError)) throw e; return scalarArg(n.args[1], env); } };
FUNCS.COALESCE = (n, env) => { for (const a of n.args) { const v = scalarArg(a, env); if (v !== null && v !== undefined) return v; } return null; };
FUNCS.DIVIDE = (n, env) => {
  needArgs(n, 2, 3); const a = toNumber(scalarArg(n.args[0], env), n.args[0]), b = toNumber(scalarArg(n.args[1], env), n.args[1]);
  return b === 0 ? (n.args[2] ? scalarArg(n.args[2], env) : null) : a / b;
};
FUNCS.ABS = (n, env) => { needArgs(n, 1); return Math.abs(toNumber(scalarArg(n.args[0], env), n.args[0])); };
FUNCS.INT = (n, env) => { needArgs(n, 1); return Math.floor(toNumber(scalarArg(n.args[0], env), n.args[0])); };
FUNCS.ROUND = (n, env) => { needArgs(n, 2); const d = 10 ** toNumber(scalarArg(n.args[1], env)); return Math.round(toNumber(scalarArg(n.args[0], env), n.args[0]) * d) / d; };

/* dates */
const dateOf = (v, node) => { if (!isDateStr(v)) throw new DaxError('A date was expected here.', node?.start, node?.end); return v; };
FUNCS.DATE = (n, env) => {
  needArgs(n, 3); const [y, m, d] = n.args.map(a => toNumber(scalarArg(a, env), a));
  return fromUTC(Date.UTC(y, m - 1, d));
};
FUNCS.YEAR = (n, env) => { needArgs(n, 1); return parseDate(dateOf(scalarArg(n.args[0], env), n.args[0])).y; };
FUNCS.MONTH = (n, env) => { needArgs(n, 1); return parseDate(dateOf(scalarArg(n.args[0], env), n.args[0])).m; };
FUNCS.DAY = (n, env) => { needArgs(n, 1); return parseDate(dateOf(scalarArg(n.args[0], env), n.args[0])).d; };
FUNCS.EDATE = (n, env) => { needArgs(n, 2); return addMonthsClamp(dateOf(scalarArg(n.args[0], env), n.args[0]), toNumber(scalarArg(n.args[1], env))); };
FUNCS.EOMONTH = (n, env) => {
  needArgs(n, 2); const s = addMonthsClamp(dateOf(scalarArg(n.args[0], env), n.args[0]), toNumber(scalarArg(n.args[1], env))); const { y, m } = parseDate(s);
  return fmtDate(y, m, daysIn(y, m));
};

/** The dates a time-intelligence function works from: a date column (visible values) or a table. */
const NO_MASK = {};
function dateInput(node, env) {
  if (node.t === 'col') {
    const { t, c } = resolveCol(env, node);
    const mask = visibleMask(env.model, env.ctx, t) ?? NO_MASK;
    const byMask = (env.model.dateInputs ??= new WeakMap());
    let perCol = byMask.get(mask);
    if (!perCol) byMask.set(mask, perCol = new Map());
    let hit = perCol.get(c.i);
    if (!hit) {
      const vals = [...new Set(visibleValues(env, t, c.i).filter(isDateStr))].sort();
      perCol.set(c.i, hit = { t, c, dates: vals, memo: new Map() });
    }
    return hit;
  }
  const tb = tableArg(node, env, 'a date column');
  const col = tb.cols[0];
  const t = col.t ? env.model.table(col.t) : null;
  const c = t?.colMap.get(col.c.toLowerCase());
  if (!t || !c) throw new DaxError('A date column from the model was expected here.', node.start, node.end);
  return { t, c, dates: [...new Set(tb.rows.map(r => r[0]).filter(isDateStr))].sort(), memo: new Map() };
}
/** Time-intelligence results are pure functions of (visible dates, arguments), so repeat calls share one table. */
function memoDate(inp, key, make) {
  let v = inp.memo.get(key);
  if (!v) inp.memo.set(key, v = make());
  return v;
}
function dateTbl(t, c, dates) { return new Tbl([{ t: t.name, c: c.name }], dates.map(d => [d]), { timeIntel: true }); }
function unitOf(node) {
  const u = (node.t === 'name' ? node.name : node.t === 'call' ? node.name : node.t === 'str' ? node.v : '').toUpperCase();
  if (!['DAY', 'MONTH', 'QUARTER', 'YEAR'].includes(u)) throw new DaxError('The interval must be DAY, MONTH, QUARTER or YEAR.', node.start, node.end);
  return u;
}
function shiftDates(dates, n, unit) {
  if (unit === 'DAY') return dates.map(d => addDays(d, n));
  const k = unit === 'MONTH' ? n : unit === 'QUARTER' ? n * 3 : n * 12;
  const byMonth = new Map();
  for (const d of dates) { const mi = monthIndex(d); byMonth.set(mi, (byMonth.get(mi) ?? 0) + 1); }
  const complete = [...byMonth].every(([mi, cnt]) => cnt === daysIn(Math.floor(mi / 12), (mi % 12) + 1));
  if (complete) {
    const out = [];
    for (const mi of byMonth.keys()) { const t = mi + k, y = Math.floor(t / 12), m = ((t % 12) + 12) % 12 + 1; for (let d = 1; d <= daysIn(y, m); d++) out.push(fmtDate(y, m, d)); }
    return out;
  }
  return dates.map(d => addMonthsMonthEnd(d, k));
}
FUNCS.DATEADD = (n, env) => {
  needArgs(n, 3); const inp = dateInput(n.args[0], env); const { t, c, dates } = inp;
  const k = toNumber(scalarArg(n.args[1], env), n.args[1]); const unit = unitOf(n.args[2]);
  return memoDate(inp, `DATEADD|${k}|${unit}`, () => dateTbl(t, c, [...new Set(shiftDates(dates, k, unit))].sort()));
};
FUNCS.SAMEPERIODLASTYEAR = (n, env) => { needArgs(n, 1); const inp = dateInput(n.args[0], env); const { t, c, dates } = inp; return memoDate(inp, 'SPLY', () => dateTbl(t, c, [...new Set(shiftDates(dates, -1, 'YEAR'))].sort())); };
FUNCS.PARALLELPERIOD = (n, env) => {
  needArgs(n, 3); const { t, c, dates } = dateInput(n.args[0], env);
  const k = toNumber(scalarArg(n.args[1], env)); const unit = unitOf(n.args[2]);
  if (unit === 'DAY') return dateTbl(t, c, [...new Set(shiftDates(dates, k, 'DAY'))].sort());
  const mult = unit === 'MONTH' ? 1 : unit === 'QUARTER' ? 3 : 12;
  const months = [...new Set(dates.map(monthIndex))].map(mi => mi + k * mult);
  const out = [];
  for (const mi of months) { const y = Math.floor(mi / 12), m = ((mi % 12) + 12) % 12 + 1; for (let d = 1; d <= daysIn(y, m); d++) out.push(fmtDate(y, m, d)); }
  return dateTbl(t, c, out.sort());
};
function relativePeriod(name, k, unit) {
  FUNCS[name] = (n, env) => {
    needArgs(n, 1); const inp = dateInput(n.args[0], env); const { t, c, dates } = inp;
    return memoDate(inp, name, () => relativeTbl(t, c, dates, k, unit));
  };
}
function relativeTbl(t, c, dates, k, unit) {
  {
    if (!dates.length) return dateTbl(t, c, []);
    if (unit === 'DAY') return dateTbl(t, c, [addDays(dates[0], k)]);
    const mult = unit === 'MONTH' ? 1 : unit === 'QUARTER' ? 3 : 12;
    const first = parseDate(dates[0]);
    const startIdx = unit === 'MONTH' ? monthIndex(dates[0]) : unit === 'QUARTER' ? Math.floor(monthIndex(dates[0]) / 3) * 3 : first.y * 12;
    const out = [];
    for (let mi = startIdx + k * mult; mi < startIdx + k * mult + mult; mi++) { const y = Math.floor(mi / 12), m = ((mi % 12) + 12) % 12 + 1; for (let d = 1; d <= daysIn(y, m); d++) out.push(fmtDate(y, m, d)); }
    return dateTbl(t, c, out);
  }
}
relativePeriod('PREVIOUSDAY', -1, 'DAY'); relativePeriod('NEXTDAY', 1, 'DAY');
relativePeriod('PREVIOUSMONTH', -1, 'MONTH'); relativePeriod('NEXTMONTH', 1, 'MONTH');
relativePeriod('PREVIOUSQUARTER', -1, 'QUARTER'); relativePeriod('PREVIOUSYEAR', -1, 'YEAR');
function allDates(env, t, c) { return [...new Set(t.rows.map(r => r[c.i]).filter(isDateStr))].sort(); }
FUNCS.DATESBETWEEN = (n, env) => {
  needArgs(n, 3); const { t, c } = colArg(n.args[0], env, 'DATESBETWEEN');
  const a = scalarArg(n.args[1], env), b = scalarArg(n.args[2], env);
  return dateTbl(t, c, allDates(env, t, c).filter(d => (a === null || d >= a) && (b === null || d <= b)));
};
FUNCS.DATESINPERIOD = (n, env) => {
  needArgs(n, 4); const { t, c } = colArg(n.args[0], env, 'DATESINPERIOD');
  const start = dateOf(scalarArg(n.args[1], env), n.args[1]); const k = toNumber(scalarArg(n.args[2], env)); const unit = unitOf(n.args[3]);
  const other = unit === 'DAY' ? addDays(start, k) : addMonthsMonthEnd(start, k * (unit === 'MONTH' ? 1 : unit === 'QUARTER' ? 3 : 12));
  const lo = k >= 0 ? start : (unit === 'DAY' ? addDays(other, 1) : addDays(other, 1)), hi = k >= 0 ? addDays(other, -1) : start;
  return dateTbl(t, c, allDates(env, t, c).filter(d => d >= lo && d <= hi));
};
function toDate(name, startOf) {
  FUNCS[name] = (n, env) => {
    needArgs(n, 1); const { t, c, dates } = dateInput(n.args[0], env);
    if (!dates.length) return dateTbl(t, c, []);
    const last = dates[dates.length - 1]; const p = parseDate(last);
    const from = startOf(p);
    return dateTbl(t, c, allDates(env, t, c).filter(d => d >= from && d <= last));
  };
}
toDate('DATESMTD', p => fmtDate(p.y, p.m, 1));
toDate('DATESQTD', p => fmtDate(p.y, Math.floor((p.m - 1) / 3) * 3 + 1, 1));
toDate('DATESYTD', p => fmtDate(p.y, 1, 1));
FUNCS.FIRSTDATE = (n, env) => { needArgs(n, 1); const { t, c, dates } = dateInput(n.args[0], env); return dateTbl(t, c, dates.slice(0, 1)); };
FUNCS.LASTDATE = (n, env) => { needArgs(n, 1); const { t, c, dates } = dateInput(n.args[0], env); return dateTbl(t, c, dates.slice(-1)); };

/* ───────────────────────────── public API ───────────────────────────── */

function makeCtx(model, filters) {
  const ctx = newCtx();
  for (const f of filters) {
    const t = model.table(f.table); const c = t.colMap.get(f.column.toLowerCase());
    addEntry(ctx, { tbl: t, cols: [c.i], set: new Set(f.values.map(keyOf)) });
  }
  return ctx;
}

/** Evaluates a compiled measure under optional column filters, e.g. [{table:'Date',column:'YearMonth',values:['2024-03']}]. */
export function evaluate(model, compiled, filters = [], { maxSteps = 600000 } = {}) {
  const env = { model, ctx: makeCtx(model, filters), frames: [], vars: null, B: { n: 0, max: maxSteps }, depth: 0 };
  model.budget = env.B; // filter-mask builds are charged to the same budget
  let v;
  try { v = evalNode(compiled.ast, env); } finally { model.budget = null; }
  if (v instanceof Tbl) throw new DaxError('Your formula returns a table. A measure must return a single value, for example by wrapping it in COUNTROWS.', compiled.ast.start, compiled.ast.end);
  return v === undefined ? null : v;
}

/** Static checks that don't need data: unknown tables, columns, measures, functions. */
export function validate(model, ast) {
  const issues = [];
  const add = (message, node) => issues.push({ message, start: node.start, end: node.end });
  function walk(node, scope) {
    if (!node || typeof node !== 'object') return;
    switch (node.t) {
      case 'col': {
        const t = model.table(node.table);
        if (!t) add(`Table '${node.table}' doesn't exist.`, node);
        else if (!t.colMap.has(node.col.toLowerCase())) add(`Column '${t.name}[${node.col}]' doesn't exist.`, node);
        break;
      }
      case 'meas': if (!model.measures.has(node.name.toLowerCase()) && !scope.computed) add(`Measure [${node.name}] doesn't exist.`, node); break;
      case 'name':
        if (!scope.vars.has(node.name.toLowerCase()) && !model.table(node.name) && !KEYWORD_NAMES.has(node.name.toUpperCase())) add(`'${node.name}' isn't a table or variable.`, node);
        break;
      case 'call':
        if (!Object.hasOwn(FUNCS, node.name)) add(KNOWN_UNSUPPORTED.has(node.name) ? `${node.name} isn't supported by this challenge's checker yet.` : `Unknown function '${node.name}'.`, node);
        node.args.forEach(a => walk(a, { ...scope, computed: scope.computed || ['ADDCOLUMNS', 'SELECTCOLUMNS', 'SUMMARIZE', 'FILTER', 'SUMX', 'TOPN', 'AVERAGEX', 'MINX', 'MAXX', 'COUNTX'].includes(node.name) }));
        break;
      case 'bin': walk(node.l, scope); walk(node.r, scope); break;
      case 'un': walk(node.e, scope); break;
      case 'list': node.items.forEach(a => walk(a, scope)); break;
      case 'let': {
        const vars = new Set(scope.vars);
        for (const v of node.vars) { walk(v.expr, { ...scope, vars }); vars.add(v.name.toLowerCase()); }
        walk(node.body, { ...scope, vars });
        break;
      }
      default:
    }
  }
  walk(ast, { vars: new Set(), computed: false });
  return issues;
}

const KEYWORD_NAMES = new Set(['DAY', 'MONTH', 'QUARTER', 'YEAR', 'ASC', 'DESC']);
export const KNOWN_UNSUPPORTED_FUNCTIONS = KNOWN_UNSUPPORTED;
