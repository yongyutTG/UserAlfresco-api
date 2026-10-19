const repo = require("./alfresco.repo");
const fail = (message, statusCode) => Object.assign(new Error(message), { statusCode });

async function updateFolder(id, body, headers) {
  const rename = Object.prototype.hasOwnProperty.call(body || {}, "name");
  const move = Object.prototype.hasOwnProperty.call(body || {}, "targetFolderPath");
  if (rename === move) throw fail("Provide either name or targetFolderPath", 400);
  const value = rename ? body.name : body.targetFolderPath;
  if (typeof value !== "string" || !value.trim()) throw fail("Invalid folder value", 400);
  const name = value.trim();
  if (rename && (name === "." || name === ".." || /[\\/\x00-\x1f\x7f]/.test(name))) throw fail("Invalid folder name", 400);
  if (move && (!value.startsWith("/") || value.split("/").some((part) => part === "." || part === ".."))) throw fail("Invalid targetFolderPath", 400);
  const folder = await repo.getObjectById(id, headers);
  if (!folder.isFolder) throw fail("Object is not a folder", 400);
  if (!folder.path || folder.path === "/" || folder.path === "/Sites" || /^\/Sites\/[^/]+(?:\/documentLibrary)?\/?$/.test(folder.path)) throw fail("Cannot modify a repository, site or library root", 403);
  if (folder.permissions?.[rename ? "canRename" : "canMove"] !== true) throw fail("Folder permission denied", 403);
  let updated;
  if (rename) {
    updated = await repo.updateDocumentProperties(id, { name }, headers);
  } else {
    const target = await repo.getObjectByPath(value, headers);
    const sourcePath = folder.path.replace(/\/+$/, "");
    const targetPath = target.path?.replace(/\/+$/, "") || "/";
    if (!target.isFolder) throw fail("Destination is not a folder", 400);
    if (target.id === folder.id || targetPath === sourcePath || targetPath.startsWith(`${sourcePath}/`)) throw fail("Cannot move a folder into itself or its descendants", 400);
    if (targetPath === (sourcePath.slice(0, sourcePath.lastIndexOf("/")) || "/")) throw fail("Folder is already in this destination", 409);
    // Alfresco performs the final destination permission check during CMIS move.
    updated = await repo.moveObject(id, value, headers);
  }
  return { id, action: rename ? "RENAME_FOLDER" : "MOVE_FOLDER", previousPath: folder.path, folder: updated };
}
module.exports = { updateFolder };
