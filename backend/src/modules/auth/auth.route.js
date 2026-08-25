const express = require("express");
const config = require("../../config/env");
const authController = require("./auth.controller");
const { requireUserSession } = require("../../middlewares/auth");
const { createRateLimiter } = require("../../middlewares/rateLimit");

const router = express.Router();
const loginRateLimiter = createRateLimiter({
  windowMs: config.loginRateLimitWindowMs,
  maxRequests: config.loginRateLimitMax,
});

//ฟังชันจัดการ route สำหรับการเข้าสู่ระบบ, ตรวจสอบข้อมูลผู้ใช้ และออกจากระบบ
router.post("/login", loginRateLimiter, authController.login);
router.get("/me", requireUserSession, authController.me);
router.post("/logout", requireUserSession, authController.logout);

module.exports = router;
