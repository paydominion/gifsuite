-- GIFs can now come from any link, not just X.
-- `source` is the site a GIF came from ("x", "giphy.com", "reddit.com"…).
-- For other sites, tweet_id holds "url:<hash of the normalised link>" (so the existing
-- UNIQUE (tweet_id, media_index) still de-duplicates), tweet_url the page or file link, and the
-- author columns whatever the site says (or the site's name).
ALTER TABLE gifs ADD COLUMN source TEXT NOT NULL DEFAULT 'x';
