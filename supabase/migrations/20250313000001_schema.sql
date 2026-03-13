-- Cake Workshop Production Tracking - Database Schema
-- Run this in Supabase SQL Editor or via Supabase CLI

-- Products: name, category
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  created_at timestamptz default now()
);

-- Employees: name, skills (comma-separated or array - using text for simplicity)
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  skills text default '', -- e.g. "Decorating, Icing, Baking"
  created_at timestamptz default now()
);

-- Work logs: product, employee, start/end time, optional partner
create table if not exists public.work_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  start_time timestamptz not null,
  end_time timestamptz not null,
  partner_id uuid references public.employees(id) on delete set null,
  created_at timestamptz default now(),
  constraint work_logs_end_after_start check (end_time > start_time)
);

-- Indexes for common queries
create index if not exists work_logs_employee_id on public.work_logs(employee_id);
create index if not exists work_logs_product_id on public.work_logs(product_id);
create index if not exists work_logs_start_time on public.work_logs(start_time);
create index if not exists work_logs_start_time_date on public.work_logs((start_time::date));

-- RLS: allow all for anonymous (tablet, no login). Restrict in production if needed.
alter table public.products enable row level security;
alter table public.employees enable row level security;
alter table public.work_logs enable row level security;

create policy "Allow all on products" on public.products for all using (true) with check (true);
create policy "Allow all on employees" on public.employees for all using (true) with check (true);
create policy "Allow all on work_logs" on public.work_logs for all using (true) with check (true);
