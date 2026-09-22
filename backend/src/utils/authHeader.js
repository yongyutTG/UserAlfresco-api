
// ฟังชันสร้าง header สำหรับการ authenticate กับ Alfresco
function createAlfrescoAuthHeader(username, password) {
  const token = Buffer.from(`${username}:${password}`, "utf8").toString("base64");
  return { Authorization: `Basic ${token}` };
}



module.exports = {
  createAlfrescoAuthHeader,
};
