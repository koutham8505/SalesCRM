// D:\SalesCRM\backend\routes\lead.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const c = require("../controllers/leads.controller");
const notes = require("../controllers/leadNotes.controller");

router.use(auth);

// Static routes MUST come before :id
router.get("/me", c.getMe);
router.get("/owners", c.getOwners);
router.get("/validation-rules", c.getValidationRules);
router.get("/duplicates", c.getDuplicates);
router.post("/import", c.importLeads);
router.post("/bulk-update", c.bulkUpdateLeads);
router.post("/merge", c.mergeLeads);

// Dynamic routes
router.get("/", c.getLeads);
router.post("/", c.createLead);
router.put("/:id", c.updateLead);
router.delete("/:id", c.deleteLead);

// Per-lead notes
router.get("/:id/notes", notes.getNotes);
router.post("/:id/notes", notes.createNote);
router.delete("/:id/notes/:noteId", notes.deleteNote);

module.exports = router;
