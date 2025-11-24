-- Add opening_hours column to shops table
ALTER TABLE public.shops
ADD COLUMN opening_hours jsonb DEFAULT '{
  "monday": "10:00 - 19:00",
  "tuesday": "10:00 - 19:00",
  "wednesday": "10:00 - 19:00",
  "thursday": "10:00 - 19:00",
  "friday": "10:00 - 19:00",
  "saturday": "10:00 - 19:00",
  "sunday": "12:00 - 18:00"
}'::jsonb;