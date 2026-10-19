// The DAX challenge page. Static HTML (readable without JavaScript); assets/dax/challenge.js makes it interactive.
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve(import.meta.dirname, '..');
export const CHALLENGE_ID = 'growth';

// Flip to true when the walkthrough goes out; the solution is not shipped to the browser until then.
export const REVEAL_SOLUTION = false;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pct = v => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)}%`;
const money = v => v.toLocaleString('en-US', { maximumFractionDigits: 0 });

/** Bar chart with a zero line, so negative months hang below it. */
function targetChart(values) {
  const W = 720, H = 300, left = 44, right = 12, top = 30, bottom = 40;
  const hi = Math.max(0, ...values), lo = Math.min(0, ...values);
  const step = 0.2;
  const max = Math.ceil(hi / step) * step, min = Math.floor(lo / step) * step;
  const y = v => top + (H - top - bottom) * (1 - (v - min) / (max - min || 1));
  const band = (W - left - right) / values.length, bar = Math.min(34, band * 0.62);
  const ticks = [min, 0, max].filter((t, i, a) => a.indexOf(t) === i).map(t => `<g><line class="chart-grid${t === 0 ? ' chart-zero' : ''}" x1="${left}" x2="${W - right}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/><text class="chart-axis" x="${left - 8}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end">${Math.round(t * 100)}%</text></g>`).join('');
  const bars = values.map((v, i) => {
    const x = left + band * i + (band - bar) / 2, y0 = y(0), y1 = y(v);
    const top0 = Math.min(y0, y1), h = Math.abs(y0 - y1);
    const labelY = v >= 0 ? top0 - 6 : top0 + h + 14;
    return `<g><rect class="chart-bar${v < 0 ? ' chart-bar--neg' : ''}" x="${x.toFixed(1)}" y="${top0.toFixed(1)}" width="${bar.toFixed(1)}" height="${Math.max(h, 1).toFixed(1)}" rx="2"/><text class="chart-value" x="${(x + bar / 2).toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle">${Math.round(v * 100)}%</text><text class="chart-axis" x="${(x + bar / 2).toFixed(1)}" y="${H - 14}" text-anchor="middle">${MONTHS[i]}</text></g>`;
  }).join('');
  const label = `Month-over-month sales growth in 2024: ${values.map((v, i) => `${MONTHS[i]} ${pct(v)}`).join(', ')}.`;
  return `<svg class="target-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg"><title>Month-over-month sales growth, 2024</title>${ticks}${bars}</svg>`;
}

const modelDiagram = `<svg class="model-diagram" viewBox="0 0 640 230" role="img" aria-label="Data model: Customers relates to Sales by CustomerID, and Date relates to Sales by OrderDate. Both are one-to-many into Sales." xmlns="http://www.w3.org/2000/svg">
<title>Data model</title>
<g class="dm-line"><path d="M180 115 H260"/><path d="M380 115 H460"/></g>
<g class="dm-card"><rect x="8" y="40" width="172" height="150" rx="3"/><text class="dm-name" x="22" y="68">Customers</text><text x="22" y="96">CustomerID</text><text x="22" y="120">CustomerName</text><text x="22" y="144">City</text></g>
<g class="dm-card dm-fact"><rect x="260" y="20" width="120" height="190" rx="3"/><text class="dm-name" x="274" y="48">Sales</text><text x="274" y="76">OrderID</text><text x="274" y="100">OrderDate</text><text x="274" y="124">CustomerID</text><text x="274" y="148">Amount</text></g>
<g class="dm-card"><rect x="460" y="20" width="172" height="190" rx="3"/><text class="dm-name" x="474" y="48">Date</text><text x="474" y="76">Date</text><text x="474" y="100">Year</text><text x="474" y="124">MonthNo · Month</text><text x="474" y="148">YearMonth</text><text x="474" y="172">Quarter</text></g>
<g class="dm-card-end"><text x="186" y="108">1</text><text x="244" y="108">∗</text><text x="392" y="108">∗</text><text x="446" y="108">1</text></g>
</svg>`;

export function addDaxPages({ generated, layout }) {
  const target = JSON.parse(readFileSync(join(root, `assets/dax/data/${CHALLENGE_ID}-target.json`), 'utf8'));
  const rows = target.values.map((v, i) => `<tr><th scope="row">${MONTHS[i]} 2024</th><td>${money(target.context.values[i])}</td><td><strong>${pct(v)}</strong></td></tr>`).join('');

  const body = `<div class="container dax-page">
<a class="text-link back-link" href="index.html"><span aria-hidden="true">←</span> Back to the portfolio</a>
<section class="case-hero dax-hero" aria-labelledby="dax-title">
  <div class="eyebrow">DAX Challenge #1 · Beginner friendly · about 5 minutes</div>
  <h1 id="dax-title">Did sales grow?</h1>
  <p class="case-lead">The manager asks one question every month: are we selling more than last month? Write the measure that gives the month-over-month growth, see it match the target, and join the leaderboard.</p>
  <div class="tags"><span>Time intelligence</span><span>CALCULATE</span><span>Variables</span></div>
  <div class="dax-counters" data-dax-stats hidden aria-label="Challenge activity"><span><strong data-n="visitors">0</strong> visited</span><span><strong data-n="started">0</strong> tried it</span><span><strong data-n="solved">0</strong> solved it</span></div>
  <div class="hero-actions"><a class="button" href="#workspace">Start the challenge <span aria-hidden="true">↓</span></a><a class="text-link" href="#leaderboard">See the leaderboard <span aria-hidden="true">↗</span></a></div>
</section>

<section class="dax-brief" aria-labelledby="brief-title">
  <div class="dax-brief__text">
    <h2 id="brief-title">The brief</h2>
    <ul class="dax-rules">
      <li>Growth for a month is <strong>(this month’s sales − last month’s sales) ÷ last month’s sales</strong>.</li>
      <li>You get a ready-made measure, <strong>[Total Sales]</strong>, so you don’t need to sum the Amount column yourself.</li>
      <li>Return a <strong>ratio</strong>, for example <code>0.25</code> for +25%. In Power BI you would format it as a percentage.</li>
      <li>January compares with December of the previous year. It must also respond to the <em>City</em> filter, and never show a divide-by-zero error.</li>
      <li>Write <strong>one measure</strong>. Any approach is welcome: you are graded on the numbers it produces, not on how it looks. It is also tested on a second dataset you can’t see.</li>
    </ul>
    <p class="dax-note">The data is fictional. Download it as CSV to try the measure in your own Power BI Desktop.</p>
    <p class="dax-downloads"><a href="assets/dax/data/retention-sales.csv" download data-dax-download>Sales.csv</a><a href="assets/dax/data/retention-customers.csv" download data-dax-download>Customers.csv</a><a href="assets/dax/data/retention-date.csv" download data-dax-download>Date.csv</a></p>
  </div>
  <figure class="dax-model">${modelDiagram}<figcaption>The model: Customers and Date each filter Sales (one-to-many).</figcaption></figure>
</section>

<section class="dax-target" aria-labelledby="target-title">
  <div class="section-heading"><div><div class="eyebrow">The target</div><h2 id="target-title">Your measure should produce this.</h2></div><p>Month-over-month sales growth, 2024. Match every month and you’re in.</p></div>
  <div class="dax-target__grid">
    <figure class="dax-chart">${targetChart(target.values)}<figcaption>Expected result of the measure, month by month.</figcaption></figure>
    <table class="dax-table"><caption class="sr-only">Total sales and expected growth by month</caption><thead><tr><th scope="col">Month</th><th scope="col">Total Sales</th><th scope="col">Growth (target)</th></tr></thead><tbody>${rows}</tbody></table>
  </div>
</section>

<section class="dax-workspace" id="workspace" aria-labelledby="workspace-title">
  <div class="section-heading"><div><div class="eyebrow">Your turn</div><h2 id="workspace-title">Write the measure.</h2></div><p>Type like you would in Power BI: suggestions appear for functions, tables, columns and measures.</p></div>
  <div class="dax-app" id="dax-app" data-challenge="${CHALLENGE_ID}" data-model="assets/dax/data/retention.json" data-target="assets/dax/data/${CHALLENGE_ID}-target.json">
    <noscript><p class="dax-note">The interactive editor needs JavaScript. You can still download the data above and solve it in Power BI Desktop.</p></noscript>
    <aside class="dax-fields" aria-label="Fields"><h3>Fields</h3><div data-dax-fields></div></aside>
    <div class="dax-main">
      <div data-dax-editor></div>
      <div class="dax-actions">
        <button class="button" type="button" data-dax-run>Run ▷</button>
        <button class="button secondary" type="button" data-dax-reset>Reset</button>
        <span class="dax-run-status" data-dax-run-status role="status" aria-live="polite"></span>
      </div>
      <div class="dax-result" data-dax-result hidden>
        <div class="dax-result__head"><h3>Your result vs the target</h3><span class="dax-badge" data-dax-badge></span></div>
        <div data-dax-chart></div>
        <div class="dax-table-wrap" data-dax-compare></div>
      </div>
      <form class="dax-submit" data-dax-submit novalidate>
        <h3>Submit your solution</h3>
        <p>When your result matches, submit it. Correct solutions are ranked by who solved it first.</p>
        <div class="dax-submit__row">
          <label>Your name<input name="name" autocomplete="nickname" maxlength="32" required placeholder="How should we list you?"></label>
          <label>LinkedIn profile <small>(optional)</small><input name="linkedin" inputmode="url" autocomplete="url" maxlength="140" placeholder="https://www.linkedin.com/in/…"></label>
        </div>
        <button class="button" type="submit" data-dax-submit-button>Submit my solution</button>
        <p class="dax-feedback" data-dax-feedback role="status" aria-live="polite"></p>
        <p class="dax-note">We store your name, optional LinkedIn link, the formula you submit, and anonymous visit counts (a random id in your browser, no cookies, no IP address). Browsers sending Do Not Track or Global Privacy Control are not counted.</p>
      </form>
    </div>
  </div>
  <details class="dax-data"><summary>Browse the data</summary><div data-dax-data class="dax-data__body"></div></details>
</section>

<section class="dax-leaderboard" id="leaderboard" aria-labelledby="board-title">
  <div class="section-heading"><div><div class="eyebrow">Leaderboard</div><h2 id="board-title">Solved it.</h2></div><p>Ranked by who got a correct answer first. Attempts show how many tries it took.</p></div>
  <div class="dax-table-wrap"><table class="dax-table dax-board"><thead><tr><th scope="col">#</th><th scope="col">Name</th><th scope="col">Attempts</th><th scope="col">Time to solve</th><th scope="col">Solved</th></tr></thead><tbody data-dax-board><tr><td colspan="5" class="dax-empty">Loading the leaderboard…</td></tr></tbody></table></div>
</section>

<section class="dax-hints" aria-labelledby="hints-title">
  <h2 id="hints-title">Stuck? Two nudges.</h2>
  <details data-dax-hint="1"><summary>Hint 1: how to think about it</summary><p>You need two numbers: this month’s sales and last month’s sales. <code>[Total Sales]</code> already gives you the first one. The question is how to get the second one.</p></details>
  <details data-dax-hint="2"><summary>Hint 2: the tools</summary><p><code>CALCULATE</code> lets you change the filter context, and a time-intelligence function such as <code>DATEADD</code> can move the dates back by one month. Store each number in a <code>VAR</code> to keep the formula readable, and use <code>DIVIDE</code> so a zero never causes an error.</p></details>
  <p class="dax-note">${REVEAL_SOLUTION ? 'The walkthrough is out. See the LinkedIn post for the full solution.' : 'The full walkthrough, with several approaches, will be shared on LinkedIn once the challenge closes.'}</p>
</section>

<section class="dax-cta"><p>Need this kind of logic in your own reports?</p><a class="button secondary" href="index.html#contact">Talk to Omar <span aria-hidden="true">↗</span></a></section>
</div>`;

  const head = '<link rel="stylesheet" href="assets/dax/challenge.css"><script type="module" src="assets/dax/challenge.js"></script>';
  generated.set('dax-challenge.html', layout({
    title: 'DAX Challenge #1: Did sales grow? | Omar Magdy',
    description: 'A hands-on DAX challenge: calculate month-over-month sales growth with time intelligence. Write the measure in a Power BI-style editor, get graded instantly and join the leaderboard.',
    path: 'dax-challenge.html', prefix: '', body, head, singleLanguage: true,
  }));
}
