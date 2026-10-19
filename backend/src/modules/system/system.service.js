const config = require("../../config/env");

function getSystemInfo(now = new Date()) {
  // Bangkok uses UTC+07:00; formatting must not depend on the host timezone.
  const localTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return {
    serverName: config.serverLabel,
    serverTime: localTime.toISOString().slice(0, 19) + "+07:00",
    timezone: "Asia/Bangkok",
  };
}

module.exports = { getSystemInfo };
