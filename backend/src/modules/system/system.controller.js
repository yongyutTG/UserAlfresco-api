const { getSystemInfo } = require("./system.service");

function info(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.json(getSystemInfo());
}

module.exports = { info };
