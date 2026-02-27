// D:\SalesCRM\backend\controllers\rbac.controller.js
const supabase = require("../config/supabase");

// Helper: Ensure user is Admin
const requireAdmin = (req, res, next) => {
    if (req.user.role !== "Admin") {
        return res.status(403).json({ message: "Admin access required" });
    }
    next();
};

// GET /api/rbac/roles
// Fetch default permissions for each role
exports.getRoleDefaults = async (req, res) => {
    try {
        const { data, error } = await supabase.from("rbac_role_defaults").select("*").order("role");
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error("getRoleDefaults error:", err);
        res.status(500).json({ message: "Failed to load role defaults" });
    }
};

// PUT /api/rbac/roles
// Update default permissions for a role
exports.updateRoleDefaults = async (req, res) => {
    try {
        const { role, permission, granted } = req.body;
        if (!role || !permission || granted === undefined) {
            return res.status(400).json({ message: "role, permission, granted required" });
        }

        // Upsert the specific permission for the role
        const { data, error } = await supabase
            .from("rbac_role_defaults")
            .upsert(
                { role, permission, granted },
                { onConflict: 'role, permission' }
            )
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        console.error("updateRoleDefaults error:", err);
        res.status(500).json({ message: "Failed to update role default" });
    }
};

// GET /api/rbac/users
// Fetch all user specific permission overrides
exports.getUserPermissions = async (req, res) => {
    try {
        const { data, error } = await supabase.from("rbac_permissions").select("*");
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error("getUserPermissions error:", err);
        res.status(500).json({ message: "Failed to load user permissions" });
    }
};

// PUT /api/rbac/users
// Update a specific override for a user
exports.updateUserPermission = async (req, res) => {
    try {
        const { user_id, permission, granted, reason } = req.body;
        if (!user_id || !permission || granted === undefined) {
            return res.status(400).json({ message: "user_id, permission, granted required" });
        }

        const { data, error } = await supabase
            .from("rbac_permissions")
            .upsert(
                { user_id, permission, granted, reason, granted_by: req.user.id },
                { onConflict: 'user_id, permission' }
            )
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        console.error("updateUserPermission error:", err);
        res.status(500).json({ message: "Failed to update user permission" });
    }
};

// DELETE /api/rbac/users
// Remove a user override (revert to role default)
exports.deleteUserPermission = async (req, res) => {
    try {
        const { user_id, permission } = req.query;
        if (!user_id || !permission) {
            return res.status(400).json({ message: "user_id and permission required" });
        }

        const { error } = await supabase
            .from("rbac_permissions")
            .delete()
            .match({ user_id, permission });

        if (error) throw error;
        res.json({ success: true, message: "Permission override removed" });
    } catch (err) {
        console.error("deleteUserPermission error:", err);
        res.status(500).json({ message: "Failed to delete user permission" });
    }
};
