# Cake Workshop – Production Tracking

Track who worked on which product and for how long. Use the data for labor cost analysis.

**Stack:** Next.js, Supabase, Tailwind CSS.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).

2. **Run the database schema**  
   In Supabase: **SQL Editor** → New query. Paste and run the contents of  
   `supabase/migrations/20250313000001_schema.sql`.

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

- **Products** – Name and category (list view).
- **Employees** – Name and skills (list view).
- **Log work** – No login. Worker selects their name → product → Start (timer) → End → optional partner. Duration is stored as `end_time - start_time`.
- **Daily report** – Pick a date; see total hours per employee and average time per product.

## Database schema

- `products`: `id`, `name`, `category`
- `employees`: `id`, `name`, `skills`
- `work_logs`: `id`, `product_id`, `employee_id`, `start_time`, `end_time`, `partner_id` (nullable)

Duration is computed as `end_time - start_time` (e.g. in the report).
