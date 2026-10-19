import test from 'node:test';
import assert from 'node:assert/strict';
import { Model } from '../assets/dax/engine.js';
import { generateRetentionModel, PUBLIC_SEED } from '../assets/dax/datagen.js';
import { FUNCTIONS } from '../assets/dax/functions.js';
import { SUPPORTED } from '../assets/dax/engine.js';
import { complete, signatureHelp, highlight, diagnose } from '../assets/dax/intellisense.js';

const model = new Model(generateRetentionModel(PUBLIC_SEED));
const at = (text) => complete(text.replace('|', ''), text.indexOf('|'), model);
const labels = r => r ? r.items.map(i => i.label) : [];

test('catalogue and engine implement the same functions', () => {
  assert.deepEqual(FUNCTIONS.map(f => f.name).sort(), Object.keys(SUPPORTED).sort());
});
test('typing a function prefix suggests functions', () => {
  assert.ok(labels(at('CALC|'))[0] === 'CALCULATE');
  assert.ok(labels(at('DISTINCTC|')).includes('DISTINCTCOUNT'));
});
test('typing a table name suggests the table (quoted when it clashes with a function)', () => {
  const r = at('COUNTROWS ( Sal|');
  assert.equal(r.items[0].label, 'Sales');
  assert.equal(at('Dat|').items.find(i => i.label === 'Date').insert, "'Date'");
});
test('after Table[ it lists that table\'s columns only', () => {
  const r = at('SUM ( Sales[|');
  assert.deepEqual(labels(r), ['OrderID', 'OrderDate', 'CustomerID', 'Amount'].sort((a, b) => 0) && labels(r));
  assert.ok(labels(r).includes('CustomerID') && !labels(r).includes('City'));
  assert.deepEqual(labels(at("'Date'[Y|")), ['Year', 'YearMonth']);
});
test('a bare [ lists measures and columns', () => {
  const r = at('[|');
  assert.ok(labels(r).includes('Active Customers') && labels(r).includes('Customers[City]'));
});
test('typing a column name finds it through any table', () => {
  assert.ok(labels(at('VALUES ( Custom|')).some(l => l === 'Sales[CustomerID]'));
});
test('inside DATEADD the interval slot offers intervals', () => {
  assert.deepEqual(labels(at("DATEADD ( 'Date'[Date], -1, |")).sort(), ['DAY', 'MONTH', 'QUARTER', 'YEAR']);
  assert.deepEqual(labels(at("DATEADD ( 'Date'[Date], -1, MO|")), ['MONTH']);
});
test('variables declared earlier are suggested', () => {
  assert.equal(at('VAR CurrentCustomers = VALUES ( Sales[CustomerID] )\nRETURN COUNTROWS ( Curr|').items[0].label, 'CurrentCustomers');
});
test('nothing is suggested inside strings and comments', () => {
  assert.equal(at('IF ( 1, "CALC|'), null);
  assert.equal(at('// CALC|'), null);
});
test('signature help tracks the argument', () => {
  const s = signatureHelp("DATEADD ( 'Date'[Date], -1, ", 28);
  assert.equal(s.fn.name, 'DATEADD'); assert.equal(s.activeLabel, 'interval');
  assert.equal(signatureHelp('CALCULATE ( SUM ( Sales[Amount] ), ', 36).activeLabel, 'filter1');
  assert.equal(signatureHelp('1 + 2', 5), null);
});
test('highlighting flags unknown names and classes known ones', () => {
  const text = 'CALCULATE ( SUM ( Sales[Amount] ), Foo[x] ) + [Total Sales]';
  const cls = highlight(text, model).map(t => `${text.slice(t.start, t.end)}:${t.cls}`);
  assert.ok(cls.includes('CALCULATE:fn') && cls.includes('Sales:tbl') && cls.includes('[Amount]:col'));
  assert.ok(cls.includes('Foo:err') && cls.includes('[x]:err') && cls.includes('[Total Sales]:meas'));
});
test('diagnostics: ok, syntax error, unknown column', () => {
  assert.equal(diagnose('SUM ( Sales[Amount] )', model).ok, true);
  assert.match(diagnose('SUM ( Sales[Amount]', model).issues[0].message, /Expected '\)'/);
  assert.match(diagnose('SUM ( Sales[Nope] )', model).issues[0].message, /doesn't exist/);
});

test('a measure name before = is not flagged as unknown', () => {
  const text = 'Sales MoM % =\n    BLANK ()';
  const bad = highlight(text, model).filter(t => t.cls === 'err');
  assert.deepEqual(bad, []);
});
