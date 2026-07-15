const config = require("../../config/env");
const authService = require("./auth.service");
const { clearUserSessionCookie, setUserSessionCookie } = require("../../utils/httpSession");
const { handleError } = require("../../middlewares/errorHandler");

async function login(req, res) {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (!username || !password) {
      return res.status(400).json({ message: "Missing username or password" });
    }

    const result = await authService.login(username, password);
    setUserSessionCookie(res, result.accessToken, config.userSessionTtlMs);
    res.json(result);
  } catch (err) {
    handleError(res, "Cannot login to Alfresco", err);
  }
}

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
  clearUserSessionCookie(res);
  res.json({ ok: true });
}

module.exports = {
  login,
  logout,
  me,
};
