-- Outcomes for a home check during an away period: what the guard found at the home.
alter table incidents drop constraint if exists incidents_outcome_check;
alter table incidents add constraint incidents_outcome_check
  check (outcome in ('resident_ok', 'assistance_provided', 'sent_to_hospital', 'resident_away', 'resident_activity_detected',
                     'home_secure', 'known_person_home', 'resident_returned', 'security_concern'));
