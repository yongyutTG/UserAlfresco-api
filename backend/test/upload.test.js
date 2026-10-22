const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const repo = require("../src/modules/alfresco/alfresco.repo");
const sessions = require("../src/modules/auth/auth.session");

test("multipart single/bulk uploads, authorization, partial results and cleanup", async (t) => {
  let allowed = true;
  const uploaded = [];
  t.mock.method(repo, "getObjectById", async (id, headers) => {
    assert.ok(headers.Authorization.startsWith("Basic "));
    return { id, name: uploaded[uploaded.length - 1], permissions: { canDownload: true, canMove: false, canDelete: false } };
  });
  t.mock.method(repo, "getObjectByPath", async (path, headers) => {
    assert.ok(headers.Authorization.startsWith("Basic "));
    return { isFolder: true, path, permissions: { canUpload: allowed } };
  });
  t.mock.method(repo, "createDocument", async (path, file) => {
    if (file.name === "duplicate.pdf") throw Object.assign(new Error("Duplicate child name"), { response: { status: 409 } });
    uploaded.push(file.name);
    return { id: "new-id", name: file.name };
  });
  const writes = [];
  const actualMkdtemp = fs.mkdtemp;
  t.mock.method(fs, "mkdtemp", async (...args) => { const dir = await actualMkdtemp(...args); writes.push(dir); return dir; });
  const app = require("../src/app");
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const token = sessions.createUserSession("upload-test", "test-only");
  const base = `http://127.0.0.1:${server.address().port}/user-api/alfresco`;
  const headers = { Authorization: `Bearer ${token}` };
  function form(field, names, path = "/Sites/demo/documentLibrary") {
    const body = new FormData();
    body.set("folderPath", path);
    for (const name of names) body.append(field, new Blob(["test"], { type: "application/pdf" }), name);
    return body;
  }
  try {
    let response = await fetch(`${base}/documents/bulk-upload`, { method: "POST", body: form("files", ["x.pdf"]) });
    assert.equal(response.status, 401); await response.arrayBuffer();
    response = await fetch(`${base}/documents`, { method: "POST", headers, body: form("file", ["การเงิน.pdf"]) });
    assert.equal(response.status, 201);
    const single = await response.json();
    assert.equal(single.fileName, "การเงิน.pdf");
    assert.equal(single.document.permissions.canDownload, true);
    assert.equal(single.document.permissions.canDelete, false);
    assert.equal(single.permissionsPending, false);
    response = await fetch(`${base}/documents/bulk-upload`, { method: "POST", headers, body: form("files", ["one.pdf", "duplicate.pdf", "three.pdf"]) });
    assert.equal(response.status, 207);
    const result = await response.json();
    assert.equal(result.success, 2); assert.equal(result.failed, 1);
    assert.equal(result.results[1].status, 409);
    allowed = false;
    const count = uploaded.length;
    response = await fetch(`${base}/documents/bulk-upload`, { method: "POST", headers, body: form("files", ["denied.pdf"]) });
    assert.equal(response.status, 403); await response.arrayBuffer();
    assert.equal(uploaded.length, count);
    response = await fetch(`${base}/documents`, { method: "POST", headers, body: form("files", ["wrong-field.pdf"]) });
    assert.equal(response.status, 400); await response.arrayBuffer();
    response = await fetch(`${base}/documents`, { method: "POST", headers: { ...headers, "Content-Type": "application/pdf" }, body: "binary" });
    assert.equal(response.status, 400); await response.arrayBuffer(); // Existing API requires a file name.
  } finally {
    sessions.deleteUserSession(token);
    await new Promise((resolve) => server.close(resolve));
  }
  for (const dir of writes) {
    // Cleanup runs after the response, so allow the asynchronous unlink to finish.
    for (let attempt = 0; attempt < 20; attempt++) {
      try { await fs.access(dir); } catch { break; }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    await assert.rejects(fs.access(dir));
  }
});
