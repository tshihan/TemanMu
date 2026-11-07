-- Set when a resident's quiet gap comes from the Quiet Gap Model (backend/ml) instead of a
-- typed-in number: the learned limit in real-life minutes, the scene time and the demo speed.
alter table resident_profiles add column if not exists learned_quiet_gap jsonb;
