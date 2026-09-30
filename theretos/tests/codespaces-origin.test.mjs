import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { isCsrfOriginAllowed } from "next/dist/server/app-render/csrf-protection.js";

function allowedOrigins(codespaces) {
  const env = { ...process.env };
  delete env.CODESPACES;
  if (codespaces !== undefined) env.CODESPACES = codespaces;
  return JSON.parse(execFileSync(process.execPath, [
    "--input-type=module", "-e",
    "import config from './next.config.ts'; process.stdout.write(JSON.stringify(config.experimental?.serverActions?.allowedOrigins ?? []));",
  ], { cwd: fileURLToPath(new URL("../", import.meta.url)), env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
}

test("Codespaces accepts the rewritten Origin observed in the recovery request", () => {
  const origins = allowedOrigins("true");
  assert.equal(isCsrfOriginAllowed("localhost:3000", origins), true);
  for (const origin of [
    "untrusted.example", "another-codespace-3000.app.github.dev", "app.github.dev",
    "localhost", "localhost:3001", "localhost.evil.example:3000", "127.0.0.1:3000",
  ]) {
    assert.equal(isCsrfOriginAllowed(origin, origins), false, origin);
  }
});

test("outside Codespaces no extra Server Action origins are trusted", () => {
  for (const value of [undefined, "false", "TRUE", ""]) {
    const origins = allowedOrigins(value);
    assert.equal(isCsrfOriginAllowed("localhost:3000", origins), false);
    assert.equal(isCsrfOriginAllowed("untrusted.example", origins), false);
  }
});
