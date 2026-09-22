const app = require("./src/app");
const config = require("./src/config/env");
const fs = require("fs");
const path = require("path");

function logFatalError(type, error) {
  const logPath = path.join(__dirname, "logs", "server-crash.log");
  const payload = {
    time: new Date().toISOString(),
    type,
    message: error?.message || String(error),
    stack: error?.stack || null,
  };

  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, `${JSON.stringify(payload)}\n`, "utf8");
  } catch (writeError) {
    console.error("[CRASH LOG FAILED]", writeError.message);
  }
}

process.on("uncaughtException", (error) => {
  logFatalError("uncaughtException", error);
  console.error(error);
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  logFatalError("unhandledRejection", error);
  console.error(error);
  process.exit(1);
});

app.listen(config.port, () => {
  console.log(`UserAlfresco API running at http://localhost:${config.port}`);
  // console.log(`Alfresco server: ${config.alfrescoHost}`);
});
