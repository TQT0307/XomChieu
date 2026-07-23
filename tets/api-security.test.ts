import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

test("sensitive diagnostics require Admin and cross-origin login is blocked", async t => {
  process.env.VERCEL = "1";
  const { default: app } = await import("../api/index.js");
  const server = createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);

  const recovery = await fetch(`${baseUrl}/api/recovery-status`);
  assert.equal(recovery.status, 401);

  const crossOriginLogin = await fetch(`${baseUrl}/api/admin-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "https://evil.example"
    },
    body: JSON.stringify({ username: "admin", password: "wrong" })
  });
  assert.equal(crossOriginLogin.status, 403);
});
