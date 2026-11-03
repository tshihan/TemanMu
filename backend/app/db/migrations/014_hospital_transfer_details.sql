alter table incidents add column if not exists hospital_name text;
alter table incidents add column if not exists hospital_sent_at timestamptz;
