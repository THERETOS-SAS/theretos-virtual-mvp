-- THERETOS Core v1: SOLO LECTURA. Ejecutar completo antes y despues de aplicar.
-- No requiere que ya existan las tablas Core. NULL en los resumenes significa
-- que falta una tabla/columna requerida; no equivale a un conteo de cero.
-- Ejecutar con el propietario en SQL Editor: los conteos deben ver todas las filas.
begin transaction read only;

-- 1. Inventario, propietario y RLS. Las tablas faltantes tambien aparecen.
with expected(name) as (
  values ('games'), ('player_progress'), ('game_sessions'),
         ('xp_ledger'), ('tickets_ledger')
)
select e.name as expected_table, c.oid::regclass as relation, c.relkind,
       c.relrowsecurity, c.relforcerowsecurity,
       pg_catalog.pg_get_userbyid(c.relowner) as owner, c.relacl as table_acl,
       pg_catalog.obj_description(c.oid, 'pg_class') as core_schema_fingerprint
from expected e
left join pg_catalog.pg_class c on c.oid = pg_catalog.to_regclass('public.' || e.name)
order by e.name;

-- 2. Columnas, tipos reales, nulabilidad, defaults y ACL de columna.
select c.relname as table_name, a.attnum as ordinal_position, a.attname as column_name,
       pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
       a.attnotnull as not_null, a.attidentity, a.attgenerated,
       pg_catalog.pg_get_expr(d.adbin, d.adrelid) as column_default,
       a.attacl as column_acl
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
join pg_catalog.pg_attribute a on a.attrelid = c.oid
left join pg_catalog.pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
where n.nspname = 'public'
  and c.relname in ('games', 'player_progress', 'game_sessions', 'xp_ledger', 'tickets_ledger')
  and a.attnum > 0 and not a.attisdropped
order by c.relname, a.attnum;

-- 3. PK, FK, UNIQUE y CHECK, incluyendo su validacion.
select con.conrelid::regclass as relation, con.conname, con.contype,
       con.convalidated, con.condeferrable,
       pg_catalog.pg_get_constraintdef(con.oid, true) as definition
from pg_catalog.pg_constraint con
join pg_catalog.pg_class c on c.oid = con.conrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('games', 'player_progress', 'game_sessions', 'xp_ledger', 'tickets_ledger')
order by relation, con.conname;

-- 4. Indices, incluidos los que respaldan UNIQUE(game_session_id) en cada ledger.
select i.indrelid::regclass as relation, i.indexrelid::regclass as index_name,
       i.indisunique, i.indisvalid, pg_catalog.pg_get_indexdef(i.indexrelid) as definition
from pg_catalog.pg_index i
join pg_catalog.pg_class c on c.oid = i.indrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('games', 'player_progress', 'game_sessions', 'xp_ledger', 'tickets_ledger')
order by relation, index_name;

-- 5. Policies. Las guardas RESTRICTIVE deben permanecer junto a SELECT.
select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in ('games', 'player_progress', 'game_sessions', 'xp_ledger', 'tickets_ledger')
order by tablename, policyname;

-- 6. Grants explicitos visibles para el rol que inspecciona.
select table_name, grantor, grantee, privilege_type, is_grantable
from information_schema.table_privileges
where table_schema = 'public'
  and table_name in ('games', 'player_progress', 'game_sessions', 'xp_ledger', 'tickets_ledger')
order by table_name, grantee, privilege_type;

select table_name, column_name, grantor, grantee, privilege_type, is_grantable
from information_schema.column_privileges
where table_schema = 'public'
  and table_name in ('games', 'player_progress', 'game_sessions', 'xp_ledger', 'tickets_ledger')
order by table_name, grantee, column_name, privilege_type;

-- 7. Privilegios EFECTIVOS: consideran PUBLIC y roles heredados.
-- SELECT no comprueba RLS; para filas propias/ajenas usar cuentas distintas.
select r.rolname, c.relname as table_name,
       pg_catalog.has_table_privilege(r.oid, c.oid, 'SELECT') as can_select,
       pg_catalog.has_table_privilege(r.oid, c.oid, 'INSERT') as can_insert,
       pg_catalog.has_table_privilege(r.oid, c.oid, 'UPDATE') as can_update,
       pg_catalog.has_table_privilege(r.oid, c.oid, 'DELETE') as can_delete,
       pg_catalog.has_table_privilege(r.oid, c.oid, 'TRUNCATE') as can_truncate,
       pg_catalog.has_table_privilege(r.oid, c.oid, 'REFERENCES') as can_reference,
       pg_catalog.has_table_privilege(r.oid, c.oid, 'TRIGGER') as can_create_trigger,
       pg_catalog.has_any_column_privilege(r.oid, c.oid, 'SELECT') as can_select_any_column,
       pg_catalog.has_any_column_privilege(r.oid, c.oid, 'INSERT') as can_insert_any_column,
       pg_catalog.has_any_column_privilege(r.oid, c.oid, 'UPDATE') as can_update_any_column,
       pg_catalog.has_any_column_privilege(r.oid, c.oid, 'REFERENCES') as can_reference_any_column
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
cross join pg_catalog.pg_roles r
where n.nspname = 'public'
  and c.relname in ('games', 'player_progress', 'game_sessions', 'xp_ledger', 'tickets_ledger')
  and r.rolname in ('anon', 'authenticated')
order by r.rolname, c.relname;

select r.rolname, c.relname as table_name, a.attname as column_name,
       pg_catalog.has_column_privilege(r.oid, c.oid, a.attnum, 'SELECT') as can_select,
       pg_catalog.has_column_privilege(r.oid, c.oid, a.attnum, 'INSERT') as can_insert,
       pg_catalog.has_column_privilege(r.oid, c.oid, a.attnum, 'UPDATE') as can_update
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
join pg_catalog.pg_attribute a on a.attrelid = c.oid
cross join pg_catalog.pg_roles r
where n.nspname = 'public'
  and c.relname in ('games', 'player_progress', 'game_sessions', 'xp_ledger', 'tickets_ledger')
  and a.attnum > 0 and not a.attisdropped
  and r.rolname in ('anon', 'authenticated')
order by r.rolname, c.relname, a.attnum;

select rolname, rolsuper, rolbypassrls, rolinherit
from pg_catalog.pg_roles where rolname in ('anon', 'authenticated');

select member_role.rolname as member_role, granted_role.rolname as granted_role
from pg_catalog.pg_auth_members m
join pg_catalog.pg_roles member_role on member_role.oid = m.member
join pg_catalog.pg_roles granted_role on granted_role.oid = m.roleid
where member_role.rolname in ('anon', 'authenticated');

-- 8. Triggers Core y de registro existentes: se muestran, no se alteran.
select t.tgrelid::regclass as relation, t.tgname, t.tgenabled,
       pg_catalog.pg_get_triggerdef(t.oid, true) as definition,
       t.tgfoid::regprocedure as function_name, p.prosecdef as security_definer
from pg_catalog.pg_trigger t
join pg_catalog.pg_proc p on p.oid = t.tgfoid
where not t.tgisinternal
  and t.tgrelid in (
    pg_catalog.to_regclass('public.games'), pg_catalog.to_regclass('public.player_progress'),
    pg_catalog.to_regclass('public.game_sessions'), pg_catalog.to_regclass('public.xp_ledger'),
    pg_catalog.to_regclass('public.tickets_ledger'), pg_catalog.to_regclass('public.profiles'),
    pg_catalog.to_regclass('auth.users')
  )
order by relation, t.tgname;

-- 9. Funciones privadas: todas deben ser trigger(), search_path explicito.
select p.oid::regprocedure as function_name,
       pg_catalog.pg_get_userbyid(p.proowner) as owner,
       p.prosecdef as security_definer, p.proconfig as settings,
       p.proacl as function_acl,
       pg_catalog.pg_get_function_result(p.oid) as result_type,
       pg_catalog.pg_get_functiondef(p.oid) as definition
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'theretos_core' and p.prokind = 'f'
order by function_name;

select r.rolname, n.nspname,
       pg_catalog.has_schema_privilege(r.oid, n.oid, 'USAGE') as can_use_schema,
       pg_catalog.has_schema_privilege(r.oid, n.oid, 'CREATE') as can_create_in_schema,
       n.nspacl as schema_acl
from pg_catalog.pg_namespace n
cross join pg_catalog.pg_roles r
where n.nspname = 'theretos_core' and r.rolname in ('anon', 'authenticated');

select r.rolname, p.oid::regprocedure as function_name,
       pg_catalog.has_function_privilege(r.oid, p.oid, 'EXECUTE') as can_execute
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
cross join pg_catalog.pg_roles r
where n.nspname = 'theretos_core' and r.rolname in ('anon', 'authenticated')
order by r.rolname, function_name;

-- 10. Conteos sin resolver tablas inexistentes en el parseo del script.
-- query_to_xml solo ejecuta SELECT de nombres fijos de esta lista.
with counted(name) as (values ('profiles'), ('player_progress'))
select name as table_name,
       case when pg_catalog.to_regclass('public.' || name) is not null then
         ((pg_catalog.xpath('/row/row_count/text()', pg_catalog.query_to_xml(
           pg_catalog.format('select count(*) as row_count from public.%I', name),
           false, true, ''
         )))[1]::text)::bigint
       end as row_count
from counted order by name;

select case when
  exists (select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'profiles' and column_name = 'id')
  and exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'player_progress' and column_name = 'user_id')
then ((pg_catalog.xpath('/row/missing_progress/text()', pg_catalog.query_to_xml(
  'select count(*) as missing_progress from public.profiles p
   where not exists (select 1 from public.player_progress pp where pp.user_id = p.id)',
  false, true, ''
)))[1]::text)::bigint end as profiles_without_progress;

-- 11. Seed observado: XML de filas para funcionar antes de crear public.games.
select case when (
  select count(*) from information_schema.columns
  where table_schema = 'public' and table_name = 'games'
    and column_name in ('slug', 'name', 'status')
) = 3 then pg_catalog.query_to_xml(
  'select slug, name, status from public.games order by slug', false, true, ''
) end as seeded_games;

-- 12. Reconciliacion de agregados; cero diferencias es el resultado esperado.
-- No corrige balances ni expone UUID de usuarios. Ejecutar como propietario.
select case when (
  select count(*) from information_schema.columns
  where table_schema = 'public'
    and ((table_name = 'player_progress' and column_name in ('user_id', 'xp_total', 'tickets_balance', 'games_played'))
      or (table_name in ('xp_ledger', 'tickets_ledger') and column_name in ('user_id', 'amount'))
      or (table_name = 'game_sessions' and column_name in ('user_id', 'status')))
) = 10 then pg_catalog.query_to_xml(
  'select count(*) filter (where p.xp_total <> coalesce(x.total, 0)) as xp_mismatches,
          count(*) filter (where p.tickets_balance <> coalesce(t.total, 0)) as ticket_mismatches,
          count(*) filter (where p.games_played <> coalesce(s.total, 0)) as session_mismatches
   from public.player_progress p
   left join (select user_id, sum(amount) as total from public.xp_ledger group by user_id) x using (user_id)
   left join (select user_id, sum(amount) as total from public.tickets_ledger group by user_id) t using (user_id)
   left join (select user_id, count(*) as total from public.game_sessions where status = ''validated'' group by user_id) s using (user_id)',
  false, true, ''
) end as aggregate_reconciliation;

-- Finaliza sin escribir, incluso si se incorpora accidentalmente un DML.
rollback;
