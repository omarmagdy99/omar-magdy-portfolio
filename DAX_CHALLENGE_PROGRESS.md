# DAX Challenge — status

Three levels (aov → growth → retention) at `/dax-challenge`, `/dax-challenge-growth`, `/dax-challenge-retention`; each unlocks after the previous is solved (enforced in the Worker). Original note: challenge #1 "Did sales grow?" (month-over-month growth, made easier at the user's request; the
harder "Who came back?" retention challenge is fully implemented and tested as `retention`, ready to use as #2).

## Built and verified (local end-to-end in the browser with `wrangler dev` + local D1)
- Engine, editor (suggestions, signature help, highlighting, diagnostics), run-vs-target chart/table, submit, leaderboard, counters,
  admin stats page, analytics (utm source, device, country), rate limits, origin check, token-protected admin. 46 tests pass (`npm test`).
- `npm run build && npm run check` pass (18 pages). Mobile 375px has no horizontal overflow.

## Not done / for the user
1. Nothing is committed or deployed. Cloudflare steps are in README ("DAX challenge"): create D1, set `database_id`, apply migration `--remote`, set secrets `ADMIN_TOKEN` + `HASH_SALT`, `npm run deploy`.
2. Workers Free allows 10 ms CPU; grading takes ~20 ms warm → likely needs Workers Paid. Not measured on Cloudflare.
3. Optional: PNG of the target chart for the LinkedIn post, Arabic page, solution reveal (`REVEAL_SOLUTION` in `content/dax-challenge-page.mjs` only changes a sentence for now), wire retention as challenge #2.
4. Editor auto-pairing of brackets/quotes was not exercised by the browser tool (it inserts text without key events); worth a manual try.
5. Engine supports a subset of DAX (~65 functions); unsupported ones give a clear message. Add functions in `assets/dax/engine.js` + `functions.js` (a test keeps them in sync).

## Load / performance (measured locally)
- 100 simultaneous visitors, 1,500 requests, 300 correct solves: 0 errors, lock enforced. Grading of the heaviest solution ≈ 6 ms warm after caching (was 21 ms). Leaderboard/stats are cached per isolate (10 s / 60 s). Per-IP submit limit is 200 / 10 min.

## Code review follow-up (Codex)
Fixed: hidden data now from secret seeds (generator moved to `worker/`, not published), text length cap, CALCULATE argument order, every city graded, RELATED path search, UNION duplicates, strict `==`, rank race, admin errors, data tabs a11y, editor `lang=en`.
Not changed: DATEADD partial-month edge cases; analytics rows from rotating visitor ids (rate-limited per IP; consider Turnstile).
**Before the next deploy:** `npx wrangler secret put HIDDEN_SEEDS` (e.g. `912345,678901`), because the old default seeds are in the public git history.
