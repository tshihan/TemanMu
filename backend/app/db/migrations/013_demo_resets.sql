-- When the demo was last reset. Activity history (phase2.md §5) shows live readings from this
-- moment on and labelled simulated history for the days before it. One row only.
create table if not exists demo_resets (
  id       boolean primary key default true check (id),
  reset_at timestamptz not null
);
alter table demo_resets enable row level security;
