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

function numberFromEnv(key, defaultValue) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : defaultValue;
}

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: numberFromEnv("PORT", 3001),
  alfrescoHost: process.env.ALFRESCO_HOST,
  userSessionTtlMs: numberFromEnv("USER_SESSION_TTL_MS", 28800000),
  alfrescoRequestTimeoutMs: numberFromEnv("ALFRESCO_REQUEST_TIMEOUT_MS", 30000),
  defaultMaxItems: numberFromEnv("DEFAULT_MAX_ITEMS", 100),
  maxListItems: numberFromEnv("MAX_LIST_ITEMS", 1000),
  maxSearchItems: numberFromEnv("MAX_SEARCH_ITEMS", 1000),
  loginRateLimitWindowMs: numberFromEnv("LOGIN_RATE_LIMIT_WINDOW_MS", 60000),
  loginRateLimitMax: numberFromEnv("LOGIN_RATE_LIMIT_MAX", 10),
  corsAllowedOrigins: String(process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};

config.alfrescoCmis = `${config.alfrescoHost}/alfresco/api/-default-/public/cmis/versions/1.1/browser`;

module.exports = config;
