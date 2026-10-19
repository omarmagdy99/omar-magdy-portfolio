import test from 'node:test';
import assert from 'node:assert/strict';
import { EN, AR, MONTHS } from '../assets/dax/i18n.js';
import { LEVELS } from '../content/dax-challenge-page.mjs';

const placeholders = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');

test('every interface string exists in both languages with the same placeholders', () => {
  assert.deepEqual(Object.keys(AR).sort(), Object.keys(EN).sort());
  for (const key of Object.keys(EN)) assert.equal(placeholders(AR[key]), placeholders(EN[key]), `placeholders differ for ${key}`);
  assert.equal(MONTHS.ar.length, 12);
});

test('every level has the same structure in English and Arabic', () => {
  for (const level of LEVELS) {
    assert.deepEqual(Object.keys(level.ar).sort(), Object.keys(level.en).sort(), level.id);
    assert.equal(level.ar.rules.length, level.en.rules.length, `${level.id} rules`);
    assert.equal(level.ar.hints.length, level.en.hints.length, `${level.id} hints`);
    assert.equal(level.ar.tags.length, level.en.tags.length, `${level.id} tags`);
    // formulas and code names must survive translation
    const code = html => (html.match(/<code>[^<]*<\/code>/g) ?? []).sort().join('|');
    level.en.hints.forEach(([, text], i) => assert.equal(code(level.ar.hints[i][1]), code(text), `${level.id} hint ${i + 1} code`));
  }
});
