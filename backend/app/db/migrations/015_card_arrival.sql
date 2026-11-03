-- Card homes: set when the resident taps in and cleared by the next water or electricity use
-- (or a tap out). While set, the "tapped in, no activity at home" clock runs.
alter table units add column if not exists awaiting_arrival_since timestamptz;
