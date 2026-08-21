-- Optional: add cancel-fee metadata columns if missing.
-- Cancel charging also works via payment_status without these columns,
-- but having them improves idempotency and reporting.

ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS cancellation_fee numeric DEFAULT 0;

ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS cancelled_by text;
