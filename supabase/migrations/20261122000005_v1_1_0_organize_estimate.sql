-- CEMP v1.1.0: category tree, entry tombstones (deleted stays deleted on re-sync), estimate projects.

-- 1) Category slug from lib/taxonomy.ts (null = inferred in the app from specialization/tags)
alter table public.entries add column category text check (category is null or category ~ '^[a-z0-9-]+$');
create index on public.entries(category);

-- 2) Permanently deleted entries: content sync must not recreate them from a batch file
create table public.entry_tombstones (
  slug text primary key,
  title text,
  deleted_by uuid references public.profiles(id) on delete set null default auth.uid(),
  deleted_at timestamptz not null default now()
);
create index on public.entry_tombstones(deleted_by);
alter table public.entry_tombstones enable row level security;
create policy entry_tombstones_read on public.entry_tombstones for select to authenticated using ((select public.is_editor()));
create policy entry_tombstones_write on public.entry_tombstones for insert to authenticated with check ((select public.is_admin()));
create policy entry_tombstones_delete on public.entry_tombstones for delete to authenticated using ((select public.is_admin()));

-- 3) Estimate projects: each user's own BOM/BOQ (items = calculator runs, prices = unit prices per material)
create table public.estimate_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  name text not null check (length(name) between 1 and 120),
  client text, location text,
  items jsonb not null default '[]'::jsonb,
  prices jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.estimate_projects(user_id);
create trigger estimate_projects_updated before update on public.estimate_projects for each row execute function public.set_updated_at();
alter table public.estimate_projects enable row level security;
create policy estimate_projects_own on public.estimate_projects for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
