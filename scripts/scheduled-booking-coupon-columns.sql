-- Scheduled-booking coupon columns + exec_sql helper.
-- Run once in the Supabase SQL editor (safe to re-run — idempotent).
--
-- WHY: later_bookings / web_booker had NO coupon_code / discount_amount
-- columns, so every scheduled booking insert silently dropped the rider's
-- coupon and stored the full fare. Drivers therefore saw the pre-discount
-- fare on Marketplace and Upcoming rides (and riders would be charged full).
--
-- The server's startup migrations run their ALTERs through an `exec_sql`
-- RPC that does not exist on this project, so those migrations have been
-- failing silently too. Part 2 creates it; from then on the server keeps
-- these columns current on every boot.

-- ── 1. Coupon columns ────────────────────────────────────────────────────────
ALTER TABLE public.later_bookings
  ADD COLUMN IF NOT EXISTS coupon_code text;

ALTER TABLE public.later_bookings
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;

ALTER TABLE public.later_bookings
  ADD COLUMN IF NOT EXISTS full_fare numeric;

ALTER TABLE public.web_booker
  ADD COLUMN IF NOT EXISTS coupon_code text;

ALTER TABLE public.web_booker
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;

ALTER TABLE public.web_booker
  ADD COLUMN IF NOT EXISTS full_fare numeric;

-- ── 2. exec_sql helper (lets the server run its startup migrations) ─────────
-- Restricted to the service_role key the server uses; riders' anon/authenticated
-- keys can never call it.
CREATE OR REPLACE FUNCTION public.exec_sql(statement text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE statement;
  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM anon;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
