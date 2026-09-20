-- Run this in Supabase Dashboard > SQL Editor
--
-- rides.arrived_at records when the driver marked "arrived" at the pickup.
-- It is the anchor for the rider's 1-minute free-cancel window and the
-- 10-minute waiting timer.
--
-- Without this column the socket handler's `update({ arrived_at })` is
-- rejected, silently stripped by the retry loop, and the arrival time is
-- lost on the next server restart — so a rider cancelling inside their free
-- minute was charged the full fare. There was no migration for it until now.
--
-- Idempotent: safe to run on an environment that already has the column.

ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS arrived_at timestamptz DEFAULT NULL;

-- Reconciliation: /api/rides/:id returns arrived_at so a rider who reopens
-- the app mid-wait resumes the countdown instead of restarting it.
COMMENT ON COLUMN public.rides.arrived_at IS
  'When the driver marked arrived at pickup. Anchors the rider 1-minute free-cancel window and 10-minute waiting timer.';
