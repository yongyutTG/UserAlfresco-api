const authService = require("./auth.service");
const { handleError } = require("../../middlewares/errorHandler");

//ฟังชันล็อกอินผู้ใช้และคืน Bearer token สำหรับเรียก API
async function login(req, res) {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (!username || !password) {
      return res.status(400).json({ message: "Missing username or password" });
    }

    //รับค่าจาก authService.login แล้วส่ง accessToken กลับให้ client นำไปแนบ Authorization: Bearer
    const result = await authService.login(username, password);
    res.json(result);
  } catch (err) {
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
  authService.logout(req.userSessionToken);
  res.json({ ok: true });
}

module.exports = {
  login,
  logout,
  me,
};
