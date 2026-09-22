-- Cancellation attribution for the rider Activity tab.
-- Run once in the Supabase SQL editor (safe to re-run — all idempotent).
--
-- Every cancel path writes these columns:
--   cancelled_by         "rider" | "driver" | "system"
--   cancellation_reason  why the ride ended (rider-picked reason, or a
--                        server label such as "no_drivers_available")
--   cancellation_fee     fee charged to the rider (0 when free / driver cancel)
--
-- The server tolerates these columns being absent (it retries without them),
-- but until they exist the Activity tab cannot show who cancelled, why, or
-- any fee that was charged.

ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS cancelled_by text;

ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS cancellation_fee numeric DEFAULT 0;
