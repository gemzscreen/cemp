-- CEMP v2.7.0: third game, Beam Optimizer ('beam'). cost = total ₱ of the beam; weight = kg of steel.
alter table public.game_runs drop constraint game_runs_game_check;
alter table public.game_runs add constraint game_runs_game_check check (game in ('truss', 'cpm', 'beam'));
