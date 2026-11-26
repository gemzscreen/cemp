-- CEMP v2.5.0: personal rate table (materials price list + labour trade rates) and issued quotation revisions.
create table public.user_rates (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  materials jsonb not null default '{}'::jsonb check (pg_column_size(materials) < 200000), -- { key: { name, unit, price, note, at } }
  labour jsonb not null default '{}'::jsonb check (pg_column_size(labour) < 20000),        -- { trade: daily rate incl. benefits }
  updated_at timestamptz not null default now()
);
alter table public.user_rates enable row level security;
create policy user_rates_own on public.user_rates for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create trigger user_rates_updated before update on public.user_rates for each row execute function public.set_updated_at();

-- Issued quotations are frozen snapshots: insert and read only (no update), owner only.
create table public.quote_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.estimate_projects(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  rev int not null check (rev between 0 and 99),
  snapshot jsonb not null check (pg_column_size(snapshot) < 400000),
  created_at timestamptz not null default now(),
  unique (project_id, rev)
);
create index on public.quote_revisions (project_id);
alter table public.quote_revisions enable row level security;
create policy quote_revisions_select on public.quote_revisions for select to authenticated using (user_id = (select auth.uid()));
create policy quote_revisions_insert on public.quote_revisions for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.estimate_projects p where p.id = project_id and p.user_id = (select auth.uid())));
create policy quote_revisions_delete on public.quote_revisions for delete to authenticated using (user_id = (select auth.uid()));
