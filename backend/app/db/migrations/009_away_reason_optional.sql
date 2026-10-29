-- The reason for an away period is optional (and private to the caregiver).
alter table away_periods alter column reason drop not null;
