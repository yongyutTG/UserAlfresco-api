const express = require("express");
const authController = require("./auth.controller");
const { requireUserSession } = require("../../middlewares/auth");

const router = express.Router();
//ฟังชันจัดการ route สำหรับการเข้าสู่ระบบ, ตรวจสอบข้อมูลผู้ใช้ และออกจากระบบ
router.post("/login", authController.login);
router.get("/me", requireUserSession, authController.me);
router.post("/logout", requireUserSession, authController.logout);

module.exports = router;
