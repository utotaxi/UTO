-- Run this in Supabase Dashboard > SQL Editor
-- Adds cancellation policy columns to later_bookings table

ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS estimated_fare NUMERIC(10,2) DEFAULT NULL;
ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'saloon';
ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS cancellation_fee NUMERIC(10,2) DEFAULT 0;
ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS cancellation_note TEXT DEFAULT NULL;
ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS cancelled_by TEXT DEFAULT NULL;
