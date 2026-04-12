-- ============================================================
-- 02_rls.sql — Row Level Security
-- Ejecutar después de 01_schema.sql
-- ============================================================

-- ─── profiles ────────────────────────────────────────────────
alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- ─── scrape_jobs ─────────────────────────────────────────────
alter table scrape_jobs enable row level security;

create policy "Users can view own scrape jobs"
  on scrape_jobs for select
  using (auth.uid() = user_id or user_id is null);

create policy "Users can insert scrape jobs"
  on scrape_jobs for insert
  with check (auth.uid() = user_id or user_id is null);

-- ─── monitored_items ─────────────────────────────────────────
alter table monitored_items enable row level security;

create policy "Users can view own monitored items"
  on monitored_items for select
  using (auth.uid() = user_id);

create policy "Users can insert monitored items"
  on monitored_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own monitored items"
  on monitored_items for update
  using (auth.uid() = user_id);

create policy "Users can delete own monitored items"
  on monitored_items for delete
  using (auth.uid() = user_id);

-- ─── price_history ───────────────────────────────────────────
alter table price_history enable row level security;

create policy "Users can view price history of own items"
  on price_history for select
  using (
    exists (
      select 1 from monitored_items
      where monitored_items.id = price_history.item_id
        and monitored_items.user_id = auth.uid()
    )
  );

-- price_history se escribe desde el servidor con service_role_key
-- (bypassa RLS) → no necesita policy de insert para el cliente

-- ─── anonymous_usage ─────────────────────────────────────────
-- Solo se accede con service_role_key desde middleware del servidor
alter table anonymous_usage enable row level security;
-- Sin policies públicas: solo el service role puede leer/escribir
