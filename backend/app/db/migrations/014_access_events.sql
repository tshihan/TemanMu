-- Existing homes keep their door-sensor setup. Card homes are selected at setup;
-- the demo seed selects A-105 without changing other homes.
alter table units add column if not exists outing_signal text not null default 'door'
    check (outing_signal in ('card', 'door'));

create table if not exists access_events (
  id           bigserial primary key,
  unit_id      text not null references units(unit_id) on delete cascade,
  card_holder  text not null check (length(btrim(card_holder)) > 0),
  direction    text not null check (direction in ('out', 'in')),
  access_point text not null check (length(btrim(access_point)) > 0),
  at           timestamptz not null
);
create index if not exists access_events_unit_time on access_events (unit_id, at, id);

-- Like readings, only the backend's database connection may access this table.
alter table access_events enable row level security;
