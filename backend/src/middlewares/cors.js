const config = require("../config/env");

// ใช้สำหรับ frontend แบบ direct fetch จาก browser
// ตัวอย่าง origin: http://localhost/Alfresco เรียกไป http://localhost:3001
function allowConfiguredCors(req, res, next) {
  const origin = req.get("origin");

  if (origin && config.corsAllowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,Accept");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
}

module.exports = {
  allowConfiguredCors,
};
