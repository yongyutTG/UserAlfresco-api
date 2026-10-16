const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");
const fs = require("node:fs/promises");
const repo = require("../src/modules/alfresco/alfresco.repo");
const { prepareDownload } = require("../src/modules/alfresco/bulkDownload.service");

test("download permissions come from CMIS actions", () => {
  const { mapCmisObject } = require("../src/utils/cmis");
  const properties = { "cmis:baseTypeId": { value: "cmis:document" } };
  assert.equal(mapCmisObject({ properties }).permissions.canDownload, false);
  assert.equal(mapCmisObject({ properties, allowableActions: { canGetContentStream: true } }).permissions.canDownload, true);
});

test("bulk-download endpoint requires a Bearer session", async () => {
  const app = require("../src/app");
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/user-api/alfresco/documents/bulk-download`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documents: [{ id: "one" }] }),
    });
    assert.equal(response.status, 401);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test("bulk download validation, permissions, ZIP and upstream errors", async (t) => {
  const headers = { Authorization: "Basic test-only" };
  t.mock.method(repo, "getObjectParents", async (id, auth) => {
    assert.equal(auth, headers);
    if (id === "two") throw new Error("Parent lookup timed out");
    return [{ path: "/Sites/example/documentLibrary/finance" }];
  });
  let calls = [];
  t.mock.method(repo, "getObjectById", async (id, auth) => {
    assert.equal(auth, headers);
    return { isDocument: true, name: "test.pdf", permissions: { canDownload: id !== "denied" } };
  });
  t.mock.method(repo, "getDocumentContentStream", async (id, auth) => {
    assert.equal(auth, headers);
    calls.push(id);
    if (id === "broken") return { data: Readable.from((async function* () { throw new Error("upstream failed"); })()) };
    return { data: Readable.from([Buffer.from("content-" + id)]) };
  });
  await assert.rejects(prepareDownload({ documents: [] }, headers), { statusCode: 400 });
  await assert.rejects(prepareDownload({ documents: ["id"] }, headers), { statusCode: 400 });
  await assert.rejects(prepareDownload({ documents: [{ id: "one" }, { id: "denied" }] }, headers), { statusCode: 403 });
  assert.deepEqual(calls, []);
  const result = await prepareDownload({ documents: [
    { id: "one", name: "../same.pdf" }, { id: "two", name: "../same.pdf" },
  ] }, headers);
  try {
    assert.deepEqual(result.auditDocuments, [
      { id: "one", name: "test.pdf", folderPath: "/Sites/example/documentLibrary/finance" },
      { id: "two", name: "test.pdf", folderPath: null },
    ]);
    const zip = await fs.readFile(result.zipPath);
    assert.equal(zip.readUInt32LE(0), 0x04034b50);
    const names = [];
    for (let offset = 0; offset < zip.length - 46; offset++) {
      if (zip.readUInt32LE(offset) === 0x02014b50) {
        const length = zip.readUInt16LE(offset + 28);
        names.push(zip.subarray(offset + 46, offset + 46 + length).toString());
      }
    }
    assert.equal(names.length, 2);
    assert.equal(new Set(names).size, 2);
    assert.ok(names.every((name) => !name.includes("/") && !name.includes("\\")));
    assert.match(result.name, /^documents_\d{8}_\d{6}\.zip$/);
  } finally { await result.cleanup(); }
  await assert.rejects(fs.access(result.zipPath));
  await assert.rejects(prepareDownload({ documents: [{ id: "one" }, { id: "broken" }] }, headers), /upstream failed/);
});
