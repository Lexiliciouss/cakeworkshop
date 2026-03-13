-- Add work_date to work_logs for explicit date ordering
-- Run after 20250313000003_add_form_fields.sql

alter table public.work_logs
  add column if not exists work_date date;

-- Backfill from start_time for existing rows
update public.work_logs
set work_date = (start_time at time zone 'UTC')::date
where work_date is null;
