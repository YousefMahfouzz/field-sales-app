-- ============================================================
-- FIELD SALES APP — SUPABASE DATABASE SETUP
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension (usually already enabled)
create extension if not exists "uuid-ossp";

-- ============================================================
-- AREAS / ZONES
-- ============================================================
create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

alter table areas enable row level security;
create policy "Users manage own areas" on areas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- CUSTOMERS
-- ============================================================
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  full_name text not null,
  business_name text,
  phone text,
  address text,
  lat double precision not null,
  lng double precision not null,
  area text,
  area_id uuid references areas,
  status text not null default 'active'
    check (status in ('active','follow_up','priority','avoid','do_not_visit')),
  last_visit_date date,
  next_visit_date date,
  visit_frequency_days int not null default 14,
  bought_before text,
  wants_next text,
  notes text,
  cost numeric(10,2),
  sale_amount numeric(10,2),
  payment_status text default 'paid'
    check (payment_status in ('paid','pending','overdue')),
  rating smallint check (rating between 1 and 5),
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table customers enable row level security;
create policy "Users manage own customers" on customers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Index for fast nearby searches
create index if not exists customers_user_id_idx on customers(user_id);
create index if not exists customers_next_visit_idx on customers(user_id, next_visit_date);
create index if not exists customers_status_idx on customers(user_id, status);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger customers_updated_at
  before update on customers
  for each row execute function update_updated_at();

-- ============================================================
-- VISITS
-- ============================================================
create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  visited_at timestamptz not null default now(),
  was_visited boolean not null default true,
  sold text,
  requested_next text,
  notes text,
  sale_amount numeric(10,2) not null default 0,
  cost numeric(10,2) not null default 0,
  profit numeric(10,2) generated always as (sale_amount - cost) stored,
  money_collected numeric(10,2) default 0,
  next_visit_date date,
  created_at timestamptz default now()
);

alter table visits enable row level security;
create policy "Users manage own visits" on visits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists visits_customer_id_idx on visits(customer_id);
create index if not exists visits_user_id_idx on visits(user_id);
create index if not exists visits_visited_at_idx on visits(user_id, visited_at desc);

-- ============================================================
-- ROUTES (saved routes)
-- ============================================================
create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text,
  customer_ids uuid[] default '{}',
  optimized_order uuid[] default '{}',
  total_distance_km numeric(8,2),
  created_at timestamptz default now()
);

alter table routes enable row level security;
create policy "Users manage own routes" on routes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- DONE
-- ============================================================
-- Verify tables were created:
select table_name from information_schema.tables
where table_schema = 'public'
order by table_name;
