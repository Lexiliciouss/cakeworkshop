-- Views for reporting: work_log_summary and employee_daily_hours
-- Run after 20250313000001_schema.sql and 20250313000003_add_form_fields.sql

-- Drop existing views (required when changing column names/order)
drop view if exists public.work_log_summary;
drop view if exists public.employee_daily_hours;

-- work_log_summary: per work log — employee_name, product_name, standard_minutes, quantity, start_time, end_time, actual_minutes, variance_minutes
create view public.work_log_summary as
select
  w.id,
  (w.start_time at time zone 'UTC')::date as work_date,
  e.name as employee_name,
  p.name as product_name,
  coalesce(p.standard_minutes, 0)::numeric as standard_minutes,
  coalesce(w.quantity, 1)::int as quantity,
  w.start_time,
  w.end_time,
  (extract(epoch from (w.end_time - w.start_time)) / 60)::numeric as actual_minutes,
  ((extract(epoch from (w.end_time - w.start_time)) / 60) - coalesce(p.standard_minutes, 0))::numeric as variance_minutes
from public.work_logs w
join public.employees e on e.id = w.employee_id
join public.products p on p.id = w.product_id;

-- employee_daily_hours: per (date, employee) — employee_name, work_date, total_hours
create view public.employee_daily_hours as
select
  e.name as employee_name,
  (w.start_time at time zone 'UTC')::date as work_date,
  (sum(extract(epoch from (w.end_time - w.start_time))) / 3600)::numeric as total_hours
from public.work_logs w
join public.employees e on e.id = w.employee_id
group by (w.start_time at time zone 'UTC')::date, e.id, e.name;

-- RLS for views (views use underlying table RLS; grant select for anon)
grant select on public.work_log_summary to anon;
grant select on public.employee_daily_hours to anon;
