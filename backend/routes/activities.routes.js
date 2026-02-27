// D:\SalesCRM\backend\routes\activities.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { getActivities, createActivity } = require("../controllers/activities.controller");

router.use(auth);
router.get("/:leadId", getActivities);
router.post("/", createActivity);

module.exports = router;
