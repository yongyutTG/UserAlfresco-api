const fs = require("node:fs/promises");
const repo = require("./alfresco.repo");
const service = require("./alfresco.service");
const fail = (message, statusCode) => Object.assign(new Error(message), { statusCode });

async function uploadFiles(folderPath, files, headers, isDisconnected = () => false) {
  if (typeof folderPath !== "string" || !folderPath.trim().startsWith("/")) throw fail("folderPath is required and must start with /", 400);
  if (!Array.isArray(files) || !files.length) throw fail("At least one file is required", 400);
  const folder = await repo.getObjectByPath(folderPath.trim(), headers);
  if (!folder.isFolder) throw fail("Destination is not a folder", 400);
  if (folder.permissions?.canUpload !== true) throw fail("Upload permission denied", 403);
  const results = [];
  for (let index = 0; index < files.length; index++) {
    if (isDisconnected()) throw fail("Client disconnected; check uploaded files before retrying", 499);
    const file = files[index];
    try {
      const name = file.originalname;
      if (!name || name === "." || name === ".." || /[\\/\x00-\x1f\x7f]/.test(name)) throw fail("Invalid file name", 400);
      const buffer = await fs.readFile(file.path);
      const uploaded = await service.createDocument(folder.path || folderPath.trim(), {
        buffer, name, mimeType: file.mimetype,
      }, headers);
      results.push({ index, fileName: name, ok: true, status: 201, ...uploaded });
    } catch (error) {
      results.push({ index, fileName: file.originalname, ok: false,
        status: error.statusCode || error.response?.status || 500,
        error: error.response?.data?.message || error.message });
    }
  }
  return { folderPath: folder.path || folderPath.trim(),
    success: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length, results };
}

module.exports = { uploadFiles };
