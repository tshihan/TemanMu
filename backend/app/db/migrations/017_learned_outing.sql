-- Set when a resident's usual outing length comes from the Outing Model (backend/ml) instead
-- of a typed-in number: the learned limit in real-life minutes, the scene time and the demo speed.
alter table resident_profiles add column if not exists learned_outing jsonb;
