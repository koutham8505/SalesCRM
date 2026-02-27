// D:\SalesCRM\backend\config\app.js
const express = require("express");
const cors = require("cors");

const leadRoutes = require("../routes/lead.routes");
const authRoutes = require("../routes/auth.routes");
const profileRoutes = require("../routes/profile.routes");
const adminRoutes = require("../routes/admin.routes");
const activitiesRoutes = require("../routes/activities.routes");
const tasksRoutes = require("../routes/tasks.routes");
const templatesRoutes = require("../routes/templates.routes");
const dashboardRoutes = require("../routes/dashboard.routes");
const rbacRoutes = require("../routes/rbac.routes");
const targetsRoutes = require("../routes/targets.routes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/leads", leadRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/activities", activitiesRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/templates", templatesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/rbac", rbacRoutes);
app.use("/api/targets", targetsRoutes);

module.exports = app;
