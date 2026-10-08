-- THERETOS Core v1. Aplicacion MANUAL completa por el propietario de profiles.
-- Leer ../THERETOS-CORE-v1.md. No contiene endpoints ni concede escrituras al cliente.
begin;
set local lock_timeout = '5s';
set local search_path = '';
set local row_security = off;

do $preflight$
declare
  profile_oid oid := to_regclass('public.profiles');
  profile_id smallint;
  object_name text;
  object_oid oid;
  structure_hash text;
  api_role record;
  item record;
  core_count integer;
  installed boolean := exists (select 1 from pg_namespace where nspname = 'theretos_core');
  games_oid oid := to_regclass('public.games');
  sessions_oid oid := to_regclass('public.game_sessions');
  id_column smallint;
  slug_column smallint;
  expression text;
  session_count bigint;
begin
  if profile_oid is null or not exists (
    select 1 from pg_class where oid = profile_oid and relkind = 'r'
  ) or exists (select 1 from pg_inherits where inhrelid = profile_oid or inhparent = profile_oid) then
    raise exception 'Core requiere public.profiles como tabla ordinaria existente.';
  end if;
  select attnum into profile_id from pg_attribute
  where attrelid = profile_oid and attname = 'id' and atttypid = 'uuid'::regtype
    and attnotnull and not attisdropped;
  if profile_id is null or not exists (
    select 1 from pg_constraint where conrelid = profile_oid and contype in ('p', 'u')
      and conkey = array[profile_id]::smallint[] and not condeferrable and convalidated
  ) then
    raise exception 'Core requiere profiles.id UUID NOT NULL con PK/UNIQUE no diferible.';
  end if;
  if not pg_has_role(current_user, (select relowner from pg_class where oid = profile_oid), 'USAGE') then
    raise exception 'Aplicar Core como propietario de profiles.';
  end if;
  -- Orden fijo y locks mantenidos hasta COMMIT, antes de inspeccionar datos.
  lock table public.profiles in share row exclusive mode;
  if to_regprocedure('auth.uid()') is null
     or (select prorettype from pg_proc where oid = to_regprocedure('auth.uid()')) <> 'uuid'::regtype or
     (select count(*) from pg_roles where rolname in ('anon', 'authenticated')) <> 2 then
    raise exception 'Faltan auth.uid() o roles anon/authenticated.';
  end if;
  for api_role in select oid, rolname from pg_roles where rolname in ('anon', 'authenticated') loop
    if exists (
      select 1 from pg_roles r where pg_has_role(api_role.oid, r.oid, 'MEMBER')
        and (r.rolsuper or r.rolbypassrls or r.rolname = current_user
          or r.oid = (select relowner from pg_class where oid = profile_oid))
    ) then
      raise exception 'El rol % puede asumir privilegios incompatibles con Core.', api_role.rolname;
    end if;
  end loop;
  select count(*) into core_count from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('games', 'player_progress', 'game_sessions', 'xp_ledger', 'tickets_ledger');
  if installed then
    if not exists (select 1 from pg_namespace where nspname = 'theretos_core'
      and obj_description(oid, 'pg_namespace') = 'theretos-core-v1-uuid'
      and nspowner = (select oid from pg_roles where rolname = current_user)) or core_count <> 5 then
      raise exception 'Core parcial o esquema theretos_core incompatible; inspeccionar sin forzar.';
    end if;
    if (select count(*) from pg_proc where pronamespace = 'theretos_core'::regnamespace) <> 6
      or exists (select 1 from pg_proc where pronamespace = 'theretos_core'::regnamespace
        and (proname not in ('set_updated_at', 'create_player_progress', 'reject_mutation',
          'guard_game_session', 'count_validated_game', 'apply_ledger_entry')
          or pronargs <> 0 or prorettype <> 'trigger'::regtype))
      or exists (select 1 from pg_class where relnamespace = 'theretos_core'::regnamespace) then
      raise exception 'Objetos inesperados o parciales en theretos_core.';
    end if;
  elsif not (core_count = 0 or (core_count = 2 and games_oid is not null and sessions_oid is not null)) then
    raise exception 'Core parcial o legado incompleto; se requieren games y game_sessions juntos.';
  end if;
  foreach object_name in array array['games', 'player_progress', 'game_sessions', 'xp_ledger', 'tickets_ledger'] loop
    object_oid := to_regclass('public.' || object_name);
    if object_oid is null then continue; end if;
    if not exists (select 1 from pg_class where oid = object_oid and relkind = 'r'
      and relowner = (select oid from pg_roles where rolname = current_user)
      and not exists (select 1 from pg_inherits where inhrelid = object_oid or inhparent = object_oid)) then
      raise exception 'Conflicto con public.%; conservar datos y revisar esquema.', object_name;
    end if;
    execute format('lock table public.%I in access exclusive mode', object_name);
    if installed then
      -- Datos, grants y policies no forman parte de la huella: se preservan los
      -- primeros y se restablece abajo el acceso SELECT previsto.
      select md5(jsonb_build_object(
        'columns', (select jsonb_agg(jsonb_build_array(a.attname,
          format_type(a.atttypid, a.atttypmod), a.attnotnull, a.attidentity,
          a.attgenerated, pg_get_expr(d.adbin, d.adrelid)) order by a.attnum)
          from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
          where a.attrelid = object_oid and a.attnum > 0 and not a.attisdropped),
        'constraints', (select jsonb_agg(jsonb_build_array(c.conname, c.contype,
          c.convalidated, c.condeferrable, c.condeferred, pg_get_constraintdef(c.oid, true)) order by c.conname)
          from pg_constraint c where c.conrelid = object_oid),
        'indexes', (select jsonb_agg(pg_get_indexdef(indexrelid) order by indexrelid::regclass::text)
          from pg_index where indrelid = object_oid),
        'triggers', (select jsonb_agg(jsonb_build_array(pg_get_triggerdef(oid), tgenabled) order by tgname)
          from pg_trigger where tgrelid = object_oid and not tgisinternal)
      )::text) into structure_hash;
      if obj_description(object_oid, 'pg_class') is distinct from 'theretos-core-v1-uuid:' || structure_hash then
        raise exception 'Estructura Core alterada en public.%; revisar antes de reaplicar.', object_name;
      end if;
    elsif obj_description(object_oid, 'pg_class') like 'theretos-core-%' then
      raise exception 'Core parcial o version anterior en public.%.', object_name;
    end if;
    if exists (select 1 from pg_rewrite where ev_class = object_oid) then
      raise exception 'Reglas inesperadas en public.%.', object_name;
    end if;
  end loop;
  if exists (select 1 from pg_trigger where tgrelid = profile_oid
      and tgname = 'theretos_core_profile_created'
      and (not installed or tgfoid is distinct from to_regprocedure('theretos_core.create_player_progress()'))) then
    raise exception 'Conflicto con trigger theretos_core_profile_created.';
  end if;
  -- IF NOT EXISTS no debe ocultar una colision de nombres con objetos ajenos.
  for item in select * from (values
    ('game_sessions_user_started_idx', 'game_sessions'),
    ('game_sessions_game_status_idx', 'game_sessions'),
    ('game_sessions_pending_expiry_idx', 'game_sessions'),
    ('xp_ledger_user_created_idx', 'xp_ledger'),
    ('tickets_ledger_user_created_idx', 'tickets_ledger')
  ) as expected(index_name, table_name) loop
    object_oid := to_regclass('public.' || item.index_name);
    if object_oid is not null and not exists (
      select 1 from pg_index where indexrelid = object_oid
        and indrelid = to_regclass('public.' || item.table_name)
    ) then
      raise exception 'Conflicto de indice requerido: %.', item.index_name;
    end if;
  end loop;
  if installed or core_count = 0 then return; end if;

  -- LEGADO: solo se adopta el contrato reconocido. Las columnas opcionales de
  -- sesiones son timestamps comunes; otras columnas requieren inspeccion humana.
  foreach object_name in array array['games', 'game_sessions'] loop
    object_oid := to_regclass('public.' || object_name);
    if exists (select 1 from pg_trigger where tgrelid = object_oid and not tgisinternal) then
      raise exception 'Triggers legacy desconocidos en public.%; inspeccionar antes de migrar.', object_name;
    end if;
    if exists (select 1 from pg_index i join pg_class idx on idx.oid = i.indexrelid
      join pg_am am on am.oid = idx.relam where i.indrelid = object_oid
        and (i.indexprs is not null or i.indpred is not null or am.amname <> 'btree'
          or not i.indisvalid or not i.indisready
          or (i.indisunique and not exists (select 1 from pg_constraint c where c.conindid = i.indexrelid)))) then
      raise exception 'Indices legacy desconocidos en public.%.', object_name;
    end if;
    if exists (select 1 from pg_attribute where attrelid = object_oid and attnum > 0
      and (attisdropped or attidentity <> '' or attgenerated <> '')) then
      raise exception 'Columnas legacy incompatibles en public.%.', object_name;
    end if;
  end loop;
  if (select count(*) from pg_attribute where attrelid = games_oid and attnum > 0) <> 6
    or (select count(*) from pg_attribute where attrelid = games_oid and attnum > 0
      and ((attname = 'id' and atttypid = 'uuid'::regtype)
        or (attname in ('slug', 'name', 'status') and atttypid = 'text'::regtype)
        or (attname in ('created_at', 'updated_at') and atttypid = 'timestamptz'::regtype))) <> 6 then
    raise exception 'Conflicto con public.games: columnas legacy incompatibles.';
  end if;
  select attnum into id_column from pg_attribute where attrelid = games_oid and attname = 'id';
  select attnum into slug_column from pg_attribute where attrelid = games_oid and attname = 'slug';
  if not exists (select 1 from pg_constraint where conrelid = games_oid and contype = 'p'
    and conkey = array[id_column]::smallint[] and not condeferrable) then
    raise exception 'games legacy requiere PK UUID id.';
  end if;
  for item in select c.*, pg_get_expr(c.conbin, c.conrelid) as check_expression
    from pg_constraint c where c.conrelid = games_oid and c.contype <> 'n' loop
    if not item.convalidated or item.condeferrable then
      raise exception 'Constraint games legacy incompatible: %.', item.conname;
    elsif item.contype = 'p' and item.conkey = array[id_column]::smallint[] then continue;
    elsif item.contype = 'u' and item.conkey = array[slug_column]::smallint[] then continue;
    elsif item.contype = 'c' and item.conname = 'games_status_check' then
      expression := regexp_replace(item.check_expression, '[[:space:]()]', '', 'g');
      -- Lista cerrada de estados conocidos; no aceptar funciones ni expresiones arbitrarias.
      if expression !~ '^status=ANYARRAY\[''([a-z-]+)''::text(,''[a-z-]+''::text)*\]$'
        or regexp_replace(expression, '''(active|inactive|available|coming-soon|disabled)''::text,?', '', 'g') <> 'status=ANYARRAY[]' then
        raise exception 'CHECK de estado games legacy desconocido.';
      end if;
    else raise exception 'Constraint games legacy desconocida: %.', item.conname;
    end if;
  end loop;
  -- Defaults del catalogo tambien son ejecutables. No invocar funciones legacy desconocidas.
  if exists (select 1 from pg_attrdef d join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
    where d.adrelid = games_oid and not (
      (a.attname = 'id' and pg_get_expr(d.adbin, d.adrelid) in ('gen_random_uuid()', 'public.gen_random_uuid()'))
      or (a.attname = 'status' and pg_get_expr(d.adbin, d.adrelid) in ('''active''::text', '''available''::text'))
      or (a.attname in ('created_at', 'updated_at') and pg_get_expr(d.adbin, d.adrelid) in ('now()', 'CURRENT_TIMESTAMP'))
    )) then raise exception 'Default games legacy desconocido.'; end if;
  if exists (select 1 from public.games group by slug having count(*) > 1) then
    raise exception 'Slugs duplicados en games legacy.';
  end if;
  if exists (select 1 from public.games where id is null or slug is null
    or slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or name is null or length(btrim(name)) = 0
    or created_at is null or updated_at is null or status is null
    or (slug in ('atrapa-monedas','tap-frenetico','revienta-globos','golpea-topos','bolas') and status <> 'active')
    or (slug in ('tiro-perfecto','memoria-flash') and status <> 'coming-soon')
    or slug not in ('atrapa-monedas','tap-frenetico','revienta-globos','golpea-topos','bolas','tiro-perfecto','memoria-flash'))
    or (select count(*) from public.games where slug in ('atrapa-monedas','tap-frenetico','revienta-globos','golpea-topos','bolas')) <> 5 then
    raise exception 'Catalogo legacy incompatible: se requieren los cinco slugs activos, sin datos desconocidos.';
  end if;
  if (select count(*) from pg_attribute where attrelid = sessions_oid and attnum > 0
    and ((attname in ('id','user_id','game_id') and atttypid = 'uuid'::regtype and attnotnull)
      or (attname in ('mode','status') and atttypid = 'text'::regtype and attnotnull)
      or (attname in ('score','duration_ms') and atttypid in ('integer'::regtype,'bigint'::regtype) and not attnotnull))) <> 7
    or exists (select 1 from pg_attribute where attrelid = sessions_oid and attnum > 0
      and attname not in ('id','user_id','game_id','mode','status','score','duration_ms')
      and not (attname in ('started_at','completed_at','created_at','updated_at') and atttypid = 'timestamptz'::regtype)) then
    raise exception 'Columnas game_sessions legacy incompatibles.';
  end if;
  if (select count(*) from pg_constraint where conrelid = sessions_oid and contype <> 'n') <> 7 then
    raise exception 'Constraints game_sessions legacy incompatibles.';
  end if;
  for item in select c.*, pg_get_expr(c.conbin, c.conrelid) as check_expression,
      (select array_agg(a.attname::text order by k.ordinality) from unnest(c.conkey) with ordinality k(num, ordinality)
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.num) as columns,
      (select array_agg(a.attname::text order by k.ordinality) from unnest(c.confkey) with ordinality k(num, ordinality)
        join pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.num) as target_columns
    from pg_constraint c where c.conrelid = sessions_oid and c.contype <> 'n' loop
    if not item.convalidated or item.condeferrable then
      raise exception 'Constraint sessions legacy incompatible: %.', item.conname;
    end if;
    expression := regexp_replace(item.check_expression, '[[:space:]()]', '', 'g');
    if item.conname = 'game_sessions_pkey' and item.contype = 'p' and item.columns = array['id'] then continue;
    elsif item.conname = 'game_sessions_game_id_fkey' and item.contype = 'f' and item.columns = array['game_id']
      and item.confrelid = games_oid and item.target_columns = array['id'] and item.confupdtype = 'a' and item.confdeltype = 'a' then continue;
    elsif item.conname = 'game_sessions_user_id_fkey' and item.contype = 'f' and item.columns = array['user_id']
      and item.confrelid = to_regclass('auth.users') and item.target_columns = array['id'] and item.confupdtype = 'a' and item.confdeltype = 'c' then continue;
    elsif item.contype = 'c' and (
      (item.conname = 'game_sessions_mode_check' and expression = 'mode=ANYARRAY[''practice''::text,''tournament''::text,''mission''::text]')
      or (item.conname = 'game_sessions_status_check' and expression = 'status=ANYARRAY[''started''::text,''completed''::text,''cancelled''::text,''invalid''::text]')
      or (item.conname = 'game_sessions_score_check' and expression in ('scoreISNULLORscore>=0','score>=0'))
      or (item.conname = 'game_sessions_duration_ms_check' and expression in ('duration_msISNULLORduration_ms>=0','duration_ms>=0'))
    ) then continue;
    else raise exception 'Constraint game_sessions legacy desconocida: %.', item.conname;
    end if;
  end loop;
  -- row_security=off impide que RLS oculte filas al contar. El lock adquirido
  -- arriba impide INSERT concurrentes hasta terminar toda la migracion.
  select count(*) into session_count from public.game_sessions;
  if session_count <> 0 then
    raise exception 'game_sessions legacy debe estar vacia; contiene % filas. No se borro nada.', session_count;
  end if;
  -- RESTRICT por defecto: una FK/vista dependiente desconocida aborta todo.
  drop table public.game_sessions;
  alter table public.games drop constraint if exists games_status_check;
  alter table public.games alter column id set default gen_random_uuid(),
    alter column slug set not null, alter column name set not null,
    alter column status set not null, alter column status drop default,
    alter column created_at set not null, alter column created_at set default now(),
    alter column updated_at set not null, alter column updated_at set default now();
  update public.games set status = 'available' where status = 'active';
  alter table public.games add constraint games_status_check check (status in ('available','coming-soon','disabled'));
  alter table public.games add constraint games_slug_check check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
  alter table public.games add constraint games_name_check check (length(btrim(name)) > 0);
  if not exists (select 1 from pg_constraint where conrelid = games_oid and contype = 'u'
    and conkey = array[slug_column]::smallint[]) then
    alter table public.games add constraint games_slug_unique unique (slug);
  end if;
end;
$preflight$;

-- Serializa el backfill con nuevos perfiles. Un timeout revierte todo; reintentar
-- en una ventana tranquila. No reemplaza ningun trigger de auth.users.
lock table public.profiles in share row exclusive mode;
create schema if not exists theretos_core;
comment on schema theretos_core is 'theretos-core-v1-uuid';
revoke all on schema theretos_core from public, anon, authenticated;

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null constraint games_slug_unique unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) > 0),
  status text not null constraint games_status_check check (status in ('available', 'coming-soon', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.player_progress (
  user_id uuid primary key references public.profiles(id) on update restrict on delete restrict,
  xp_total bigint not null default 0 constraint player_progress_xp_check check (xp_total >= 0),
  tickets_balance bigint not null default 0 constraint player_progress_tickets_check check (tickets_balance >= 0),
  level integer not null default 1 constraint player_progress_level_check check (level >= 1),
  games_played bigint not null default 0 constraint player_progress_games_check check (games_played >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.player_progress(user_id) on update restrict on delete restrict,
  game_id uuid not null references public.games(id) on update restrict on delete restrict,
  mode text not null constraint game_sessions_mode_check check (mode in ('practice', 'competitive')),
  status text not null default 'started' constraint game_sessions_status_check
    check (status in ('started', 'submitted', 'validated', 'rejected', 'expired')),
  score bigint constraint game_sessions_score_check check (score >= 0),
  duration_ms bigint constraint game_sessions_duration_check check (duration_ms >= 0),
  metrics jsonb not null default '{}'::jsonb constraint game_sessions_metrics_check check (jsonb_typeof(metrics) = 'object'),
  client_version text,
  rejection_reason text,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  validated_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_sessions_id_user_unique unique (id, user_id),
  constraint game_sessions_expiry_check check (expires_at > started_at),
  constraint game_sessions_submission_check check (
    status not in ('submitted', 'validated') or (score is not null and duration_ms is not null and submitted_at is not null)),
  constraint game_sessions_validation_check check ((status = 'validated') = (validated_at is not null)),
  constraint game_sessions_timestamps_check check (
    (submitted_at is null or submitted_at >= started_at) and
    (validated_at is null or validated_at >= submitted_at)),
  constraint game_sessions_rejection_check check (status <> 'rejected' or length(btrim(rejection_reason)) > 0 and rejection_reason is not null)
);
create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.player_progress(user_id) on update restrict on delete restrict,
  amount bigint not null constraint xp_ledger_amount_check check (amount > 0),
  reason text not null check (length(btrim(reason)) > 0),
  game_session_id uuid,
  event_key text not null constraint xp_ledger_event_key_unique unique,
  created_at timestamptz not null default now(),
  constraint xp_ledger_session_unique unique (game_session_id),
  constraint xp_ledger_event_key_check check (length(btrim(event_key)) between 1 and 200),
  constraint xp_ledger_session_user_fk foreign key (game_session_id, user_id)
    references public.game_sessions(id, user_id) on update restrict on delete restrict
);
create table if not exists public.tickets_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.player_progress(user_id) on update restrict on delete restrict,
  amount bigint not null constraint tickets_ledger_amount_check check (amount <> 0),
  reason text not null check (length(btrim(reason)) > 0),
  game_session_id uuid,
  event_key text not null constraint tickets_ledger_event_key_unique unique,
  created_at timestamptz not null default now(),
  constraint tickets_ledger_session_unique unique (game_session_id),
  constraint tickets_ledger_event_key_check check (length(btrim(event_key)) between 1 and 200),
  constraint tickets_ledger_session_user_fk foreign key (game_session_id, user_id)
    references public.game_sessions(id, user_id) on update restrict on delete restrict,
  constraint tickets_ledger_session_credit_check check (game_session_id is null or amount > 0)
);
create index if not exists game_sessions_user_started_idx on public.game_sessions (user_id, started_at desc);
create index if not exists game_sessions_game_status_idx on public.game_sessions (game_id, status, started_at desc);
create index if not exists game_sessions_pending_expiry_idx on public.game_sessions (expires_at) where status in ('started', 'submitted');
create index if not exists xp_ledger_user_created_idx on public.xp_ledger (user_id, created_at desc);
create index if not exists tickets_ledger_user_created_idx on public.tickets_ledger (user_id, created_at desc);
-- UNIQUE(game_session_id) permite multiples NULL y una recompensa de cada clase
-- por sesion, incluso con otro event_key. Es una constraint, no un indice opcional.

create or replace function theretos_core.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $function$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$function$;

-- Unica funcion que necesita elevar privilegios: el rol que crea profiles
-- mediante el registro existente no necesita INSERT sobre player_progress.
create or replace function theretos_core.create_player_progress()
returns trigger language plpgsql security definer set search_path = '' as $function$
begin
  insert into public.player_progress (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$function$;

create or replace function theretos_core.reject_mutation()
returns trigger language plpgsql security invoker set search_path = '' as $function$
begin
  raise exception 'Core: % no permite %; el historial es inmutable.', tg_table_name, tg_op using errcode = '23514';
end;
$function$;

create or replace function theretos_core.guard_game_session()
returns trigger language plpgsql security invoker set search_path = '' as $function$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'started' or new.score is not null or new.duration_ms is not null
       or new.submitted_at is not null or new.validated_at is not null
       or new.rejection_reason is not null or new.metrics <> '{}'::jsonb
       or new.expires_at <= clock_timestamp() then
      raise exception 'Una sesion debe comenzar started, vigente y sin resultado.' using errcode = '23514';
    end if;
    if not exists (select 1 from public.games where id = new.game_id and status = 'available') then
      raise exception 'El juego no esta disponible.' using errcode = '23514';
    end if;
    return new;
  end if;
  if (new.id, new.user_id, new.game_id, new.mode, new.started_at, new.expires_at, new.created_at)
     is distinct from (old.id, old.user_id, old.game_id, old.mode, old.started_at, old.expires_at, old.created_at) then
    raise exception 'La identidad y vigencia de la sesion son inmutables.' using errcode = '23514';
  end if;
  if old.status in ('validated', 'rejected', 'expired') then
    if (to_jsonb(new) - 'updated_at') is distinct from (to_jsonb(old) - 'updated_at') then
      raise exception 'Una sesion terminal es inmutable.' using errcode = '23514';
    end if;
    return new;
  end if;
  if new.submitted_at is distinct from old.submitted_at or new.validated_at is distinct from old.validated_at then
    raise exception 'Los timestamps de estado son internos.' using errcode = '23514';
  end if;
  if new.status = old.status then
    if (to_jsonb(new) - 'updated_at') is distinct from (to_jsonb(old) - 'updated_at') then
      raise exception 'El resultado solo cambia al transicionar de estado.' using errcode = '23514';
    end if;
    return new;
  end if;
  if not ((old.status = 'started' and new.status in ('submitted', 'rejected', 'expired'))
       or (old.status = 'submitted' and new.status in ('validated', 'rejected', 'expired'))) then
    raise exception 'Transicion de sesion invalida.' using errcode = '23514';
  end if;
  if new.status = 'submitted' then
    if clock_timestamp() >= old.expires_at then
      raise exception 'La sesion ya vencio.' using errcode = '23514';
    end if;
    new.submitted_at := clock_timestamp();
  end if;
  if new.status = 'validated' then
    new.validated_at := clock_timestamp();
  end if;
  if new.status = 'expired' and clock_timestamp() < old.expires_at then
    raise exception 'No se puede expirar una sesion vigente.' using errcode = '23514';
  end if;
  return new;
end;
$function$;

create or replace function theretos_core.count_validated_game()
returns trigger language plpgsql security invoker set search_path = '' as $function$
begin
  if new.status = 'validated' and old.status is distinct from 'validated' then
    update public.player_progress set games_played = games_played + 1 where user_id = new.user_id;
    if not found then raise exception 'Falta progreso para la sesion.'; end if;
  end if;
  return new;
end;
$function$;

create or replace function theretos_core.apply_ledger_entry()
returns trigger language plpgsql security invoker set search_path = '' as $function$
begin
  if new.game_session_id is not null and not exists (
    select 1 from public.game_sessions
    where id = new.game_session_id and user_id = new.user_id and status = 'validated'
  ) then
    raise exception 'La recompensa requiere una sesion propia validada.' using errcode = '23514';
  end if;
  if tg_table_name = 'xp_ledger' then
    update public.player_progress set xp_total = xp_total + new.amount where user_id = new.user_id;
  elsif tg_table_name = 'tickets_ledger' then
    -- UPDATE bloquea la fila; el predicado se reevalua tras escrituras concurrentes.
    -- numeric evita overflow al comprobar incluso el bigint minimo.
    update public.player_progress set tickets_balance = tickets_balance + new.amount
    where user_id = new.user_id and tickets_balance::numeric + new.amount::numeric >= 0;
  else
    raise exception 'Ledger desconocido.';
  end if;
  if not found then
    raise exception 'Saldo de tickets insuficiente o progreso inexistente.' using errcode = '23514';
  end if;
  return new;
end;
$function$;

revoke all on all functions in schema theretos_core from public, anon, authenticated;

drop trigger if exists theretos_core_profile_created on public.profiles;
create trigger theretos_core_profile_created after insert on public.profiles
for each row execute function theretos_core.create_player_progress();

do $triggers$
declare table_name text;
begin
  foreach table_name in array array['games', 'player_progress', 'game_sessions'] loop
    execute format('drop trigger if exists theretos_core_updated_at on public.%I', table_name);
    execute format('create trigger theretos_core_updated_at before update on public.%I for each row execute function theretos_core.set_updated_at()', table_name);
  end loop;
  foreach table_name in array array['xp_ledger', 'tickets_ledger'] loop
    execute format('drop trigger if exists theretos_core_ledger_apply on public.%I', table_name);
    execute format('create trigger theretos_core_ledger_apply after insert on public.%I for each row execute function theretos_core.apply_ledger_entry()', table_name);
    execute format('drop trigger if exists theretos_core_immutable on public.%I', table_name);
    execute format('create trigger theretos_core_immutable before update or delete on public.%I for each row execute function theretos_core.reject_mutation()', table_name);
  end loop;
  foreach table_name in array array['xp_ledger', 'tickets_ledger', 'game_sessions', 'player_progress'] loop
    execute format('drop trigger if exists theretos_core_no_truncate on public.%I', table_name);
    execute format('create trigger theretos_core_no_truncate before truncate on public.%I for each statement execute function theretos_core.reject_mutation()', table_name);
  end loop;
end;
$triggers$;
drop trigger if exists theretos_core_session_guard on public.game_sessions;
create trigger theretos_core_session_guard before insert or update on public.game_sessions
for each row execute function theretos_core.guard_game_session();
drop trigger if exists theretos_core_session_count on public.game_sessions;
create trigger theretos_core_session_count after update on public.game_sessions
for each row when (new.status = 'validated' and old.status is distinct from 'validated')
execute function theretos_core.count_validated_game();
drop trigger if exists theretos_core_session_no_delete on public.game_sessions;
create trigger theretos_core_session_no_delete before delete on public.game_sessions
for each row execute function theretos_core.reject_mutation();

insert into public.player_progress (user_id) select id from public.profiles
on conflict (user_id) do nothing;

insert into public.games (slug, name, status) values
  ('atrapa-monedas', 'Atrapa Monedas', 'available'),
  ('tap-frenetico', 'Tap Frenético', 'available'),
  ('revienta-globos', 'Revienta Globos', 'available'),
  ('golpea-topos', 'Golpea Topos', 'available'),
  ('bolas', 'Bolas', 'available'),
  ('tiro-perfecto', 'Tiro Perfecto', 'coming-soon'),
  ('memoria-flash', 'Memoria Flash', 'coming-soon')
on conflict (slug) do nothing;

-- Privilegios de tabla Y columna: RLS no sustituye REVOKE.
do $table_security$
declare table_name text; columns_sql text; policy_name text;
begin
  foreach table_name in array array['games', 'player_progress', 'game_sessions', 'xp_ledger', 'tickets_ledger'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
    select string_agg(quote_ident(attname), ', ' order by attnum) into columns_sql
    from pg_attribute where attrelid = to_regclass('public.' || table_name) and attnum > 0 and not attisdropped;
    execute format('revoke select (%1$s), insert (%1$s), update (%1$s), references (%1$s) on table public.%2$I from public, anon, authenticated', columns_sql, table_name);
    -- Elimina tambien las policies legacy, incluida INSERT desde navegador.
    for policy_name in select polname from pg_policy where polrelid = to_regclass('public.' || table_name) loop
      execute format('drop policy %I on public.%I', policy_name, table_name);
    end loop;
    if table_name = 'games' then
      execute 'grant select on table public.games to anon, authenticated';
      execute 'create policy theretos_core_select on public.games for select to anon, authenticated using (true)';
    else
      execute format('grant select on table public.%I to authenticated', table_name);
      execute format('create policy theretos_core_select on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name);
      execute format('create policy theretos_core_select_guard on public.%I as restrictive for select to anon, authenticated using ((select auth.uid()) = user_id)', table_name);
    end if;
  end loop;
end;
$table_security$;

-- No continuar si grants heredados/defaults permiten mas que lo previsto.
do $verify_security$
declare api_role record; relation record; field record; routine record; privilege_name text; may_select boolean;
begin
  for api_role in select oid, rolname from pg_roles where rolname in ('anon', 'authenticated') loop
    if has_schema_privilege(api_role.oid, 'theretos_core', 'USAGE')
       or has_schema_privilege(api_role.oid, 'theretos_core', 'CREATE') then
      raise exception 'Privilegios heredados en esquema interno para %.', api_role.rolname;
    end if;
    for relation in select c.oid, c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname in ('games', 'player_progress', 'game_sessions', 'xp_ledger', 'tickets_ledger') loop
      may_select := relation.relname = 'games' or api_role.rolname = 'authenticated';
      if has_table_privilege(api_role.oid, relation.oid, 'SELECT') is distinct from may_select then
        raise exception 'SELECT inesperado para % en %.', api_role.rolname, relation.relname;
      end if;
      foreach privilege_name in array array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
        if has_table_privilege(api_role.oid, relation.oid, privilege_name) then
          raise exception 'Privilegio % inesperado para % en %.', privilege_name, api_role.rolname, relation.relname;
        end if;
      end loop;
      for field in select attnum from pg_attribute where attrelid = relation.oid and attnum > 0 and not attisdropped loop
        if has_column_privilege(api_role.oid, relation.oid, field.attnum, 'SELECT') is distinct from may_select then
          raise exception 'SELECT de columna inesperado en %.', relation.relname;
        end if;
        foreach privilege_name in array array['INSERT', 'UPDATE', 'REFERENCES'] loop
          if has_column_privilege(api_role.oid, relation.oid, field.attnum, privilege_name) then
            raise exception 'Privilegio de columna % inesperado en %.', privilege_name, relation.relname;
          end if;
        end loop;
      end loop;
    end loop;
    for routine in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'theretos_core' loop
      if has_function_privilege(api_role.oid, routine.oid, 'EXECUTE') then
        raise exception 'EXECUTE inesperado para % en funcion Core.', api_role.rolname;
      end if;
    end loop;
  end loop;
end;
$verify_security$;

-- Registro del contrato estructural instalado. No es un secreto ni una firma
-- contra el administrador: detecta cambios accidentales antes de reaplicar v1.
do $record_structure$
declare object_name text; object_oid oid; structure_hash text;
begin
  foreach object_name in array array['games', 'player_progress', 'game_sessions', 'xp_ledger', 'tickets_ledger'] loop
    object_oid := to_regclass('public.' || object_name);
    select md5(jsonb_build_object(
      'columns', (select jsonb_agg(jsonb_build_array(a.attname,
        format_type(a.atttypid, a.atttypmod), a.attnotnull, a.attidentity,
        a.attgenerated, pg_get_expr(d.adbin, d.adrelid)) order by a.attnum)
        from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
        where a.attrelid = object_oid and a.attnum > 0 and not a.attisdropped),
      'constraints', (select jsonb_agg(jsonb_build_array(c.conname, c.contype,
        c.convalidated, c.condeferrable, c.condeferred, pg_get_constraintdef(c.oid, true)) order by c.conname)
        from pg_constraint c where c.conrelid = object_oid),
      'indexes', (select jsonb_agg(pg_get_indexdef(indexrelid) order by indexrelid::regclass::text)
        from pg_index where indrelid = object_oid),
      'triggers', (select jsonb_agg(jsonb_build_array(pg_get_triggerdef(oid), tgenabled) order by tgname)
        from pg_trigger where tgrelid = object_oid and not tgisinternal)
    )::text) into structure_hash;
    execute format('comment on table public.%I is %L', object_name, 'theretos-core-v1-uuid:' || structure_hash);
  end loop;
end;
$record_structure$;
commit;
