-- Add notification preferences column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN notification_preferences JSONB DEFAULT '{
  "drop_reminders": true,
  "favorite_brand_drops": true,
  "new_shop_openings": false,
  "weekly_digest": true,
  "promotional_emails": false
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.notification_preferences IS 'User email notification preferences stored as JSON';
