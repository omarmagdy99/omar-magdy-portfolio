// Deterministic sample data for the DAX challenges. The public dataset and the hidden grading
// dataset come from the same generator with different seeds, so a hard-coded answer can't pass.

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ['Ahmed', 'Mona', 'Youssef', 'Salma', 'Omar', 'Nour', 'Khaled', 'Hana', 'Tarek', 'Laila', 'Mostafa', 'Dina', 'Karim', 'Yara', 'Hassan', 'Mariam', 'Ali', 'Farida', 'Amr', 'Rana', 'Sherif', 'Heba', 'Ziad', 'Nada', 'Hossam', 'Aya', 'Walid', 'Reem', 'Fady', 'Jana', 'Adel', 'Malak', 'Samir', 'Lina', 'Bassem', 'Dalia', 'Ehab', 'Noha'];
const LAST = ['Hassan', 'Ibrahim', 'Mahmoud', 'Fathy', 'Said', 'Nabil', 'Gamal', 'Samy', 'Helmy', 'Ashraf', 'Kamal', 'Zaki'];
const CITIES = ['Cairo', 'Alexandria', 'Giza'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n, l = 2) => String(n).padStart(l, '0');
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export const RETENTION = {
  id: 'retention',
  firstMonth: { y: 2023, m: 11 },
  lastMonth: { y: 2024, m: 12 },
  // Months the answer is graded on (every month of 2024).
  gradedMonths: Array.from({ length: 12 }, (_, i) => `2024-${pad(i + 1)}`),
};

export function generateRetentionModel(seed, { customers = 36, neverBought = 3 } = {}) {
  const rnd = mulberry32(seed);
  const pick = list => list[Math.floor(rnd() * list.length)];
  const { firstMonth, lastMonth } = RETENTION;

  const months = [];
  for (let y = firstMonth.y, m = firstMonth.m; y < lastMonth.y || (y === lastMonth.y && m <= lastMonth.m); m === 12 ? (y++, m = 1) : m++) months.push([y, m]);

  const dateRows = [];
  for (const [y, m] of months) {
    for (let d = 1; d <= daysIn(y, m); d++) {
      dateRows.push([`${y}-${pad(m)}-${pad(d)}`, y, m, MONTH_NAMES[m - 1], `${y}-${pad(m)}`, `Q${Math.ceil(m / 3)}`]);
    }
  }

  const customerRows = [];
  const habit = [];
  for (let i = 1; i <= customers; i++) {
    const name = `${FIRST[(i * 7 + Math.floor(rnd() * 5)) % FIRST.length]} ${pick(LAST)}`;
    customerRows.push([`C${pad(i, 3)}`, name, pick(CITIES)]);
    // buying habit: loyal, regular, occasional, rare — plus a few who never bought
    const r = rnd();
    habit.push(i > customers - neverBought ? 0 : r < 0.25 ? 0.85 : r < 0.55 ? 0.5 : r < 0.85 ? 0.28 : 0.12);
  }

  const salesRows = [];
  let order = 1;
  for (const [y, m] of months) {
    for (let c = 0; c < customers; c++) {
      if (rnd() >= habit[c]) continue;
      const orders = rnd() < 0.6 ? 1 : rnd() < 0.75 ? 2 : 3; // several orders in a month must count the customer once
      for (let k = 0; k < orders; k++) {
        const day = 1 + Math.floor(rnd() * daysIn(y, m));
        salesRows.push([`O${pad(order++, 4)}`, `${y}-${pad(m)}-${pad(day)}`, customerRows[c][0], Math.round((20 + rnd() * 380) * 100) / 100]);
      }
    }
  }
  salesRows.sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : a[0] < b[0] ? -1 : 1));

  return {
    id: RETENTION.id,
    tables: [
      { name: 'Sales', columns: [{ name: 'OrderID', type: 'text' }, { name: 'OrderDate', type: 'date' }, { name: 'CustomerID', type: 'text' }, { name: 'Amount', type: 'number' }], rows: salesRows },
      { name: 'Customers', columns: [{ name: 'CustomerID', type: 'text' }, { name: 'CustomerName', type: 'text' }, { name: 'City', type: 'text' }], rows: customerRows },
      { name: 'Date', columns: [{ name: 'Date', type: 'date' }, { name: 'Year', type: 'number' }, { name: 'MonthNo', type: 'number' }, { name: 'Month', type: 'text' }, { name: 'YearMonth', type: 'text' }, { name: 'Quarter', type: 'text' }], rows: dateRows },
    ],
    relationships: [
      { from: 'Sales[CustomerID]', to: 'Customers[CustomerID]' },
      { from: 'Sales[OrderDate]', to: 'Date[Date]' },
    ],
    measures: [
      { name: 'Total Sales', table: 'Sales', expr: 'SUM ( Sales[Amount] )' },
      { name: 'Active Customers', table: 'Sales', expr: 'DISTINCTCOUNT ( Sales[CustomerID] )' },
    ],
    dateTable: 'Date',
  };
}

/** Plain-JS answer used to cross-check the DAX engine (not DAX, on purpose). */
export function retentionByMonth(model, { city = null } = {}) {
  const cityOf = new Map(model.tables[1].rows.map(r => [r[0], r[2]]));
  const buyers = new Map();
  for (const [, date, cust] of model.tables[0].rows) {
    if (city && cityOf.get(cust) !== city) continue;
    const ym = date.slice(0, 7);
    if (!buyers.has(ym)) buyers.set(ym, new Set());
    buyers.get(ym).add(cust);
  }
  const prev = ym => { const [y, m] = ym.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`; };
  return RETENTION.gradedMonths.map(ym => {
    const now = buyers.get(ym) ?? new Set(), before = buyers.get(prev(ym)) ?? new Set();
    return [...now].filter(c => before.has(c)).length;
  });
}

/** Month-over-month sales growth as a ratio (0.125 = +12.5%). Zero when last month had no sales. */
export function growthByMonth(model, { city = null } = {}) {
  const cityOf = new Map(model.tables[1].rows.map(r => [r[0], r[2]]));
  const sales = new Map();
  for (const [, date, cust, amount] of model.tables[0].rows) {
    if (city && cityOf.get(cust) !== city) continue;
    const ym = date.slice(0, 7);
    sales.set(ym, (sales.get(ym) ?? 0) + amount);
  }
  const prev = ym => { const [y, m] = ym.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`; };
  return RETENTION.gradedMonths.map(ym => {
    const before = sales.get(prev(ym)) ?? 0;
    return before === 0 ? 0 : ((sales.get(ym) ?? 0) - before) / before;
  });
}

/** Average order value per month: total sales divided by the number of orders (every Sales row is one order). */
export function aovByMonth(model, { city = null } = {}) {
  const cityOf = new Map(model.tables[1].rows.map(r => [r[0], r[2]]));
  const sum = new Map(), count = new Map();
  for (const [, date, cust, amount] of model.tables[0].rows) {
    if (city && cityOf.get(cust) !== city) continue;
    const ym = date.slice(0, 7);
    sum.set(ym, (sum.get(ym) ?? 0) + amount); count.set(ym, (count.get(ym) ?? 0) + 1);
  }
  return RETENTION.gradedMonths.map(ym => (count.get(ym) ? sum.get(ym) / count.get(ym) : 0));
}

export function salesByMonth(model) {
  const sales = new Map();
  for (const [, date, , amount] of model.tables[0].rows) sales.set(date.slice(0, 7), (sales.get(date.slice(0, 7)) ?? 0) + amount);
  return RETENTION.gradedMonths.map(ym => Math.round((sales.get(ym) ?? 0) * 100) / 100);
}

export const PUBLIC_SEED = 20240131;
export const HIDDEN_SEED = 77013;
