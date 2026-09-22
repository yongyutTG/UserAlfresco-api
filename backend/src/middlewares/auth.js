const { getBearerToken } = require("../utils/httpSession");
const authSession = require("../modules/auth/auth.session");

//ฟังชันย่อ token เพื่อ debug โดยไม่แสดง token เต็มใน console
function maskToken(token) {
  if (!token) return null;
  return `${token.slice(0, 8)}...${token.slice(-6)}`;
}

//ฟังชันตรวจสอบ session ของผู้ใช้และตั้งค่า req.userSessionToken, req.alfrescoUsername, req.alfrescoAuthHeaders
function requireUserSession(req, res, next) {
  const token = getBearerToken(req);

  console.log("[AUTH REQUEST]", {
    method: req.method,
    path: req.originalUrl,
    hasBearerToken: Boolean(token),
    token: maskToken(token),
  });

  const session = authSession.touchUserSession(token);

  if (!session) {
    console.log("[AUTH DENIED]", {
      reason: "SESSION_NOT_FOUND_OR_EXPIRED",
      token: maskToken(token),
    });
    return res.status(401).json({ message: "Unauthorized: ไม่พบ Token" });
  }

  console.log("[AUTH OK]", {
    token: maskToken(token),
    username: session.username,
    hasAlfrescoAuth: Boolean(session.headers?.Authorization),
    authType: session.headers?.Authorization?.split(" ")[0],
    authHeaderLength: session.headers?.Authorization?.length,
  });

  req.userSessionToken = token;
  req.alfrescoUsername = session.username;
  req.alfrescoAuthHeaders = session.headers;

  console.log("[AUTH BIND REQUEST]", {
    path: req.originalUrl,
    alfrescoUsername: req.alfrescoUsername,
    willCallAlfrescoAs: req.alfrescoUsername,
  });

  next();
}

module.exports = {
  requireUserSession,
};
