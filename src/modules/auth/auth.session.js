const crypto = require("crypto");
const config = require("../../config/env");
const { createAlfrescoAuthHeader } = require("../../utils/authHeader");

const userSessions = new Map();
//ฟังชันลบ session ของผู้ใช้ที่หมดอายุ
function cleanupExpiredUserSessions() {
  const now = Date.now();
  for (const [token, session] of userSessions.entries()) {
    if (session.expiresAt <= now) userSessions.delete(token);
  }
}
//ฟังชันสร้าง session ของผู้ใช้ใหม่
function createUserSession(username, password) {
  cleanupExpiredUserSessions();
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();

  userSessions.set(token, {
    username,
    headers: createAlfrescoAuthHeader(username, password),
    createdAt: now,
    lastUsedAt: now,
    expiresAt: now + config.userSessionTtlMs,
  });

  return token;
}
//ฟังชันดึง session ของผู้ใช้ตาม token
function getUserSession(token) {
  cleanupExpiredUserSessions();
  return token ? userSessions.get(token) : null;
}

//ฟังชันอัปเดตเวลาที่ผู้ใช้ใช้งาน session ล่าสุด
function touchUserSession(token) {
  const session = getUserSession(token);
  if (session) session.lastUsedAt = Date.now();
  return session;
}

function deleteUserSession(token) {
  userSessions.delete(token);
}

module.exports = {
  createUserSession,
  deleteUserSession,
  getUserSession,
  touchUserSession,
};
