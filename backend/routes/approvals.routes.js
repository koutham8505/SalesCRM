// D:\SalesCRM\backend\routes\approvals.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const c = require("../controllers/approvals.controller");

router.use(auth);
router.get("/", c.getApprovals);
router.post("/", c.createApproval);
router.put("/:id/review", c.reviewApproval);
router.delete("/:id", c.cancelApproval);

module.exports = router;
