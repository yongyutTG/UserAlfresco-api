const express = require("express");
const path = require("path");
const authRoutes = require("./modules/auth/auth.route");
const alfrescoRoutes = require("./modules/alfresco/alfresco.route");
const alfrescoController = require("./modules/alfresco/alfresco.controller");
const { requireUserSession } = require("./middlewares/auth");
const { notFound } = require("./middlewares/errorHandler");

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.get("/health", alfrescoController.health);
app.use("/auth", authRoutes);

// ทุก endpoint ใต้ /user-api/alfresco/* ต้องผ่าน session middleware ก่อน
// middleware ตรวจได้ทั้ง Authorization: Bearer <token> และ cookie alfresco_user_session
app.use("/user-api/alfresco", requireUserSession, alfrescoRoutes);

app.use(notFound);

module.exports = app;
