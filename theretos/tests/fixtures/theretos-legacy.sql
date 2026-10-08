-- Disposable local fixture: UUIDs, slugs, names and policies observed in theretos-2-dev.
-- Dates are synthetic and deliberately distinct to detect accidental replacement.
create table public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.games (id, slug, name, status, created_at, updated_at) values
  ('339b4240-92f8-48d7-b798-0b50fd05130e', 'atrapa-monedas', 'Atrapa Monedas', 'active', '2026-01-01T01:00:00Z', '2026-02-01T01:00:00Z'),
  ('77141165-b5ba-4388-b712-08e0232798e8', 'tap-frenetico', 'Tap Frenético', 'active', '2026-01-02T02:00:00Z', '2026-02-02T02:00:00Z'),
  ('3ba763c6-4e57-4d30-bef9-89a9b3c7b3c1', 'revienta-globos', 'Revienta Globos', 'active', '2026-01-03T03:00:00Z', '2026-02-03T03:00:00Z'),
  ('8989273d-40dd-400f-92a0-984c50326df5', 'golpea-topos', 'Golpea Topos', 'active', '2026-01-04T04:00:00Z', '2026-02-04T04:00:00Z'),
  ('64025093-de9a-49e8-a4c4-42bfd7fd907c', 'bolas', 'Bolas', 'active', '2026-01-05T05:00:00Z', '2026-02-05T05:00:00Z');
alter table public.games enable row level security;
create policy "Anyone can view active games" on public.games
  for select to anon, authenticated using (status = 'active');
grant select on public.games to anon, authenticated;

-- Only the seven columns established by the supplied constraints are assumed.
create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id),
  mode text not null constraint game_sessions_mode_check check (mode in ('practice', 'tournament', 'mission')),
  status text not null default 'started' constraint game_sessions_status_check check (status in ('started', 'completed', 'cancelled', 'invalid')),
  score integer constraint game_sessions_score_check check (score is null or score >= 0),
  duration_ms integer constraint game_sessions_duration_ms_check check (duration_ms is null or duration_ms >= 0)
);
alter table public.game_sessions enable row level security;
create policy "Users can start own game sessions" on public.game_sessions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can view own game sessions" on public.game_sessions
  for select to authenticated using (auth.uid() = user_id);
grant select, insert on public.game_sessions to authenticated;
