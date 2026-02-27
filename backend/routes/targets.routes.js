// D:\SalesCRM\backend\routes\targets.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const c = require("../controllers/targets.controller");

router.use(auth);

// Managers/Admins/TeamLeads check is generally done inside controller
// or UI handles the hiding, but we can do a quick check here if needed.
// For now relying on controller applyTargetFilters and explicit UI.

router.get("/", c.getTargets);
router.post("/", c.createTarget);
router.put("/:id", c.updateTarget);
router.delete("/:id", c.deleteTarget);

module.exports = router;
