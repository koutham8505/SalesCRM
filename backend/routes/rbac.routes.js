// D:\SalesCRM\backend\routes\rbac.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const c = require("../controllers/rbac.controller");

// Require auth for all
router.use(auth);

// All RBAC endpoints require Admin access, so we check it in the controller or inline middleware
const requireAdmin = (req, res, next) => {
    if (req.user.role !== "Admin") {
        return res.status(403).json({ message: "Admin access required" });
    }
    next();
};
router.use(requireAdmin);

// Routes
router.get("/roles", c.getRoleDefaults);
router.put("/roles", c.updateRoleDefaults);
router.get("/users", c.getUserPermissions);
router.put("/users", c.updateUserPermission);
router.delete("/users", c.deleteUserPermission);

module.exports = router;
