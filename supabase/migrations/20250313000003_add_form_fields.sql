-- Add fields for web forms
-- Run after 20250313000001_schema.sql

alter table public.employees
  add column if not exists role text default '',
  add column if not exists hourly_rate numeric(10,2) default 0;

alter table public.products
  add column if not exists standard_minutes numeric(10,2) default 0;

alter table public.work_logs
  add column if not exists quantity integer default 1,
  add column if not exists notes text default '';
