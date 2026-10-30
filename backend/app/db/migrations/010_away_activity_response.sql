-- The caregiver's answer to an "activity while away" notice: the resident is back, the
-- caregiver knows who it is, or they asked township to check the home.
alter table notifications add column if not exists response text
  check (response in ('resident_returned','known_visitor','home_check_requested'));
alter table notifications add column if not exists responded_at timestamptz;
