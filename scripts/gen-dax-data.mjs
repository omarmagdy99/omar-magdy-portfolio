// Generates the public sample data (JSON + CSV), each challenge's target, and the private expected answers.
// Expected answers come from plain JavaScript, independent of the DAX engine, and are cross-checked in `npm test`.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { generateRetentionModel, retentionByMonth, growthByMonth, aovByMonth, salesByMonth, RETENTION, PUBLIC_SEED, HIDDEN_SEED } from '../assets/dax/datagen.js';

const root = resolve(import.meta.dirname, '..');
const dataDir = join(root, 'assets/dax/data');
await mkdir(dataDir, { recursive: true });
await mkdir(join(root, 'worker/generated'), { recursive: true });

const pub = generateRetentionModel(PUBLIC_SEED);
const hidden = generateRetentionModel(HIDDEN_SEED);

await writeFile(join(dataDir, 'retention.json'), JSON.stringify(pub));
const csv = t => [t.columns.map(c => c.name).join(','), ...t.rows.map(r => r.join(','))].join('\n') + '\n';
for (const t of pub.tables) await writeFile(join(dataDir, `retention-${t.name.toLowerCase()}.csv`), csv(t));

const series = fn => ({ public: fn(pub), hidden: fn(hidden), hiddenCairo: fn(hidden, { city: 'Cairo' }) });
const expected = { aov: series(aovByMonth), growth: series(growthByMonth), retention: series(retentionByMonth) };

const starter = name => [`${name} =`, '    // Write your DAX here. Start typing for suggestions.', '    BLANK ()'].join('\n');
const sales = { name: 'Total Sales', label: 'Total Sales', labelAr: 'إجمالي المبيعات', values: salesByMonth(pub) };
// What the page shows as the target for each challenge (public data only).
const targets = {
  aov: { months: RETENTION.gradedMonths, values: expected.aov.public, format: 'money', measureName: 'Average Order Value', context: sales, starter: starter('Average Order Value') },
  growth: { months: RETENTION.gradedMonths, values: expected.growth.public, format: 'percent', measureName: 'Sales MoM %', context: sales, starter: starter('Sales MoM %') },
  retention: {
    months: RETENTION.gradedMonths, values: expected.retention.public, format: 'count', measureName: 'Retained Customers',
    context: { name: 'Active Customers', label: 'Active customers', labelAr: 'العملاء النشطون', values: null }, starter: starter('Retained Customers'),
  },
};
for (const [id, t] of Object.entries(targets)) await writeFile(join(dataDir, `${id}-target.json`), JSON.stringify(t));
await writeFile(join(root, 'worker/generated/expected.json'), JSON.stringify(expected, null, 2) + '\n');
console.log('AOV target:', expected.aov.public.map(v => v.toFixed(2)).join(' '));
console.log('Growth target:', expected.growth.public.map(v => (v * 100).toFixed(1) + '%').join(' '));
