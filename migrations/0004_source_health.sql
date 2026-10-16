-- Health of each outside source GifSuite fetches from (X for now), shared by every Worker instance.
-- A run of failures pauses that source for a short while (a "circuit breaker"), so grabs go straight to
-- the fallback instead of each waiting on a source that's down. /api/health reports it.
CREATE TABLE IF NOT EXISTS source_health (
  source       TEXT PRIMARY KEY,
  failures     INTEGER NOT NULL DEFAULT 0,  -- failures in the current window
  window_start INTEGER NOT NULL DEFAULT 0,  -- ms
  paused_until INTEGER NOT NULL DEFAULT 0,  -- ms; 0 = not paused
  last_ok      INTEGER,                     -- ms of the last success
  last_error   TEXT                         -- short description of the last failure
);
