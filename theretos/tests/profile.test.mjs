import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { profileDetails, saveOwnProfile } from "../lib/supabase/profile.ts";

// Real Supabase request construction, with all HTTP requests intercepted locally.
// These tests do not validate the deployed database's RLS policies.
const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";
const AUTH_MESSAGE = /Tu sesión cambió o expiró/;
const SAVE_MESSAGE = /No pudimos guardar tu perfil/;
const validInput = { firstName: " Ana ", lastName: " Ruiz ", phone: " +57 3001234567 " };
const storedProfile = {
  first_name: "Ana",
  last_name: "Ruiz",
  display_name: "Ana R. (guardado)",
  phone: "+57 3001234567",
};

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
  profileResponse,
  failProfileRequest = false,
} = {}) {
  const requests = [];
  const client = createClient("https://supabase.example.invalid", "test-anon-key", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: authenticated ? { Authorization: "Bearer test-session-token" } : {},
      fetch: async (input, init) => {
        const request = new Request(input, init);
        const url = new URL(request.url);
        requests.push({
          url,
          method: request.method,
          headers: request.headers,
          body: request.method === "PATCH" ? await request.json() : null,
        });
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
        if (url.pathname === "/rest/v1/profiles") {
          if (failProfileRequest) throw new TypeError("Simulated offline connection");
          return profileResponse ?? json(storedProfile);
        }
        throw new Error(`Unexpected request: ${request.method} ${url.pathname}`);
      },
    },
  });
  return { client, requests };
}

test("checks the current user and updates only allowed profile fields for that UID", async () => {
  const { client, requests } = clientWithResponses();
  const result = await saveOwnProfile(client, USER_ID, {
    ...validInput,
    id: OTHER_USER_ID,
    email: "ignored@example.invalid",
    xp: 999,
    eTickets: 999,
  });

  assert.equal(requests.length, 2);
  assert.equal(requests[0].method, "GET");
  assert.equal(requests[0].url.pathname, "/auth/v1/user");
  const update = requests[1];
  assert.equal(update.method, "PATCH");
  assert.equal(update.url.pathname, "/rest/v1/profiles");
  assert.equal(update.url.searchParams.get("id"), `eq.${USER_ID}`);
  assert.equal(update.url.searchParams.get("select"), "first_name,last_name,display_name,phone");
  assert.equal(update.headers.get("content-profile"), "public");
  assert.equal(update.headers.get("accept"), "application/vnd.pgrst.object+json");
  assert.match(update.headers.get("prefer"), /return=representation/);
  assert.equal(update.headers.get("authorization"), "Bearer test-session-token");
  assert.deepEqual(update.body, {
    first_name: "Ana",
    last_name: "Ruiz",
    display_name: "Ana Ruiz",
    phone: "+57 3001234567",
  });
  // The context must receive the saved row, not unconfirmed form values.
  assert.deepEqual(result, {
    firstName: "Ana",
    lastName: "Ruiz",
    name: "Ana R. (guardado)",
    phone: "+57 3001234567",
  });
});

test("clearing an optional phone persists and returns an empty string", async () => {
  const { client, requests } = clientWithResponses({
    profileResponse: json({ ...storedProfile, phone: "" }),
  });
  const result = await saveOwnProfile(client, USER_ID, { ...validInput, phone: "   " });
  assert.equal(requests[1].body.phone, "");
  assert.equal(result.phone, "");
});

test("rejects missing names before making any requests", async () => {
  for (const input of [
    { ...validInput, firstName: "  " },
    { ...validInput, lastName: "\t" },
  ]) {
    const { client, requests } = clientWithResponses();
    await assert.rejects(saveOwnProfile(client, USER_ID, input), /Completa tu nombre y apellido/);
    assert.equal(requests.length, 0);
  }
});

test("a changed authenticated user cannot update either profile", async () => {
  const { client, requests } = clientWithResponses({ userId: OTHER_USER_ID });
  await assert.rejects(saveOwnProfile(client, USER_ID, validInput), AUTH_MESSAGE);
  assert.deepEqual(requests.map(({ method }) => method), ["GET"]);
});

test("an absent session never sends a profile update", async () => {
  const { client, requests } = clientWithResponses({ authenticated: false });
  await assert.rejects(saveOwnProfile(client, USER_ID, validInput), AUTH_MESSAGE);
  assert.equal(requests.length, 0);
});

test("an expired token never sends a profile update", async () => {
  const { client, requests } = clientWithResponses({
    authResponse: json({ code: "bad_jwt", message: "JWT expired" }, 401),
  });
  await assert.rejects(saveOwnProfile(client, USER_ID, validInput), AUTH_MESSAGE);
  assert.deepEqual(requests.map(({ method }) => method), ["GET"]);
});

for (const { name, status, body } of [
  {
    name: "RLS denies the update",
    status: 403,
    body: { code: "42501", message: "test-only internal database diagnostic" },
  },
  {
    name: "RLS filters every row or the profile does not exist",
    status: 406,
    body: { code: "PGRST116", message: "Cannot coerce the result to a single JSON object", details: "The result contains 0 rows" },
  },
  { name: "the update returns no saved data", status: 200, body: null },
]) {
  test(`does not report success when ${name}`, async () => {
    const { client, requests } = clientWithResponses({ profileResponse: json(body, status) });
    await assert.rejects(saveOwnProfile(client, USER_ID, validInput), (error) => {
      assert.match(error.message, SAVE_MESSAGE);
      assert.doesNotMatch(error.message, /internal database diagnostic/);
      return true;
    });
    assert.deepEqual(requests.map(({ method }) => method), ["GET", "PATCH"]);
  });
}

test("a network failure cannot become a successful save", async () => {
  const { client, requests } = clientWithResponses({ failProfileRequest: true });
  await assert.rejects(saveOwnProfile(client, USER_ID, validInput), SAVE_MESSAGE);
  assert.deepEqual(requests.map(({ method }) => method), ["GET", "PATCH"]);
});

test("nullable saved columns become explicit empty values for context synchronization", () => {
  assert.deepEqual(profileDetails({ first_name: null, last_name: null, display_name: null, phone: null }), {
    firstName: "",
    lastName: "",
    name: "Jugador THERETOS",
    phone: "",
  });
  assert.equal(profileDetails({ ...storedProfile, display_name: null }).name, "Ana Ruiz");
});
