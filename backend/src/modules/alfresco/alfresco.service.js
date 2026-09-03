const alfrescoRepo = require("./alfresco.repo");
const config = require("../../config/env");
const { escapeCmisLike, escapeCmisString, mapCmisObject } = require("../../utils/cmis");
const { parseOffset, parsePositiveInteger } = require("../../utils/pagination");

function getListPaging(options = {}) {
  return {
    maxItems: parsePositiveInteger(options.maxItems, config.defaultMaxItems, config.maxListItems),
    skipCount: parseOffset(options.skipCount),
  };
}

function getSearchPaging(options = {}) {
  return {
    maxItems: parsePositiveInteger(options.maxItems, config.defaultMaxItems, config.maxSearchItems),
    skipCount: parseOffset(options.skipCount),
  };
}

function normalizeRepositoryPath(repositoryPath) {
  if (!repositoryPath) return null;
  return String(repositoryPath).replace(/^\/Company Home(?=\/|$)/, "") || "/";
}

function getExactFileNameCandidates(fileName) {
  const normalizedFileName = String(fileName || "").trim();
  if (!normalizedFileName) return [];

  const candidates = [normalizedFileName];

  if (!/\.[^./\\]+$/.test(normalizedFileName)) {
    candidates.push(`${normalizedFileName}.pdf`);
  }

  return [...new Set(candidates)];
}

//ฟังชันตรวจสอบสถานะการเชื่อมต่อกับ Alfresco
async function getHealth() {
  const alfresco = await alfrescoRepo.getServerInfo();
  return { ok: true, mode: "user-session", alfresco };
}
//ฟังชันดึงรายการโฟลเดอร์จาก Alfresco
async function listFolders(folderPath, headers) {
  const items = await alfrescoRepo.getChildrenByPath(folderPath || "/", headers);
  return items.filter((item) => item.isFolder);
}
//ฟังชันดึงรายการเอกสารจาก Alfresco ตาม path และ query
async function queryDocumentsInTree(folderPath, headers, options = {}) {
  const folder = await alfrescoRepo.getObjectByPath(folderPath, headers);
  const { maxItems, skipCount } = getListPaging(options);
  const query = `SELECT * FROM cmis:document WHERE IN_TREE('${escapeCmisString(folder.id)}')`;
  const data = await alfrescoRepo.queryDocuments(query, headers, { maxItems, skipCount });
  const files = (data.results || []).map((item) => mapCmisObject(item));

  return {
    path: folderPath,
    folderId: folder.id,
    count: data.results?.length || 0,
    total: data.numItems ?? null,
    hasMoreItems: Boolean(data.hasMoreItems),
    maxItems,
    skipCount,
    files,
  };
}
//ฟังชันค้นหาเอกสารใน Alfresco ตาม path และ query
async function searchDocumentsInTree(folderPath, searchText, headers, options = {}) {
  const folder = await alfrescoRepo.getObjectByPath(folderPath, headers);
  const { maxItems, skipCount } = getSearchPaging(options);
  const normalizedSearchText = String(searchText || "").trim();

  if (!normalizedSearchText) {
    return { path: folderPath, folderId: folder.id, q: "", count: 0, total: 0, hasMoreItems: false, maxItems, skipCount, files: [] };
  }
//ฟังชันสร้าง query สำหรับค้นหาเอกสารใน Alfresco
  const query = [
    "SELECT * FROM cmis:document",
    `WHERE IN_TREE('${escapeCmisString(folder.id)}')`,
    `AND cmis:name LIKE '%${escapeCmisLike(normalizedSearchText)}%'`,
  ].join(" ");
  //ฟังชันเรียกใช้ alfrescoRepo.queryDocuments
  const data = await alfrescoRepo.queryDocuments(query, headers, { searchAllVersions: false, maxItems, skipCount });
  const files = (data.results || []).map((item) => mapCmisObject(item));

  return {
    path: folderPath,
    folderId: folder.id,
    q: normalizedSearchText,
    count: data.results?.length || 0,
    total: data.numItems ?? null,
    hasMoreItems: Boolean(data.hasMoreItems),
    maxItems,
    skipCount,
    files,
  };
}
//ฟังชันค้นหาเอกสารแบบชื่อไฟล์ตรงตัว เช่น 23017_116969.pdf
async function findDocumentByExactNameInTree(folderPath, exactName, headers, options = {}) {
  const folder = await alfrescoRepo.getObjectByPath(folderPath, headers);
  const { maxItems, skipCount } = getSearchPaging(options);
  const exactNameCandidates = getExactFileNameCandidates(exactName);

  if (!exactNameCandidates.length) {
    return { path: folderPath, folderId: folder.id, exactName: "", count: 0, total: 0, hasMoreItems: false, maxItems, skipCount, files: [] };
  }

  //ฟังชันสร้าง query สำหรับค้นชื่อไฟล์ตรงตัวใน Alfresco
  //ใช้ = แทน LIKE เพื่อให้ _ หรือ % ถูกมองเป็นตัวอักษรจริง ไม่ใช่ wildcard
  const exactNameFilter = exactNameCandidates
    .map((name) => `cmis:name = '${escapeCmisString(name)}'`)
    .join(" OR ");
  const query = [
    "SELECT * FROM cmis:document",
    `WHERE IN_TREE('${escapeCmisString(folder.id)}')`,
    `AND (${exactNameFilter})`,
  ].join(" ");

  const data = await alfrescoRepo.queryDocuments(query, headers, { searchAllVersions: false, maxItems, skipCount });
  const files = (data.results || []).map((item) => mapCmisObject(item));

  return {
    path: folderPath,
    folderId: folder.id,
    exactName: exactNameCandidates[0],
    exactNameCandidates,
    count: data.results?.length || 0,
    total: data.numItems ?? null,
    hasMoreItems: Boolean(data.hasMoreItems),
    maxItems,
    skipCount,
    files,
  };
}
//ฟังชันดึงรายการเอกสารจาก Alfresco ตาม path และ query หรือค้นหาเอกสาร
async function listOrSearchDocuments(folderPath, q, headers, options = {}) {
  let result;

  if (options.exactName && String(options.exactName).trim()) {
    result = await findDocumentByExactNameInTree(folderPath, options.exactName, headers, options);
  } else if (q && String(q).trim()) {
    result = await searchDocumentsInTree(folderPath, q, headers, options);
  } else {
    result = await queryDocumentsInTree(folderPath, headers, options);
  }

  return {
    ...result,
    nextSkipCount: result.hasMoreItems ? result.skipCount + result.count : null,
  };
}
//ฟังชันดึงตำแหน่งไฟล์จาก Alfresco ตาม id
async function getDocumentLocation(id, headers) {
  if (!id || id === "DOCUMENT_ID") {
    const error = new Error("Missing real document id");
    error.statusCode = 400;
    throw error;
  }

  try {
    const nodePath = normalizeRepositoryPath(await alfrescoRepo.getNodePathByObjectId(id, headers));

    if (nodePath) {
      return {
        id,
        parentPath: nodePath,
        source: "nodes-api",
      };
    }
  } catch (error) {
    // ถ้า REST nodes API ไม่รองรับ id รูปแบบนี้ ให้ลอง CMIS parents ต่อ
  }

  try {
    const parents = await alfrescoRepo.getObjectParents(id, headers);
    const parentPath = normalizeRepositoryPath(parents.find((parent) => parent.path)?.path);

    return {
      id,
      parentPath,
      source: parentPath ? "cmis-parents" : null,
    };
  } catch (error) {
    return {
      id,
      parentPath: null,
      source: null,
    };
  }

  return {
    id,
    parentPath: null,
    source: null,
  };
}
//ฟังชันสตรีมเนื้อหาเอกสารจาก Alfresco
async function streamDocumentContent(res, id, name, headers) {
  if (!id || id === "DOCUMENT_ID") {
    return res.status(400).json({ message: "Missing real document id" });
  }
//ฟังชันเรียกใช้ alfrescoRepo.getDocumentContentStream และ alfrescoRepo.safeFileName
  const result = await alfrescoRepo.getDocumentContentStream(id, headers);
  const fileName = alfrescoRepo.safeFileName(name);

  res.setHeader("Content-Type", result.headers["content-type"] || "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(fileName)}"`);
  result.data.pipe(res);
}

module.exports = {
  getHealth,
  findDocumentByExactNameInTree,
  getDocumentLocation,
  listFolders,
  listOrSearchDocuments,
  queryDocumentsInTree,
  searchDocumentsInTree,
  streamDocumentContent,
};
