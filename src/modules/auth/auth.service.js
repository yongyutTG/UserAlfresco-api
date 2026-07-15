const config = require("../../config/env");
const authRepo = require("./auth.repo");
const authSession = require("./auth.session");

async function login(username, password) {
  await authRepo.validateAlfrescoLogin(username, password);
  const token = authSession.createUserSession(username, password);

  return {
    tokenType: "Bearer",
    accessToken: token,
    expiresInMs: config.userSessionTtlMs,
    username,
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
