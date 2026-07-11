-- ASAP ride vias (up to 5 stops between pickup and dropoff)
CREATE TABLE IF NOT EXISTS public.ride_vias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id TEXT NOT NULL,
  sequence_order INTEGER NOT NULL CHECK (sequence_order >= 1 AND sequence_order <= 5),
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ride_id, sequence_order)
);

CREATE INDEX IF NOT EXISTS ride_vias_ride_id_idx ON public.ride_vias (ride_id);

COMMENT ON TABLE public.ride_vias IS 'Intermediate via stops for ASAP rides (max 5 per ride)';
