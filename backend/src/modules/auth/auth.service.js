const config = require("../../config/env");
const authRepo = require("./auth.repo");
const authSession = require("./auth.session");

//ฟังชันล็อกอินผู้ใช้และสร้าง session token
async function login(username, password) {
  //ตรวจสอบการล็อกอินของผู้ใช้ใน Alfresco โดยเรียกใช้ฟังชัน validateAlfrescoLogin จาก authRepo
  await authRepo.validateAlfrescoLogin(username, password);
  const token = authSession.createUserSession(username, password);

  return {
    tokenType: "Bearer",
    accessToken: token,
    expiresInMs: config.userSessionTtlMs,
    username,
    user: {
      username,
    },
  };
}

function getCurrentSession(token) {
  return authSession.getUserSession(token);
}

function logout(token) {
  authSession.deleteUserSession(token);
}

module.exports = {
  getCurrentSession,
  login,
  logout,
};

