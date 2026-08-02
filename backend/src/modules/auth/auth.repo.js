const axios = require("axios");
const config = require("../../config/env");
const { createAlfrescoAuthHeader } = require("../../utils/authHeader");

//ฟังชันตรวจสอบการล็อกอินของผู้ใช้ใน Alfresco โดยส่งคำขอ GET ไปยัง Alfresco CMIS API ด้วยข้อมูลผู้ใช้และรหัสผ่านที่ให้มา
async function validateAlfrescoLogin(username, password) {
  //ส่งคำขอ GET ไปยัง Alfresco CMIS API เพื่อดึงข้อมูล root folder ของผู้ใช้ โดยใช้ header การตรวจสอบสิทธิ์ที่สร้างจาก username และ password
  await axios.get(`${config.alfrescoCmis}/root`, {
    headers: createAlfrescoAuthHeader(username, password),
    params: { cmisselector: "object" },
  });
}

module.exports = {
  validateAlfrescoLogin,
};
