-- CEMP v2.3.0: Truss Builder runs record the deck and code played. Stars count in any setting (each has its own
-- calibrated budget); best cost only compares runs on the level's standard setting (default deck + AISC).
alter table public.game_runs
  add column deck text check (deck in ('timber','grating','planks','rcslab')),
  add column code text not null default 'aisc' check (code in ('aisc','bs')),
  add column std boolean not null default true;
create or replace view public.game_bests with (security_invoker = true) as
  select user_id, game, level,
    max(stars) as stars,
    min(cost) filter (where passed and std) as best_cost,
    count(*) as runs,
    max(created_at) as last_run
  from public.game_runs group by user_id, game, level;
