const { getBearerToken, getCookie } = require("../utils/httpSession");
const authSession = require("../modules/auth/auth.session");

//ฟังชันตรวจสอบ session ของผู้ใช้และตั้งค่า req.userSessionToken, req.alfrescoUsername, req.alfrescoAuthHeaders
function requireUserSession(req, res, next) {
  const token = getBearerToken(req) || getCookie(req, "alfresco_user_session");
  const session = authSession.touchUserSession(token);

  if (!session) {
    return res.status(401).json({ message: "Unauthorized: ไม่พบ Token" });
  }

  req.userSessionToken = token;
  req.alfrescoUsername = session.username;
  req.alfrescoAuthHeaders = session.headers;
  next();
}

module.exports = {
  requireUserSession,
};
