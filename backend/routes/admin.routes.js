// D:\SalesCRM\backend\routes\admin.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
    requireAdmin, listUsers, updateUser, toggleUserActive,
    listFeatureRequests, updateFeatureRequest,
    getAuditLog, getValidationRules, updateValidationRule,
} = require("../controllers/admin.controller");

router.use(auth);
router.use(requireAdmin);

router.get("/users", listUsers);
router.put("/users/:id", updateUser);
router.put("/users/:id/toggle-active", toggleUserActive);
router.get("/feature-requests", listFeatureRequests);
router.put("/feature-requests/:id", updateFeatureRequest);
router.get("/audit-log", getAuditLog);
router.get("/validation-rules", getValidationRules);
router.put("/validation-rules/:id", updateValidationRule);

module.exports = router;
