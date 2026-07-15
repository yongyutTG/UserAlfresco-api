const express = require("express");
const authController = require("./auth.controller");
const { requireUserSession } = require("../../middlewares/auth");

const router = express.Router();

router.post("/login", authController.login);
router.get("/me", requireUserSession, authController.me);
router.post("/logout", requireUserSession, authController.logout);

module.exports = router;
