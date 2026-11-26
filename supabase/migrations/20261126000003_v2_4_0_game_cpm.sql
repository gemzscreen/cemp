-- CEMP v2.4.0: second game, Critical Path Rush ('cpm'). cost = seconds (find levels) or total ₱ (crash levels).
alter table public.game_runs drop constraint game_runs_game_check;
alter table public.game_runs add constraint game_runs_game_check check (game in ('truss', 'cpm'));
