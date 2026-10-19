import test from 'node:test';
import assert from 'node:assert/strict';
import { Model, compile, evaluate, validate, DaxError } from '../assets/dax/engine.js';
import { generateRetentionModel, retentionByMonth, growthByMonth, aovByMonth, PUBLIC_SEED, DEFAULT_HIDDEN_SEEDS } from '../worker/datagen.js';
import { grade as gradeAny, REFERENCE, evaluateSeries } from '../worker/challenges.js';
const REFERENCE_DAX = REFERENCE.retention;
const grade = (id, dax) => gradeAny(id, dax);

const model = seed => new Model(generateRetentionModel(seed));
const series = (dax, seed = PUBLIC_SEED, extra = []) => evaluateSeries(model(seed), compile(dax), extra);

const SOLUTIONS = {
  reference: REFERENCE_DAX,
  'FILTER + CALCULATE (context transition)': `Retained =
CALCULATE ( DISTINCTCOUNT ( Sales[CustomerID] ),
  FILTER ( VALUES ( Sales[CustomerID] ),
    CALCULATE ( COUNTROWS ( Sales ), DATEADD ( 'Date'[Date], -1, MONTH ) ) > 0 ) )`,
  'SUMX over customers': `SUMX ( VALUES ( Sales[CustomerID] ), IF ( CALCULATE ( COUNTROWS ( Sales ), DATEADD ( 'Date'[Date], -1, MONTH ) ) > 0, 1, 0 ) )`,
  'NOT ISEMPTY': `COUNTROWS ( FILTER ( VALUES ( Sales[CustomerID] ), NOT ISEMPTY ( CALCULATETABLE ( Sales, DATEADD ( 'Date'[Date], -1, MONTH ) ) ) ) )`,
  'IN + PREVIOUSMONTH': `COUNTROWS ( FILTER ( VALUES ( Sales[CustomerID] ), Sales[CustomerID] IN CALCULATETABLE ( VALUES ( Sales[CustomerID] ), PREVIOUSMONTH ( 'Date'[Date] ) ) ) )`,
  'EDATE / EOMONTH dates': `VAR PrevStart = EDATE ( MIN ( 'Date'[Date] ), -1 )
VAR PrevCustomers = CALCULATETABLE ( VALUES ( Sales[CustomerID] ), DATESBETWEEN ( 'Date'[Date], PrevStart, EOMONTH ( PrevStart, 0 ) ) )
RETURN COUNTROWS ( INTERSECT ( VALUES ( Sales[CustomerID] ), PrevCustomers ) )`,
  'EXCEPT (customers minus new ones)': `VAR Cur = VALUES ( Sales[CustomerID] )
VAR Prev = CALCULATETABLE ( VALUES ( Sales[CustomerID] ), DATEADD ( 'Date'[Date], -1, MONTH ) )
RETURN COUNTROWS ( Cur ) - COUNTROWS ( EXCEPT ( Cur, Prev ) )`,
  'TREATAS on the other side': `VAR Prev = CALCULATETABLE ( VALUES ( Sales[CustomerID] ), DATEADD ( 'Date'[Date], -1, MONTH ) )
RETURN CALCULATE ( DISTINCTCOUNT ( Sales[CustomerID] ), TREATAS ( Prev, Sales[CustomerID] ) )`,
};
const WRONG = {
  'active customers only': `DISTINCTCOUNT ( Sales[CustomerID] )`,
  'previous month customers': `CALCULATE ( DISTINCTCOUNT ( Sales[CustomerID] ), DATEADD ( 'Date'[Date], -1, MONTH ) )`,
  'bought at any time before': `COUNTROWS ( INTERSECT ( VALUES ( Sales[CustomerID] ), CALCULATETABLE ( VALUES ( Sales[CustomerID] ), DATESBETWEEN ( 'Date'[Date], BLANK (), MIN ( 'Date'[Date] ) - 1 ) ) ) )`,
  'month number minus one (breaks in January)': `VAR m = MAX ( 'Date'[MonthNo] ) VAR y = MAX ( 'Date'[Year] )
RETURN COUNTROWS ( INTERSECT ( VALUES ( Sales[CustomerID] ), CALCULATETABLE ( VALUES ( Sales[CustomerID] ), ALL ( 'Date' ), 'Date'[MonthNo] = m - 1, 'Date'[Year] = y ) ) )`,
  'counts orders instead of customers': `CALCULATE ( COUNTROWS ( Sales ), FILTER ( VALUES ( Sales[CustomerID] ), CALCULATE ( COUNTROWS ( Sales ), DATEADD ( 'Date'[Date], -1, MONTH ) ) > 0 ) )`,
  'hard-coded numbers': `SWITCH ( MAX ( 'Date'[MonthNo] ), 1, 9, 2, 13, 3, 12, 4, 10, 5, 9, 6, 8, 7, 7, 8, 12, 9, 12, 10, 11, 11, 13, 12, 17 )`,
};

test('engine agrees with an independent JavaScript computation (public and hidden data)', () => {
  assert.deepEqual(series(REFERENCE_DAX), retentionByMonth(generateRetentionModel(PUBLIC_SEED)));
  assert.deepEqual(series(REFERENCE_DAX, DEFAULT_HIDDEN_SEEDS[0]), retentionByMonth(generateRetentionModel(DEFAULT_HIDDEN_SEEDS[0])));
  assert.deepEqual(series(REFERENCE_DAX, DEFAULT_HIDDEN_SEEDS[0], [{ table: 'Customers', column: 'City', values: ['Cairo'] }]), retentionByMonth(generateRetentionModel(DEFAULT_HIDDEN_SEEDS[0]), { city: 'Cairo' }));
});

for (const [name, dax] of Object.entries(SOLUTIONS)) {
  test(`accepts a correct approach: ${name}`, () => {
    const r = grade('retention', dax);
    assert.equal(r.ok, true, r.error);
    assert.equal(r.correct, true, `matched ${r.matched}/${r.total}`);
  });
}
for (const [name, dax] of Object.entries(WRONG)) {
  test(`rejects a wrong approach: ${name}`, () => {
    const r = grade('retention', dax);
    assert.equal(r.ok, true, r.error);
    assert.equal(r.correct, false);
    assert.ok(r.total === 12 && r.matched < 12 || r.stage !== "public");
  });
}

test('the data has the traps the challenge promises', () => {
  const m = generateRetentionModel(PUBLIC_SEED);
  const orders = new Map();
  for (const [, date, cust] of m.tables[0].rows) { const k = `${cust}|${date.slice(0, 7)}`; orders.set(k, (orders.get(k) ?? 0) + 1); }
  assert.ok([...orders.values()].some(n => n > 1), 'some customer orders more than once in a month');
  assert.ok(m.tables[1].rows.some(c => !m.tables[0].rows.some(s => s[2] === c[0])), 'some customer never bought');
  assert.ok(m.tables[0].rows.some(s => s[1].startsWith('2023-12')), 'December 2023 exists so January can look back across the year boundary');
});

test('syntax errors are explained with a position', () => {
  assert.throws(() => compile('COUNTROWS ( VALUES ( Sales[CustomerID] )'), e => e instanceof DaxError && /Expected '\)'/.test(e.message));
  assert.throws(() => compile('Retained ='), e => /Add the formula/.test(e.message));
  assert.throws(() => compile('VAR x = 1'), e => /RETURN/.test(e.message));
  assert.throws(() => compile('EVALUATE Sales'), e => /Write just the measure/.test(e.message));
});

test('unknown names are reported without running the formula', () => {
  const issues = validate(model(PUBLIC_SEED), compile('SUM ( Sales[Revenue] ) + COUNTROWS ( Orders ) + FOO ( 1 ) + [Nope]').ast);
  assert.equal(issues.length, 4);
  assert.match(grade('retention', 'SUM ( Sales[Revenue] )').error, /Sales\[Revenue\]/);
});

test('measure name, quoting and comments are handled', () => {
  const c = compile('/* c */ Retained Customers = // note\n 1 + 1');
  assert.equal(c.name, 'Retained Customers');
  assert.equal(evaluate(model(PUBLIC_SEED), c), 2);
  assert.equal(compile('[My Measure] = 3').name, 'My Measure');
  assert.equal(compile('Sales[Amount] = 3').name, null);
});

test('formulas that return tables or loop too long fail gracefully', () => {
  assert.match(grade('retention', 'VALUES ( Sales[CustomerID] )').error, /table/);
  const heavy = grade('retention', 'SUMX ( ALL ( Sales ), SUMX ( ALL ( Sales ), SUMX ( ALL ( Sales ), 1 ) ) )');
  assert.equal(heavy.ok, false);
  assert.match(heavy.error, /too much work/);
});

test('grading is fast enough for a Worker', () => {
  const t = performance.now();
  for (let i = 0; i < 5; i++) grade('retention', SOLUTIONS['FILTER + CALCULATE (context transition)']);
  const per = (performance.now() - t) / 5;
  console.log(`  grade() ≈ ${per.toFixed(1)} ms per submission (warm)`);
  assert.ok(per < 400);
});

test('numeric semantics: blank vs zero, division, strings, dates', () => {
  const m = model(PUBLIC_SEED);
  const v = d => evaluate(m, compile(d));
  assert.equal(v('DIVIDE ( 1, 0, -1 )'), -1);
  assert.equal(v('ISBLANK ( COUNTROWS ( FILTER ( Sales, FALSE () ) ) )'), true);
  assert.equal(v('"a" & "b"'), 'ab');
  assert.equal(v('SWITCH ( TRUE (), 1 > 2, "x", 2 > 1, "y", "z" )'), 'y');
  assert.equal(v('DATE ( 2024, 0, 1 )'), '2023-12-01');
  assert.equal(v('EOMONTH ( DATE ( 2024, 2, 10 ), 0 )'), '2024-02-29');
  assert.equal(v('CALCULATE ( [Active Customers], \'Date\'[YearMonth] = "2024-03" )') > 0, true);
});

/* ───────── challenge #1: month-over-month sales growth ───────── */
const GROWTH_OK = {
  reference: REFERENCE.growth,
  'PREVIOUSMONTH': `VAR Prev = CALCULATE ( [Total Sales], PREVIOUSMONTH ( 'Date'[Date] ) ) RETURN DIVIDE ( [Total Sales] - Prev, Prev )`,
  'ratio minus one': `VAR Prev = CALCULATE ( SUM ( Sales[Amount] ), DATEADD ( 'Date'[Date], -1, MONTH ) ) RETURN DIVIDE ( SUM ( Sales[Amount] ), Prev ) - 1`,
  'PARALLELPERIOD, no variables': `DIVIDE ( [Total Sales] - CALCULATE ( [Total Sales], PARALLELPERIOD ( 'Date'[Date], -1, MONTH ) ), CALCULATE ( [Total Sales], PARALLELPERIOD ( 'Date'[Date], -1, MONTH ) ) )`,
  'IF guard instead of DIVIDE': `VAR Prev = CALCULATE ( [Total Sales], DATEADD ( 'Date'[Date], -1, MONTH ) ) RETURN IF ( Prev = 0, BLANK (), ( [Total Sales] - Prev ) / Prev )`,
};
const GROWTH_WRONG = {
  'absolute change, not a ratio': `[Total Sales] - CALCULATE ( [Total Sales], DATEADD ( 'Date'[Date], -1, MONTH ) )`,
  'versus the same month last year': `VAR Prev = CALCULATE ( [Total Sales], SAMEPERIODLASTYEAR ( 'Date'[Date] ) ) RETURN DIVIDE ( [Total Sales] - Prev, Prev )`,
  'percent points instead of a ratio': `VAR Prev = CALCULATE ( [Total Sales], DATEADD ( 'Date'[Date], -1, MONTH ) ) RETURN DIVIDE ( [Total Sales] - Prev, Prev ) * 100`,
  'divides by the current month': `VAR Prev = CALCULATE ( [Total Sales], DATEADD ( 'Date'[Date], -1, MONTH ) ) RETURN DIVIDE ( [Total Sales] - Prev, [Total Sales] )`,
  'ignores the previous month': `[Total Sales]`,
};
test('growth: engine agrees with plain JavaScript on public and hidden data', () => {
  const run = (seed, extra = []) => evaluateSeries(model(seed), compile(REFERENCE.growth), extra);
  const close = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
  assert.ok(close(run(PUBLIC_SEED), growthByMonth(generateRetentionModel(PUBLIC_SEED))));
  assert.ok(close(run(DEFAULT_HIDDEN_SEEDS[0]), growthByMonth(generateRetentionModel(DEFAULT_HIDDEN_SEEDS[0]))));
  assert.ok(close(run(DEFAULT_HIDDEN_SEEDS[0], [{ table: 'Customers', column: 'City', values: ['Cairo'] }]), growthByMonth(generateRetentionModel(DEFAULT_HIDDEN_SEEDS[0]), { city: 'Cairo' })));
});
for (const [name, dax] of Object.entries(GROWTH_OK)) test(`growth accepts: ${name}`, () => { const r = grade('growth', dax); assert.equal(r.ok, true, r.error); assert.equal(r.correct, true, `matched ${r.matched}/${r.total} (${r.stage})`); });
for (const [name, dax] of Object.entries(GROWTH_WRONG)) test(`growth rejects: ${name}`, () => { const r = grade('growth', dax); assert.equal(r.ok, true, r.error); assert.equal(r.correct, false); });

/* ───────── challenge #1: average order value (the 2-minute one) ───────── */
const AOV_OK = {
  reference: REFERENCE.aov,
  'AVERAGE of Amount': 'AVERAGE ( Sales[Amount] )',
  'SUM / COUNTROWS': 'DIVIDE ( SUM ( Sales[Amount] ), COUNTROWS ( Sales ) )',
  'AVERAGEX over orders': 'AVERAGEX ( Sales, Sales[Amount] )',
};
const AOV_WRONG = {
  'total sales only': '[Total Sales]',
  'sales per customer, not per order': 'DIVIDE ( [Total Sales], DISTINCTCOUNT ( Sales[CustomerID] ) )',
  'order count': 'DISTINCTCOUNT ( Sales[OrderID] )',
};
test('aov: engine agrees with plain JavaScript on public and hidden data', () => {
  const run = (seed, extra = []) => evaluateSeries(model(seed), compile(REFERENCE.aov), extra);
  const close = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
  assert.ok(close(run(PUBLIC_SEED), aovByMonth(generateRetentionModel(PUBLIC_SEED))));
  assert.ok(close(run(DEFAULT_HIDDEN_SEEDS[0], [{ table: 'Customers', column: 'City', values: ['Cairo'] }]), aovByMonth(generateRetentionModel(DEFAULT_HIDDEN_SEEDS[0]), { city: 'Cairo' })));
});
for (const [name, dax] of Object.entries(AOV_OK)) test(`aov accepts: ${name}`, () => { const r = grade('aov', dax); assert.equal(r.ok, true, r.error); assert.equal(r.correct, true, `matched ${r.matched}/${r.total} (${r.stage})`); });
for (const [name, dax] of Object.entries(AOV_WRONG)) test(`aov rejects: ${name}`, () => { const r = grade('aov', dax); assert.equal(r.ok, true, r.error); assert.equal(r.correct, false); });
test('levels unlock in order', async () => {
  const { CHALLENGES } = await import('../worker/challenges.js');
  assert.deepEqual(Object.values(CHALLENGES).sort((a, b) => a.level - b.level).map(c => [c.id, c.requires]), [['aov', null], ['growth', 'aov'], ['retention', 'growth']]);
});

/* ───────── hostile input ───────── */
test('hostile formulas are refused or bounded', () => {
  const nested = '('.repeat(500) + '1' + ')'.repeat(500);
  assert.throws(() => compile(nested), e => e instanceof DaxError && /nested too deeply/.test(e.message));
  assert.throws(() => compile('1' + ' + 1'.repeat(1600)), e => e instanceof DaxError && /too long/.test(e.message));
  for (const name of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf']) {
    const r = grade('growth', `${name} ( 1 )`);
    assert.equal(r.ok, false, name);
    assert.match(r.error, /Unknown function/);
  }
  // a formula that rebuilds filter masks in a loop is charged for that work and stopped
  const t = performance.now();
  const r = grade('growth', "SUMX ( ALL ( Sales ), SUMX ( ALL ( Sales ), CALCULATE ( COUNTROWS ( Sales ), ALL ( 'Date' ) ) ) )");
  assert.equal(r.ok, false);
  assert.match(r.error, /too much work/);
  assert.ok(performance.now() - t < 1500, 'stopped quickly');
});

/* ───────── review findings (Codex) ───────── */
test('text can not be grown without bound', () => {
  const doubling = 'VAR a0 = "xxxxxxxxxxxxxxxx" ' + Array.from({ length: 24 }, (_, i) => `VAR a${i + 1} = a${i} & a${i}`).join(' ') + ' RETURN IF ( a24 = "q", 1, 0 )';
  const r = grade('aov', doubling);
  assert.equal(r.ok, false);
  assert.match(r.error, /longer than/);
});

test('CALCULATE evaluates filter arguments in the original context', () => {
  // Inside the iterator the explicit VALUES filter sees ALL visible customers, so the denominator is multiplied.
  const wrong = 'DIVIDE ( [Total Sales], SUMX ( VALUES ( Sales[CustomerID] ), CALCULATE ( COUNTROWS ( Sales ), VALUES ( Sales[CustomerID] ) ) ) )';
  const r = grade('aov', wrong);
  assert.equal(r.ok, true, r.error);
  assert.equal(r.correct, false);
});

test('every city is graded, not just one', () => {
  const cheat = 'IF ( SELECTEDVALUE ( Customers[City] ) = "Alexandria", 0, AVERAGE ( Sales[Amount] ) )';
  const r = grade('aov', cheat);
  assert.equal(r.ok, true, r.error);
  assert.equal(r.correct, false);
  assert.equal(r.stage, 'hidden');
});

test('hidden datasets come from the supplied seeds, and correct answers pass for any seeds', async () => {
  const { parseSeeds } = await import('../worker/challenges.js');
  assert.deepEqual(parseSeeds('111, 222'), [111, 222]);
  assert.deepEqual(parseSeeds(undefined), DEFAULT_HIDDEN_SEEDS);
  assert.deepEqual(parseSeeds('abc,-5,1.5'), DEFAULT_HIDDEN_SEEDS);
  for (const seeds of [[111, 222], [987654, 123456], [5, 6]]) assert.equal(grade('growth', REFERENCE.growth, { hiddenSeeds: seeds }).correct, true, seeds.join());
  // a lookup table built from the default seeds can not pass once the seeds are different
  const lookup = 'SWITCH ( MAX ( \'Date\'[MonthNo] ), 1, 0.237525, 2, -0.074833, 3, -0.056939, 4, -0.034261, 5, -0.349139, 6, -0.120576, 7, 0.705741, 8, -0.254, 9, 0.265, 10, -0.011, 11, 0.224, 12, 0.22 )';
  assert.equal(grade('growth', lookup, { hiddenSeeds: [111, 222] }).correct, false);
});

test('RELATED follows the relationship toward the requested table', () => {
  const viaDate = 'DIVIDE ( SUMX ( Sales, Sales[Amount] * ( RELATED ( \'Date\'[Year] ) > 0 ) ), COUNTROWS ( Sales ) )';
  const viaCustomers = 'DIVIDE ( SUMX ( Sales, Sales[Amount] * ( LEN_IS_UNSUPPORTED = 1 ) ), 1 )';
  const r = grade('aov', viaDate);
  assert.equal(r.ok, true, r.error);
  assert.equal(r.correct, true);
  assert.equal(evaluate(model(PUBLIC_SEED), compile('SUMX ( Sales, IF ( RELATED ( Customers[City] ) = "Cairo", 1, 0 ) )')) > 0, true);
  assert.ok(viaCustomers);
});

test('UNION keeps duplicate rows', () => {
  const m = model(PUBLIC_SEED);
  assert.equal(evaluate(m, compile('COUNTROWS ( UNION ( { 1 }, { 1 } ) )')), 2);
  assert.equal(evaluate(m, compile('COUNTROWS ( DISTINCT ( UNION ( { 1 }, { 1 } ) ) )')), 1);
  const aov = 'DIVIDE ( SUMX ( UNION ( Sales, Sales ), Sales[Amount] ), 2 * DISTINCTCOUNT ( Sales[OrderID] ) )';
  assert.equal(grade('aov', aov).correct, true);
});

test('strict equality treats BLANK as different from 0, empty text and FALSE', () => {
  const m = model(PUBLIC_SEED);
  const v = d => evaluate(m, compile(d));
  assert.equal(v('BLANK () == 0'), false);
  assert.equal(v('BLANK () = 0'), true);
  assert.equal(v('BLANK () == BLANK ()'), true);
  assert.equal(v('1 == 1'), true);
  assert.equal(v('"1" == 1'), false);
});

test('DATEADD handles partial month selections like DAX', () => {
  const m = model(PUBLIC_SEED);
  const shifted = (filter, n = 1) => {
    // count the dates DATEADD produces for a selection of the Date column
    const compiled = compile(`COUNTROWS ( CALCULATETABLE ( VALUES ( 'Date'[Date] ), DATEADD ( 'Date'[Date], ${n}, MONTH ) ) )`);
    return evaluate(m, compiled, filter);
  };
  const sel = values => [{ table: 'Date', column: 'Date', values }];
  assert.equal(shifted(sel(['2024-02-28', '2024-02-29'])), 4);       // Mar 28–31
  assert.equal(shifted(sel(['2024-02-29'])), 1);                      // Mar 29, not Mar 31
  assert.equal(shifted(sel(['2024-03-01', '2024-03-02', '2024-03-03']), -1), 3); // Feb 1–3
});
