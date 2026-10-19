const { test } = require("node:test");
const assert = require("node:assert/strict");
const config = require("../src/config/env");
const { getSystemInfo } = require("../src/modules/system/system.service");

test("system info formats Bangkok time including date rollover", () => {
  assert.deepEqual(getSystemInfo(new Date("2026-10-19T07:35:00Z")), {
    serverName: config.serverLabel, serverTime: "2026-10-19T14:35:00+07:00", timezone: "Asia/Bangkok",
  });
  assert.equal(getSystemInfo(new Date("2026-12-31T20:00:00Z")).serverTime, "2027-01-01T03:00:00+07:00");
});

test("system info requires a real session and prevents caching", async (t) => {
  const sessions = require("../src/modules/auth/auth.session");
  const repo = require("../src/modules/alfresco/alfresco.repo");
  for (const name of Object.keys(repo)) {
    t.mock.method(repo, name, () => { throw new Error("System info must not call Alfresco"); });
  }
  const app = require("../src/app");
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const token = sessions.createUserSession("system-info-test", "test-only");
  try {
    const url = `http://127.0.0.1:${server.address().port}/user-api/system/info`;
    for (const headers of [{}, { Authorization: "Bearer invalid" }]) {
      const response = await fetch(url, { headers });
      assert.equal(response.status, 401);
      assert.equal(response.headers.get("cache-control"), "no-store");
      await response.arrayBuffer();
    }
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const result = await response.json();
    assert.equal(result.serverName, config.serverLabel);
    assert.equal(result.timezone, "Asia/Bangkok");
    assert.match(result.serverTime, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\+07:00$/);
    assert.ok(Math.abs(Date.now() - Date.parse(result.serverTime)) < 5000);
    assert.deepEqual(Object.keys(result).sort(), ["serverName", "serverTime", "timezone"]);
  } finally {
    sessions.deleteUserSession(token);
    await new Promise((resolve) => server.close(resolve));
  }
});
