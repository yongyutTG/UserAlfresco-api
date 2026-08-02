function getBearerToken(req) {
  const authorization = req.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");
  return scheme === "Bearer" ? token : null;
}

function getCookie(req, name) {
  const cookieHeader = req.get("cookie") || "";
  const cookies = cookieHeader.split(";").map((item) => item.trim()).filter(Boolean);

  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = cookie.slice(0, separatorIndex);
    const value = cookie.slice(separatorIndex + 1);
    if (key === name) return decodeURIComponent(value);
  }

  return null;
}

function setUserSessionCookie(res, token, ttlMs) {
  const maxAgeSeconds = Math.floor(ttlMs / 1000);
  res.setHeader(
    "Set-Cookie",
    `alfresco_user_session=${encodeURIComponent(token)}; Max-Age=${maxAgeSeconds}; Path=/; HttpOnly; SameSite=Lax`
  );
}

function clearUserSessionCookie(res) {
  res.setHeader("Set-Cookie", "alfresco_user_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax");
}

module.exports = {
  clearUserSessionCookie,
  getBearerToken,
  getCookie,
  setUserSessionCookie,
};
