// Owner-only stats page. The token is typed here, kept for the tab session only, and sent as a Bearer header.
const root = document.getElementById('admin-root');
const KEY = 'dax.admin.token';
const LEVELS = [['aov', 'Level 1: Average order value'], ['growth', 'Level 2: Did sales grow?'], ['retention', 'Level 3: Who came back?']];
let current = 'aov';
const get = () => { try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; } };
const put = v => { try { v ? sessionStorage.setItem(KEY, v) : sessionStorage.removeItem(KEY); } catch { /* ignore */ } };

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  for (const c of children) node.append(c);
  return node;
}
const pct = n => `${Math.round((n || 0) * 1000) / 10}%`;
const when = s => new Date(s * 1000).toLocaleString();

function kpi(value, label) { return el('div', { className: 'admin-kpi' }, el('strong', {}, String(value ?? '–')), el('span', {}, label)); }
function bars(rows, labelKey, valueKey) {
  const max = Math.max(1, ...rows.map(r => r[valueKey]));
  if (!rows.length) return el('p', { className: 'dax-note' }, 'No data yet.');
  const box = el('div');
  for (const r of rows) {
    const i = el('i'); i.style.width = `${Math.max(2, (r[valueKey] / max) * 100)}%`;
    box.append(el('div', { className: 'admin-bar' }, el('span', {}, String(r[labelKey])), el('div', {}, i), el('em', {}, String(r[valueKey]))));
  }
  return box;
}
function card(title, ...content) { return el('section', { className: 'admin-card' }, el('h2', {}, title), ...content); }

function login(message) {
  const form = el('form', { className: 'admin-login' });
  const input = el('input', { type: 'password', placeholder: 'Admin token', autocomplete: 'off', required: true, ariaLabel: 'Admin token' });
  form.append(input, el('button', { className: 'button', type: 'submit' }, 'Open stats'));
  form.addEventListener('submit', e => { e.preventDefault(); put(input.value.trim()); load(); });
  root.replaceChildren(form, ...(message ? [el('p', { className: 'dax-note' }, message)] : []));
}

async function call(path, init = {}) {
  const res = await fetch(path, { ...init, headers: { Authorization: `Bearer ${get()}`, 'Content-Type': 'application/json' }, cache: 'no-store' });
  if (res.status === 401) throw Object.assign(new Error('unauthorised'), { code: 401 });
  let data = null;
  try { data = await res.json(); } catch { /* not JSON */ }
  if (!res.ok || !data || data.ok === false) throw Object.assign(new Error(data?.error || `HTTP ${res.status}`), { code: res.status });
  return data;
}

async function load() {
  if (!get()) return login();
  let d;
  try { d = await call(`/api/dax/admin/stats?challenge=${current}`); } catch (e) {
    if (e.code === 401) { put(''); return login('That token was not accepted.'); }
    return login(e.code === 429 ? 'Too many requests. Wait a minute and try again.' : 'Could not load the stats. Try again in a moment.');
  }
  const f = d.funnel, r = d.rates;
  const funnel = [
    { step: 'Visited', n: f.visitors }, { step: 'Started typing / ran', n: f.started },
    { step: 'Ran the measure', n: f.ran }, { step: 'Submitted', n: f.submitted }, { step: 'Solved', n: f.solved },
  ];
  const table = (headers, rows) => {
    const t = el('table', { className: 'dax-table' });
    t.append(el('thead', {}, el('tr', {}, ...headers.map(h => el('th', { scope: 'col' }, h)))), el('tbody', {}, ...rows));
    return el('div', { className: 'dax-table-wrap' }, t);
  };
  const solverRows = d.solvers.map(s => {
    const b = el('button', { className: 'button secondary', type: 'button' }, s.hidden ? 'Show' : 'Hide');
    b.addEventListener('click', async () => {
      b.disabled = true;
      try { await call('/api/dax/admin/hide', { method: 'POST', body: JSON.stringify({ challenge: d.challenge, visitor: s.visitor_id, hidden: !s.hidden }) }); await load(); } catch (e) { b.disabled = false; b.textContent = e.code === 429 ? 'Wait…' : 'Retry'; }
    });
    return el('tr', {}, el('td', {}, s.name + (s.hidden ? ' (hidden)' : '')), el('td', {}, String(s.attempts)), el('td', {}, when(s.solved_at)), el('td', {}, b));
  });

  const pick = el('select', { ariaLabel: 'Challenge' }, ...LEVELS.map(([id, label]) => el('option', { value: id, selected: id === current }, label)));
  pick.addEventListener('change', () => { current = pick.value; load(); });
  root.replaceChildren(
    el('label', { className: 'admin-select' }, 'Challenge ', pick),
    el('div', { className: 'admin-kpis' },
      kpi(f.visitors, 'visitors'), kpi(f.started, 'started'), kpi(f.submitted, 'submitted'), kpi(f.solved, 'solved'),
      kpi(pct(r.startRate), 'visitors who started'), kpi(pct(r.solveRate), 'submitters who solved'),
      kpi(r.medianAttemptsToSolve ?? '–', 'median attempts to solve'), kpi(r.medianMinutesToSolve === null ? '–' : `${r.medianMinutesToSolve} min`, 'median time to solve')),
    el('div', { className: 'admin-grid' },
      card('Funnel', bars(funnel, 'step', 'n')),
      card('Visitors per day (30 days)', bars(d.daily.map(x => ({ day: x.day.slice(5), n: x.visitors })), 'day', 'n')),
      card('Where visitors come from', bars(d.sources, 'source', 'visitors')),
      card('Countries', bars(d.countries, 'country', 'visitors')),
      card('Devices', bars(d.devices, 'device', 'visitors')),
      card('Attempts per solver', bars(d.attemptsDist.map(x => ({ a: `${x.attempts} attempt${x.attempts === 1 ? '' : 's'}`, n: x.solvers })), 'a', 'n')),
      card('Submissions by outcome', bars(d.outcomes, 'status', 'n')),
      card('Most common errors', d.errors.length ? table(['Error', '×'], d.errors.map(x => el('tr', {}, el('td', {}, x.error || ''), el('td', {}, String(x.n))))) : el('p', { className: 'dax-note' }, 'No errors yet.')),
    ),
    card('Latest submissions', table(['When', 'Name', 'Result'], d.recent.map(x => el('tr', {}, el('td', {}, when(x.created_at)), el('td', {}, x.name), el('td', {}, x.status === 'wrong' ? `wrong (${x.matched}/${x.total})` : x.status))))),
    card('Solvers (hide a name to remove it from the public board)', table(['Name', 'Attempts', 'Solved', ''], solverRows)),
    el('p', {}, el('button', { className: 'button secondary', type: 'button' }, 'Lock'))
  );
  root.lastChild.firstChild.addEventListener('click', () => { put(''); login(); });
}

load();
