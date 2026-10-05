-- Public/private visibility, chosen by whoever grabbed the GIF, and the NSFW filter.

-- 1 = on the public timeline (the default), 0 = private: off the timeline, but the link still works.
ALTER TABLE gifs ADD COLUMN is_public INTEGER NOT NULL DEFAULT 1;

-- SHA-256 of the grabber's browser key (the gs_owner cookie). Only that browser can change visibility.
-- NULL for GIFs grabbed before this existed: only an admin can change those.
ALTER TABLE gifs ADD COLUMN owner_key_hash TEXT;

-- NULL = not checked (the scan failed), 0 = safe, 1 = sensitive. Only 0 appears on the timeline.
ALTER TABLE gifs ADD COLUMN nsfw INTEGER;
-- Highest explicit-content score the scanner gave any sampled frame (0–1), for tuning the threshold.
ALTER TABLE gifs ADD COLUMN nsfw_score REAL;
-- What decided it: 'x' (X marked the post sensitive), 'scan' (our model) or 'admin'.
ALTER TABLE gifs ADD COLUMN nsfw_source TEXT;

-- GIFs that existed before the filter were all public and unscanned; treat them as safe so the
-- timeline doesn't empty out. An admin can flag any of them.
UPDATE gifs SET nsfw = 0, nsfw_source = 'legacy' WHERE nsfw IS NULL;

DROP INDEX IF EXISTS gifs_timeline;
CREATE INDEX gifs_timeline ON gifs (hidden, is_public, nsfw, created_at DESC);
