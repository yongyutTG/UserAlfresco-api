const crypto = require("crypto");
const config = require("../../config/env");
const { createAlfrescoAuthHeader } = require("../../utils/authHeader");

const userSessions = new Map();

//ฟังชันย่อ token เพื่อ debug โดยไม่แสดง token เต็มใน console
function maskToken(token) {
  if (!token) return null;
  return `${token.slice(0, 8)}...${token.slice(-6)}`;
}

//ฟังชันลบ session ของผู้ใช้ที่หมดอายุ
function cleanupExpiredUserSessions() {
  const now = Date.now();
  for (const [token, session] of userSessions.entries()) {
    if (session.expiresAt <= now) {
      console.log("[SESSION EXPIRED]", {
        token: maskToken(token),
        username: session.username,
        expiredAt: new Date(session.expiresAt).toISOString(),
      });
      userSessions.delete(token);
    }
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

  console.log("[SESSION CREATED]", {
    token: maskToken(token),
    username,
    hasAlfrescoAuthHeader: true,
    authType: "Basic",
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + config.userSessionTtlMs).toISOString(),
    totalSessions: userSessions.size,
  });

  return token;
}
//ฟังชันดึง session ของผู้ใช้ตาม token
function getUserSession(token) {
  cleanupExpiredUserSessions();
  const session = token ? userSessions.get(token) : null;

  console.log("[SESSION LOOKUP เอา token ไปหา session]", {
    token: maskToken(token),
    found: Boolean(session),
    username: session?.username || null,
    expiresAt: session ? new Date(session.expiresAt).toISOString() : null,
  });

  return session;
}

//ฟังชันอัปเดตเวลาที่ผู้ใช้ใช้งาน session ล่าสุด
function touchUserSession(token) {
  const session = getUserSession(token);
  if (session) {
    session.lastUsedAt = Date.now();
    console.log("[SESSION TOUCH ถูกใช้งานล่าสุด]", {
      token: maskToken(token),
      username: session.username,
      lastUsedAt: new Date(session.lastUsedAt).toISOString(),
    });
  }
  return session;
}

function deleteUserSession(token) {
  const session = userSessions.get(token);
  console.log("[SESSION DELETE หมดอายุ]", {
    token: maskToken(token),
    found: Boolean(session),
    username: session?.username || null,
  });
  userSessions.delete(token);
}

module.exports = {
  createUserSession,
  deleteUserSession,
  getUserSession,
  touchUserSession,
};
