-- Same-hour neighbours (companion feature). Idempotent, like 001_init.sql.

-- A resident's typical day in local time, seeded to stand in for four weeks of history.
create table if not exists resident_rhythms (
  unit_id    text primary key references units(unit_id) on delete cascade,
  wake_local time not null,
  outings    jsonb not null default '[]'  -- [{"start": "07:00", "end": "08:15"}], local times
);

-- A resident appears in (and sees) neighbour suggestions only while consent is recorded.
create table if not exists neighbour_consents (
  unit_id      text primary key references units(unit_id) on delete cascade,
  consented_at timestamptz not null
);

-- A caregiver's request for the community coordinator to introduce the pair in person.
create table if not exists neighbour_introductions (
  unit_id           text primary key references units(unit_id) on delete cascade,
  neighbour_unit_id text not null references units(unit_id) on delete cascade,
  requested_at      timestamptz not null
);

-- Keeps unable_to_verify and emergency_called from 003_emergency_handoff.sql.
alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (kind in (
  'morning_reassurance','alert','reminder','acknowledged','unable_to_verify','emergency_called',
  'closed','auto_resolved','message_delivered','buddy_matched','neighbour_introduced'));

alter table resident_rhythms        enable row level security;
alter table neighbour_consents      enable row level security;
alter table neighbour_introductions enable row level security;
