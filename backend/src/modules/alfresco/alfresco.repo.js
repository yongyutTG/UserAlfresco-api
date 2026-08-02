const axios = require("axios");
const path = require("path");
const config = require("../../config/env");
const { cmisUrlForPath, mapCmisObject } = require("../../utils/cmis");
//ฟังชันดึงข้อมูลเซิร์ฟเวอร์ Alfresco
async function getServerInfo() {
  const result = await axios.get(`${config.alfrescoHost}/alfresco/service/api/server`);
  return result.data;
}
//ฟังชันดึงรายการโฟลเดอร์และเอกสารจาก Alfresco ตาม path
async function getChildrenByPath(folderPath, headers) {
  const result = await axios.get(cmisUrlForPath(folderPath), {
    headers,
    params: { cmisselector: "children" },
  });

  return (result.data.objects || []).map((item) => mapCmisObject(item));
}
//ฟังชันดึงข้อมูลเอกสารจาก Alfresco ตาม path
async function getObjectByPath(objectPath, headers) {
  const result = await axios.get(cmisUrlForPath(objectPath), {
    headers,
    params: { cmisselector: "object" },
  });

  return mapCmisObject(result.data);
}
//ฟังชันค้นหาเอกสารใน Alfresco ตาม query
async function queryDocuments(query, headers, options = {}) {
  const result = await axios.get(config.alfrescoCmis, {
    headers,
    params: {
      cmisselector: "query",
      q: query,
      searchAllVersions: options.searchAllVersions,
      maxItems: options.maxItems,
      skipCount: options.skipCount,
    },
  });

  return result.data;
}
//ฟังชันสตรีมเนื้อหาเอกสารจาก Alfresco ตาม id
async function getDocumentContentStream(id, headers) {
  return axios.get(`${config.alfrescoCmis}/root`, {
    headers,
    params: { cmisselector: "content", objectId: id },
    responseType: "stream",
  });
}
//ฟังชันตรวจสอบความปลอดภัยของชื่อไฟล์
function safeFileName(name) {
  return path.basename(name || "download");
}

module.exports = {
  getChildrenByPath,
  getDocumentContentStream,
  getObjectByPath,
  getServerInfo,
  queryDocuments,
  safeFileName,
};
