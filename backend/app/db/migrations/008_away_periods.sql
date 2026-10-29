-- Caregiver-declared periods when the resident is not at home, for any reason (a trip, a
-- hospital stay, staying with family). Inactivity checks pause for these windows.
create table if not exists away_periods (
  period_id            text primary key default gen_random_uuid()::text,
  unit_id              text not null references units(unit_id) on delete cascade,
  starts_at            timestamptz not null,
  ends_at              timestamptz not null,
  reason               text not null,
  created_by           text not null,
  created_at           timestamptz not null,
  cancelled_at         timestamptz,
  -- Set once the caregiver has been told about activity at home during this period.
  activity_notified_at timestamptz,
  check (ends_at > starts_at)
);
create index if not exists away_periods_unit_time on away_periods (unit_id, ends_at);
alter table away_periods enable row level security;

alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check
  check (kind in ('morning_reassurance','alert','reminder','acknowledged','caregiver_checking_in','township_requested','unable_to_verify','emergency_called','closed','auto_resolved','message_delivered','buddy_matched','neighbour_introduced','away_activity'));
