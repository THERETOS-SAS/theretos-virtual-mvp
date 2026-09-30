-- Solo lectura. Ejecutar en el SQL Editor del proyecto Supabase de THERETOS.
-- Conservar el resultado antes de ejecutar profile-edit-rls.sql.

select c.oid::regclass as relation, c.relkind, c.relrowsecurity,
       c.relforcerowsecurity, pg_get_userbyid(c.relowner) as owner,
       c.relacl as table_acl
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'profiles';

select column_name, data_type, udt_name, is_nullable,
       character_maximum_length, column_default, is_generated
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
order by ordinal_position;

select conname, contype, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = to_regclass('public.profiles');

select policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'profiles'
order by policyname;

select grantor, grantee, privilege_type, is_grantable
from information_schema.table_privileges
where table_schema = 'public' and table_name = 'profiles'
order by grantee, privilege_type;

select grantor, grantee, column_name, privilege_type, is_grantable
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'profiles'
order by grantee, column_name, privilege_type;

-- Privilegios efectivos: incluye grants heredados y PUBLIC.
select r.rolname, a.attname,
       has_column_privilege(r.oid, c.oid, a.attnum, 'SELECT') as can_select,
       has_column_privilege(r.oid, c.oid, a.attnum, 'UPDATE') as can_update
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join pg_attribute a on a.attrelid = c.oid
cross join pg_roles r
where n.nspname = 'public' and c.relname = 'profiles'
  and a.attnum > 0 and not a.attisdropped
  and r.rolname in ('anon', 'authenticated')
order by r.rolname, a.attnum;

select rolname, rolsuper, rolbypassrls, rolinherit
from pg_roles where rolname in ('anon', 'authenticated');

select member_role.rolname as member_role, granted_role.rolname as granted_role
from pg_auth_members m
join pg_roles member_role on member_role.oid = m.member
join pg_roles granted_role on granted_role.oid = m.roleid
where member_role.rolname in ('anon', 'authenticated');

-- No modifica los triggers existentes de registro ni actualización.
select t.tgrelid::regclass as relation, t.tgname,
       pg_get_triggerdef(t.oid) as definition,
       t.tgfoid::regprocedure as function_name, p.prosecdef as security_definer
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where not t.tgisinternal
  and t.tgrelid in (to_regclass('public.profiles'), to_regclass('auth.users'))
order by relation, t.tgname;
