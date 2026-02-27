// D:\SalesCRM\backend\routes\dashboard.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { getMetrics } = require("../controllers/dashboard.controller");

// Single endpoint — all dashboard metrics from my_leads
router.get("/metrics", auth, getMetrics);

module.exports = router;
