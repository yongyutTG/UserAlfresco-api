const test = require("node:test");
const assert = require("node:assert/strict");
const { getDocumentDateClause, getDocumentFolderPredicate } = require("../src/modules/alfresco/alfresco.service");

test("document upload date range covers complete Bangkok calendar days", () => {
  const clause = getDocumentDateClause({ createdFrom: "2026-11-03", createdTo: "2026-11-03" });

  assert.match(clause, /cmis:creationDate >= TIMESTAMP '2026-11-02T17:00:00\.000Z'/);
  assert.match(clause, /cmis:creationDate < TIMESTAMP '2026-11-03T17:00:00\.000Z'/);
});

test("document upload date range validates dates and ordering", () => {
  assert.throws(() => getDocumentDateClause({ createdFrom: "2026-02-30" }), /Invalid upload date/);
  assert.throws(
    () => getDocumentDateClause({ createdFrom: "2026-11-04", createdTo: "2026-11-03" }),
    /start date must not be after end date/,
  );
});

test("document search scope supports the selected folder or its complete tree", () => {
  assert.equal(getDocumentFolderPredicate("folder-id"), "IN_TREE('folder-id')");
  assert.equal(getDocumentFolderPredicate("folder-id", { scope: "tree" }), "IN_TREE('folder-id')");
  assert.equal(getDocumentFolderPredicate("folder-id", { scope: "folder" }), "IN_FOLDER('folder-id')");
});
