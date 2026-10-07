-- Migración manual e idempotente para la tabla EXISTENTE public.profiles.
-- Leer README.md y ejecutar inspect-profiles.sql antes de aplicarla.
-- Ejecutar el archivo completo como propietario de la tabla (SQL Editor).
-- No crea perfiles, no cambia datos y conserva los triggers del registro.

begin;

do $preflight$
declare
  profiles_oid oid := to_regclass('public.profiles');
  profiles_owner oid;
  id_attribute smallint;
  field_name text;
  api_role record;
begin
  if profiles_oid is null then
    raise exception 'Falta public.profiles; revisar el esquema antes de continuar.';
  end if;

  if not exists (
    select 1 from pg_class where oid = profiles_oid and relkind = 'r'
  ) or exists (
    select 1 from pg_inherits
    where inhrelid = profiles_oid or inhparent = profiles_oid
  ) then
    raise exception 'profiles debe ser una tabla ordinaria sin herencia ni particiones.';
  end if;

  select relowner into profiles_owner from pg_class where oid = profiles_oid;
  select attnum into id_attribute
  from pg_attribute
  where attrelid = profiles_oid and attname = 'id' and not attisdropped
    and atttypid = 'uuid'::regtype and attnotnull;

  if id_attribute is null or not exists (
    select 1 from pg_constraint
    where conrelid = profiles_oid and contype in ('p', 'u')
      and conkey = array[id_attribute]::smallint[]
  ) then
    raise exception 'profiles.id debe ser UUID, NOT NULL y único por sí solo.';
  end if;

  foreach field_name in array array['first_name', 'last_name', 'display_name', 'phone']
  loop
    if not exists (
      select 1 from pg_attribute
      where attrelid = profiles_oid and attname = field_name and not attisdropped
        and atttypid in ('text'::regtype, 'character varying'::regtype)
        and attgenerated = ''
    ) then
      raise exception 'La columna profiles.% debe existir y ser text/varchar editable.', field_name;
    end if;
  end loop;

  if (select count(*) from pg_roles where rolname in ('anon', 'authenticated')) <> 2 then
    raise exception 'Faltan los roles Supabase anon/authenticated.';
  end if;

  for api_role in select oid, rolname, rolsuper, rolbypassrls
                  from pg_roles where rolname in ('anon', 'authenticated')
  loop
    if api_role.rolsuper or api_role.rolbypassrls
       or pg_has_role(api_role.oid, profiles_owner, 'MEMBER') then
      raise exception 'El rol % puede omitir RLS o asumir al propietario; revisar roles.', api_role.rolname;
    end if;
  end loop;
end;
$preflight$;

alter table public.profiles enable row level security;

-- Quitar SELECT/UPDATE de tabla no basta si ya existen grants por columna.
-- No tocamos permisos de INSERT/DELETE ni roles internos/service_role.
revoke select on table public.profiles from public, anon, authenticated;
revoke update on table public.profiles from public, anon, authenticated;

do $column_grants$
declare
  columns_sql text;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum)
  into columns_sql
  from pg_attribute
  where attrelid = 'public.profiles'::regclass
    and attnum > 0 and not attisdropped;

  execute format(
  'revoke select (%s) on table public.profiles from public, anon, authenticated',
  columns_sql
);

execute format(
  'revoke update (%s) on table public.profiles from public, anon, authenticated',
  columns_sql
);
end;
$column_grants$;

grant select (id, first_name, last_name, display_name, phone)
  on table public.profiles to authenticated;
grant update (first_name, last_name, display_name, phone)
  on table public.profiles to authenticated;

-- Solo se reemplazan los cuatro nombres reservados por este archivo.
-- Las policies desconocidas se conservan. Las RESTRICTIVE se combinan con
-- AND e impiden que una policy PERMISSIVE antigua abra otras filas.
drop policy if exists theretos_profile_edit_select_guard on public.profiles;
create policy theretos_profile_edit_select_guard
  on public.profiles as restrictive for select to anon, authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = id);

drop policy if exists theretos_profile_edit_update_guard on public.profiles;
create policy theretos_profile_edit_update_guard
  on public.profiles as restrictive for update to anon, authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = id);

drop policy if exists theretos_profile_edit_select_own on public.profiles;
create policy theretos_profile_edit_select_own
  on public.profiles as permissive for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists theretos_profile_edit_update_own on public.profiles;
create policy theretos_profile_edit_update_own
  on public.profiles as permissive for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Si un rol heredado u otro grant sigue dando UPDATE no autorizado, abortar
-- toda la transacción. No revocamos permisos de roles desconocidos a ciegas.
do $verify_grants$
declare
  field record;
  editable boolean;
  selectable boolean;
begin
  for field in
    select attname, attnum from pg_attribute
    where attrelid = 'public.profiles'::regclass
      and attnum > 0 and not attisdropped
  loop
    editable := field.attname in ('first_name', 'last_name', 'display_name', 'phone');
    selectable := field.attname in ('id', 'first_name', 'last_name', 'display_name', 'phone');

    if has_column_privilege('anon', 'public.profiles', field.attname, 'SELECT') then
      raise exception 'anon conserva SELECT efectivo en %; revisar grants heredados.', field.attname;
    end if;

    if has_column_privilege('authenticated', 'public.profiles', field.attname, 'SELECT')
      is distinct from selectable then
      raise exception 'SELECT efectivo inesperado para authenticated en %; revisar grants heredados.', field.attname;
    end if;
    
    if has_column_privilege('anon', 'public.profiles', field.attname, 'UPDATE') then
      raise exception 'anon conserva UPDATE efectivo en %; revisar grants heredados.', field.attname;
    end if;

    if has_column_privilege('authenticated', 'public.profiles', field.attname, 'UPDATE')
       is distinct from editable then
      raise exception 'UPDATE efectivo inesperado para authenticated en %; revisar grants heredados.', field.attname;
    end if;
  end loop;
end;
$verify_grants$;

commit;

-- Volver a ejecutar inspect-profiles.sql y las pruebas de README.md.
