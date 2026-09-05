const express = require("express");
const path = require("path");
const authRoutes = require("./modules/auth/auth.route");
const alfrescoRoutes = require("./modules/alfresco/alfresco.route");
const alfrescoController = require("./modules/alfresco/alfresco.controller");
const config = require("./config/env");
const { requireUserSession } = require("./middlewares/auth");
const { allowConfiguredCors } = require("./middlewares/cors");
const { notFound } = require("./middlewares/errorHandler");
const { createRateLimiter } = require("./middlewares/rateLimit");

const app = express();
const apiRateLimiter = createRateLimiter({
  windowMs: config.apiRateLimitWindowMs,
  maxRequests: config.apiRateLimitMax,
  message: "Too many API requests. Please try again later.",
});

app.use(allowConfiguredCors);
app.use(express.json({ limit: "1mb" }));

// Frontend แยกออกจาก public เพื่อให้จัดการ UI เป็นส่วนของตัวเอง
// /login/ และ /frontend/ จะอ่านจากโฟลเดอร์ frontend ก่อน
app.use("/login", express.static(path.join(__dirname, "..", "..", "frontend", "login")));
app.use("/frontend", express.static(path.join(__dirname, "..", "..", "frontend", "documents")));

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.get("/health", alfrescoController.health);
app.use("/auth", authRoutes);

// ทุก endpoint ใต้ /user-api/alfresco/* ต้องผ่าน session middleware ก่อน
// middleware ตรวจได้ทั้ง Authorization: Bearer <token> และ cookie alfresco_user_session
app.use("/user-api/alfresco", apiRateLimiter, requireUserSession, alfrescoRoutes);

app.use(notFound);

module.exports = app;
