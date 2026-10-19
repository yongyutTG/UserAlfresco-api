const { test } = require("node:test");
const assert = require("node:assert/strict");
const repo = require("../src/modules/alfresco/alfresco.repo");
const { mapCmisObject } = require("../src/utils/cmis");
const { getObjectPermissions } = require("../src/modules/alfresco/permissions.service");

test("permissions validate id and use current credentials without caching", async (t) => {
  const headers = { Authorization: "Basic test-only" };
  let allowed = true;
  let calls = 0;
  t.mock.method(repo, "getObjectById", async (id, auth) => {
    calls++;
    assert.equal(id, "uuid;1.0");
    assert.equal(auth, headers);
    return mapCmisObject({ properties: {
      "cmis:objectId": { value: id }, "cmis:name": { value: "Finance" },
      "cmis:baseTypeId": { value: "cmis:folder" },
    }, allowableActions: { canCreateFolder: allowed, canCreateDocument: allowed, canUpdateProperties: allowed } });
  });
  for (const id of [undefined, "", " ", [], {}]) {
    await assert.rejects(getObjectPermissions(id, headers), { statusCode: 400 });
  }
  assert.equal(calls, 0);
  const result = await getObjectPermissions("uuid;1.0", headers);
  assert.equal(result.permissions.canCreateFolder, true);
  assert.equal(result.permissions.canUpload, true);
  assert.equal(result.permissions.canRename, true);
  assert.equal(result.permissions.canDownload, false);
  allowed = false;
  assert.equal((await getObjectPermissions("uuid;1.0", headers)).permissions.canUpload, false);
  assert.equal(calls, 2);
});

test("permissions propagate denied and missing objects", async (t) => {
  for (const status of [403, 404]) {
    const error = Object.assign(new Error("upstream"), { response: { status } });
    t.mock.method(repo, "getObjectById", async () => { throw error; });
    await assert.rejects(getObjectPermissions("id", {}), (actual) => actual === error);
    t.mock.restoreAll();
  }
});
