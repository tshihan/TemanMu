-- Caregiver coordination is recorded without claiming the incident or stopping reminders.
alter table incident_events drop constraint if exists incident_events_type_check;
alter table incident_events add constraint incident_events_type_check
  check (type in ('detected','voice_call_started','voice_call_no_answer','voice_call_cancelled','notified','reminder','acknowledged','caregiver_checking_in','township_requested','unable_to_verify','emergency_called','closed','auto_resolved'));

alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check
  check (kind in ('morning_reassurance','alert','reminder','acknowledged','caregiver_checking_in','township_requested','unable_to_verify','emergency_called','closed','auto_resolved','message_delivered','buddy_matched','neighbour_introduced'));
