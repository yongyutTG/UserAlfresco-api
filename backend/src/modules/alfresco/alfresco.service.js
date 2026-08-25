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
//ฟังชันค้นหาเอกสารแบบชื่อไฟล์ตรงตัว เช่น 23017_116969.pdf
async function findDocumentByExactNameInTree(folderPath, exactName, headers, options = {}) {
  const folder = await alfrescoRepo.getObjectByPath(folderPath, headers);
  const { maxItems, skipCount } = getSearchPaging(options);
  const normalizedExactName = String(exactName || "").trim();

  if (!normalizedExactName) {
    return { path: folderPath, folderId: folder.id, exactName: "", count: 0, total: 0, hasMoreItems: false, maxItems, skipCount, files: [] };
  }

  //ฟังชันสร้าง query สำหรับค้นชื่อไฟล์ตรงตัวใน Alfresco
  //ใช้ = แทน LIKE เพื่อให้ _ หรือ % ถูกมองเป็นตัวอักษรจริง ไม่ใช่ wildcard
  const query = [
    "SELECT * FROM cmis:document",
    `WHERE IN_TREE('${escapeCmisString(folder.id)}')`,
    `AND cmis:name = '${escapeCmisString(normalizedExactName)}'`,
  ].join(" ");

  const data = await alfrescoRepo.queryDocuments(query, headers, { searchAllVersions: false, maxItems, skipCount });

  return {
    path: folderPath,
    folderId: folder.id,
    exactName: normalizedExactName,
    count: data.results?.length || 0,
    total: data.numItems ?? null,
    hasMoreItems: Boolean(data.hasMoreItems),
    maxItems,
    skipCount,
    files: (data.results || []).map((item) => mapCmisObject(item)),
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
  listFolders,
  listOrSearchDocuments,
  queryDocumentsInTree,
  searchDocumentsInTree,
  streamDocumentContent,
};
