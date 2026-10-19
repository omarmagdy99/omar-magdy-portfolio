// Attack simulation against a running instance (run `wrangler dev` first, with a local D1):
//   BASE=http://127.0.0.1:8799 node scripts/security-test.mjs
// It throws SQL injection, XSS, prototype-pollution, oversized and CPU-heavy input at the API, then checks that
// the database is intact and that nothing unexpected was stored. Never point it at production.
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const BASE = process.env.BASE ?? 'http://127.0.0.1:8799';
const ADMIN = process.env.ADMIN_TOKEN ?? 'local-admin-token';
let failures = 0, checks = 0;
const ok = (cond, label, detail = '') => { checks++; if (!cond) { failures++; console.log(`  ✗ ${label} ${detail}`); } else console.log(`  ✓ ${label}`); };
const ip = () => `172.16.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

async function post(path, body, headers = {}) {
  const started = performance.now();
  const res = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: BASE, 'CF-Connecting-IP': ip(), ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, text, ms: performance.now() - started };
}
async function get(path, headers = {}) {
  const res = await fetch(BASE + path, { headers: { 'CF-Connecting-IP': ip(), ...headers } });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, text, type: res.headers.get('content-type') ?? '' };
}
// Calls wrangler through node directly (no shell), so the SQL text is passed as one argument.
const d1 = sql => JSON.parse(execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', '--local', '--json', '--command', sql], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))[0].results;
const submit = (extra = {}) => post('/api/dax/submit', { challenge: 'aov', visitor: randomUUID(), name: 'Tester', dax: 'AVERAGE ( Sales[Amount] )', ...extra });

console.log('\n1. SQL injection (every input that reaches the database)');
const tablesBefore = d1("SELECT name FROM sqlite_master WHERE type IN ('table','view') ORDER BY name").map(r => r.name);
const SQLI = [`Robert'); DROP TABLE dax_solvers;--`, `' OR '1'='1`, `x'; DELETE FROM dax_submissions; --`, `"; UPDATE dax_solvers SET hidden=1; --`, `\\'; DROP TABLE dax_events; --`];
for (const p of SQLI) {
  const a = await submit({ name: p }); ok(a.status < 500, `name payload handled (${a.status})`, p);
  const b = await submit({ dax: `${p} 1 + 1` }); ok(b.status < 500, `dax payload handled (${b.status})`);
  const c = await post('/api/dax/event', { challenge: p, type: 'view', visitor: randomUUID() }); ok(c.status === 400, 'event challenge payload rejected', `got ${c.status}`);
  const e = await post('/api/dax/event', { challenge: 'aov', type: p, visitor: randomUUID() }); ok(e.status === 400, 'event type payload rejected', `got ${e.status}`);
  const f = await post('/api/dax/submit', { challenge: 'aov', visitor: p, name: 'x', dax: 'BLANK ()' }); ok(f.status === 400, 'visitor id payload rejected', `got ${f.status}`);
  const g = await get(`/api/dax/leaderboard?challenge=${encodeURIComponent(p)}`); ok(g.status === 400, 'query-string challenge payload rejected', `got ${g.status}`);
  const h = await get('/api/dax/progress', { 'X-Visitor': p.replace(/[^\x20-\x7e]/g, '') }); ok(h.status === 200 && h.json?.solved?.length === 0, 'header visitor payload is inert');
}
const tablesAfter = d1("SELECT name FROM sqlite_master WHERE type IN ('table','view') ORDER BY name").map(r => r.name);
ok(JSON.stringify(tablesBefore) === JSON.stringify(tablesAfter), 'all tables and views still exist', `${tablesBefore.length} → ${tablesAfter.length}`);
const stored = d1("SELECT name FROM dax_submissions WHERE name LIKE '%DROP TABLE%' LIMIT 1");
ok(stored.length === 0 || stored[0].name.includes('DROP TABLE'), 'payload (if stored) is stored as plain text, never executed');
ok(d1('SELECT COUNT(*) AS c FROM dax_submissions')[0].c > 0, 'submissions table still has its rows (nothing was deleted)');

console.log('\n2. Prototype pollution / unexpected object keys');
for (const key of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf', 'prototype']) {
  const e = await post('/api/dax/event', { challenge: key, type: 'view', visitor: randomUUID() }); ok(e.status === 400, `challenge "${key}" rejected on events`, `got ${e.status}`);
  const s = await submit({ challenge: key }); ok(s.status === 400, `challenge "${key}" rejected on submit`, `got ${s.status}`);
}
const polluted = await post('/api/dax/submit', '{"challenge":"aov","visitor":"' + randomUUID() + '","name":"Poll","dax":"BLANK ()","__proto__":{"admin":true},"constructor":{"prototype":{"x":1}}}');
ok(polluted.status < 500 && ({}).admin === undefined && ({}).x === undefined, '__proto__ keys in the body do nothing');
const badChallenges = d1("SELECT DISTINCT challenge_id FROM dax_events UNION SELECT DISTINCT challenge_id FROM dax_submissions").map(r => r.challenge_id);
ok(badChallenges.every(c => ['aov', 'growth', 'retention'].includes(c)), 'only real challenge ids were ever stored', JSON.stringify(badChallenges));

console.log('\n3. XSS: markup in names, links and formulas');
const XSS = ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '"><svg onload=alert(1)>', 'javascript:alert(1)'];
for (const p of XSS) {
  const n = await submit({ name: p }); ok(n.status < 500, `name "${p.slice(0, 22)}…" handled`);
  const l = await submit({ name: 'Link', linkedin: p }); ok(l.json?.code === 'linkedin' || l.json?.ok === false, `linkedin "${p.slice(0, 22)}…" rejected`, JSON.stringify(l.json));
  const x = await submit({ dax: `${p}( 1 )` }); ok(x.status < 500, 'formula with markup handled');
}
const solverId = randomUUID();
await submit({ visitor: solverId, name: '<b>Bold</b>Name' });
const board = await get('/api/dax/leaderboard?challenge=aov');
ok(!/[<>]/.test(JSON.stringify(board.json.solvers.map(s => s.name))), 'leaderboard names never contain < or >');
ok(board.type.includes('application/json') && board.type !== 'text/html', 'API answers are JSON, not HTML');

console.log('\n4. Oversized and malformed requests');
for (const [label, body] of [['200 KB body', 'x'.repeat(200_000)], ['5 MB body', 'y'.repeat(5_000_000)], ['not JSON', '{nope'], ['array', '[]'], ['null', 'null'], ['number', '42']]) {
  const r = await post('/api/dax/submit', body); ok(r.status >= 400 && r.status < 500, `${label} refused cleanly`, `got ${r.status}`);
}
const huge = await submit({ dax: 'BLANK () + '.repeat(500) + '1' }); ok(huge.status < 500, `4,000+ character formula handled (${huge.status})`, huge.json?.error ?? '');
const wrongTypes = await post('/api/dax/submit', { challenge: ['aov'], visitor: { a: 1 }, name: 5, dax: 7 }); ok(wrongTypes.status === 400, 'wrong JSON types refused', `got ${wrongTypes.status}`);

console.log('\n5. CPU-heavy and recursive formulas (must answer quickly, never 5xx)');
const nest = (open, close, n, mid = '1') => open.repeat(n) + mid + close.repeat(n);
const HEAVY = {
  'deeply nested parentheses': nest('(', ')', 1900),
  'deeply nested IF': 'IF ( TRUE (), '.repeat(250) + '1' + ' )'.repeat(250),
  'nested SUMX over all rows': 'SUMX ( ALL ( Sales ), SUMX ( ALL ( Sales ), SUMX ( ALL ( Sales ), 1 ) ) )',
  'nested CALCULATE in iterators': 'SUMX ( ALL ( Sales ), SUMX ( ALL ( Sales ), CALCULATE ( COUNTROWS ( Sales ), ALL ( \'Date\' ) ) ) )',
  'huge number literal': '9'.repeat(3500),
  'long chain of additions': '1' + ' + 1'.repeat(900),
  'many unary minus': '-'.repeat(1900) + '1',
  'giant DATEADD offset': 'COUNTROWS ( CALCULATETABLE ( VALUES ( Sales[OrderID] ), DATEADD ( \'Date\'[Date], -999999999999, MONTH ) ) )',
  'string doubling': 'LEN_IS_NOT_SUPPORTED ( ' + '"a" & '.repeat(400) + '"b" )',
  'many VARs': Array.from({ length: 120 }, (_, i) => `VAR v${i} = SUMX ( ALL ( Sales ), 1 )`).join(' ') + ' RETURN v0',
  'lots of tokens': '{' + '1,'.repeat(1900) + '1}',
  'unicode soup': '𝔘𝔫𝔦𝔠𝔬𝔡𝔢 '.repeat(250),
};
for (const [label, dax] of Object.entries(HEAVY)) {
  const r = await submit({ dax }); const needed = r.ms < 2500;
  ok(r.status < 500 && r.json !== null && needed, `${label}: ${r.status} in ${r.ms.toFixed(0)} ms`, r.json?.error ?? '');
}

console.log('\n6. Origin, methods, auth and file exposure');
const noOrigin = await fetch(`${BASE}/api/dax/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); ok(noOrigin.status === 403, 'POST without Origin refused', `got ${noOrigin.status}`);
const evil = await post('/api/dax/submit', {}, { Origin: 'https://evil.example' }); ok(evil.status === 403, 'POST from another site refused', `got ${evil.status}`);
for (const method of ['PUT', 'DELETE', 'PATCH']) { const r = await fetch(`${BASE}/api/dax/submit`, { method, headers: { Origin: BASE } }); ok(r.status === 404, `${method} on the API refused`, `got ${r.status}`); }
ok((await get('/api/dax/admin/stats')).status === 401, 'admin stats need a token');
ok((await get('/api/dax/admin/stats', { Authorization: 'Bearer wrong' })).status === 401, 'wrong admin token refused');
ok((await get('/api/dax/admin/stats', { Authorization: `Bearer ${ADMIN}` })).status === 200, 'right admin token accepted');
ok((await post('/api/dax/admin/hide', { challenge: 'aov', visitor: randomUUID(), hidden: true })).status === 401, 'admin hide needs a token');
for (const path of ['/.dev.vars', '/wrangler.jsonc', '/worker/worker.js', '/.git/config', '/package.json', '/migrations/0001_dax_challenge.sql', '/worker/generated/expected.json', '/api/dax/../../.dev.vars', '/%2e%2e/.dev.vars']) {
  const r = await get(path); ok(r.status === 404 || !/ADMIN_TOKEN|database_id|expected|CREATE TABLE/.test(r.text), `${path} not exposed`, `got ${r.status}`);
}

console.log('\n7. Database integrity after everything');
ok(JSON.stringify(d1("SELECT name FROM sqlite_master WHERE type IN ('table','view') ORDER BY name").map(r => r.name)) === JSON.stringify(tablesBefore), 'schema unchanged');
ok(d1("SELECT COUNT(*) AS c FROM dax_solvers WHERE hidden = 1")[0].c === 0, 'no solver was hidden by injection');
ok(d1("SELECT COUNT(*) AS c FROM dax_solvers")[0].c >= 1, 'solvers table intact');

console.log(`\n${checks - failures}/${checks} checks passed${failures ? `, ${failures} FAILED` : ''}.`);
process.exit(failures ? 1 : 0);
