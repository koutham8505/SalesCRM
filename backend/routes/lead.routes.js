// D:\SalesCRM\backend\routes\lead.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const c = require("../controllers/leads.controller");

router.use(auth);

// Static routes MUST come before :id
router.get("/me", c.getMe);
router.get("/owners", c.getOwners);
router.get("/validation-rules", c.getValidationRules);
router.post("/import", c.importLeads);
router.post("/bulk-update", c.bulkUpdateLeads);

// Dynamic routes
router.get("/", c.getLeads);
router.post("/", c.createLead);
router.put("/:id", c.updateLead);
router.delete("/:id", c.deleteLead);

module.exports = router;
