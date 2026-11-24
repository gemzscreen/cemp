-- CEMP v2.0.0: Games. One row per test run; owner-only. client_id de-duplicates the offline queue.
create table public.game_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  game text not null check (game in ('truss')),
  level int not null check (level between 1 and 100),
  passed boolean not null,
  stars smallint not null check (stars between 0 and 3),
  cost numeric(12,2),
  weight numeric(10,2),
  max_ratio numeric(8,3),
  design jsonb not null check (pg_column_size(design) < 100000),
  client_id text not null check (length(client_id) between 8 and 64),
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);
create index game_runs_user_level on public.game_runs (user_id, game, level);
alter table public.game_runs enable row level security;
create policy game_runs_select on public.game_runs for select to authenticated using (user_id = (select auth.uid()));
create policy game_runs_insert on public.game_runs for insert to authenticated with check (user_id = (select auth.uid()));
create policy game_runs_delete on public.game_runs for delete to authenticated using (user_id = (select auth.uid()));

create view public.game_bests with (security_invoker = true) as
  select user_id, game, level,
    max(stars) as stars,
    min(cost) filter (where passed) as best_cost,
    count(*) as runs,
    max(created_at) as last_run
  from public.game_runs group by user_id, game, level;
