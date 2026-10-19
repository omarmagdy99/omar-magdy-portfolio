# DAX Challenge — status

Page `/dax-challenge`: challenge #1 "Did sales grow?" (month-over-month growth, made easier at the user's request; the
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
