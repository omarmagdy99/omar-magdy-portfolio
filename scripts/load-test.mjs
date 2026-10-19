// Simulates many visitors solving the three levels at the same time against a running instance.
//   BASE=http://127.0.0.1:8799 USERS=100 ADMIN_TOKEN=... node scripts/load-test.mjs
// Run it against `wrangler dev` (local D1), not against production: it creates fake solvers.
import { randomUUID } from 'node:crypto';

const BASE = process.env.BASE ?? 'http://127.0.0.1:8799';
const USERS = Number(process.env.USERS ?? 100);
const ADMIN = process.env.ADMIN_TOKEN ?? 'local-admin-token';

const SOLUTIONS = {
  aov: ['AVERAGE ( Sales[Amount] )', 'Average Order Value = DIVIDE ( [Total Sales], DISTINCTCOUNT ( Sales[OrderID] ) )'],
  growth: [
    'VAR Prev = CALCULATE ( [Total Sales], DATEADD ( \'Date\'[Date], -1, MONTH ) ) RETURN DIVIDE ( [Total Sales] - Prev, Prev )',
    'DIVIDE ( [Total Sales] - CALCULATE ( [Total Sales], PARALLELPERIOD ( \'Date\'[Date], -1, MONTH ) ), CALCULATE ( [Total Sales], PARALLELPERIOD ( \'Date\'[Date], -1, MONTH ) ) )',
  ],
  retention: [
    'VAR C = VALUES ( Sales[CustomerID] ) VAR P = CALCULATETABLE ( VALUES ( Sales[CustomerID] ), DATEADD ( \'Date\'[Date], -1, MONTH ) ) RETURN COUNTROWS ( INTERSECT ( C, P ) )',
    // the most expensive approach: context transition for every customer
    'CALCULATE ( DISTINCTCOUNT ( Sales[CustomerID] ), FILTER ( VALUES ( Sales[CustomerID] ), CALCULATE ( COUNTROWS ( Sales ), DATEADD ( \'Date\'[Date], -1, MONTH ) ) > 0 ) )',
  ],
};
const WRONG = 'DISTINCTCOUNT ( Sales[CustomerID] )';

const samples = new Map();
const statuses = new Map();
function record(name, ms, status) {
  if (!samples.has(name)) samples.set(name, []);
  samples.get(name).push(ms);
  const key = `${name} ${status}`;
  statuses.set(key, (statuses.get(key) ?? 0) + 1);
}
async function call(name, path, { method = 'GET', body, visitor, ip } = {}) {
  const started = performance.now();
  let status = 0, json = null;
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', Origin: BASE, 'X-Visitor': visitor ?? '', 'CF-Connecting-IP': ip ?? '10.0.0.1' },
      body: body ? JSON.stringify(body) : undefined,
    });
    status = res.status;
    json = (res.headers.get('content-type') ?? '').includes('json') ? await res.json() : await res.text();
  } catch (e) { status = -1; }
  record(name, performance.now() - started, status);
  return { status, json };
}
const pause = ms => new Promise(r => setTimeout(r, ms));
const pick = list => list[Math.floor(Math.random() * list.length)];

async function visitor(i) {
  const id = randomUUID();
  const ip = `10.${(i >> 8) & 255}.${i & 255}.7`;
  const v = { visitor: id, ip };
  const ev = type => call('event', '/api/dax/event', { method: 'POST', ...v, body: { challenge: 'aov', type, visitor: id, source: 'linkedin', device: 'desktop' } });
  await call('page', '/dax-challenge', v);
  await Promise.all([ev('view'), call('leaderboard', '/api/dax/leaderboard?challenge=aov', v), call('stats', '/api/dax/stats?challenge=aov', v), call('progress', '/api/dax/progress', v)]);
  await pause(Math.random() * 300);
  await ev('start'); await ev('run');
  const name = `Solver ${i}`;
  const submit = (challenge, dax) => call(`submit ${challenge}`, '/api/dax/submit', { method: 'POST', ...v, body: { challenge, visitor: id, name, dax } });
  if (Math.random() < 0.3) await submit('aov', WRONG);
  let r = await submit('aov', pick(SOLUTIONS.aov));
  let solved = r.json?.correct === true ? 1 : 0;
  // a locked level must refuse until the previous one is solved
  const early = await call('submit locked', '/api/dax/submit', { method: 'POST', visitor: randomUUID(), ip, body: { challenge: 'retention', visitor: randomUUID(), name: 'Skipper', dax: SOLUTIONS.retention[0] } });
  if (early.json?.locked !== true) record('LOCK BROKEN', 0, 'x');
  await pause(Math.random() * 400);
  r = await submit('growth', pick(SOLUTIONS.growth)); solved += r.json?.correct === true ? 1 : 0;
  await call('progress', '/api/dax/progress', v);
  r = await submit('retention', pick(SOLUTIONS.retention)); solved += r.json?.correct === true ? 1 : 0;
  await call('leaderboard', '/api/dax/leaderboard?challenge=retention', v);
  return solved;
}

const q = (a, p) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];
console.log(`Starting ${USERS} visitors at once against ${BASE} …`);
const t0 = performance.now();
const results = await Promise.all(Array.from({ length: USERS }, (_, i) => visitor(i)));
const wall = ((performance.now() - t0) / 1000).toFixed(1);

console.log(`\nAll visitors finished in ${wall}s. Levels solved per visitor: ${results.filter(n => n === 3).length}/${USERS} solved all three.\n`);
console.log('endpoint'.padEnd(18), 'count'.padStart(6), 'p50'.padStart(8), 'p95'.padStart(8), 'max'.padStart(8));
for (const [name, a] of samples) console.log(name.padEnd(18), String(a.length).padStart(6), `${q(a, 0.5).toFixed(0)}ms`.padStart(8), `${q(a, 0.95).toFixed(0)}ms`.padStart(8), `${Math.max(...a).toFixed(0)}ms`.padStart(8));
console.log('\nstatus codes:', [...statuses].map(([k, v]) => `${k}×${v}`).join('  '));

const stats = await fetch(`${BASE}/api/dax/admin/stats?challenge=retention`, { headers: { Authorization: `Bearer ${ADMIN}` } }).then(r => r.json()).catch(() => null);
if (stats?.ok) console.log('\nAdmin funnel (level 3):', JSON.stringify(stats.funnel));
const bad = [...statuses].filter(([k]) => /( 5\d\d| -1| x)$/.test(k)).length;
process.exit(bad || results.some(n => n !== 3) ? 1 : 0);
