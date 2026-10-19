const express = require("express");
const controller = require("./system.controller");

const router = express.Router();
// GET /user-api/system/info: local API server identity and Bangkok time.
router.get("/info", controller.info);

module.exports = router;
