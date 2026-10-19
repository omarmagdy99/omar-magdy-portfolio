// API for the DAX challenge: grading, leaderboard and privacy-light analytics. Static pages are served by the
// assets binding; this Worker only runs for /api/* and /dax-admin (see run_worker_first in wrangler.jsonc).
import { grade, CHALLENGES } from './challenges.js';

const DAY = 86400;
const EVENT_TYPES = new Set(['view', 'start', 'run', 'hint', 'copy_data']);
const VISITOR_RE = /^[a-f0-9-]{16,64}$/;
const LINKEDIN_RE = /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%]{3,100}\/?$/;
const SECURITY = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store',
};

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...SECURITY, ...extra } });
const fail = (message, status = 400) => json({ ok: false, error: message }, status);

const now = () => Math.floor(Date.now() / 1000);
const dayOf = ts => new Date(ts * 1000).toISOString().slice(0, 10);

function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  const host = new URL(request.url).host;
  return new URL(origin).host === host;
}

async function readJson(request, limit = 16384) {
  const text = await request.text();
  if (text.length > limit) throw new Error('too large');
  return JSON.parse(text);
}

async function hashIp(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') ?? '0.0.0.0';
  const data = new TextEncoder().encode(`${ip}|${env.HASH_SALT ?? 'dev-salt'}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

function cleanName(value) {
  const name = String(value ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 32) return null;
  if (/https?:|www\.|@/i.test(name)) return null;
  return name;
}
const cleanSource = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40) || null;
const cleanChallenge = value => (CHALLENGES[value] ? value : null);

/* ─────────────── public endpoints ─────────────── */

async function recordEvent(request, env) {
  if (!sameOrigin(request)) return fail('Bad origin.', 403);
  let body;
  try { body = await readJson(request, 2048); } catch { return fail('Invalid JSON.'); }
  const challenge = cleanChallenge(body.challenge);
  if (!challenge || !EVENT_TYPES.has(body.type) || !VISITOR_RE.test(body.visitor ?? '')) return fail('Invalid event.');
  const ts = now();
  const device = ['mobile', 'tablet', 'desktop'].includes(body.device) ? body.device : null;
  const source = cleanSource(body.source);
  await env.DB.prepare(
    `INSERT INTO dax_events (day, challenge_id, visitor_id, type, n, first_ts, last_ts, country, source, device)
     VALUES (?1, ?2, ?3, ?4, 1, ?5, ?5, ?6, ?7, ?8)
     ON CONFLICT (day, challenge_id, visitor_id, type) DO UPDATE SET n = MIN(n + 1, 1000), last_ts = ?5`
  ).bind(dayOf(ts), challenge, body.visitor, body.type, ts, request.cf?.country ?? null, source, device).run();
  return json({ ok: true });
}

async function rankOf(env, challenge, solvedAt, visitor) {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS ahead FROM dax_solvers WHERE challenge_id = ?1 AND hidden = 0
       AND (solved_at < ?2 OR (solved_at = ?2 AND visitor_id < ?3))`
  ).bind(challenge, solvedAt, visitor).first();
  return (row?.ahead ?? 0) + 1;
}

async function submit(request, env) {
  if (!sameOrigin(request)) return fail('Bad origin.', 403);
  let body;
  try { body = await readJson(request); } catch { return fail('Invalid JSON.'); }
  const challenge = cleanChallenge(body.challenge);
  const dax = String(body.dax ?? '');
  if (!challenge || !VISITOR_RE.test(body.visitor ?? '')) return fail('Invalid request.');
  const name = cleanName(body.name);
  if (!name) return fail('Please enter a name between 2 and 32 characters (no links or @).');
  if (dax.trim().length < 3) return fail('Write your measure first.');
  if (dax.length > 4000) return fail('That formula is too long (4,000 characters max).');
  let linkedin = String(body.linkedin ?? '').trim();
  if (linkedin && !LINKEDIN_RE.test(linkedin)) return fail('The LinkedIn link should look like https://www.linkedin.com/in/your-name');
  linkedin = linkedin || null;

  const ts = now();
  const ipHash = await hashIp(request, env);
  const recent = await env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM dax_submissions WHERE challenge_id = ?1 AND visitor_id = ?2 AND created_at > ?4) AS byVisitor,
            (SELECT COUNT(*) FROM dax_submissions WHERE ip_hash = ?3 AND created_at > ?5) AS byIp`
  ).bind(challenge, body.visitor, ipHash, ts - 60, ts - 600).first();
  if (recent.byVisitor >= 6 || recent.byIp >= 40) return fail('You are submitting a little too fast. Wait a minute and try again.', 429);

  const existing = await env.DB.prepare('SELECT name, solved_at FROM dax_solvers WHERE challenge_id = ?1 AND visitor_id = ?2')
    .bind(challenge, body.visitor).first();

  const result = grade(challenge, dax);
  const status = !result.ok ? 'error' : result.correct ? 'correct' : 'wrong';
  await env.DB.prepare(
    `INSERT INTO dax_submissions (challenge_id, visitor_id, name, dax, status, matched, total, error, created_at, ip_hash, country)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`
  ).bind(challenge, body.visitor, name, dax, status, result.matched ?? null, result.total ?? null, result.error ?? null, ts, ipHash, request.cf?.country ?? null).run();

  if (!result.ok) return json({ ok: false, error: result.error });
  if (!result.correct) {
    return json({ ok: true, correct: false, matched: result.matched, total: result.total, stage: result.stage });
  }

  if (existing) {
    return json({ ok: true, correct: true, alreadySolved: true, rank: await rankOf(env, challenge, existing.solved_at, body.visitor) });
  }
  const stats = await env.DB.prepare(
    'SELECT COUNT(*) AS attempts, MIN(created_at) AS first FROM dax_submissions WHERE challenge_id = ?1 AND visitor_id = ?2'
  ).bind(challenge, body.visitor).first();
  await env.DB.prepare(
    `INSERT OR IGNORE INTO dax_solvers (challenge_id, visitor_id, name, linkedin, dax, attempts, first_attempt_at, solved_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
  ).bind(challenge, body.visitor, name, linkedin, dax, stats.attempts, stats.first, ts).run();
  return json({ ok: true, correct: true, rank: await rankOf(env, challenge, ts, body.visitor), attempts: stats.attempts });
}

async function leaderboard(request, env, url) {
  const challenge = cleanChallenge(url.searchParams.get('challenge'));
  if (!challenge) return fail('Unknown challenge.');
  const me = request.headers.get('X-Visitor') ?? '';
  const { results } = await env.DB.prepare(
    `SELECT visitor_id, name, linkedin, attempts, first_attempt_at, solved_at FROM dax_solvers
     WHERE challenge_id = ?1 AND hidden = 0 ORDER BY solved_at ASC, visitor_id ASC LIMIT 100`
  ).bind(challenge).all();
  const total = await env.DB.prepare('SELECT COUNT(*) AS c FROM dax_solvers WHERE challenge_id = ?1 AND hidden = 0').bind(challenge).first();
  return json({
    ok: true,
    total: total.c,
    solvers: results.map((r, i) => ({
      rank: i + 1, name: r.name, linkedin: r.linkedin, attempts: r.attempts, solvedAt: r.solved_at,
      minutes: Math.max(0, Math.round((r.solved_at - r.first_attempt_at) / 60)), you: me !== '' && r.visitor_id === me,
    })),
  }, 200, { 'Cache-Control': 'public, max-age=15' });
}

async function publicStats(env, url) {
  const challenge = cleanChallenge(url.searchParams.get('challenge'));
  if (!challenge) return fail('Unknown challenge.');
  const f = await env.DB.prepare('SELECT visitors, started, submitted, solved FROM v_dax_funnel WHERE challenge_id = ?1').bind(challenge).first();
  return json({ ok: true, visitors: f?.visitors ?? 0, started: f?.started ?? 0, submitted: f?.submitted ?? 0, solved: f?.solved ?? 0 },
    200, { 'Cache-Control': 'public, max-age=60' });
}

/* ─────────────── admin ─────────────── */

function authorised(request, env) {
  const header = request.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const secret = env.ADMIN_TOKEN ?? '';
  if (!secret || token.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= token.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

async function adminStats(env, url) {
  const challenge = cleanChallenge(url.searchParams.get('challenge') ?? 'growth') ?? 'growth';
  const q = (sql, ...binds) => env.DB.prepare(sql).bind(challenge, ...binds).all().then(r => r.results);
  const [funnel] = await q('SELECT * FROM v_dax_funnel WHERE challenge_id = ?1');
  const since = dayOf(now() - 29 * DAY);
  const [daily, sources, countries, devices, outcomes, attemptsDist, errors, recent, solvers, timing] = await Promise.all([
    q('SELECT day, visitors, started FROM v_dax_daily WHERE challenge_id = ?1 AND day >= ?2 ORDER BY day', since),
    q('SELECT source, visitors FROM v_dax_sources WHERE challenge_id = ?1 ORDER BY visitors DESC LIMIT 10'),
    q(`SELECT COALESCE(country, '??') AS country, COUNT(DISTINCT visitor_id) AS visitors FROM dax_events WHERE challenge_id = ?1 AND type = 'view' GROUP BY 1 ORDER BY 2 DESC LIMIT 10`),
    q(`SELECT COALESCE(device, 'unknown') AS device, COUNT(DISTINCT visitor_id) AS visitors FROM dax_events WHERE challenge_id = ?1 AND type = 'view' GROUP BY 1 ORDER BY 2 DESC`),
    q('SELECT status, COUNT(*) AS n FROM dax_submissions WHERE challenge_id = ?1 GROUP BY status'),
    q('SELECT attempts, COUNT(*) AS solvers FROM dax_solvers WHERE challenge_id = ?1 GROUP BY attempts ORDER BY attempts LIMIT 12'),
    q(`SELECT error, COUNT(*) AS n FROM dax_submissions WHERE challenge_id = ?1 AND status = 'error' GROUP BY error ORDER BY n DESC LIMIT 8`),
    q('SELECT name, status, matched, total, created_at FROM dax_submissions WHERE challenge_id = ?1 ORDER BY id DESC LIMIT 15'),
    q('SELECT visitor_id, name, linkedin, attempts, solved_at, hidden FROM dax_solvers WHERE challenge_id = ?1 ORDER BY solved_at DESC LIMIT 100'),
    q('SELECT attempts, (solved_at - first_attempt_at) AS secs FROM dax_solvers WHERE challenge_id = ?1'),
  ]);
  const median = list => { const s = [...list].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
  const f = funnel ?? { visitors: 0, started: 0, ran: 0, submitted: 0, solved: 0, attempts: 0 };
  return json({
    ok: true, challenge, funnel: f,
    rates: {
      startRate: f.visitors ? f.started / f.visitors : 0,
      submitRate: f.visitors ? f.submitted / f.visitors : 0,
      solveRate: f.submitted ? f.solved / f.submitted : 0,
      attemptsPerSubmitter: f.submitted ? f.attempts / f.submitted : 0,
      medianAttemptsToSolve: median(timing.map(t => t.attempts)),
      medianMinutesToSolve: median(timing.map(t => Math.round(t.secs / 60))),
    },
    daily, sources, countries, devices, outcomes, attemptsDist, errors, recent, solvers,
  });
}

async function adminHide(request, env) {
  if (!sameOrigin(request)) return fail('Bad origin.', 403);
  const body = await readJson(request, 1024).catch(() => null);
  if (!body || !cleanChallenge(body.challenge) || !VISITOR_RE.test(body.visitor ?? '')) return fail('Invalid request.');
  await env.DB.prepare('UPDATE dax_solvers SET hidden = ?3 WHERE challenge_id = ?1 AND visitor_id = ?2')
    .bind(body.challenge, body.visitor, body.hidden ? 1 : 0).run();
  return json({ ok: true });
}

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>DAX challenge stats</title>
<link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/dax/challenge.css">
<script type="module" src="/assets/dax/admin.js"></script></head>
<body class="dax-admin"><main id="main" class="container"><h1>DAX challenge stats</h1><div id="admin-root"></div></main></body></html>`;

/* ─────────────── router ─────────────── */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    try {
      if (pathname === '/dax-admin') {
        return new Response(ADMIN_HTML, { headers: {
          'Content-Type': 'text/html; charset=utf-8', ...SECURITY,
          'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
          'X-Robots-Tag': 'noindex, nofollow',
        } });
      }
      if (pathname.startsWith('/api/dax/admin/')) {
        if (!authorised(request, env)) return fail('Unauthorised.', 401);
        if (pathname === '/api/dax/admin/stats' && request.method === 'GET') return await adminStats(env, url);
        if (pathname === '/api/dax/admin/hide' && request.method === 'POST') return await adminHide(request, env);
        return fail('Not found.', 404);
      }
      if (pathname === '/api/dax/event' && request.method === 'POST') return await recordEvent(request, env);
      if (pathname === '/api/dax/submit' && request.method === 'POST') return await submit(request, env);
      if (pathname === '/api/dax/leaderboard' && request.method === 'GET') return await leaderboard(request, env, url);
      if (pathname === '/api/dax/stats' && request.method === 'GET') return await publicStats(env, url);
      if (pathname.startsWith('/api/')) return fail('Not found.', 404);
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error('dax-api', error?.stack ?? error);
      return fail('Something went wrong on our side. Please try again.', 500);
    }
  },
};
