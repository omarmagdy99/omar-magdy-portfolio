-- DAX challenge: analytics events, submissions, solvers (leaderboard) and reporting views.

-- One row per visitor, event type and day; `n` counts repeats (e.g. several test runs).
CREATE TABLE IF NOT EXISTS dax_events (
  day          TEXT    NOT NULL,            -- YYYY-MM-DD (UTC)
  challenge_id TEXT    NOT NULL,
  visitor_id   TEXT    NOT NULL,            -- random id kept in the visitor's browser, not a person
  type         TEXT    NOT NULL,            -- view | start | run | hint | copy_data
  n            INTEGER NOT NULL DEFAULT 1,
  first_ts     INTEGER NOT NULL,
  last_ts      INTEGER NOT NULL,
  country      TEXT,
  source       TEXT,                        -- utm_source / ref, or the referrer host
  device       TEXT,                        -- mobile | tablet | desktop
  PRIMARY KEY (day, challenge_id, visitor_id, type)
);
CREATE INDEX IF NOT EXISTS idx_dax_events_challenge ON dax_events (challenge_id, type);

-- Every graded attempt.
CREATE TABLE IF NOT EXISTS dax_submissions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_id TEXT    NOT NULL,
  visitor_id   TEXT    NOT NULL,
  name         TEXT    NOT NULL,
  dax          TEXT    NOT NULL,
  status       TEXT    NOT NULL,            -- correct | wrong | error
  matched      INTEGER,
  total        INTEGER,
  error        TEXT,
  created_at   INTEGER NOT NULL,
  ip_hash      TEXT,
  country      TEXT
);
CREATE INDEX IF NOT EXISTS idx_dax_sub_visitor ON dax_submissions (challenge_id, visitor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dax_sub_ip ON dax_submissions (ip_hash, created_at);

-- One row per visitor who solved it. Ranked by solved_at (first correct solution is #1).
CREATE TABLE IF NOT EXISTS dax_solvers (
  challenge_id     TEXT    NOT NULL,
  visitor_id       TEXT    NOT NULL,
  name             TEXT    NOT NULL,
  linkedin         TEXT,
  dax              TEXT    NOT NULL,
  attempts         INTEGER NOT NULL,
  first_attempt_at INTEGER NOT NULL,
  solved_at        INTEGER NOT NULL,
  hidden           INTEGER NOT NULL DEFAULT 0,   -- moderation switch
  PRIMARY KEY (challenge_id, visitor_id)
);
CREATE INDEX IF NOT EXISTS idx_dax_solvers_rank ON dax_solvers (challenge_id, hidden, solved_at);

-- Reporting views (also used by the admin page and `npm run stats`).
CREATE VIEW IF NOT EXISTS v_dax_funnel AS
SELECT c.challenge_id,
  (SELECT COUNT(DISTINCT visitor_id) FROM dax_events e WHERE e.challenge_id = c.challenge_id AND e.type = 'view')  AS visitors,
  (SELECT COUNT(DISTINCT visitor_id) FROM dax_events e WHERE e.challenge_id = c.challenge_id AND e.type IN ('start','run')) AS started,
  (SELECT COUNT(DISTINCT visitor_id) FROM dax_events e WHERE e.challenge_id = c.challenge_id AND e.type = 'run')   AS ran,
  (SELECT COUNT(DISTINCT visitor_id) FROM dax_submissions s WHERE s.challenge_id = c.challenge_id)                 AS submitted,
  (SELECT COUNT(*) FROM dax_solvers v WHERE v.challenge_id = c.challenge_id)                                       AS solved,
  (SELECT COUNT(*) FROM dax_submissions s WHERE s.challenge_id = c.challenge_id)                                   AS attempts
FROM (SELECT DISTINCT challenge_id FROM dax_events UNION SELECT DISTINCT challenge_id FROM dax_submissions) c;

CREATE VIEW IF NOT EXISTS v_dax_daily AS
SELECT challenge_id, day,
  COUNT(DISTINCT CASE WHEN type = 'view' THEN visitor_id END)  AS visitors,
  COUNT(DISTINCT CASE WHEN type IN ('start','run') THEN visitor_id END) AS started
FROM dax_events GROUP BY challenge_id, day;

CREATE VIEW IF NOT EXISTS v_dax_sources AS
SELECT challenge_id, COALESCE(NULLIF(source, ''), 'direct') AS source,
  COUNT(DISTINCT visitor_id) AS visitors
FROM dax_events WHERE type = 'view' GROUP BY challenge_id, COALESCE(NULLIF(source, ''), 'direct');
