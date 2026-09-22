const authService = require("./auth.service");
const { handleError } = require("../../middlewares/errorHandler");
const { audit } = require("../../utils/auditLogger");

//ฟังชันล็อกอินผู้ใช้และคืน Bearer token สำหรับเรียก API
async function login(req, res) {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    console.log("[LOGIN REQUEST ตอน login เข้ามา]", {
      username: username || null,
      hasPassword: Boolean(password),
    });

    if (!username || !password) {
      console.log("[LOGIN DENIED ]", {
        username: username || null,
        reason: "MISSING_USERNAME_OR_PASSWORD",
      });
      return res.status(400).json({ message: "Missing username or password" });
    }

    //รับค่าจาก authService.login แล้วส่ง accessToken กลับให้ client นำไปแนบ Authorization: Bearer
    const result = await authService.login(username, password);

    audit(req, "LOGIN", {
      username: result.username,
      message: "Login success",
    });

    console.log("[LOGIN OK]", {
      username: result.username,
      tokenType: result.tokenType,
      expiresInMs: result.expiresInMs,
      hasAccessToken: Boolean(result.accessToken),
    });

    res.json(result);
  } catch (err) {
    audit(req, "LOGIN", {
      username: req.body?.username || null,
      status: "FAILED",
      message: err.message,
    });

    console.log("[LOGIN FAILED]", {
      username: req.body?.username || null,
      message: err.message,
      status: err.response?.status,
    });
    handleError(res, "Cannot login to Alfresco", err);
  }
}

//ฟังชันดึงข้อมูลผู้ใช้ที่ล็อกอินอยู่
function me(req, res) {
  const session = authService.getCurrentSession(req.userSessionToken);
  res.json({
    username: req.alfrescoUsername,
    createdAt: session.createdAt,
    lastUsedAt: session.lastUsedAt,
    expiresAt: session.expiresAt,
  });
}

function logout(req, res) {
  audit(req, "LOGOUT", {
    message: "Logout success",
  });

  authService.logout(req.userSessionToken);
  res.json({ ok: true });
}

module.exports = {
  login,
  logout,
  me,
};
