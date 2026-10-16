import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { GAME_SESSION_TTL_MS, handleStartGameSession } from "../lib/games/start-session.ts";

// Exercise real Supabase HTTP construction without accessing a deployed project.
// Database constraints and RLS are covered separately by the existing Core tests.
const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";
const GAME_ID = "33333333-3333-4333-8333-333333333333";
const SESSION_ID = "44444444-4444-4444-8444-444444444444";
const GAME = { id: GAME_ID, slug: "memory-match", status: "available" };
const VALID_INPUT = { game_slug: GAME.slug, mode: "practice" };
const ORIGIN = "https://theretos.example.invalid";
const INTERNAL_DETAIL = "private database diagnostic and secret configuration";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function startRequest(body = VALID_INPUT, { headers = {}, method = "POST", rawBody } = {}) {
  return new Request(ORIGIN + "/api/game-sessions/start", {
    method,
    headers: { "Content-Type": "application/json", Origin: ORIGIN, ...headers },
    ...(method === "GET" || method === "HEAD" ? {} : { body: rawBody ?? JSON.stringify(body) }),
  });
}

function harness({
  authenticated = true,
  userId = USER_ID,
  authResponse,
  gameResponse,
  sessionResponse,
  failInsert = false,
  failWriterCreation = false,
  failSessionCreation = false,
  extraSessionFields = {},
} = {}) {
  const state = { requests: [], sessionCreations: 0, writerCreations: 0 };
  const auth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };
  function interceptedFetch(clientKind) {
    return async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      const body = request.method === "POST" ? await request.json() : null;
      state.requests.push({ clientKind, url, method: request.method, headers: request.headers, body });
      if (clientKind === "session" && url.pathname === "/auth/v1/user") {
        return authResponse ?? json({
          id: userId,
          aud: "authenticated",
          role: "authenticated",
          email: "player@example.invalid",
          app_metadata: {},
          user_metadata: {},
          created_at: "2026-01-01T00:00:00Z",
        });
      }
      if (clientKind === "session" && url.pathname === "/rest/v1/games") {
        return gameResponse ?? json([GAME]);
      }
      if (clientKind === "writer" && url.pathname === "/rest/v1/game_sessions") {
        if (failInsert) throw new TypeError(INTERNAL_DETAIL);
        return sessionResponse ?? json({
          id: SESSION_ID,
          game_id: body.game_id,
          status: body.status,
          started_at: body.started_at,
          expires_at: body.expires_at,
          ...extraSessionFields,
        }, 201);
      }
      throw new Error("Unexpected Supabase request: " + clientKind + " " + request.method + " " + url.pathname);
    };
  }
  const dependencies = {
    createSessionClient: async () => {
      state.sessionCreations += 1;
      if (failSessionCreation) throw new Error(INTERNAL_DETAIL);
      return createClient("https://supabase.example.invalid", "test-anon-key", {
        auth,
        global: {
          headers: authenticated ? { Authorization: "Bearer test-player-session-token" } : {},
          fetch: interceptedFetch("session"),
        },
      });
    },
    createWriterClient: () => {
      state.writerCreations += 1;
      if (failWriterCreation) throw new Error(INTERNAL_DETAIL);
      return createClient("https://supabase.example.invalid", "test-server-service-role-key", {
        auth,
        global: { fetch: interceptedFetch("writer") },
      });
    },
  };
  return { state, dependencies };
}

async function assertError(response, status, code) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(body.error, code);
  assert.doesNotMatch(JSON.stringify(body), /private database diagnostic|secret configuration|test-server-service-role-key|test-player-session-token/);
  return body;
}

function assertNoInsert(state) {
  assert.equal(state.writerCreations, 0);
  assert.equal(state.requests.filter(({ method }) => method === "POST").length, 0);
}

for (const mode of ["practice", "competitive"]) {
  test("starts an available game in Core v1 mode " + mode + " using the authenticated identity", async () => {
    const { state, dependencies } = harness();
    const before = Date.now();
    const response = await handleStartGameSession(startRequest({ ...VALID_INPUT, mode }), dependencies);
    const after = Date.now();
    assert.equal(response.status, 201);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(state.requests.map(({ clientKind, method, url }) => [clientKind, method, url.pathname]), [
      ["session", "GET", "/auth/v1/user"],
      ["session", "GET", "/rest/v1/games"],
      ["writer", "POST", "/rest/v1/game_sessions"],
    ]);
    assert.equal(state.sessionCreations, 1);
    assert.equal(state.writerCreations, 1);
    const [, lookup, insert] = state.requests;
    assert.equal(lookup.url.searchParams.get("select"), "id,slug,status");
    assert.equal(lookup.url.searchParams.get("slug"), "eq." + GAME.slug);
    assert.equal(lookup.headers.get("accept-profile"), "public");
    assert.equal(lookup.headers.get("authorization"), "Bearer test-player-session-token");
    assert.equal(insert.headers.get("authorization"), "Bearer test-server-service-role-key");
    assert.equal(insert.headers.get("cookie"), null);
    assert.equal(insert.headers.get("content-profile"), "public");
    assert.equal(insert.url.searchParams.get("select"), "id,game_id,status,started_at,expires_at");
    assert.match(insert.headers.get("prefer"), /return=representation/);
    assert.deepEqual(Object.keys(insert.body).sort(), ["user_id", "game_id", "mode", "status", "started_at", "expires_at"].sort());
    assert.equal(insert.body.user_id, USER_ID);
    assert.equal(insert.body.game_id, GAME_ID);
    assert.equal(insert.body.mode, mode);
    assert.equal(insert.body.status, "started");
    const startedAt = Date.parse(insert.body.started_at);
    assert.ok(startedAt >= before && startedAt <= after);
    assert.equal(GAME_SESSION_TTL_MS, 15 * 60 * 1000);
    assert.equal(Date.parse(insert.body.expires_at) - startedAt, GAME_SESSION_TTL_MS);
    assert.deepEqual(await response.json(), {
      id: SESSION_ID,
      game_id: GAME_ID,
      game_slug: GAME.slug,
      status: "started",
      started_at: insert.body.started_at,
      expires_at: insert.body.expires_at,
    });
  });
}

test("derives a different player's identity from verified auth.getUser data", async () => {
  const { state, dependencies } = harness({ userId: OTHER_USER_ID });
  const response = await handleStartGameSession(startRequest(), dependencies);
  assert.equal(response.status, 201);
  assert.equal(state.requests.at(-1).body.user_id, OTHER_USER_ID);
});

test("does not initialize a writer or query games without a session", async () => {
  const { state, dependencies } = harness({ authenticated: false });
  await assertError(await handleStartGameSession(startRequest(), dependencies), 401, "UNAUTHENTICATED");
  assert.equal(state.requests.length, 0);
  assertNoInsert(state);
});

for (const status of [401, 403]) {
  test("rejects an auth token refused with HTTP " + status, async () => {
    const { state, dependencies } = harness({ authResponse: json({ code: "bad_jwt", message: INTERNAL_DETAIL }, status) });
    await assertError(await handleStartGameSession(startRequest(), dependencies), 401, "UNAUTHENTICATED");
    assert.deepEqual(state.requests.map(({ url }) => url.pathname), ["/auth/v1/user"]);
    assertNoInsert(state);
  });
}

test("an unexpected authentication failure returns a generic service error", async () => {
  const { state, dependencies } = harness({ authResponse: json({ code: "unexpected_failure", message: INTERNAL_DETAIL }, 400) });
  await assertError(await handleStartGameSession(startRequest(), dependencies), 503, "START_UNAVAILABLE");
  assertNoInsert(state);
});

test("a missing game never initializes the privileged writer", async () => {
  const { state, dependencies } = harness({ gameResponse: json([]) });
  await assertError(await handleStartGameSession(startRequest(), dependencies), 404, "GAME_NOT_FOUND");
  assertNoInsert(state);
});

for (const status of ["coming-soon", "disabled"]) {
  test("does not create sessions for a game with status " + status, async () => {
    const { state, dependencies } = harness({ gameResponse: json([{ ...GAME, status }]) });
    await assertError(await handleStartGameSession(startRequest(), dependencies), 409, "GAME_UNAVAILABLE");
    assertNoInsert(state);
  });
}

for (const mode of ["ranked", "tournament", "Practice", "", null, 1]) {
  test("rejects incompatible mode " + JSON.stringify(mode), async () => {
    const { state, dependencies } = harness();
    await assertError(await handleStartGameSession(startRequest({ ...VALID_INPUT, mode }), dependencies), 400, "INVALID_MODE");
    assertNoInsert(state);
  });
}

for (const [field, value] of Object.entries({
  user_id: OTHER_USER_ID,
  game_id: "55555555-5555-4555-8555-555555555555",
  score: 9000,
  result: { won: true },
  results: { score: 9000 },
  metrics: { duration_ms: 1 },
  status: "validated",
  started_at: "2020-01-01T00:00:00Z",
  expires_at: "2099-01-01T00:00:00Z",
  xp: 9999,
  tickets: 9999,
})) {
  test("rejects client-supplied " + field + " without creating a session", async () => {
    const { state, dependencies } = harness();
    await assertError(await handleStartGameSession(startRequest({ ...VALID_INPUT, [field]: value }), dependencies), 400, "INVALID_REQUEST");
    assertNoInsert(state);
  });
}

for (const game_slug of ["", "MixedCase", "two words", "../games", "slug,other", "a".repeat(101), null, 123]) {
  test("rejects unsafe or invalid slug " + JSON.stringify(game_slug), async () => {
    const { state, dependencies } = harness();
    await assertError(await handleStartGameSession(startRequest({ ...VALID_INPUT, game_slug }), dependencies), 400, "INVALID_REQUEST");
    assertNoInsert(state);
  });
}

for (const body of [null, [], "memory-match", 42, { mode: "practice" }]) {
  test("rejects an invalid request object " + JSON.stringify(body), async () => {
    const { state, dependencies } = harness();
    await assertError(await handleStartGameSession(startRequest(body), dependencies), 400, "INVALID_REQUEST");
    assertNoInsert(state);
  });
}

test("rejects malformed JSON", async () => {
  const { state, dependencies } = harness();
  await assertError(await handleStartGameSession(startRequest(undefined, { rawBody: "{" }), dependencies), 400, "INVALID_REQUEST");
  assertNoInsert(state);
});

test("rejects non-JSON media types", async () => {
  const { state, dependencies } = harness();
  await assertError(await handleStartGameSession(startRequest(undefined, { headers: { "Content-Type": "text/plain" } }), dependencies), 415, "INVALID_REQUEST");
  assertNoInsert(state);
});

test("accepts JSON with a charset and same-origin metadata", async () => {
  const { dependencies } = harness();
  const response = await handleStartGameSession(startRequest(undefined, {
    headers: { "Content-Type": "application/json; charset=utf-8", "Sec-Fetch-Site": "same-origin" },
  }), dependencies);
  assert.equal(response.status, 201);
});

for (const headers of [{ Origin: "https://attacker.example.invalid" }, { Origin: "null" }, { "Sec-Fetch-Site": "cross-site" }]) {
  test("rejects cross-origin request metadata " + JSON.stringify(headers), async () => {
    const { state, dependencies } = harness();
    await assertError(await handleStartGameSession(startRequest(undefined, { headers }), dependencies), 403, "INVALID_REQUEST");
    assertNoInsert(state);
  });
}

test("allows an authenticated server caller with no Origin header", async () => {
  const { dependencies } = harness();
  const request = startRequest();
  request.headers.delete("origin");
  assert.equal((await handleStartGameSession(request, dependencies)).status, 201);
});

test("refuses methods other than POST", async () => {
  const { state, dependencies } = harness();
  await assertError(await handleStartGameSession(startRequest(undefined, { method: "GET" }), dependencies), 405, "INVALID_REQUEST");
  assertNoInsert(state);
});

test("enforces the request size limit using actual UTF-8 bytes", async () => {
  const { state, dependencies } = harness();
  const body = JSON.stringify({ ...VALID_INPUT, game_slug: "é".repeat(2100) });
  assert.ok(body.length < 4096);
  assert.ok(Buffer.byteLength(body) > 4096);
  await assertError(await handleStartGameSession(startRequest(undefined, { rawBody: body }), dependencies), 413, "INVALID_REQUEST");
  assertNoInsert(state);
});

test("never leaks unexpected database columns into the successful response", async () => {
  const { state, dependencies } = harness({ extraSessionFields: {
    user_id: USER_ID,
    score: 12345,
    metrics: { internal: INTERNAL_DETAIL },
    metadata: { secret: INTERNAL_DETAIL },
  } });
  const response = await handleStartGameSession(startRequest(), dependencies);
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.deepEqual(Object.keys(body).sort(), ["id", "game_id", "game_slug", "status", "started_at", "expires_at"].sort());
  assert.doesNotMatch(JSON.stringify(body), /user_id|score|metrics|metadata|private database diagnostic/);
  assert.equal(state.requests.filter(({ method }) => method === "POST").length, 1);
});

test("a database error during game lookup cannot become an insert", async () => {
  const { state, dependencies } = harness({ gameResponse: json({ code: "42501", message: INTERNAL_DETAIL }, 403) });
  await assertError(await handleStartGameSession(startRequest(), dependencies), 503, "START_UNAVAILABLE");
  assertNoInsert(state);
});

for (const [name, sessionResponse] of [
  ["database refusal", json({ code: "42501", message: INTERNAL_DETAIL }, 403)],
  ["missing inserted row", json(null)],
]) {
  test("does not report success for " + name, async () => {
    const { state, dependencies } = harness({ sessionResponse });
    await assertError(await handleStartGameSession(startRequest(), dependencies), 503, "START_UNAVAILABLE");
    assert.equal(state.requests.filter(({ method }) => method === "POST").length, 1);
  });
}

test("a network failure during insert is not retried or reported as a successful start", async () => {
  const { state, dependencies } = harness({ failInsert: true });
  await assertError(await handleStartGameSession(startRequest(), dependencies), 503, "START_UNAVAILABLE");
  assert.equal(state.writerCreations, 1);
  assert.equal(state.requests.filter(({ method }) => method === "POST").length, 1);
});

test("unavailable server writer configuration returns a generic error", async () => {
  const { state, dependencies } = harness({ failWriterCreation: true });
  await assertError(await handleStartGameSession(startRequest(), dependencies), 503, "START_UNAVAILABLE");
  assert.equal(state.writerCreations, 1);
  assert.equal(state.requests.filter(({ method }) => method === "POST").length, 0);
});

test("unavailable session client configuration returns a generic error", async () => {
  const { state, dependencies } = harness({ failSessionCreation: true });
  await assertError(await handleStartGameSession(startRequest(), dependencies), 503, "START_UNAVAILABLE");
  assert.equal(state.requests.length, 0);
  assertNoInsert(state);
});
