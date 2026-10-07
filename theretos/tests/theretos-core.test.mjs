import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { allMockGames } from "../data/mockGames.ts";

// Runs the actual migration in local PostgreSQL/WASM. No network, credentials,
// Supabase project or .env files are involved. PGlite uses a single connection;
// concurrent transactions and the hosted Auth/PostgREST deployment need staging QA.
const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const NEW_USER = "33333333-3333-4333-8333-333333333333";
const SESSION = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TABLES = ["games", "player_progress", "game_sessions", "xp_ledger", "tickets_ledger"];
const PRIVATE_TABLES = TABLES.slice(1);
const migration = await readFile(new URL("../supabase/migrations/202610070001_theretos_core_v1.sql", import.meta.url), "utf8");
const inspection = await readFile(new URL("../supabase/inspect-theretos-core.sql", import.meta.url), "utf8");
const db = new PGlite();
const bootstrap = `
    create role anon nologin;
    create role authenticated nologin;
    create role profile_creator nologin;
    create schema auth;
    create function auth.uid() returns uuid language sql stable
      set search_path = '' as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, profile_creator;
    grant execute on function auth.uid() to anon, authenticated;
    create table public.profiles (id uuid primary key);
    grant insert on public.profiles to profile_creator;
    insert into public.profiles values ('${USER}'), ('${OTHER}');
  `;
let inspectionBeforeMigration;

before(async () => {
  await db.exec(bootstrap);
  inspectionBeforeMigration = await db.exec(inspection);
  await db.exec(migration);
  await db.exec(migration);
});

after(async () => { await db.close(); });

function isolatedTest(name, run) {
  test(name, async () => {
    await db.exec("begin");
    try { await run(); } finally { await db.exec("rollback"); }
  });
}

async function rejectsSql(sql, parameters = [], code = "23514") {
  await db.exec("savepoint expected_error");
  try {
    await assert.rejects(db.query(sql, parameters), (error) => {
      assert.ok((Array.isArray(code) ? code : [code]).includes(error.code), `${error.code}: ${error.message}`);
      return true;
    });
  } finally {
    await db.exec("rollback to savepoint expected_error; release savepoint expected_error");
  }
}

async function roleQuery(role, sql, parameters = [], user = USER) {
  assert.ok(["anon", "authenticated", "profile_creator"].includes(role));
  await db.query("select set_config('request.jwt.claim.sub', $1, true)", [user]);
  await db.exec(`set local role ${role}`);
  try { return await db.query(sql, parameters); } finally { await db.exec("reset role"); }
}

async function startSession(user = USER, id = SESSION) {
  await db.query(`insert into public.game_sessions (id, user_id, game_slug, mode, expires_at)
    values ($1, $2, 'atrapa-monedas', 'competitive', clock_timestamp() + interval '1 hour')`, [id, user]);
}

async function validateSession() {
  await startSession();
  await db.query("update public.game_sessions set status = 'submitted', score = 25, duration_ms = 1000 where id = $1", [SESSION]);
  await db.query("update public.game_sessions set status = 'validated' where id = $1", [SESSION]);
}

async function ledger(table, amount, event, user = USER, session = null) {
  assert.ok(["xp_ledger", "tickets_ledger"].includes(table));
  return db.query(`insert into public.${table} (user_id, amount, reason, event_key, game_session_id)
    values ($1, $2, 'local test fixture', $3, $4) returning id`, [user, amount, event, session]);
}

async function progress(user = USER) {
  return (await db.query(`select xp_total::text, tickets_balance::text, level, games_played::text
    from public.player_progress where user_id = $1`, [user])).rows[0];
}

test("Core SQL has no administrative key use or embedded credentials", async () => {
  assert.doesNotMatch(migration, /service_role/i);
  const files = [
    "supabase/migrations/202610070001_theretos_core_v1.sql",
    "supabase/inspect-theretos-core.sql",
    "supabase/THERETOS-CORE-v1.md",
  ];
  for (const file of files) {
    const content = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    for (const pattern of [
      /sb_secret_[A-Za-z0-9_-]{20,}/,
      /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/,
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
      /postgres(?:ql)?:\/\/[^\s:]+:[^\s@]+@/,
    ]) assert.doesNotMatch(content, pattern, `Possible credential in ${file}`);
  }
});

test("inspection runs read-only before and after Core exists and reports matching aggregates", async () => {
  assert.match(inspection, /begin transaction read only\s*;/i);
  const beforeRows = inspectionBeforeMigration.flatMap(({ rows }) => rows);
  assert.deepEqual(beforeRows.filter((row) => Object.hasOwn(row, "row_count")), [
    { table_name: "player_progress", row_count: null }, { table_name: "profiles", row_count: 2 },
  ]);
  const afterRows = (await db.exec(inspection)).flatMap(({ rows }) => rows);
  assert.deepEqual(afterRows.filter((row) => Object.hasOwn(row, "row_count")), [
    { table_name: "player_progress", row_count: 2 }, { table_name: "profiles", row_count: 2 },
  ]);
  assert.deepEqual(afterRows.find((row) => Object.hasOwn(row, "profiles_without_progress")), { profiles_without_progress: 0 });
  assert.match(afterRows.find((row) => Object.hasOwn(row, "aggregate_reconciliation")).aggregate_reconciliation,
    /<xp_mismatches>0<\/xp_mismatches>[\s\S]*<ticket_mismatches>0<\/ticket_mismatches>[\s\S]*<session_mismatches>0<\/session_mismatches>/);
});

isolatedTest("catalog seed exactly matches all seven official games and statuses", async () => {
  const expected = allMockGames.map(({ slug, name, status }) => ({ slug, name, status }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  assert.equal(expected.length, 7);
  const actual = (await db.query("select slug, name, status from public.games order by slug")).rows;
  assert.deepEqual(actual, expected);
  assert.equal(actual.filter(({ status }) => status === "available").length, 5);
});

isolatedTest("backfill and profile INSERT initialize progress through a least privilege trigger", async () => {
  assert.equal((await db.query("select count(*)::int as count from public.player_progress")).rows[0].count, 2);
  assert.deepEqual(await progress(), { xp_total: "0", tickets_balance: "0", level: 1, games_played: "0" });
  await roleQuery("profile_creator", "insert into public.profiles values ($1)", [NEW_USER]);
  assert.deepEqual(await progress(NEW_USER), { xp_total: "0", tickets_balance: "0", level: 1, games_played: "0" });
  const { rows } = await db.query("select has_table_privilege('profile_creator', 'public.player_progress', 'INSERT') as allowed");
  assert.equal(rows[0].allowed, false);
});

isolatedTest("RLS, table grants and column grants permit only the intended SELECT access", async () => {
  for (const table of TABLES) {
    const { rows } = await db.query("select relrowsecurity from pg_class where oid = $1::regclass", [`public.${table}`]);
    assert.equal(rows[0].relrowsecurity, true, table);
    for (const role of ["anon", "authenticated"]) {
      const result = await db.query(`select
        has_table_privilege($1, $2, 'SELECT') as can_select,
        has_table_privilege($1, $2, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as can_write,
        has_any_column_privilege($1, $2, 'INSERT,UPDATE,REFERENCES') as can_write_column`, [role, `public.${table}`]);
      assert.deepEqual(result.rows[0], {
        can_select: role === "authenticated" || table === "games", can_write: false, can_write_column: false,
      }, `${role}: ${table}`);
    }
  }
  const policies = (await db.query("select cmd from pg_policies where schemaname = 'public' and tablename = any($1::text[])", [TABLES])).rows;
  assert.equal(policies.length, 9);
  assert.ok(policies.every(({ cmd }) => cmd === "SELECT"));
});

isolatedTest("authenticated SELECT returns only own rows; anonymous private reads fail", async () => {
  await startSession();
  await startSession(OTHER, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  for (const table of ["xp_ledger", "tickets_ledger"]) {
    await ledger(table, 10, `${table}-one`);
    await ledger(table, 20, `${table}-two`, OTHER);
  }
  for (const table of PRIVATE_TABLES) {
    for (const user of [USER, OTHER]) {
      const { rows } = await roleQuery("authenticated", `select user_id from public.${table}`, [], user);
      assert.deepEqual(rows, [{ user_id: user }], table);
    }
    assert.deepEqual((await roleQuery("authenticated", `select user_id from public.${table}`, [], "")).rows, []);
    await db.exec("set local role anon");
    await rejectsSql(`select * from public.${table}`, [], "42501");
    await db.exec("reset role");
  }
  for (const role of ["anon", "authenticated"]) {
    assert.equal((await roleQuery(role, "select slug from public.games")).rows.length, 7);
  }
});

isolatedTest("both browser roles are denied all direct Core writes", async () => {
  const insert = {
    games: "insert into public.games (slug, name, status) values ('forged', 'Forged', 'available')",
    player_progress: `insert into public.player_progress (user_id) values ('${NEW_USER}')`,
    game_sessions: `insert into public.game_sessions (user_id, game_slug, mode, expires_at) values ('${USER}', 'bolas', 'practice', now() + interval '1 hour')`,
    xp_ledger: `insert into public.xp_ledger (user_id, amount, reason, event_key) values ('${USER}', 999, 'forged', 'forged-xp')`,
    tickets_ledger: `insert into public.tickets_ledger (user_id, amount, reason, event_key) values ('${USER}', 999, 'forged', 'forged-tickets')`,
  };
  const update = {
    games: "status = 'available'", player_progress: "xp_total = 999, tickets_balance = 999, level = 99, games_played = 99",
    game_sessions: "status = 'validated', score = 999", xp_ledger: "amount = 999", tickets_ledger: "amount = 999",
  };
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set local role ${role}`);
    for (const table of TABLES) {
      for (const sql of [insert[table], `update public.${table} set ${update[table]}`, `delete from public.${table}`, `truncate public.${table}`]) {
        await rejectsSql(sql, [], "42501");
      }
    }
    await db.exec("reset role");
  }
  assert.deepEqual(await progress(), { xp_total: "0", tickets_balance: "0", level: 1, games_played: "0" });
});

isolatedTest("private functions have fixed search_path, minimal definer scope and no browser EXECUTE", async () => {
  const { rows } = await db.query(`select p.oid, p.proname, p.prosecdef, p.proconfig, p.pronargs,
    p.prorettype = 'trigger'::regtype as is_trigger
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'theretos_core'`);
  assert.equal(rows.length, 6);
  assert.deepEqual(rows.filter(({ prosecdef }) => prosecdef).map(({ proname }) => proname), ["create_player_progress"]);
  for (const routine of rows) {
    assert.ok(routine.proconfig.some((config) => /^search_path=(?:""|)$/.test(config)), routine.proname);
    assert.equal(routine.pronargs, 0);
    assert.equal(routine.is_trigger, true);
    for (const role of ["anon", "authenticated"]) {
      assert.equal((await db.query("select has_function_privilege($1, $2::oid, 'EXECUTE') as allowed", [role, routine.oid])).rows[0].allowed, false);
      await db.exec(`set local role ${role}`);
      await rejectsSql(`select theretos_core.${routine.proname}()`, [], "42501");
      await db.exec("reset role");
    }
  }
});

isolatedTest("ledger events consolidate totals once and unique event keys reject duplicates atomically", async () => {
  await ledger("xp_ledger", 125, "xp-award");
  await ledger("tickets_ledger", 10, "tickets-award");
  await ledger("tickets_ledger", -4, "tickets-spent");
  for (const table of ["xp_ledger", "tickets_ledger"]) {
    const key = table === "xp_ledger" ? "xp-award" : "tickets-award";
    await rejectsSql(`insert into public.${table} (user_id, amount, reason, event_key) values ($1, 99, 'duplicate', $2)`, [USER, key], "23505");
    await db.query(`insert into public.${table} (user_id, amount, reason, event_key) values ($1, 99, 'retry', $2) on conflict (event_key) do nothing`, [USER, key]);
    await rejectsSql(`insert into public.${table} (user_id, amount, reason, event_key) values ($1, 99, 'other user duplicate', $2)`, [OTHER, key], "23505");
  }
  assert.deepEqual(await progress(), { xp_total: "125", tickets_balance: "6", level: 1, games_played: "0" });
  assert.equal((await db.query("select sum(amount)::text as balance from public.tickets_ledger where user_id = $1", [USER])).rows[0].balance, "6");
});

isolatedTest("negative balance, invalid ledger amounts and bigint overflow roll back the entire entry", async () => {
  await ledger("tickets_ledger", 10, "initial-credit");
  for (const amount of [-11, "-9223372036854775808", 0]) {
    await rejectsSql("insert into public.tickets_ledger (user_id, amount, reason, event_key) values ($1, $2, 'invalid', $3)", [USER, amount, `bad-${amount}`]);
  }
  for (const amount of [0, -1]) {
    await rejectsSql("insert into public.xp_ledger (user_id, amount, reason, event_key) values ($1, $2, 'invalid', $3)", [USER, amount, `bad-${amount}`]);
  }
  await ledger("tickets_ledger", -10, "exact-debit");
  await ledger("tickets_ledger", "9223372036854775807", "max-credit");
  await rejectsSql("insert into public.tickets_ledger (user_id, amount, reason, event_key) values ($1, 1, 'overflow', 'overflow')", [USER], "22003");
  assert.equal((await progress()).tickets_balance, "9223372036854775807");
  assert.equal((await db.query("select count(*)::int as count from public.tickets_ledger")).rows[0].count, 3);
});

isolatedTest("ledger UPDATE, DELETE and TRUNCATE are rejected even for the table owner", async () => {
  for (const table of ["xp_ledger", "tickets_ledger"]) {
    await ledger(table, 10, `${table}-immutable`);
    for (const sql of [`update public.${table} set amount = 100`, `delete from public.${table}`, `truncate public.${table}`]) {
      await rejectsSql(sql);
    }
  }
  await rejectsSql("delete from public.profiles where id = $1", [USER], ["23001", "23503"]);
  await rejectsSql("delete from public.player_progress where user_id = $1", [USER], ["23001", "23503"]);
  assert.deepEqual(await progress(), { xp_total: "10", tickets_balance: "10", level: 1, games_played: "0" });
});

isolatedTest("sessions validate once and terminal results cannot be edited, reset or removed", async () => {
  await validateSession();
  await db.query("update public.game_sessions set status = 'validated' where id = $1", [SESSION]);
  assert.equal((await progress()).games_played, "1");
  const session = (await db.query("select submitted_at, validated_at from public.game_sessions where id = $1", [SESSION])).rows[0];
  assert.ok(session.submitted_at && session.validated_at);
  for (const change of ["status = 'submitted'", "score = 999999", `user_id = '${OTHER}'`, "metrics = '{\"forged\":true}'"]) {
    await rejectsSql(`update public.game_sessions set ${change} where id = $1`, [SESSION]);
  }
  await rejectsSql("delete from public.game_sessions where id = $1", [SESSION]);
  await rejectsSql("truncate public.game_sessions cascade");
  assert.equal((await progress()).games_played, "1");
});

isolatedTest("session lifecycle rejects forged validation, negative results and non-object metrics", async () => {
  await rejectsSql("insert into public.game_sessions (user_id, game_slug, mode, status, expires_at) values ($1, 'bolas', 'practice', 'validated', now() + interval '1 hour')", [USER]);
  await rejectsSql("insert into public.game_sessions (user_id, game_slug, mode, expires_at) values ($1, 'tiro-perfecto', 'practice', now() + interval '1 hour')", [USER]);
  await startSession();
  await rejectsSql("update public.game_sessions set status = 'validated' where id = $1", [SESSION]);
  for (const [score, duration, metrics] of [[-1, 1000, "{}"], [1, -1, "{}"], [1, 1000, "[]"], [1, 1000, "null"]]) {
    await rejectsSql("update public.game_sessions set status = 'submitted', score = $2, duration_ms = $3, metrics = $4::jsonb where id = $1", [SESSION, score, duration, metrics]);
  }
  assert.equal((await progress()).games_played, "0");
});

isolatedTest("session rewards require own validated session and cannot be repeated with a different key", async () => {
  await startSession();
  for (const table of ["xp_ledger", "tickets_ledger"]) {
    await rejectsSql(`insert into public.${table} (user_id, amount, reason, event_key, game_session_id) values ($1, 10, 'early', $2, $3)`, [USER, `${table}-early`, SESSION]);
  }
  await db.query("update public.game_sessions set status = 'submitted', score = 25, duration_ms = 1000 where id = $1", [SESSION]);
  await db.query("update public.game_sessions set status = 'validated' where id = $1", [SESSION]);
  for (const table of ["xp_ledger", "tickets_ledger"]) {
    await rejectsSql(`insert into public.${table} (user_id, amount, reason, event_key, game_session_id) values ($1, 10, 'wrong owner', $2, $3)`, [OTHER, `${table}-wrong-owner`, SESSION], "23503");
    await ledger(table, 10, `${table}-award`, USER, SESSION);
    await rejectsSql(`insert into public.${table} (user_id, amount, reason, event_key, game_session_id) values ($1, 10, 'replay', $2, $3)`, [USER, `${table}-changed-key`, SESSION], "23505");
  }
  assert.deepEqual(await progress(), { xp_total: "10", tickets_balance: "10", level: 1, games_played: "1" });
});

test("migration reapply preserves data and clears accidental table, column and function grants", async () => {
  await validateSession();
  await ledger("xp_ledger", 55, "persistent-xp", USER, SESSION);
  await ledger("tickets_ledger", 7, "persistent-tickets", USER, SESSION);
  await db.exec(`
    update public.games set status = 'disabled' where slug = 'bolas';
    grant update on public.player_progress to public;
    grant insert (user_id, amount, reason, event_key) on public.tickets_ledger to authenticated;
    grant select (amount) on public.xp_ledger to anon;
    grant execute on function theretos_core.create_player_progress() to public;
    grant usage on schema theretos_core to public;
  `);
  await db.exec(migration);
  await db.exec(migration);
  assert.deepEqual(await progress(), { xp_total: "55", tickets_balance: "7", level: 1, games_played: "1" });
  assert.equal((await db.query("select status from public.games where slug = 'bolas'")).rows[0].status, "disabled");
  const checks = await db.query(`select
    has_table_privilege('authenticated', 'public.player_progress', 'UPDATE') as table_write,
    has_any_column_privilege('authenticated', 'public.tickets_ledger', 'INSERT') as column_write,
    has_any_column_privilege('anon', 'public.xp_ledger', 'SELECT') as private_read,
    has_function_privilege('authenticated', 'theretos_core.create_player_progress()', 'EXECUTE') as execute,
    has_schema_privilege('authenticated', 'theretos_core', 'USAGE') as schema_usage`);
  assert.deepEqual(checks.rows[0], { table_write: false, column_write: false, private_read: false, execute: false, schema_usage: false });
});

test("migration fails atomically for inherited write grants without silently changing role membership", async () => {
  await db.exec("create role inherited_core_writer; grant inherited_core_writer to authenticated; grant update on public.player_progress to inherited_core_writer");
  await assert.rejects(db.exec(migration), /Privilegio UPDATE inesperado/);
  await db.exec("rollback");
  assert.equal((await db.query("select pg_has_role('authenticated', 'inherited_core_writer', 'MEMBER') as member")).rows[0].member, true);
  assert.deepEqual(await progress(), { xp_total: "55", tickets_balance: "7", level: 1, games_played: "1" });
  await db.exec("revoke inherited_core_writer from authenticated; revoke update on public.player_progress from inherited_core_writer; drop role inherited_core_writer");
});

test("migration refuses an unrecognized existing table and preserves its data", async () => {
  await db.exec("alter table public.games rename to preserved_core_games; create table public.games (marker text); insert into public.games values ('keep me')");
  try {
    await assert.rejects(db.exec(migration), /Conflicto con public.games/);
    await db.exec("rollback");
    assert.deepEqual((await db.query("select marker from public.games")).rows, [{ marker: "keep me" }]);
    assert.equal((await db.query("select count(*)::int as count from public.preserved_core_games")).rows[0].count, 7);
  } finally {
    // Only the disposable in-memory fixture is removed, never a hosted database.
    await db.exec("drop table public.games; alter table public.preserved_core_games rename to games");
  }
});

test("migration refuses removed amount checks or session-owner foreign keys", async () => {
  for (const [table, constraint] of [["xp_ledger", "xp_ledger_amount_check"], ["tickets_ledger", "tickets_ledger_session_user_fk"]]) {
    await db.exec(`begin; alter table public.${table} drop constraint ${constraint}`);
    try { await assert.rejects(db.exec(migration), /Estructura Core alterada/); }
    finally { await db.exec("rollback"); }
    assert.equal((await db.query("select count(*)::int as count from pg_constraint where conname = $1", [constraint])).rows[0].count, 1);
  }
});

test("unrelated relation colliding with a required unique index aborts initial migration atomically", async () => {
  const fresh = new PGlite();
  try {
    await fresh.exec(bootstrap);
    await fresh.exec("create table public.xp_ledger_session_unique (marker text); insert into public.xp_ledger_session_unique values ('unrelated data')");
    await assert.rejects(fresh.exec(migration), (error) => error.code === "42P07");
    await fresh.exec("rollback");
    assert.deepEqual((await fresh.query("select marker from public.xp_ledger_session_unique")).rows, [{ marker: "unrelated data" }]);
    assert.equal((await fresh.query("select to_regclass('public.games') as core_table")).rows[0].core_table, null);
  } finally { await fresh.close(); }
});
