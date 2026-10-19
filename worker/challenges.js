// Server-side challenge registry. Grading runs the visitor's measure against the public dataset and several hidden
// ones, for every month and every city, and compares with answers computed independently in plain JavaScript.
// The hidden datasets come from secret seeds (env.HIDDEN_SEEDS): this repository is public, so nothing that
// could rebuild them is committed or published.
import { Model, compile, evaluate, validate, DaxError } from '../assets/dax/engine.js';
import { generateRetentionModel, retentionByMonth, growthByMonth, aovByMonth, RETENTION, PUBLIC_SEED, DEFAULT_HIDDEN_SEEDS } from './datagen.js';
import expected from './generated/expected.json' with { type: 'json' };

export const REFERENCE = {
  aov: `Average Order Value =
DIVIDE ( [Total Sales], DISTINCTCOUNT ( Sales[OrderID] ) )`,
  growth: `Sales MoM % =
VAR CurrentSales = [Total Sales]
VAR PreviousSales =
    CALCULATE ( [Total Sales], DATEADD ( 'Date'[Date], -1, MONTH ) )
RETURN
    DIVIDE ( CurrentSales - PreviousSales, PreviousSales )`,
  retention: `Retained Customers =
VAR CurrentCustomers = VALUES ( Sales[CustomerID] )
VAR PreviousCustomers =
    CALCULATETABLE (
        VALUES ( Sales[CustomerID] ),
        DATEADD ( 'Date'[Date], -1, MONTH )
    )
RETURN
    COUNTROWS ( INTERSECT ( CurrentCustomers, PreviousCustomers ) )`,
};

// Levels unlock in order: a visitor must have solved `requires` before submitting.
export const CHALLENGES = {
  aov: { id: 'aov', level: 1, title: 'Average order value', tolerance: 1e-6, requires: null },
  growth: { id: 'growth', level: 2, title: 'Did sales grow?', tolerance: 1e-6, requires: 'aov' },
  retention: { id: 'retention', level: 3, title: 'Who came back?', tolerance: 1e-9, requires: 'growth' },
};

const EXPECTED_FN = { aov: aovByMonth, growth: growthByMonth, retention: retentionByMonth };
const CITIES = ['Cairo', 'Alexandria', 'Giza'];

/** Parses the HIDDEN_SEEDS secret ("123,456"); falls back to the development defaults. */
export function parseSeeds(value) {
  const seeds = String(value ?? '').split(',').map(s => Number(s.trim())).filter(n => Number.isSafeInteger(n) && n > 0);
  return seeds.length >= 2 ? seeds.slice(0, 4) : DEFAULT_HIDDEN_SEEDS;
}

const modelCache = new Map();
function modelFor(seed) {
  if (!modelCache.has(seed)) modelCache.set(seed, new Model(generateRetentionModel(seed)));
  return modelCache.get(seed);
}
const expectedCache = new Map();
function expectedFor(id, seed, city) {
  const key = `${id}|${seed}|${city ?? ''}`;
  if (!expectedCache.has(key)) expectedCache.set(key, EXPECTED_FN[id](modelFor(seed).spec, city ? { city } : {}));
  return expectedCache.get(key);
}

/** Public data first, then every hidden dataset overall, then each city on a different hidden dataset. */
function scenariosFor(id, seeds) {
  const [a, b] = seeds;
  const city = (name, seed) => ({ dataset: 'hidden', seed, extra: [{ table: 'Customers', column: 'City', values: [name] }], expected: expectedFor(id, seed, name) });
  return [
    { dataset: 'public', seed: PUBLIC_SEED, extra: [], expected: expected[id].public },
    { dataset: 'hidden', seed: a, extra: [], expected: expectedFor(id, a) },
    { dataset: 'hidden', seed: b, extra: [], expected: expectedFor(id, b) },
    city(CITIES[0], b), city(CITIES[1], a), city(CITIES[2], b),
  ];
}

export function evaluateSeries(model, compiled, extra = []) {
  return RETENTION.gradedMonths.map(ym => {
    const v = evaluate(model, compiled, [{ table: 'Date', column: 'YearMonth', values: [ym] }, ...extra], { maxSteps: 250000 });
    return v === null || v === undefined ? 0 : v;
  });
}

/** Grades a submission. Never throws: errors come back as { ok:false, error }. */
export function grade(challengeId, dax, { hiddenSeeds } = {}) {
  if (typeof challengeId !== 'string' || !Object.hasOwn(CHALLENGES, challengeId)) return { ok: false, error: 'Unknown challenge.' };
  const challenge = CHALLENGES[challengeId];
  const same = (a, b) => typeof a === 'number' && isFinite(a) && Math.abs(a - b) <= challenge.tolerance;
  let compiled;
  try {
    compiled = compile(dax);
    const issues = validate(modelFor(PUBLIC_SEED), compiled.ast);
    if (issues.length) return { ok: false, error: issues[0].message };
  } catch (e) {
    return { ok: false, error: e instanceof DaxError ? e.message : 'Could not read that formula.' };
  }
  let matched = 0, total = 0;
  try {
    for (const s of scenariosFor(challengeId, hiddenSeeds ?? DEFAULT_HIDDEN_SEEDS)) {
      const series = evaluateSeries(modelFor(s.seed), compiled, s.extra);
      let ok = 0;
      series.forEach((v, i) => { if (same(v, s.expected[i])) ok++; });
      if (s.dataset === 'public') { matched = ok; total = series.length; }
      if (ok !== series.length) return { ok: true, correct: false, matched: s.dataset === 'public' ? ok : matched, total: total || series.length, stage: s.dataset };
    }
  } catch (e) {
    return { ok: false, error: e instanceof DaxError ? e.message : 'The formula could not be evaluated.' };
  }
  return { ok: true, correct: true, matched, total, stage: 'all' };
}
