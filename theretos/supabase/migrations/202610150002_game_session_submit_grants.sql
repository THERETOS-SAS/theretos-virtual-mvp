begin;

grant update (status, score, duration_ms, metrics)
on table public.game_sessions to service_role;

commit;
