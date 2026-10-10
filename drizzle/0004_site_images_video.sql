-- Slice #10: the hero video lives in site-images (docs/design.md), so the bucket accepts mp4.
-- 10 MB limit, matching the other buckets. The demo seed sets the same values through the API.
UPDATE storage.buckets
SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/avif','image/svg+xml','video/mp4']
WHERE id = 'site-images';
