import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { readOwnPlayerProgress } from "../lib/supabase/player-progress.ts";

// Exercise the real Supabase client with intercepted HTTP requests; no live database.
// Deployed RLS policies are outside the scope of these tests.
const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";
const INITIAL_PROGRESS = { level: 1, xp_total: 0, tickets_balance: 0, games_played: 0 };
const PROGRESS_COLUMNS = "level,xp_total,tickets_balance,games_played";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function clientWithResponses({
  authenticated = true,
  userId = USER_ID,
  authResponse,
  progressResponse,
  failProgressRequest = false,
} = {}) {
  const requests = [];
  const client = createClient("https://supabase.example.invalid", "test-anon-key", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: authenticated ? { Authorization: "Bearer test-session-token" } : {},
      fetch: async (input, init) => {
        const request = new Request(input, init);
        const url = new URL(request.url);
        requests.push({ url, method: request.method, headers: request.headers });
        if (url.pathname === "/auth/v1/user") {
          return authResponse ?? json({
            id: userId,
            aud: "authenticated",
            role: "authenticated",
            email: "ana@example.invalid",
            app_metadata: {},
            user_metadata: {},
            created_at: "2026-01-01T00:00:00Z",
          });
        }
        if (url.pathname === "/rest/v1/player_progress") {
          if (failProgressRequest) throw new TypeError("Simulated offline connection");
          return progressResponse ?? json([INITIAL_PROGRESS]);
        }
        throw new Error(`Unexpected request: ${request.method} ${url.pathname}`);
      },
    },
  });
  return { client, requests };
}

test("reads the new account's real initial progress using the verified session", async () => {
  const { client, requests } = clientWithResponses();
  const result = await readOwnPlayerProgress(client);

  assert.deepEqual(result, { status: "ready", userId: USER_ID, progress: INITIAL_PROGRESS });
  assert.deepEqual(requests.map(({ method }) => method), ["GET", "GET"]);
  assert.equal(requests[0].url.pathname, "/auth/v1/user");
  assert.equal(requests[0].headers.get("authorization"), "Bearer test-session-token");
  const read = requests[1];
  assert.equal(read.url.pathname, "/rest/v1/player_progress");
  assert.deepEqual([...read.url.searchParams.entries()], [
    ["select", PROGRESS_COLUMNS],
    ["user_id", `eq.${USER_ID}`],
  ]);
  assert.equal(read.headers.get("accept-profile"), "public");
  assert.equal(read.headers.get("authorization"), "Bearer test-session-token");
});

test("uses the current authenticated UID and returns the stored nonzero counters", async () => {
  const progress = { level: 4, xp_total: 1250, tickets_balance: 23, games_played: 17 };
  const { client, requests } = clientWithResponses({
    userId: OTHER_USER_ID,
    progressResponse: json([progress]),
  });

  assert.deepEqual(await readOwnPlayerProgress(client), {
    status: "ready",
    userId: OTHER_USER_ID,
    progress,
  });
  assert.equal(requests[1].url.searchParams.get("user_id"), `eq.${OTHER_USER_ID}`);
  assert.ok(requests.every(({ method }) => method === "GET"));
});

test("an absent session never queries player_progress", async () => {
  const { client, requests } = clientWithResponses({ authenticated: false });
  assert.deepEqual(await readOwnPlayerProgress(client), { status: "unauthenticated" });
  assert.equal(requests.length, 0);
});

for (const status of [401, 403]) {
  test(`an authentication rejection (${status}) never queries player_progress`, async () => {
    const { client, requests } = clientWithResponses({
      authResponse: json({ code: "bad_jwt", message: "JWT expired" }, status),
    });
    assert.deepEqual(await readOwnPlayerProgress(client), { status: "unauthenticated" });
    assert.deepEqual(requests.map(({ url }) => url.pathname), ["/auth/v1/user"]);
  });
}

test("an unexpected authentication error does not become anonymous or load counters", async () => {
  const { client, requests } = clientWithResponses({
    authResponse: json({ code: "unexpected_failure", message: "test-only internal auth diagnostic" }, 422),
  });
  assert.deepEqual(await readOwnPlayerProgress(client), { status: "error" });
  assert.deepEqual(requests.map(({ url }) => url.pathname), ["/auth/v1/user"]);
});

for (const { name, status, body, expected } of [
  { name: "the session expires during the read", status: 401, body: { code: "PGRST301", message: "JWT expired" }, expected: "unauthenticated" },
  { name: "access is denied", status: 403, body: { code: "42501", message: "test-only internal database diagnostic" }, expected: "error" },
  { name: "the database rejects the query", status: 400, body: { code: "42703", message: "test-only internal database diagnostic" }, expected: "error" },
  { name: "no progress row exists", status: 200, body: [], expected: "missing" },
  { name: "the database returns null", status: 200, body: null, expected: "missing" },
  { name: "the database returns multiple rows", status: 200, body: [INITIAL_PROGRESS, INITIAL_PROGRESS], expected: "error" },
]) {
  test(`does not invent counters when ${name}`, async () => {
    const { client, requests } = clientWithResponses({ progressResponse: json(body, status) });
    assert.deepEqual(await readOwnPlayerProgress(client), { status: expected });
    assert.deepEqual(requests.map(({ method }) => method), ["GET", "GET"]);
  });
}

test("an offline progress request returns an error without demo fallback", async () => {
  const { client, requests } = clientWithResponses({ failProgressRequest: true });
  assert.deepEqual(await readOwnPlayerProgress(client), { status: "error" });
  assert.ok(requests.every(({ method }) => method === "GET"));
  assert.equal(requests[0].url.pathname, "/auth/v1/user");
  assert.ok(requests.slice(1).every(({ url }) => url.pathname === "/rest/v1/player_progress"));
  assert.ok(requests.length >= 2);
});

test("rejects missing, negative, fractional, string, and unsafe progress values", async () => {
  const invalidRows = [
    {},
    { ...INITIAL_PROGRESS, level: 0 },
    ...Object.keys(INITIAL_PROGRESS).flatMap((field) => [
      { ...INITIAL_PROGRESS, [field]: -1 },
      { ...INITIAL_PROGRESS, [field]: 1.5 },
      { ...INITIAL_PROGRESS, [field]: "8" },
      { ...INITIAL_PROGRESS, [field]: null },
      { ...INITIAL_PROGRESS, [field]: Number.MAX_SAFE_INTEGER + 1 },
    ]),
  ];

  for (const row of invalidRows) {
    const { client } = clientWithResponses({ progressResponse: json([row]) });
    assert.deepEqual(await readOwnPlayerProgress(client), { status: "error" }, JSON.stringify(row));
  }
});
