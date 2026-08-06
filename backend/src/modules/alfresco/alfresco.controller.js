const alfrescoService = require("./alfresco.service");
const { handleError } = require("../../middlewares/errorHandler");

//ฟังชันตรวจสอบสถานะการเชื่อมต่อกับ Alfresco
async function health(req, res) {
  try {
    const result = await alfrescoService.getHealth();
    res.json(result);
  } catch (err) {
    handleError(res, "ไม่สามารถเชื่อมต่อกับ Alfresco ได้", err);
  }
}
//ฟังชันดึงรายการโฟลเดอร์จาก Alfresco
async function listFolders(req, res) {
  try {
    const folderPath = req.query.path || "/";
    const folders = await alfrescoService.listFolders(folderPath, req.alfrescoAuthHeaders);
    res.json(folders);
  } catch (err) {
    handleError(res, "ไม่สามารถรายการโฟลเดอร์จาก Alfresco ได้", err);
  }
}
//ฟังชันดึงรายการเอกสารจาก Alfresco
async function listDocuments(req, res) {
  try {
    const folderPath = req.query.folderPath || req.query.path || "/Sites/tg-saving/documentLibrary";
    const q = req.query.q || req.query.keyword || req.query.name;
    const exactName = req.query.exactName || req.query.fileName;
    const options = { maxItems: req.query.maxItems, skipCount: req.query.skipCount, exactName };
    const result = await alfrescoService.listOrSearchDocuments(folderPath, q, req.alfrescoAuthHeaders, options);

    res.json({
      ...result,
      username: req.alfrescoUsername,
    });
  } catch (err) {
    handleError(res, "ไม่สามารถรายการเอกสารจาก Alfresco ได้", err);
  }
}
//ฟังชันสตรีมเนื้อหาเอกสารจาก Alfresco
async function streamDocumentContent(req, res) {
  try {
    await alfrescoService.streamDocumentContent(res, req.params.id, req.query.name, req.alfrescoAuthHeaders);
  } catch (err) {
    handleError(res, "ไม่สามารถดาวน์โหลดเอกสารจาก Alfresco ได้", err);
  }
}

module.exports = {
  health,
  listDocuments,
  listFolders,
  streamDocumentContent,
};
