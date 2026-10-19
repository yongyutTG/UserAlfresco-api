const repo = require("./alfresco.repo");
const fail = (message, statusCode) => Object.assign(new Error(message), { statusCode });

async function deleteFolder(id, recursiveValue, body, headers) {
  if (!id || !String(id).trim()) throw fail("Missing folder id", 400);
  if (recursiveValue !== undefined && recursiveValue !== "true" && recursiveValue !== "false") {
    throw fail("recursive must be true or false", 400);
  }
  const recursive = recursiveValue === "true";
  const folder = await repo.getObjectById(id, headers);
  if (!folder.isFolder) throw fail("Object is not a folder", 400);
  if (!folder.path || folder.path === "/" || folder.path === "/Sites" || /^\/Sites\/[^/]+(?:\/documentLibrary)?\/?$/.test(folder.path)) {
    throw fail("Cannot delete a repository, site or document library root", 403);
  }
  if (folder.permissions?.[recursive ? "canDeleteTree" : "canDelete"] !== true) {
    throw fail("Folder delete permission denied", 403);
  }
  if (recursive && body?.confirmName !== folder.name) throw fail("confirmName must match the folder name", 400);
  if (!recursive && await repo.folderHasChildren(id, headers)) {
    throw fail("Folder is not empty; explicit recursive confirmation is required", 409);
  }
  // Alfresco enforces permissions on descendants. deleteTree is not atomic.
  const failedToDelete = await repo.deleteFolderObject(id, recursive, headers);
  return { id, name: folder.name, folderPath: folder.path, recursive,
    deleted: failedToDelete.length === 0, partial: failedToDelete.length > 0, failedToDelete };
}

module.exports = { deleteFolder };
