// Server-side challenge registry. Grading runs the visitor's measure against the public dataset and a
// hidden one, in every graded month, and compares with answers precomputed in plain JavaScript.
import { Model, compile, evaluate, validate, DaxError } from '../assets/dax/engine.js';
import { generateRetentionModel, RETENTION, PUBLIC_SEED, HIDDEN_SEED } from '../assets/dax/datagen.js';
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

function scenariosFor(id) {
  const e = expected[id];
  return [
    { dataset: 'public', seed: PUBLIC_SEED, extra: [], expected: e.public },
    { dataset: 'hidden', seed: HIDDEN_SEED, extra: [], expected: e.hidden },
    { dataset: 'hidden', seed: HIDDEN_SEED, extra: [{ table: 'Customers', column: 'City', values: ['Cairo'] }], expected: e.hiddenCairo },
  ];
}

const modelCache = new Map();
function modelFor(seed) {
  if (!modelCache.has(seed)) modelCache.set(seed, new Model(generateRetentionModel(seed)));
  return modelCache.get(seed);
}

export function evaluateSeries(model, compiled, extra = []) {
  return RETENTION.gradedMonths.map(ym => {
    const v = evaluate(model, compiled, [{ table: 'Date', column: 'YearMonth', values: [ym] }, ...extra], { maxSteps: 250000 });
    return v === null || v === undefined ? 0 : v;
  });
}

/** Grades a submission. Never throws: errors come back as { ok:false, error }. */
export function grade(challengeId, dax) {
  const challenge = CHALLENGES[challengeId];
  if (!challenge) return { ok: false, error: 'Unknown challenge.' };
  const same = (a, b) => typeof a === 'number' && isFinite(a) && Math.abs(a - b) <= challenge.tolerance;
  let compiled;
  try {
    compiled = compile(dax);
    const issues = validate(modelFor(PUBLIC_SEED), compiled.ast);
    if (issues.length) return { ok: false, error: issues[0].message };
  } catch (e) {
    return { ok: false, error: e instanceof DaxError ? e.message : 'Could not read that formula.' };
  }
  // Public data first: most wrong answers stop here, which keeps grading cheap.
  let matched = 0, total = 0;
  try {
    for (const s of scenariosFor(challengeId)) {
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
