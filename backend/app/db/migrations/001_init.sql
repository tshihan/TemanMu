-- TemanMu initial schema (PRD §8.8). Idempotent: safe to run more than once, either through
-- `python -m app.db.migrate` or by pasting into the Supabase SQL editor.
-- Enum-like columns use text + check constraints instead of Postgres enums, so they are easy
-- to change mid-hackathon.
-- gen_random_uuid() is built into Postgres 13+, so no extension is needed.

create table if not exists units (
  unit_id                text primary key,
  resident_name          text not null,
  caregiver_name         text not null,
  caregiver_relationship text not null,
  controllable           boolean not null default false,
  status                 text not null check (status in ('routine','possible_away','unusual_inactivity','unresolved_concern')),
  status_reason          text not null,
  status_since           timestamptz not null,
  last_water_activity_at timestamptz,
  last_door_event_at     timestamptz,
  latest_water_lpm       double precision not null default 0,
  latest_power_kw        double precision not null default 0,
  latest_door            text not null default 'closed' check (latest_door in ('open','closed'))
);

create table if not exists resident_profiles (
  unit_id                 text primary key references units(unit_id) on delete cascade,
  usual_quiet_gap_seconds integer not null,
  usual_outing_seconds    integer not null,
  standby_power_kw        double precision not null
);

create table if not exists readings (
  id          bigserial primary key,
  unit_id     text not null references units(unit_id) on delete cascade,
  sensor      text not null check (sensor in ('water','electricity','door')),
  value_num   double precision,
  value_text  text check (value_text in ('open','closed')),
  recorded_at timestamptz not null,
  -- door readings carry only value_text; water/electricity carry only value_num
  check (
    (sensor = 'door' and value_text is not null and value_num is null)
    or (sensor <> 'door' and value_num is not null and value_text is null)
  )
);
create index if not exists readings_unit_time on readings (unit_id, recorded_at);

create table if not exists incidents (
  incident_id      text primary key default gen_random_uuid()::text,
  unit_id          text not null references units(unit_id) on delete cascade,
  state            text not null check (state in ('grace','notified','acknowledged','closed','auto_resolved')),
  opened_at        timestamptz not null,
  grace_ends_at    timestamptz,
  next_reminder_at timestamptz,
  reminder_count   integer not null default 0,
  ack_role         text check (ack_role in ('township','caregiver')),
  ack_name         text,
  ack_at           timestamptz,
  outcome          text check (outcome in ('resident_ok','assistance_provided','resident_away','resident_activity_detected')),
  closed_at        timestamptz
);
create index if not exists incidents_unit_state on incidents (unit_id, state);

create table if not exists incident_events (
  id          bigserial primary key,
  incident_id text not null references incidents(incident_id) on delete cascade,
  type        text not null check (type in ('detected','voice_call_started','voice_call_no_answer','voice_call_cancelled','notified','reminder','acknowledged','closed','auto_resolved')),
  at          timestamptz not null,
  actor_role  text check (actor_role in ('township','caregiver')),
  actor_name  text,
  detail      text
);
create index if not exists incident_events_incident on incident_events (incident_id, at, id);

create table if not exists notifications (
  notification_id text primary key default gen_random_uuid()::text,
  role            text not null check (role in ('township','caregiver')),
  unit_id         text not null references units(unit_id) on delete cascade,
  kind            text not null check (kind in ('morning_reassurance','alert','reminder','acknowledged','closed','auto_resolved','message_delivered','buddy_matched')),
  message         text not null,
  incident_id     text references incidents(incident_id) on delete set null,
  created_at      timestamptz not null,
  read            boolean not null default false
);
create index if not exists notifications_role_time on notifications (role, created_at desc);

create table if not exists community_activities (
  activity_id  text primary key,
  title        text not null,
  starts_at    timestamptz not null,
  location     text not null,
  near_unit_id text not null references units(unit_id) on delete cascade
);

create table if not exists community_responses (
  id          bigserial primary key,
  activity_id text not null references community_activities(activity_id) on delete cascade,
  action      text not null check (action in ('invite_resident','join_together')),
  created_at  timestamptz not null
);

create table if not exists resident_interests (
  unit_id  text not null references units(unit_id) on delete cascade,
  interest text not null,
  position integer not null,
  primary key (unit_id, interest)
);

create table if not exists buddies (
  buddy_id  text primary key,
  name      text not null,
  interests text[] not null
);

create table if not exists buddy_matches (
  unit_id         text primary key references units(unit_id) on delete cascade,
  buddy_id        text not null references buddies(buddy_id) on delete cascade,
  shared_interest text not null,
  matched_at      timestamptz not null
);

create table if not exists message_presets (
  preset_id text primary key,
  text      text not null
);

create table if not exists companion_messages (
  message_id text primary key default gen_random_uuid()::text,
  unit_id    text not null references units(unit_id) on delete cascade,
  from_name  text not null,
  preset_id  text not null references message_presets(preset_id),
  text       text not null,
  channel    text not null default 'voice_call' check (channel = 'voice_call'),
  status     text not null default 'delivered' check (status = 'delivered'),
  sent_at    timestamptz not null
);
create index if not exists companion_messages_unit_time on companion_messages (unit_id, sent_at desc);

-- Only the backend reads these tables, through DATABASE_URL as the table owner (which bypasses
-- RLS). Enabling RLS with no policies blocks Supabase's public REST API from reading or
-- writing them with the project's anon/publishable key.
alter table units                enable row level security;
alter table resident_profiles    enable row level security;
alter table readings             enable row level security;
alter table incidents            enable row level security;
alter table incident_events      enable row level security;
alter table notifications        enable row level security;
alter table community_activities enable row level security;
alter table community_responses  enable row level security;
alter table resident_interests   enable row level security;
alter table buddies              enable row level security;
alter table buddy_matches        enable row level security;
alter table message_presets      enable row level security;
alter table companion_messages   enable row level security;
