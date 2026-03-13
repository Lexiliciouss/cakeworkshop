# Cake Workshop – Production Tracking

Track who worked on which product and for how long. Use the data for labor cost analysis.

**Stack:** Next.js, Supabase, Tailwind CSS.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).

2. **Run the database schema**  
   In Supabase: **SQL Editor** → New query. Run in order:
   - `supabase/migrations/20250313000001_schema.sql`
   - `supabase/migrations/20250313000002_views.sql`
   - `supabase/migrations/20250313000003_add_form_fields.sql`

3. **Seed data (optional)**  
   In the SQL Editor, run `supabase/seed.sql`.

4. **Environment variables**  
   Copy `.env.local.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL` – Project URL from Supabase dashboard
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` – anon public key from Supabase dashboard

5. **Run the app**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Features

- **Products** (`/products`) – List products by category.
- **Employees** (`/employees`) – List employees and skills.
- **Log work** (`/log`) – No login. Worker selects name → product → Start → End → optional partner.
- **Work logs** (`/work-logs`) – List all logged work sessions.
- **Reports** (`/reports`) – Daily employee hours and product summary by date.

## Database schema

- `products`: `id`, `name`, `category`, `standard_minutes`
- `employees`: `id`, `name`, `role`, `skills`, `hourly_rate`
- `work_logs`: `id`, `product_id`, `employee_id`, `start_time`, `end_time`, `partner_id`, `quantity`, `notes`
- `work_log_summary` (view): per-day product totals and averages
- `employee_daily_hours` (view): per-day employee total hours
