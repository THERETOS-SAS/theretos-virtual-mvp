begin;

grant select on table public.games to service_role;
grant insert, select on table public.game_sessions to service_role;

commit;
