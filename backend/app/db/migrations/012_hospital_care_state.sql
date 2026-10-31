alter table units add column if not exists care_state text not null default 'home_monitoring'
    check (care_state in ('home_monitoring', 'in_hospital'));

-- Preserve the most recently recorded hospital outcome on existing homes.
update units u set care_state = 'in_hospital'
where (select i.outcome from incidents i where i.unit_id = u.unit_id and i.state = 'closed'
       order by i.closed_at desc, i.incident_id desc limit 1) = 'sent_to_hospital'
and (u.last_caregiver_confirmation_at is null or u.last_caregiver_confirmation_at <
     (select max(i.closed_at) from incidents i where i.unit_id = u.unit_id and i.state = 'closed'));
