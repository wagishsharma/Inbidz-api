-- Video poster thumbnails (first frame JPEG)
ALTER TABLE post_media
  ADD COLUMN thumbnail_r2_key VARCHAR(512) NULL AFTER public_url,
  ADD COLUMN thumbnail_url VARCHAR(1024) NULL AFTER thumbnail_r2_key;
