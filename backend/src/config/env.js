const fs = require("fs");
const path = require("path");

//ฟังชันโหลดค่าตัวแปรสภาพแวดล้อมจากไฟล์ .env
function loadLocalEnv() {
  const envPath = path.join(__dirname, "..", "..", "..", ".env");
  console.log('ข้อมูล env:', envPath);

  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

//ฟังชันโหลดค่าตัวแปรสภาพแวดล้อมจากไฟล์ .env ถ
loadLocalEnv();

const config = {
  port: Number(process.env.PORT),
  alfrescoHost: process.env.ALFRESCO_HOST,
  userSessionTtlMs: Number(process.env.USER_SESSION_TTL_MS),
  corsAllowedOrigins: String(process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};

config.alfrescoCmis = `${config.alfrescoHost}/alfresco/api/-default-/public/cmis/versions/1.1/browser`;

module.exports = config;
