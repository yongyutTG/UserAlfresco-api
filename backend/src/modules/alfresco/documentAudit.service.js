const repo = require("./alfresco.repo");

// Audit enrichment is best-effort and must not block an otherwise valid download.
async function getAuditFolderPath(id, headers) {
  try {
    const parents = await repo.getObjectParents(id, headers);
    return parents.find((parent) => typeof parent.path === "string" && parent.path.startsWith("/"))?.path || null;
  } catch {
    return null;
  }
}

module.exports = { getAuditFolderPath };
