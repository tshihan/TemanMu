alter table incidents add column if not exists trigger_reason text;

-- Older detected events remain available. Do not invent an original explanation
-- from the unit's current status, which may belong to a later incident.
