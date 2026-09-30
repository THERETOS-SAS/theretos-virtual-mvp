import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { createBrowserClient, createServerClient } from "@supabase/ssr";
import {
  PasswordRecoveryError,
  getPasswordValidationError,
  requestPasswordRecovery,
  updatePassword,
} from "../lib/supabase/password.ts";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const PASSWORD = " nueva clave 123 ";
const PRIVATE_DIAGNOSTIC = "test-only raw server diagnostic ana@example.invalid";

test("PKCE recovery persists the verifier in cookies and exchanges it on the server", async () => {
  const jar = new Map();
  const requests = [];
  const cookies = {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: (entries) => entries.forEach(({ name, value }) => value ? jar.set(name, value) : jar.delete(name)),
  };
  const payload = { sub: USER_ID, exp: Math.floor(Date.now() / 1000) + 3600 };
  const token = [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
    Buffer.from(JSON.stringify(payload)).toString("base64url"),
    Buffer.from("test-signature").toString("base64url"),
  ].join(".");
  const user = { id: USER_ID, email: "ana@example.invalid", aud: "authenticated", role: "authenticated", created_at: new Date().toISOString() };
  const fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const body = request.method === "GET" ? null : await request.json();
    requests.push({ path: url.pathname, body, authorization: request.headers.get("Authorization") });
    let response;
    if (url.pathname === "/auth/v1/recover") response = {};
    else if (url.pathname === "/auth/v1/token") response = { access_token: token, refresh_token: "test-refresh", token_type: "bearer", expires_in: 3600, user };
    else if (url.pathname === "/auth/v1/user") response = user;
    else assert.fail(`Unexpected request: ${url.pathname}`);
    return new Response(JSON.stringify(response), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const options = { cookies, global: { fetch }, auth: { autoRefreshToken: false, detectSessionInUrl: false } };
  const browser = createBrowserClient("https://pkce.example.invalid", "test-anon-key", { ...options, isSingleton: false });
  await requestPasswordRecovery(browser, "ana@example.invalid", "https://theretos.example.invalid");
  assert.ok(requests[0].body.code_challenge);
  assert.equal(requests[0].body.code_challenge_method, "s256");
  assert.ok([...jar.keys()].some((name) => name.includes("code-verifier")));

  const server = createServerClient("https://pkce.example.invalid", "test-anon-key", options);
  const result = await server.auth.exchangeCodeForSession("test-recovery-code");
  assert.equal(result.error, null);
  assert.equal(result.data.user.id, USER_ID);
  assert.equal(requests[1].body.auth_code, "test-recovery-code");
  assert.ok(requests[1].body.code_verifier);
  assert.ok([...jar.keys()].some((name) => name.startsWith("sb-pkce-auth-token") && !name.includes("code-verifier")));

  // A fresh request must read the established cookie session and use its token.
  const mutationClient = createServerClient("https://pkce.example.invalid", "test-anon-key", options);
  await updatePassword(mutationClient, USER_ID, PASSWORD, PASSWORD);
  const update = requests.find((request) => request.body?.password);
  assert.equal(update.body.password, PASSWORD);
  assert.equal(update.authorization, `Bearer ${token}`);
});

// The injectable auth surface records every operation; no test opens a network connection.
function authFixture({ userId = USER_ID, identityError = null, updateResult, updateThrow, identityThrow } = {}) {
  const calls = [];
  const client = {
    auth: {
      getUser: async () => {
        calls.push({ method: "getUser" });
        if (identityThrow) throw identityThrow;
        return { data: { user: userId ? { id: userId } : null }, error: identityError };
      },
      updateUser: async (attributes) => {
        calls.push({ method: "updateUser", attributes });
        if (updateThrow) throw updateThrow;
        return updateResult ?? { data: { user: { id: USER_ID } }, error: null };
      },
      signOut: async () => {
        calls.push({ method: "signOut" });
        throw new Error("A password change must not sign the user out");
      },
    },
  };
  return { client, calls };
}

function assertSafeError(code, messagePattern) {
  return (error) => {
    assert.ok(error instanceof PasswordRecoveryError);
    assert.equal(error.code, code);
    assert.doesNotMatch(error.message, /raw server diagnostic|ana@example\.invalid/);
    if (messagePattern) assert.match(error.message, messagePattern);
    return true;
  };
}

test("recovery sends normalized email and a reset callback using the real Supabase client", async () => {
  const requests = [];
  const client = createClient("https://supabase.example.invalid", "test-anon-key", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init) => {
        const request = new Request(input, init);
        requests.push({ url: new URL(request.url), method: request.method, body: await request.json() });
        return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
      },
    },
  });
  assert.equal(await requestPasswordRecovery(client, " Ana@Example.Invalid ", "https://theretos.example.invalid"), undefined);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, "POST");
  assert.equal(requests[0].url.pathname, "/auth/v1/recover");
  assert.equal(requests[0].body.email, "ana@example.invalid");
  const callback = new URL(requests[0].url.searchParams.get("redirect_to"));
  assert.equal(callback.origin, "https://theretos.example.invalid");
  assert.equal(callback.pathname, "/auth/callback");
  assert.equal(callback.searchParams.get("next"), "/reset-password");
});

test("invalid recovery input stops before requesting an email", async () => {
  let called = false;
  const client = { auth: { resetPasswordForEmail: async () => { called = true; } } };
  for (const email of ["", "  ", "no-at.example", "a@", "a b@example.invalid", "a@@example.invalid", null]) {
    await assert.rejects(requestPasswordRecovery(client, email, "https://theretos.example.invalid"), assertSafeError("validation"));
  }
  assert.equal(called, false);
});

test("an invalid origin cannot be included in a recovery email", async () => {
  let called = false;
  const client = { auth: { resetPasswordForEmail: async () => { called = true; } } };
  for (const origin of ["not a URL", "file:///tmp/"]) {
    await assert.rejects(requestPasswordRecovery(client, "a@example.invalid", origin), assertSafeError("request"));
  }
  assert.equal(called, false);
});

test("accepted recovery responses do not reveal account data", async () => {
  for (const data of [{}, { email: "ana@example.invalid", account_exists: true }, null]) {
    const client = { auth: { resetPasswordForEmail: async () => ({ data, error: null }) } };
    assert.equal(await requestPasswordRecovery(client, "ana@example.invalid", "http://localhost:3000"), undefined);
  }
});

test("recovery rate limits return a wait message without raw error details", async () => {
  for (const error of [{ status: 429, message: PRIVATE_DIAGNOSTIC }, { code: "over_email_send_rate_limit", message: PRIVATE_DIAGNOSTIC }]) {
    const client = { auth: { resetPasswordForEmail: async () => ({ data: null, error }) } };
    await assert.rejects(requestPasswordRecovery(client, "ana@example.invalid", "https://theretos.example.invalid"), assertSafeError("request", /Espera unos minutos/));
  }
});

test("recovery failures remain generic, including rejected promises", async () => {
  const errors = [
    { code: "user_not_found", message: PRIVATE_DIAGNOSTIC },
    { code: "invalid_credentials", message: PRIVATE_DIAGNOSTIC },
    { status: 500, message: PRIVATE_DIAGNOSTIC },
  ];
  const messages = [];
  for (const error of errors) {
    const client = { auth: { resetPasswordForEmail: async () => ({ data: null, error }) } };
    await assert.rejects(requestPasswordRecovery(client, "ana@example.invalid", "https://theretos.example.invalid"), (failure) => {
      assertSafeError("request")(failure);
      messages.push(failure.message);
      return true;
    });
  }
  assert.equal(new Set(messages).size, 1);
  const client = { auth: { resetPasswordForEmail: async () => { throw new Error(PRIVATE_DIAGNOSTIC); } } };
  await assert.rejects(requestPasswordRecovery(client, "ana@example.invalid", "https://theretos.example.invalid"), assertSafeError("request"));
});

test("password validation checks type, minimum length and exact confirmation without trimming", () => {
  for (const [password, confirmation] of [[null, null], [12345678, 12345678], ["12345678", undefined], ["1234567", "1234567"], ["12345678", "12345679"], [PASSWORD, PASSWORD.trim()]]) {
    assert.equal(typeof getPasswordValidationError(password, confirmation), "string");
  }
  assert.equal(getPasswordValidationError("12345678", "12345678"), null);
  assert.equal(getPasswordValidationError(PASSWORD, PASSWORD), null);
});

test("invalid password input makes no auth requests", async () => {
  const { client, calls } = authFixture();
  await assert.rejects(updatePassword(client, USER_ID, "short", "short"), assertSafeError("validation"));
  await assert.rejects(updatePassword(client, USER_ID, PASSWORD, PASSWORD.trim()), assertSafeError("validation"));
  assert.deepEqual(calls, []);
});

test("password update verifies identity first, preserves spaces and keeps the session open", async () => {
  const { client, calls } = authFixture();
  assert.equal(await updatePassword(client, USER_ID, PASSWORD, PASSWORD), undefined);
  assert.deepEqual(calls, [
    { method: "getUser" },
    { method: "updateUser", attributes: { password: PASSWORD } },
  ]);
});

test("missing, changed or unverified users never receive a password update", async () => {
  for (const settings of [
    { userId: null },
    { userId: OTHER_ID },
    { identityError: { code: "invalid_credentials", message: PRIVATE_DIAGNOSTIC } },
    { identityThrow: new Error(PRIVATE_DIAGNOSTIC) },
  ]) {
    const { client, calls } = authFixture(settings);
    await assert.rejects(updatePassword(client, USER_ID, PASSWORD, PASSWORD), assertSafeError("session"));
    assert.deepEqual(calls, [{ method: "getUser" }]);
  }
  const { client, calls } = authFixture();
  await assert.rejects(updatePassword(client, "", PASSWORD, PASSWORD), assertSafeError("session"));
  assert.deepEqual(calls, [{ method: "getUser" }]);
});

for (const { upstream, code, message } of [
  { upstream: { code: "same_password" }, code: "update", message: /diferente/ },
  { upstream: { code: "weak_password" }, code: "update", message: /requisitos de seguridad/ },
  { upstream: { code: "session_expired" }, code: "session", message: /expiró/ },
  { upstream: { code: "session_not_found" }, code: "session", message: /expiró/ },
  { upstream: { code: "bad_jwt" }, code: "session", message: /expiró/ },
  { upstream: { status: 401 }, code: "session", message: /expiró/ },
  { upstream: { code: "unknown_error" }, code: "update", message: /No pudimos actualizar/ },
]) {
  test(`update maps ${upstream.code ?? upstream.status} safely`, async () => {
    const { client } = authFixture({ updateResult: { data: { user: null }, error: { ...upstream, message: PRIVATE_DIAGNOSTIC } } });
    await assert.rejects(updatePassword(client, USER_ID, PASSWORD, PASSWORD), assertSafeError(code, message));
  });
}

test("an update with no user, a different user or a thrown error cannot report success", async () => {
  for (const { settings, code } of [
    { settings: { updateResult: { data: { user: null }, error: null } }, code: "update" },
    { settings: { updateResult: { data: { user: { id: OTHER_ID } }, error: null } }, code: "session" },
    { settings: { updateThrow: new Error(PRIVATE_DIAGNOSTIC) }, code: "update" },
  ]) {
    const { client, calls } = authFixture(settings);
    await assert.rejects(updatePassword(client, USER_ID, PASSWORD, PASSWORD), assertSafeError(code));
    assert.equal(calls.some(({ method }) => method === "signOut"), false);
  }
});
