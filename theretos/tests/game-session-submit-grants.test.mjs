import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

// Execute the real Core and grant migrations under a service role with limited ACLs.
// This verifies PostgreSQL ACLs and triggers locally; it does not run PostgREST
// or use credentials, network access or a hosted Supabase project.
const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const SESSION = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MISSING = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const GAME = "339b4240-92f8-48d7-b798-0b50fd05130e";
const UPDATE_COLUMNS = ["status", "score", "duration_ms", "metrics"];
const CORE_TABLES = ["games", "player_progress", "game_sessions", "xp_ledger", "tickets_ledger"];
const db = new PGlite();
const [legacy, core, startGrants, submitGrants] = await Promise.all([
  "./fixtures/theretos-legacy.sql",
  "../supabase/migrations/202610070001_theretos_core_v1.sql",
  "../supabase/migrations/202610150001_game_session_server_grants.sql",
  "../supabase/migrations/202610150002_game_session_submit_grants.sql",
].map((path) => readFile(new URL(path, import.meta.url), "utf8")));

before(async () => {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key);
    insert into auth.users values ('${USER}'), ('${OTHER}');
    create function auth.uid() returns uuid language sql stable
      set search_path = '' as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    grant usage on schema public to service_role;
    create table public.profiles (id uuid primary key);
    insert into public.profiles values ('${USER}'), ('${OTHER}');
  `);
  await db.exec(legacy);
  await db.exec(core);
  await db.exec(startGrants);
  const { rows } = await db.query(`select
    has_table_privilege('service_role', 'public.game_sessions', 'UPDATE') as table_update,
    has_any_column_privilege('service_role', 'public.game_sessions', 'UPDATE') as column_update`);
  assert.deepEqual(rows, [{ table_update: false, column_update: false }]);
  await db.exec(submitGrants);
});

after(async () => { await db.close(); });

function isolatedTest(name, run) {
  test(name, async () => {
    await db.exec("begin");
    try { await run(); } finally { await db.exec("rollback"); }
  });
}

async function serviceQuery(sql, parameters = []) {
  await db.exec("set local role service_role");
  try { return await db.query(sql, parameters); } finally { await db.exec("reset role"); }
}

async function rejectsAsRole(role, sql, parameters = [], code = "42501") {
  assert.ok(["anon", "authenticated", "service_role"].includes(role));
  await db.exec("savepoint expected_error");
  try {
    await db.exec(`set local role ${role}`);
    await assert.rejects(db.query(sql, parameters), (error) => {
      assert.equal(error.code, code, error.message);
      return true;
    });
  } finally {
    await db.exec("rollback to savepoint expected_error; release savepoint expected_error");
  }
}

async function startSession({ expiresSoon = false } = {}) {
  return serviceQuery(`insert into public.game_sessions
    (id, user_id, game_id, mode, started_at, expires_at)
    values ($1, $2, $3, 'competitive', clock_timestamp() - interval '1 second',
      clock_timestamp() + $4::interval)`, [SESSION, USER, GAME, expiresSoon ? "20 milliseconds" : "1 hour"]);
}

async function submitSession(user = USER, id = SESSION) {
  return serviceQuery(`update public.game_sessions
    set status = 'submitted', score = 25, duration_ms = 1000, metrics = '{"hits":5}'::jsonb
    where id = $1 and user_id = $2 and status = 'started' and expires_at > clock_timestamp()
    returning id, status, score, duration_ms, submitted_at`, [id, user]);
}

async function progressionSnapshot() {
  return (await db.query(`select
    (select jsonb_agg(to_jsonb(p) order by user_id) from public.player_progress p) as progress,
    (select count(*)::int from public.xp_ledger) as xp_entries,
    (select count(*)::int from public.tickets_ledger) as ticket_entries`)).rows;
}

isolatedTest("submit grants allow only four UPDATE columns without table UPDATE or extra Core privileges", async () => {
  const { rows } = await db.query(`select attname,
    has_column_privilege('service_role', attrelid, attnum, 'UPDATE') as allowed
    from pg_attribute where attrelid = 'public.game_sessions'::regclass
      and attnum > 0 and not attisdropped order by attnum`);
  assert.deepEqual(rows.filter(({ allowed }) => allowed).map(({ attname }) => attname), UPDATE_COLUMNS);
  const access = (await db.query(`select
    has_schema_privilege('service_role', 'public', 'USAGE') as public_usage,
    has_schema_privilege('service_role', 'theretos_core', 'USAGE') as core_usage,
    has_table_privilege('service_role', 'public.games', 'SELECT') as games_select,
    has_table_privilege('service_role', 'public.game_sessions', 'INSERT') as sessions_insert,
    has_table_privilege('service_role', 'public.game_sessions', 'SELECT') as sessions_select,
    has_table_privilege('service_role', 'public.game_sessions', 'UPDATE') as table_update,
    has_table_privilege('service_role', 'public.game_sessions', 'DELETE') as sessions_delete,
    has_function_privilege('service_role', 'theretos_core.guard_game_session()', 'EXECUTE') as guard_execute,
    has_function_privilege('service_role', 'theretos_core.set_updated_at()', 'EXECUTE') as timestamp_execute`)).rows[0];
  assert.deepEqual(access, {
    public_usage: true, core_usage: false, games_select: true,
    sessions_insert: true, sessions_select: true, table_update: false,
    sessions_delete: false, guard_execute: false, timestamp_execute: false,
  });
  for (const table of ["player_progress", "xp_ledger", "tickets_ledger"]) {
    const { rows: privileges } = await db.query(`select
      has_table_privilege('service_role', $1, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as table_access,
      has_any_column_privilege('service_role', $1, 'SELECT,INSERT,UPDATE,REFERENCES') as column_access`, [`public.${table}`]);
    assert.deepEqual(privileges, [{ table_access: false, column_access: false }], table);
  }
});

isolatedTest("service submit succeeds and triggers set both timestamps without timestamp grants or rewards", async () => {
  await startSession();
  const progressionBefore = await progressionSnapshot();
  const { rows } = await submitSession();
  assert.equal(rows.length, 1);
  assert.deepEqual(Object.keys(rows[0]).sort(), ["id", "status", "score", "duration_ms", "submitted_at"].sort());
  assert.equal(rows[0].id, SESSION);
  assert.equal(rows[0].status, "submitted");
  assert.equal(Number(rows[0].score), 25);
  assert.equal(Number(rows[0].duration_ms), 1000);
  assert.ok(rows[0].submitted_at);
  const state = (await db.query(`select metrics, validated_at, rejection_reason,
    submitted_at >= started_at as submitted_after_start,
    updated_at >= submitted_at as updated_after_submit,
    updated_at > created_at as updated_changed
    from public.game_sessions where id = $1`, [SESSION])).rows[0];
  assert.deepEqual(state, {
    metrics: { hits: 5 }, validated_at: null, rejection_reason: null,
    submitted_after_start: true, updated_after_submit: true, updated_changed: true,
  });
  assert.deepEqual(await progressionSnapshot(), progressionBefore);
});

isolatedTest("service cannot UPDATE identity, timestamps or any column outside the submit grant", async () => {
  await startSession();
  const columns = (await db.query(`select attname from pg_attribute
    where attrelid = 'public.game_sessions'::regclass and attnum > 0 and not attisdropped`)).rows;
  for (const { attname } of columns) {
    if (UPDATE_COLUMNS.includes(attname)) continue;
    // Identifiers come from this migration's catalog, never from a request.
    assert.match(attname, /^[a-z_]+$/);
    await rejectsAsRole("service_role", `update public.game_sessions set ${attname} = ${attname} where id = $1`, [SESSION]);
  }
  await rejectsAsRole("service_role", "delete from public.game_sessions where id = $1", [SESSION]);
});

isolatedTest("submit grants leave anon and authenticated without Core write permissions", async () => {
  await startSession();
  for (const role of ["anon", "authenticated"]) {
    for (const table of CORE_TABLES) {
      const { rows } = await db.query(`select
        has_table_privilege($1, $2, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as table_write,
        has_any_column_privilege($1, $2, 'INSERT,UPDATE,REFERENCES') as column_write`, [role, `public.${table}`]);
      assert.deepEqual(rows, [{ table_write: false, column_write: false }], `${role}: ${table}`);
    }
    await rejectsAsRole(role, "update public.game_sessions set status = 'submitted', score = 1, duration_ms = 1 where id = $1", [SESSION]);
    await rejectsAsRole(role, `insert into public.game_sessions (user_id, game_id, mode, expires_at)
      values ($1, $2, 'practice', clock_timestamp() + interval '1 hour')`, [USER, GAME]);
    await rejectsAsRole(role, "delete from public.game_sessions where id = $1", [SESSION]);
  }
});

isolatedTest("conditional submit rejects missing, foreign-owned and already submitted sessions", async () => {
  await startSession();
  assert.deepEqual((await submitSession(USER, MISSING)).rows, []);
  assert.deepEqual((await submitSession(OTHER)).rows, []);
  assert.equal((await submitSession()).rows.length, 1);
  const saved = (await db.query("select * from public.game_sessions where id = $1", [SESSION])).rows;
  assert.deepEqual((await submitSession()).rows, []);
  await rejectsAsRole("service_role", "update public.game_sessions set status = 'submitted', score = 26 where id = $1", [SESSION], "23514");
  assert.deepEqual((await db.query("select * from public.game_sessions where id = $1", [SESSION])).rows, saved);
});

isolatedTest("expiry predicate and Core clock guard both prevent submission without changing status", async () => {
  await startSession({ expiresSoon: true });
  await new Promise((resolve) => setTimeout(resolve, 40));
  const { rows } = await db.query("select expires_at <= clock_timestamp() as expired from public.game_sessions where id = $1", [SESSION]);
  assert.deepEqual(rows, [{ expired: true }]);
  assert.deepEqual((await submitSession()).rows, []);
  await rejectsAsRole("service_role", `update public.game_sessions
    set status = 'submitted', score = 25, duration_ms = 1000, metrics = '{}'
    where id = $1`, [SESSION], "23514");
  const state = (await db.query("select status, score, duration_ms, submitted_at from public.game_sessions where id = $1", [SESSION])).rows;
  assert.deepEqual(state, [{ status: "started", score: null, duration_ms: null, submitted_at: null }]);
});

isolatedTest("Core constraints still reject negative or incomplete results and non-object metrics", async () => {
  await startSession();
  const progressionBefore = await progressionSnapshot();
  for (const [score, duration, metrics] of [
    [-1, 1000, "{}"], [1, -1, "{}"], [null, 1000, "{}"], [1, null, "{}"],
    [1, 1000, "[]"], [1, 1000, "null"],
  ]) {
    await rejectsAsRole("service_role", `update public.game_sessions
      set status = 'submitted', score = $2, duration_ms = $3, metrics = $4::jsonb
      where id = $1`, [SESSION, score, duration, metrics], "23514");
  }
  await rejectsAsRole("service_role", "update public.game_sessions set status = 'validated' where id = $1", [SESSION], "23514");
  assert.deepEqual((await db.query("select status, submitted_at from public.game_sessions where id = $1", [SESSION])).rows,
    [{ status: "started", submitted_at: null }]);
  assert.deepEqual(await progressionSnapshot(), progressionBefore);
});
