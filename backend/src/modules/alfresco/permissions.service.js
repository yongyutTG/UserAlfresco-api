const repo = require("./alfresco.repo");

async function getObjectPermissions(id, headers) {
  if (typeof id !== "string" || !id.trim()) {
    throw Object.assign(new Error("id must be a non-empty string"), { statusCode: 400 });
  }
  // Fetch fresh metadata and allowable actions using the current user's credentials.
  const object = await repo.getObjectById(id.trim(), headers);
  return { id: object.id, name: object.name, type: object.type, permissions: object.permissions };
}

module.exports = { getObjectPermissions };
