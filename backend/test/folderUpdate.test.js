const { test } = require("node:test");
const assert = require("node:assert/strict");
const repo = require("../src/modules/alfresco/alfresco.repo");
const { updateFolder } = require("../src/modules/alfresco/folderUpdate.service");

test("folder rename and move validate authority and destination", async (t) => {
  const headers = { Authorization: "Basic test" };
  const source = { id: "source", name: "Finance", path: "/Sites/demo/documentLibrary/Finance", isFolder: true,
    permissions: { canRename: true, canMove: true } };
  let target = { id: "target", path: "/Sites/demo/documentLibrary/Archive", isFolder: true };
  const writes = [];
  t.mock.method(repo, "getObjectById", async () => source);
  t.mock.method(repo, "getObjectByPath", async () => target);
  t.mock.method(repo, "updateDocumentProperties", async (id, body, auth) => {
    assert.equal(auth, headers); writes.push(body); return { ...source, name: body.name };
  });
  t.mock.method(repo, "moveObject", async (id, path, auth) => {
    assert.equal(auth, headers); writes.push(path); return { ...source, path: `${path}/Finance` };
  });
  await assert.rejects(updateFolder("source", { name: "../bad" }, headers), { statusCode: 400 });
  await assert.rejects(updateFolder("source", { name: "ok", targetFolderPath: "/target" }, headers), { statusCode: 400 });
  source.permissions.canRename = false;
  await assert.rejects(updateFolder("source", { name: "New" }, headers), { statusCode: 403 });
  source.permissions.canRename = true;
  target.path = source.path + "/child";
  await assert.rejects(updateFolder("source", { targetFolderPath: target.path }, headers), { statusCode: 400 });
  assert.equal(writes.length, 0);
  target.path = "/Sites/demo/documentLibrary/Archive";
  assert.equal((await updateFolder("source", { name: "New" }, headers)).action, "RENAME_FOLDER");
  assert.equal((await updateFolder("source", { targetFolderPath: target.path }, headers)).action, "MOVE_FOLDER");
  assert.equal(writes.length, 2);
});
