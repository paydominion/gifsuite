-- When an admin last reviewed a GIF's reports (by restoring it). Only reports filed after that count
-- towards hiding it again, so a restore needs a fresh set of people, not one more report.
ALTER TABLE gifs ADD COLUMN reports_reviewed_at INTEGER NOT NULL DEFAULT 0;
