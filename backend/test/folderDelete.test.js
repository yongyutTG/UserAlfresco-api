const { test } = require("node:test");
const assert = require("node:assert/strict");
const repo = require("../src/modules/alfresco/alfresco.repo");
const { deleteFolder } = require("../src/modules/alfresco/folderDelete.service");

test("folder delete validates permissions, confirmation and partial outcomes", async (t) => {
  const headers = { Authorization: "Basic test" };
  let folder = { isFolder: true, name: "Finance", path: "/Sites/demo/documentLibrary/Finance",
    permissions: { canDelete: true, canDeleteTree: true } };
  let children = false;
  let failed = [];
  const calls = [];
  t.mock.method(repo, "getObjectById", async (id, auth) => { assert.equal(auth, headers); return folder; });
  t.mock.method(repo, "folderHasChildren", async () => children);
  t.mock.method(repo, "deleteFolderObject", async (...args) => { calls.push(args); return failed; });
  await assert.rejects(deleteFolder("id", "yes", {}, headers), { statusCode: 400 });
  await assert.rejects(deleteFolder("id", "true", { confirmName: "wrong" }, headers), { statusCode: 400 });
  children = true;
  await assert.rejects(deleteFolder("id", undefined, {}, headers), { statusCode: 409 });
  folder.permissions.canDeleteTree = false;
  await assert.rejects(deleteFolder("id", "true", { confirmName: "Finance" }, headers), { statusCode: 403 });
  assert.equal(calls.length, 0);
  folder.permissions.canDeleteTree = true;
  failed = ["restricted-child"];
  const partial = await deleteFolder("id", "true", { confirmName: "Finance" }, headers);
  assert.equal(partial.partial, true);
  assert.equal(partial.deleted, false);
  assert.deepEqual(partial.failedToDelete, failed);
  assert.deepEqual(calls[0], ["id", true, headers]);
  children = false;
  failed = [];
  assert.equal((await deleteFolder("id", undefined, {}, headers)).deleted, true);
  assert.equal(calls[1][1], false);
  folder.path = "/Sites/demo/documentLibrary";
  await assert.rejects(deleteFolder("id", "true", { confirmName: "Finance" }, headers), { statusCode: 403 });
  assert.equal(calls.length, 2);
});
