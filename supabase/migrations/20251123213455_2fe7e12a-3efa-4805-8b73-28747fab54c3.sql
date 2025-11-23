
-- Update default notification preferences to include digest_frequency
ALTER TABLE profiles 
ALTER COLUMN notification_preferences 
SET DEFAULT '{"weekly_digest": true, "drop_reminders": true, "new_shop_openings": false, "promotional_emails": false, "favorite_brand_drops": true, "digest_frequency": "weekly"}'::jsonb;
