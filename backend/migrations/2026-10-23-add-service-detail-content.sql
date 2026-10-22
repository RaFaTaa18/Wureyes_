-- Run once against the Wureyes database before deploying the updated API.
-- Existing service records remain valid; optional detail content defaults to NULL.
ALTER TABLE services
  ADD COLUMN detail_content LONGTEXT NULL AFTER description;
