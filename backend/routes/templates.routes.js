// D:\SalesCRM\backend\routes\templates.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { getTemplates, createTemplate, updateTemplate, deleteTemplate } = require("../controllers/templates.controller");

router.use(auth);
router.get("/", getTemplates);
router.post("/", createTemplate);
router.put("/:id", updateTemplate);
router.delete("/:id", deleteTemplate);

module.exports = router;
