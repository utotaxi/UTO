-- ride_declines: durable record of every driver who declined or cancelled a
-- specific ride offer. The live dispatch keeps an in-memory exclusion set, but
-- that set is lost on every server restart / redeploy and across instances.
-- Without this table, a driver who cancelled an ASAP ride can be re-offered the
-- SAME ride after a redeploy (the ride row is reset to pending/driver_id=null).
-- ride_declines rows survive restarts and are consulted by buildDispatchState
-- so a cancelled/declined driver is never offered that ride again — instead the
-- ride cascades to other nearby drivers within the 5-mile radius.

CREATE TABLE IF NOT EXISTS ride_declines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id text NOT NULL,
  driver_id text NOT NULL,       -- drivers.id (and/or drivers.user_id alias)
  user_id text,                  -- optional drivers.user_id alias, when known
  reason text,                   -- "driver_cancelled" | "declined" | "timeout"
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One row per (ride, driver) identity — upserts use ON CONFLICT DO NOTHING.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ride_declines_ride_driver_unique
  ON ride_declines (ride_id, driver_id);

CREATE INDEX IF NOT EXISTS idx_ride_declines_ride_id
  ON ride_declines (ride_id);
