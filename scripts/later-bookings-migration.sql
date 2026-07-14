-- Run this in Supabase Dashboard > SQL Editor
-- Adds cancellation policy columns to later_bookings table

ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS estimated_fare NUMERIC(10,2) DEFAULT NULL;
ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'saloon';
ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS cancellation_fee NUMERIC(10,2) DEFAULT 0;
ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS cancellation_note TEXT DEFAULT NULL;
ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS cancelled_by TEXT DEFAULT NULL;

-- Required for pending admin→driver assignment offers (Upcoming Accept/Decline).
-- Without this column, assign used to clear driver_id and the offer never appeared.
ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS assigned_driver_id UUID DEFAULT NULL;
ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS assigned_driver_name TEXT DEFAULT NULL;

-- Required for Start Trip (PIN) within 60 minutes of pickup.
-- Without these, prepare-start cannot persist the live ride link (server still activates rides).
ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS otp TEXT DEFAULT NULL;
ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS live_ride_id TEXT DEFAULT NULL;

ALTER TABLE web_booker ADD COLUMN IF NOT EXISTS otp TEXT DEFAULT NULL;
ALTER TABLE web_booker ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE web_booker ADD COLUMN IF NOT EXISTS live_ride_id TEXT DEFAULT NULL;

-- web_booker uses assigned_driver_id; ensure driver_id exists for accept/decline parity.
ALTER TABLE web_booker ADD COLUMN IF NOT EXISTS driver_id UUID DEFAULT NULL;
