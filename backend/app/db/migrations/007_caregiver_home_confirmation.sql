-- Keep a caregiver's verbal confirmation distinct from a water-meter reading.
alter table units add column if not exists last_caregiver_confirmation_at timestamptz;
