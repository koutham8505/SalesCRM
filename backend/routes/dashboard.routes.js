// D:\SalesCRM\backend\routes\dashboard.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
    getMetrics,
    getFunnel,
    getTeamProductivity,
    getSourcePerformance,
} = require("../controllers/dashboard.controller");

// Phase 1 — all dashboard metrics from my_leads
router.get("/metrics", auth, getMetrics);

// Phase 2 — new analytics endpoints
router.get("/funnel", auth, getFunnel);
router.get("/team-productivity", auth, getTeamProductivity);
router.get("/source-performance", auth, getSourcePerformance);

module.exports = router;
