import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { handleSubmitGameSession } from "../lib/games/submit-session.ts";

// Real Supabase query construction with local HTTP responses; no deployed project.
// The atomic PATCH model exercises races separately from the Core SQL tests.
const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";
const SESSION_ID = "aaaa4444-4444-4444-8444-444444444444";
const ORIGIN = "https://theretos.example.invalid";
const INTERNAL_DETAIL = "private database diagnostic and secret configuration";
const VALID_INPUT = { session_id: SESSION_ID, score: 120, duration_ms: 1500 };
const SAFE_COLUMNS = "id,status,score,duration_ms,submitted_at";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function submitRequest(body = VALID_INPUT, { headers = {}, method = "POST", rawBody } = {}) {
  return new Request(ORIGIN + "/api/game-sessions/submit", {
    method,
    headers: { "Content-Type": "application/json", Origin: ORIGIN, ...headers },
    ...(method === "GET" || method === "HEAD" ? {} : { body: rawBody ?? JSON.stringify(body) }),
  });
}

function harness({
  authenticated = true,
  userId = USER_ID,
  authResponse,
  lookupResponse,
  updateResponse,
  initialSession = {},
  extraUpdatedFields = {},
  failSessionCreation = false,
  failWriterCreation = false,
  failUpdate = false,
  onWriterCreation,
  synchronizeLookups = false,
} = {}) {
  const state = {
    requests: [],
    sessionCreations: 0,
    writerCreations: 0,
    updates: 0,
    currentSession: {
      id: SESSION_ID,
      user_id: userId,
      status: "started",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      ...initialSession,
    },
  };
  const auth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };
  let releaseLookups;
  let pendingLookups = 0;
  const lookupBarrier = new Promise((resolve) => { releaseLookups = resolve; });

  function interceptedFetch(clientKind) {
    return async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      const body = request.method === "PATCH" ? await request.json() : null;
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
      if (clientKind === "session" && request.method === "GET" && url.pathname === "/rest/v1/game_sessions") {
        const snapshot = { ...state.currentSession };
        if (synchronizeLookups) {
          pendingLookups += 1;
          if (pendingLookups === 2) releaseLookups();
          await lookupBarrier;
        }
        return lookupResponse ?? json([snapshot]);
      }
      if (clientKind === "writer" && request.method === "PATCH" && url.pathname === "/rest/v1/game_sessions") {
        if (failUpdate) throw new TypeError(INTERNAL_DETAIL);
        if (updateResponse) return updateResponse;

        // Match the actual PostgREST filters, with no await between match and update.
        const session = state.currentSession;
        const expiresFilter = url.searchParams.get("expires_at");
        const matches = url.searchParams.get("id") === "eq." + session.id
          && url.searchParams.get("user_id") === "eq." + session.user_id
          && url.searchParams.get("status") === "eq." + session.status
          && expiresFilter?.startsWith("gt.")
          && Date.parse(session.expires_at) > Date.parse(expiresFilter.slice(3));
        if (!matches) return json([]);
        state.currentSession = { ...session, ...body, submitted_at: new Date().toISOString() };
        state.updates += 1;
        return json([{
          id: session.id,
          status: state.currentSession.status,
          score: state.currentSession.score,
          duration_ms: state.currentSession.duration_ms,
          submitted_at: state.currentSession.submitted_at,
          ...extraUpdatedFields,
        }]);
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
      onWriterCreation?.();
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

function assertNoUpdate(state) {
  assert.equal(state.writerCreations, 0);
  assert.equal(state.requests.filter(({ method }) => method === "PATCH").length, 0);
  assert.equal(state.updates, 0);
}

test("submits only permitted columns for the verified owner using separate session and writer credentials", async () => {
  const { state, dependencies } = harness();
  const before = Date.now();
  const response = await handleSubmitGameSession(submitRequest(), dependencies);
  const after = Date.now();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(state.requests.map(({ clientKind, method, url }) => [clientKind, method, url.pathname]), [
    ["session", "GET", "/auth/v1/user"],
    ["session", "GET", "/rest/v1/game_sessions"],
    ["writer", "PATCH", "/rest/v1/game_sessions"],
  ]);
  const [, lookup, update] = state.requests;
  assert.equal(lookup.url.searchParams.get("select"), "id,user_id,status,expires_at");
  assert.equal(lookup.url.searchParams.get("id"), "eq." + SESSION_ID);
  assert.equal(lookup.url.searchParams.get("user_id"), "eq." + USER_ID);
  assert.equal(lookup.headers.get("accept-profile"), "public");
  assert.equal(lookup.headers.get("authorization"), "Bearer test-player-session-token");
  assert.equal(update.headers.get("authorization"), "Bearer test-server-service-role-key");
  assert.equal(update.headers.get("cookie"), null);
  assert.equal(update.headers.get("content-profile"), "public");
  assert.equal(update.url.searchParams.get("select"), SAFE_COLUMNS);
  assert.equal(update.url.searchParams.get("id"), "eq." + SESSION_ID);
  assert.equal(update.url.searchParams.get("user_id"), "eq." + USER_ID);
  assert.equal(update.url.searchParams.get("status"), "eq.started");
  const expiresFilter = update.url.searchParams.get("expires_at");
  assert.ok(expiresFilter.startsWith("gt."));
  const checkedAt = Date.parse(expiresFilter.slice(3));
  assert.ok(checkedAt >= before && checkedAt <= after);
  assert.match(update.headers.get("prefer"), /return=representation/);
  assert.deepEqual(update.body, { status: "submitted", score: 120, duration_ms: 1500, metrics: {} });
  assert.equal(state.updates, 1);
  assert.deepEqual(await response.json(), {
    id: SESSION_ID,
    status: "submitted",
    score: 120,
    duration_ms: 1500,
    submitted_at: state.currentSession.submitted_at,
  });
});

test("derives ownership from auth.getUser for a different verified player", async () => {
  const { state, dependencies } = harness({ userId: OTHER_USER_ID });
  assert.equal((await handleSubmitGameSession(submitRequest(), dependencies)).status, 200);
  for (const { url } of state.requests.filter(({ url }) => url.pathname === "/rest/v1/game_sessions")) {
    assert.equal(url.searchParams.get("user_id"), "eq." + OTHER_USER_ID);
  }
});

test("normalizes a canonical uppercase UUID before querying and updating", async () => {
  const { state, dependencies } = harness();
  assert.equal((await handleSubmitGameSession(submitRequest({ ...VALID_INPUT, session_id: SESSION_ID.toUpperCase() }), dependencies)).status, 200);
  assert.equal(state.requests.at(-1).url.searchParams.get("id"), "eq." + SESSION_ID);
});

test("accepts zero scores and durations with JSON object metrics", async () => {
  const metrics = { moves: 0, won: false, rounds: [1, 2], extra: { description: null } };
  const { state, dependencies } = harness();
  const response = await handleSubmitGameSession(submitRequest({ ...VALID_INPUT, score: 0, duration_ms: 0, metrics }), dependencies);
  assert.equal(response.status, 200);
  assert.deepEqual(state.requests.at(-1).body, { status: "submitted", score: 0, duration_ms: 0, metrics });
});

test("accepts integers up to the JavaScript safe integer boundary", async () => {
  const { dependencies } = harness();
  const response = await handleSubmitGameSession(submitRequest({ ...VALID_INPUT, score: Number.MAX_SAFE_INTEGER, duration_ms: Number.MAX_SAFE_INTEGER }), dependencies);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.score, Number.MAX_SAFE_INTEGER);
  assert.equal(body.duration_ms, Number.MAX_SAFE_INTEGER);
});

test("does not query sessions or create a writer without authentication", async () => {
  const { state, dependencies } = harness({ authenticated: false });
  await assertError(await handleSubmitGameSession(submitRequest(), dependencies), 401, "UNAUTHENTICATED");
  assert.equal(state.requests.length, 0);
  assertNoUpdate(state);
});

for (const status of [401, 403]) {
  test("rejects a session token refused with HTTP " + status, async () => {
    const { state, dependencies } = harness({ authResponse: json({ code: "bad_jwt", message: INTERNAL_DETAIL }, status) });
    await assertError(await handleSubmitGameSession(submitRequest(), dependencies), 401, "UNAUTHENTICATED");
    assert.deepEqual(state.requests.map(({ url }) => url.pathname), ["/auth/v1/user"]);
    assertNoUpdate(state);
  });
}

test("unexpected authentication errors return a generic service error", async () => {
  const { state, dependencies } = harness({ authResponse: json({ code: "unexpected_failure", message: INTERNAL_DETAIL }, 400) });
  await assertError(await handleSubmitGameSession(submitRequest(), dependencies), 503, "SUBMIT_UNAVAILABLE");
  assertNoUpdate(state);
});

test("a missing session cannot initialize the privileged writer", async () => {
  const { state, dependencies } = harness({ lookupResponse: json([]) });
  await assertError(await handleSubmitGameSession(submitRequest(), dependencies), 404, "SESSION_NOT_FOUND");
  assertNoUpdate(state);
});

test("rejects another player's session even if a lookup unexpectedly returns it", async () => {
  const { state, dependencies } = harness({ initialSession: { user_id: OTHER_USER_ID } });
  await assertError(await handleSubmitGameSession(submitRequest(), dependencies), 404, "SESSION_NOT_FOUND");
  assertNoUpdate(state);
});

for (const status of ["submitted", "validated", "rejected", "expired"]) {
  test("a session in state " + status + " cannot be submitted", async () => {
    const { state, dependencies } = harness({ initialSession: { status } });
    await assertError(await handleSubmitGameSession(submitRequest(), dependencies), 409, "SESSION_NOT_STARTED");
    assertNoUpdate(state);
  });
}

test("an expired session cannot initialize the writer", async () => {
  const { state, dependencies } = harness({ initialSession: { expires_at: "2020-01-01T00:00:00Z" } });
  await assertError(await handleSubmitGameSession(submitRequest(), dependencies), 409, "SESSION_EXPIRED");
  assertNoUpdate(state);
});

test("the expiration boundary is exclusive", async (t) => {
  const now = Date.parse("2026-10-15T12:00:00Z");
  t.mock.timers.enable({ apis: ["Date"], now });
  const { state, dependencies } = harness({ initialSession: { expires_at: new Date(now).toISOString() } });
  await assertError(await handleSubmitGameSession(submitRequest(), dependencies), 409, "SESSION_EXPIRED");
  assertNoUpdate(state);
});

test("a replay cannot update a session already submitted by the first request", async () => {
  const { state, dependencies } = harness();
  assert.equal((await handleSubmitGameSession(submitRequest(), dependencies)).status, 200);
  await assertError(await handleSubmitGameSession(submitRequest(), dependencies), 409, "SESSION_NOT_STARTED");
  assert.equal(state.writerCreations, 1);
  assert.equal(state.updates, 1);
});

test("two stale started reads allow only one atomic submission", async () => {
  const { state, dependencies } = harness({ synchronizeLookups: true });
  const responses = await Promise.all([
    handleSubmitGameSession(submitRequest(), dependencies),
    handleSubmitGameSession(submitRequest(), dependencies),
  ]);
  assert.deepEqual(responses.map(({ status }) => status).sort(), [200, 409]);
  await assertError(responses.find(({ status }) => status === 409), 409, "SESSION_NOT_SUBMITTABLE");
  assert.equal(state.writerCreations, 2);
  assert.equal(state.requests.filter(({ method }) => method === "PATCH").length, 2);
  assert.equal(state.updates, 1);
});

test("expiration between lookup and PATCH is checked with a fresh server timestamp", async (t) => {
  const now = Date.parse("2026-10-15T12:00:00Z");
  t.mock.timers.enable({ apis: ["Date"], now });
  const { state, dependencies } = harness({
    initialSession: { expires_at: new Date(now + 1000).toISOString() },
    onWriterCreation: () => t.mock.timers.setTime(now + 1000),
  });
  await assertError(await handleSubmitGameSession(submitRequest(), dependencies), 409, "SESSION_NOT_SUBMITTABLE");
  assert.equal(state.writerCreations, 1);
  assert.equal(state.requests.at(-1).url.searchParams.get("expires_at"), "gt." + new Date(now + 1000).toISOString());
  assert.equal(state.updates, 0);
});

for (const field of ["score", "duration_ms"]) {
  for (const value of [-1, -0.1, 0.5, Number.MAX_SAFE_INTEGER + 1, "120", null, true]) {
    test("rejects invalid " + field + " " + JSON.stringify(value), async () => {
      const { state, dependencies } = harness();
      await assertError(await handleSubmitGameSession(submitRequest({ ...VALID_INPUT, [field]: value }), dependencies), 400, "INVALID_REQUEST");
      assertNoUpdate(state);
    });
  }
  test("requires " + field, async () => {
    const { state, dependencies } = harness();
    const input = { ...VALID_INPUT };
    delete input[field];
    await assertError(await handleSubmitGameSession(submitRequest(input), dependencies), 400, "INVALID_REQUEST");
    assertNoUpdate(state);
  });
}

for (const session_id of ["", "not-a-uuid", SESSION_ID + ",id.eq.other", SESSION_ID.replaceAll("-", ""), " " + SESSION_ID, null, 123]) {
  test("rejects invalid session id " + JSON.stringify(session_id), async () => {
    const { state, dependencies } = harness();
    await assertError(await handleSubmitGameSession(submitRequest({ ...VALID_INPUT, session_id }), dependencies), 400, "INVALID_REQUEST");
    assertNoUpdate(state);
  });
}

for (const metrics of [null, [], "{}", 0, false]) {
  test("rejects metrics that are not a JSON object: " + JSON.stringify(metrics), async () => {
    const { state, dependencies } = harness();
    await assertError(await handleSubmitGameSession(submitRequest({ ...VALID_INPUT, metrics }), dependencies), 400, "INVALID_REQUEST");
    assertNoUpdate(state);
  });
}

for (const [field, value] of Object.entries({
  user_id: OTHER_USER_ID,
  game_id: "33333333-3333-4333-8333-333333333333",
  status: "validated",
  started_at: "2020-01-01T00:00:00Z",
  submitted_at: "2020-01-01T00:00:00Z",
  validated_at: "2020-01-01T00:00:00Z",
  expires_at: "2099-01-01T00:00:00Z",
  xp: 9999,
  XP: 9999,
  eTickets: 9999,
  tickets: 9999,
  rewards: { xp: 9999 },
  metadata: { internal: true },
  extra: "ignored fields must be rejected",
})) {
  test("rejects client-supplied " + field + " without a write", async () => {
    const { state, dependencies } = harness();
    await assertError(await handleSubmitGameSession(submitRequest({ ...VALID_INPUT, [field]: value }), dependencies), 400, "INVALID_REQUEST");
    assertNoUpdate(state);
  });
}

for (const body of [null, [], "session", 42, { score: 1, duration_ms: 1 }]) {
  test("rejects invalid request object " + JSON.stringify(body), async () => {
    const { state, dependencies } = harness();
    await assertError(await handleSubmitGameSession(submitRequest(body), dependencies), 400, "INVALID_REQUEST");
    assertNoUpdate(state);
  });
}

test("rejects malformed JSON", async () => {
  const { state, dependencies } = harness();
  await assertError(await handleSubmitGameSession(submitRequest(undefined, { rawBody: "{" }), dependencies), 400, "INVALID_REQUEST");
  assertNoUpdate(state);
});

test("rejects non-JSON media types", async () => {
  const { state, dependencies } = harness();
  await assertError(await handleSubmitGameSession(submitRequest(undefined, { headers: { "Content-Type": "text/plain" } }), dependencies), 415, "INVALID_REQUEST");
  assertNoUpdate(state);
});

test("accepts JSON with charset and same-origin metadata", async () => {
  const { dependencies } = harness();
  const response = await handleSubmitGameSession(submitRequest(undefined, {
    headers: { "Content-Type": "application/json; charset=utf-8", "Sec-Fetch-Site": "same-origin" },
  }), dependencies);
  assert.equal(response.status, 200);
});

for (const headers of [{ Origin: "https://attacker.example.invalid" }, { Origin: "null" }, { "Sec-Fetch-Site": "cross-site" }]) {
  test("rejects cross-origin request metadata " + JSON.stringify(headers), async () => {
    const { state, dependencies } = harness();
    await assertError(await handleSubmitGameSession(submitRequest(undefined, { headers }), dependencies), 403, "INVALID_REQUEST");
    assertNoUpdate(state);
  });
}

test("allows an authenticated server caller without an Origin header", async () => {
  const { dependencies } = harness();
  const request = submitRequest();
  request.headers.delete("origin");
  assert.equal((await handleSubmitGameSession(request, dependencies)).status, 200);
});

test("refuses methods other than POST", async () => {
  const { state, dependencies } = harness();
  const response = await handleSubmitGameSession(submitRequest(undefined, { method: "GET" }), dependencies);
  assert.equal(response.headers.get("allow"), "POST");
  await assertError(response, 405, "INVALID_REQUEST");
  assertNoUpdate(state);
});

test("limits actual UTF-8 bytes even if Content-Length understates them", async () => {
  const { state, dependencies } = harness();
  const rawBody = JSON.stringify({ ...VALID_INPUT, metrics: { value: "\u00e9".repeat(2100) } });
  assert.ok(rawBody.length < 4096);
  assert.ok(Buffer.byteLength(rawBody) > 4096);
  await assertError(await handleSubmitGameSession(submitRequest(undefined, { rawBody, headers: { "Content-Length": "10" } }), dependencies), 413, "INVALID_REQUEST");
  assertNoUpdate(state);
});

test("projects only the five safe response fields even if the database returns extras", async () => {
  const { dependencies } = harness({ extraUpdatedFields: {
    user_id: USER_ID,
    game_id: "33333333-3333-4333-8333-333333333333",
    metrics: { internal: INTERNAL_DETAIL },
    metadata: { secret: INTERNAL_DETAIL },
    xp: 9999,
    eTickets: 9999,
  } });
  const response = await handleSubmitGameSession(submitRequest(), dependencies);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(Object.keys(body).sort(), SAFE_COLUMNS.split(",").sort());
  assert.doesNotMatch(JSON.stringify(body), /user_id|game_id|metrics|metadata|private database diagnostic|eTickets|xp/);
});

test("a database failure during lookup cannot become an update or expose diagnostics", async () => {
  const { state, dependencies } = harness({ lookupResponse: json({ code: "42501", message: INTERNAL_DETAIL, details: INTERNAL_DETAIL, hint: INTERNAL_DETAIL }, 403) });
  await assertError(await handleSubmitGameSession(submitRequest(), dependencies), 503, "SUBMIT_UNAVAILABLE");
  assertNoUpdate(state);
});

for (const [name, initialSession, status, code] of [
  ["another session id", { id: "bbbb4444-4444-4444-8444-444444444444" }, 404, "SESSION_NOT_FOUND"],
  ["an invalid expiration timestamp", { expires_at: "invalid-date" }, 503, "SUBMIT_UNAVAILABLE"],
]) {
  test("a lookup returning " + name + " cannot initialize a writer", async () => {
    const { state, dependencies } = harness({ initialSession });
    await assertError(await handleSubmitGameSession(submitRequest(), dependencies), status, code);
    assertNoUpdate(state);
  });
}

for (const [name, extraUpdatedFields] of [
  ["another session id", { id: "bbbb4444-4444-4444-8444-444444444444" }],
  ["a validated state", { status: "validated" }],
  ["a different score", { score: 121 }],
  ["a different duration", { duration_ms: 1501 }],
  ["a missing submission timestamp", { submitted_at: null }],
  ["an invalid submission timestamp", { submitted_at: "invalid-date" }],
]) {
  test("a database result with " + name + " is not reported as successful", async () => {
    const { state, dependencies } = harness({ extraUpdatedFields });
    await assertError(await handleSubmitGameSession(submitRequest(), dependencies), 503, "SUBMIT_UNAVAILABLE");
    assert.equal(state.requests.filter(({ method }) => method === "PATCH").length, 1);
  });
}

test("a Core guard constraint rejection returns a safe conflict", async () => {
  const { state, dependencies } = harness({ updateResponse: json({ code: "23514", message: INTERNAL_DETAIL, details: INTERNAL_DETAIL }, 400) });
  await assertError(await handleSubmitGameSession(submitRequest(), dependencies), 409, "SESSION_NOT_SUBMITTABLE");
  assert.equal(state.requests.filter(({ method }) => method === "PATCH").length, 1);
});

test("a conditional update affecting no rows returns a safe conflict", async () => {
  const { state, dependencies } = harness({ updateResponse: json([]) });
  await assertError(await handleSubmitGameSession(submitRequest(), dependencies), 409, "SESSION_NOT_SUBMITTABLE");
  assert.equal(state.requests.filter(({ method }) => method === "PATCH").length, 1);
});

for (const status of [403, 500, 503]) {
  test("a database update failure with HTTP " + status + " is not retried or exposed", async () => {
    const { state, dependencies } = harness({ updateResponse: json({ code: "42501", message: INTERNAL_DETAIL, details: INTERNAL_DETAIL, hint: INTERNAL_DETAIL }, status) });
    await assertError(await handleSubmitGameSession(submitRequest(), dependencies), 503, "SUBMIT_UNAVAILABLE");
    assert.equal(state.requests.filter(({ method }) => method === "PATCH").length, 1);
  });
}

test("a network failure during PATCH is not retried or reported as successful", async () => {
  const { state, dependencies } = harness({ failUpdate: true });
  await assertError(await handleSubmitGameSession(submitRequest(), dependencies), 503, "SUBMIT_UNAVAILABLE");
  assert.equal(state.writerCreations, 1);
  assert.equal(state.requests.filter(({ method }) => method === "PATCH").length, 1);
});

test("unavailable writer configuration returns a generic error", async () => {
  const { state, dependencies } = harness({ failWriterCreation: true });
  await assertError(await handleSubmitGameSession(submitRequest(), dependencies), 503, "SUBMIT_UNAVAILABLE");
  assert.equal(state.writerCreations, 1);
  assert.equal(state.requests.filter(({ method }) => method === "PATCH").length, 0);
});

test("unavailable session client configuration returns a generic error", async () => {
  const { state, dependencies } = harness({ failSessionCreation: true });
  await assertError(await handleSubmitGameSession(submitRequest(), dependencies), 503, "SUBMIT_UNAVAILABLE");
  assert.equal(state.requests.length, 0);
  assertNoUpdate(state);
});
