const alfrescoRepo = require("./alfresco.repo");
const { escapeCmisLike, escapeCmisString, mapCmisObject } = require("../../utils/cmis");

async function getHealth() {
  const alfresco = await alfrescoRepo.getServerInfo();
  return { ok: true, mode: "user-session", alfresco };
}

async function listFolders(folderPath, headers) {
  const items = await alfrescoRepo.getChildrenByPath(folderPath || "/", headers);
  return items.filter((item) => item.isFolder);
}

async function queryDocumentsInTree(folderPath, headers, options = {}) {
  const folder = await alfrescoRepo.getObjectByPath(folderPath, headers);
  const maxItems = Math.min(Number(options.maxItems || 1000), 60000);
  const skipCount = Math.max(Number(options.skipCount || 0), 0);
  const query = `SELECT * FROM cmis:document WHERE IN_TREE('${escapeCmisString(folder.id)}')`;
  const data = await alfrescoRepo.queryDocuments(query, headers, { maxItems, skipCount });

  return {
    path: folderPath,
    folderId: folder.id,
    count: data.results?.length || 0,
    total: data.numItems ?? null,
    hasMoreItems: Boolean(data.hasMoreItems),
    maxItems,
    skipCount,
    files: (data.results || []).map((item) => mapCmisObject(item)),
  };
}

async function searchDocumentsInTree(folderPath, searchText, headers, options = {}) {
  const folder = await alfrescoRepo.getObjectByPath(folderPath, headers);
  const maxItems = Math.min(Number(options.maxItems || 100), 5000);
  const skipCount = Math.max(Number(options.skipCount || 0), 0);
  const normalizedSearchText = String(searchText || "").trim();

  if (!normalizedSearchText) {
    return { path: folderPath, folderId: folder.id, q: "", count: 0, total: 0, hasMoreItems: false, maxItems, skipCount, files: [] };
  }

  const query = [
    "SELECT * FROM cmis:document",
    `WHERE IN_TREE('${escapeCmisString(folder.id)}')`,
    `AND cmis:name LIKE '%${escapeCmisLike(normalizedSearchText)}%'`,
  ].join(" ");
  const data = await alfrescoRepo.queryDocuments(query, headers, { searchAllVersions: false, maxItems, skipCount });

  return {
    path: folderPath,
    folderId: folder.id,
    q: normalizedSearchText,
    count: data.results?.length || 0,
    total: data.numItems ?? null,
    hasMoreItems: Boolean(data.hasMoreItems),
    maxItems,
    skipCount,
    files: (data.results || []).map((item) => mapCmisObject(item)),
  };
}

async function listOrSearchDocuments(folderPath, q, headers, options = {}) {
  const result = q && String(q).trim()
    ? await searchDocumentsInTree(folderPath, q, headers, options)
    : await queryDocumentsInTree(folderPath, headers, options);

  return {
    ...result,
    nextSkipCount: result.hasMoreItems ? result.skipCount + result.count : null,
  };
}

async function streamDocumentContent(res, id, name, headers) {
  if (!id || id === "DOCUMENT_ID") {
    return res.status(400).json({ message: "Missing real document id" });
  }

  const result = await alfrescoRepo.getDocumentContentStream(id, headers);
  const fileName = alfrescoRepo.safeFileName(name);

  res.setHeader("Content-Type", result.headers["content-type"] || "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(fileName)}"`);
  result.data.pipe(res);
}

module.exports = {
  getHealth,
  listFolders,
  listOrSearchDocuments,
  queryDocumentsInTree,
  searchDocumentsInTree,
  streamDocumentContent,
};
