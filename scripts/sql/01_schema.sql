-- ============================================================
-- 01_schema.sql
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Extensión para UUIDs
create extension if not exists "pgcrypto";

-- ─── profiles ────────────────────────────────────────────────
-- Se crea automáticamente al registrarse (via trigger en auth.users)
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  name       text,
  plan       text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now()
);

-- Trigger para crear profile al hacer signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── scrape_jobs ─────────────────────────────────────────────
create table if not exists scrape_jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete set null,
  url         text not null,
  method      text not null default 'hybrid',
  status      text not null default 'pending'
              check (status in ('pending', 'running', 'done', 'error')),
  result      jsonb,
  rows_count  int,
  duration_ms int,
  error_msg   text,
  created_at  timestamptz not null default now()
);

create index if not exists scrape_jobs_user_id_idx on scrape_jobs(user_id);
create index if not exists scrape_jobs_created_at_idx on scrape_jobs(created_at desc);

-- ─── monitored_items ─────────────────────────────────────────
create table if not exists monitored_items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  name             text not null,
  url              text not null,
  price_selector   text not null default '.price',
  method           text not null default 'hybrid',
  current_price    numeric(12,2),
  previous_price   numeric(12,2),
  in_stock         boolean not null default true,
  alert_threshold  numeric(5,2) not null default 5.0, -- %
  target_price     numeric(12,2),
  check_interval   interval not null default '6 hours',
  next_check       timestamptz not null default now(),
  notify_telegram  boolean not null default true,
  notify_email     boolean not null default false,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

create index if not exists monitored_items_user_id_idx   on monitored_items(user_id);
create index if not exists monitored_items_next_check_idx on monitored_items(next_check)
  where active = true;

-- ─── price_history ───────────────────────────────────────────
create table if not exists price_history (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references monitored_items(id) on delete cascade,
  price      numeric(12,2),
  in_stock   boolean not null default true,
  scraped_at timestamptz not null default now()
);

create index if not exists price_history_item_id_idx  on price_history(item_id);
create index if not exists price_history_scraped_at_idx on price_history(scraped_at desc);

-- ─── anonymous_usage ─────────────────────────────────────────
create table if not exists anonymous_usage (
  ip        text primary key,
  count     int not null default 0,
  reset_at  timestamptz not null default (now() + interval '30 days')
);
