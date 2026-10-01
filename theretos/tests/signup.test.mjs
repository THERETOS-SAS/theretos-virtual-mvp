import assert from "node:assert/strict";
import test from "node:test";
import { createBrowserClient } from "@supabase/ssr";
import { SignupError, signupAccount, resendSignupConfirmation } from "../lib/supabase/signup.ts";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const ORIGIN = "https://theretos.example.invalid";
const INPUT = {
  firstName: " Ana ", lastName: " Ruiz ", email: " Ana@Example.Invalid ",
  phone: " +57 3001234567 ", password: " nueva clave 123 ", confirmation: " nueva clave 123 ",
};
const PRIVATE_DIAGNOSTIC = "test-only internal diagnostic ana@example.invalid";

function authFixture({ signupResponse, resendResponse, signupThrow, resendThrow } = {}) {
  const calls = [];
  const client = {
    auth: {
      signUp: async (input) => {
        calls.push({ method: "signUp", input });
        if (signupThrow) throw signupThrow;
        return signupResponse ?? { data: { user: { id: USER_ID }, session: null }, error: null };
      },
      resend: async (input) => {
        calls.push({ method: "resend", input });
        if (resendThrow) throw resendThrow;
        return resendResponse ?? { data: { user: null, session: null }, error: null };
      },
    },
  };
  return { client, calls };
}

function safeError(code, message) {
  return (error) => {
    assert.ok(error instanceof SignupError);
    assert.equal(error.code, code);
    assert.doesNotMatch(error.message, /internal diagnostic|ana@example\.invalid/);
    if (message) assert.match(error.message, message);
    return true;
  };
}

function assertCallback(value) {
  const callback = new URL(value);
  assert.equal(callback.origin, ORIGIN);
  assert.equal(callback.pathname, "/auth/callback");
  assert.equal(callback.searchParams.get("next"), "/login?confirmed=1");
}

test("signup sends normalized account details, exact password and confirmation callback", async () => {
  const { client, calls } = authFixture();
  assert.equal(await signupAccount(client, INPUT, ORIGIN), "check-email");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "signUp");
  assert.deepEqual(calls[0].input, {
    email: "ana@example.invalid", password: INPUT.password,
    options: {
      emailRedirectTo: `${ORIGIN}/auth/callback?next=%2Flogin%3Fconfirmed%3D1`,
      data: { first_name: "Ana", last_name: "Ruiz", display_name: "Ana Ruiz", phone: "+57 3001234567" },
    },
  });
});

test("invalid signup values are rejected before any auth operation", async () => {
  for (const input of [
    { ...INPUT, firstName: " " }, { ...INPUT, lastName: "\t" },
    { ...INPUT, email: "a@@example.invalid" }, { ...INPUT, email: "no-address" },
    { ...INPUT, password: "short", confirmation: "short" },
    { ...INPUT, confirmation: INPUT.password.trim() }, { ...INPUT, confirmation: null },
  ]) {
    const { client, calls } = authFixture();
    await assert.rejects(signupAccount(client, input, ORIGIN), safeError("validation"));
    assert.deepEqual(calls, []);
  }
});

test("a real session matching the returned user is the only signed-in result", async () => {
  const { client } = authFixture({ signupResponse: {
    data: { user: { id: USER_ID }, session: { access_token: "test-token", user: { id: USER_ID } } }, error: null,
  } });
  assert.equal(await signupAccount(client, INPUT, ORIGIN), "signed-in");
  for (const session of [
    { access_token: "test-token", user: { id: OTHER_ID } },
    { access_token: "test-token", user: null },
    { user: { id: USER_ID } },
  ]) {
    const { client } = authFixture({ signupResponse: { data: { user: { id: USER_ID }, session }, error: null } });
    await assert.rejects(signupAccount(client, INPUT, ORIGIN), safeError("signup"));
  }
});

test("a masked existing-user response gets the same neutral check-email state", async () => {
  for (const user of [{ id: USER_ID, identities: [{}] }, { id: OTHER_ID, identities: [] }]) {
    const { client } = authFixture({ signupResponse: { data: { user, session: null }, error: null } });
    assert.equal(await signupAccount(client, INPUT, ORIGIN), "check-email");
  }
});

test("missing signup user data never reports success", async () => {
  for (const data of [null, { user: null, session: null }, { user: {}, session: null }]) {
    const { client } = authFixture({ signupResponse: { data, error: null } });
    await assert.rejects(signupAccount(client, INPUT, ORIGIN), safeError("signup"));
  }
});

test("weak passwords and rate limits use safe actionable messages", async () => {
  for (const { upstream, code, message } of [
    { upstream: { code: "weak_password" }, code: "signup", message: /requisitos de seguridad/ },
    { upstream: { status: 429 }, code: "rate_limit", message: /Espera unos minutos/ },
    { upstream: { code: "over_email_send_rate_limit" }, code: "rate_limit", message: /Espera unos minutos/ },
  ]) {
    const { client } = authFixture({ signupResponse: { data: null, error: { ...upstream, message: PRIVATE_DIAGNOSTIC } } });
    await assert.rejects(signupAccount(client, INPUT, ORIGIN), safeError(code, message));
  }
});

test("signup server and network failures do not expose account information", async () => {
  const messages = [];
  for (const code of ["user_already_exists", "email_exists", "unexpected_failure"]) {
    const { client } = authFixture({ signupResponse: { data: null, error: { code, message: PRIVATE_DIAGNOSTIC } } });
    await assert.rejects(signupAccount(client, INPUT, ORIGIN), (error) => {
      safeError("signup")(error); messages.push(error.message); return true;
    });
  }
  assert.equal(new Set(messages).size, 1);
  const { client } = authFixture({ signupThrow: new Error(PRIVATE_DIAGNOSTIC) });
  await assert.rejects(signupAccount(client, INPUT, ORIGIN), safeError("signup"));
});

test("resend uses only auth.resend with signup type and ignores account response data", async () => {
  for (const data of [null, { user: { id: USER_ID } }, { session: null, user: null }]) {
    const { client, calls } = authFixture({ resendResponse: { data, error: null } });
    assert.equal(await resendSignupConfirmation(client, INPUT.email, ORIGIN), undefined);
    assert.deepEqual(calls, [{ method: "resend", input: {
      type: "signup", email: "ana@example.invalid",
      options: { emailRedirectTo: `${ORIGIN}/auth/callback?next=%2Flogin%3Fconfirmed%3D1` },
    } }]);
  }
});

test("resend validates email and safely maps returned or thrown failures", async () => {
  const { client, calls } = authFixture();
  await assert.rejects(resendSignupConfirmation(client, "not-email", ORIGIN), safeError("validation"));
  assert.deepEqual(calls, []);
  for (const error of [
    { status: 429, message: PRIVATE_DIAGNOSTIC },
    { code: "over_email_send_rate_limit", message: PRIVATE_DIAGNOSTIC },
    { code: "user_not_found", message: PRIVATE_DIAGNOSTIC },
    { code: "email_not_confirmed", message: PRIVATE_DIAGNOSTIC },
  ]) {
    const { client } = authFixture({ resendResponse: { data: null, error } });
    await assert.rejects(resendSignupConfirmation(client, INPUT.email, ORIGIN), safeError(error.status === 429 || error.code === "over_email_send_rate_limit" ? "rate_limit" : "resend"));
  }
  const thrown = authFixture({ resendThrow: new Error(PRIVATE_DIAGNOSTIC) });
  await assert.rejects(resendSignupConfirmation(thrown.client, INPUT.email, ORIGIN), safeError("resend"));
});

test("invalid origins never reach the email API", async () => {
  for (const origin of ["invalid", "file:///tmp/"]) {
    const { client, calls } = authFixture();
    await assert.rejects(signupAccount(client, INPUT, origin), safeError("signup"));
    await assert.rejects(resendSignupConfirmation(client, INPUT.email, origin), safeError("resend"));
    assert.deepEqual(calls, []);
  }
});

test("real browser signup and resend send PKCE challenges and refresh the cookie verifier", async () => {
  const jar = new Map();
  const requests = [];
  const browser = createBrowserClient("https://signup-pkce.example.invalid", "test-anon-key", {
    isSingleton: false,
    auth: { autoRefreshToken: false, detectSessionInUrl: false },
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (entries) => entries.forEach(({ name, value }) => value ? jar.set(name, value) : jar.delete(name)),
    },
    global: {
      fetch: async (input, init) => {
        const request = new Request(input, init);
        const url = new URL(request.url);
        requests.push({ url, method: request.method, body: await request.json() });
        assert.ok(["/auth/v1/signup", "/auth/v1/resend"].includes(url.pathname));
        const response = url.pathname.endsWith("/signup")
          ? { id: USER_ID, email: "ana@example.invalid", aud: "authenticated", created_at: "2026-01-01T00:00:00Z" }
          : {};
        return new Response(JSON.stringify(response), { status: 200, headers: { "Content-Type": "application/json" } });
      },
    },
  });
  assert.equal(await signupAccount(browser, INPUT, ORIGIN), "check-email");
  // The SDK also keeps immutable per-flow slots. The fixed key is the one
  // used by our callback (no flow id), and must follow the latest request.
  const verifierName = `${browser.auth.storageKey}-code-verifier`;
  assert.ok(jar.has(verifierName));
  const initialVerifier = jar.get(verifierName);
  assert.equal(await resendSignupConfirmation(browser, INPUT.email, ORIGIN), undefined);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url.pathname, "/auth/v1/signup");
  assert.equal(requests[1].url.pathname, "/auth/v1/resend");
  for (const request of requests) {
    assert.equal(request.method, "POST");
    assert.equal(request.body.email, "ana@example.invalid");
    assert.match(request.body.code_challenge, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(request.body.code_challenge_method, "s256");
    assertCallback(request.url.searchParams.get("redirect_to"));
  }
  assert.equal(requests[1].body.type, "signup");
  assert.equal(requests[1].body.password, undefined);
  assert.notEqual(requests[1].body.code_challenge, requests[0].body.code_challenge);
  assert.ok(jar.get(verifierName));
  assert.notEqual(jar.get(verifierName), initialVerifier);
});
