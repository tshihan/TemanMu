-- Allow a confirmed hospital transfer to be recorded as a final incident outcome.
alter table incidents drop constraint if exists incidents_outcome_check;
alter table incidents add constraint incidents_outcome_check
  check (outcome in ('resident_ok', 'assistance_provided', 'sent_to_hospital', 'resident_away', 'resident_activity_detected'));
