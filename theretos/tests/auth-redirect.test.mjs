import assert from "node:assert/strict";
import test from "node:test";
import { authCallbackDestination, safeInternalPath } from "../lib/auth-redirect.ts";

const authenticated = { data: { user: { id: "test-user" } }, error: null };

test("preserves internal signup and recovery destinations, queries and fragments", () => {
  for (const path of ["/profile", "/login?confirmed=1", "/reset-password", "/reset-password?source=email#form"]) {
    assert.equal(safeInternalPath(path), path);
  }
  assert.equal(safeInternalPath("/account/../reset-password"), "/reset-password");
  assert.equal(safeInternalPath(null, "/login"), "/login");
});

test("rejects external URL syntax and normalized paths that could leave the app", () => {
  for (const value of [
    null,
    "",
    "profile",
    " https://evil.example",
    "https://evil.example/reset-password",
    "javascript:alert(1)",
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "/account/..//evil.example",
    "/.//evil.example",
    "/%2e//evil.example",
  ]) {
    const path = safeInternalPath(value);
    assert.equal(path, "/profile", JSON.stringify(value));
    assert.equal(new URL(path, "https://app.example").origin, "https://app.example");
  }
  assert.equal(safeInternalPath(null, "https://evil.example"), "/profile");
});

test("decodes callback query values once and preserves the signup confirmation", async () => {
  const codes = [];
  const destination = await authCallbackDestination(
    new URLSearchParams("code=valid-code&next=%2Flogin%3Fconfirmed%3D1"),
    async (code) => { codes.push(code); return authenticated; },
  );
  assert.equal(destination, "/login?confirmed=1");
  assert.deepEqual(codes, ["valid-code"]);
});

test("encoded backslashes and tabs cannot escape the callback origin", async () => {
  for (const next of ["%2F%5Cevil.example", "%2F%09%2Fevil.example", "%2Faccount%2F..%2F%2Fevil.example"]) {
    assert.equal(await authCallbackDestination(
      new URLSearchParams(`code=valid-code&next=${next}`),
      async () => authenticated,
    ), "/profile");
  }
});

test("a successful recovery exchange reaches the normalized recovery destination", async () => {
  assert.equal(await authCallbackDestination(
    new URLSearchParams({ code: "recovery-code", next: "/account/../reset-password?source=email" }),
    async () => authenticated,
  ), "/reset-password?source=email");
});

test("a missing code never creates a client or exchanges a session", async () => {
  const unexpected = async () => { assert.fail("must not exchange without a code"); };
  assert.equal(await authCallbackDestination(new URLSearchParams(), unexpected), "/login?error=missing_code");
  assert.equal(await authCallbackDestination(
    new URLSearchParams({ next: "/reset-password", code: "" }), unexpected,
  ), "/forgot-password?error=recovery_link");
});

test("provider query errors override valid codes and are never reflected to the user", async () => {
  for (const key of ["error", "error_code", "error_description"]) {
    for (const [next, expected] of [
      ["/profile", "/login?error=confirmation"],
      ["/reset-password?source=email", "/forgot-password?error=recovery_link"],
    ]) {
      const params = new URLSearchParams({ code: "valid-code", next, [key]: "private diagnostic" });
      assert.equal(await authCallbackDestination(params, async () => {
        assert.fail("must not exchange when the provider reports an error");
      }), expected);
    }
  }
});

test("failed, thrown and empty session exchanges use safe recovery or signup errors", async () => {
  const exchanges = [
    async () => ({ data: null, error: { message: "private diagnostic" } }),
    async () => ({ data: { user: null }, error: null }),
    async () => ({ data: null, error: null }),
    async () => { throw new Error("private diagnostic"); },
  ];
  for (const exchange of exchanges) {
    for (const [next, expected] of [
      ["/login?confirmed=1", "/login?error=confirmation"],
      ["/reset-password#form", "/forgot-password?error=recovery_link"],
    ]) {
      assert.equal(await authCallbackDestination(
        new URLSearchParams({ code: "test-code", next }), exchange,
      ), expected);
    }
  }
});
