// D:\SalesCRM\backend\controllers\admin.controller.js
const supabase = require("../config/supabase");
const logAudit = require("../middleware/auditLog");

const requireAdmin = (req, res, next) => {
    if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin access required" });
    next();
};

// GET /api/admin/users
const listUsers = async (req, res) => {
    try {
        const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const emailMap = {};
        if (authUsers?.users) authUsers.users.forEach((u) => (emailMap[u.id] = u.email));
        const enriched = (data || []).map((p) => ({ ...p, email: emailMap[p.id] || "unknown" }));
        res.json(enriched);
    } catch (err) {
        console.error("listUsers error:", err);
        res.status(500).json({ message: "Failed to load users" });
    }
};

// PUT /api/admin/users/:id
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, role, team, feature_flags } = req.body;
        const updates = {};
        if (full_name !== undefined) updates.full_name = full_name;
        if (role !== undefined) updates.role = role;
        if (team !== undefined) updates.team = team;
        if (feature_flags !== undefined) updates.feature_flags = feature_flags;
        if (Object.keys(updates).length === 0) return res.status(400).json({ message: "No fields" });

        const { data, error } = await supabase.from("profiles").update(updates).eq("id", id).select();
        if (error) throw error;

        await supabase.auth.admin.updateUserById(id, {
            user_metadata: { full_name: updates.full_name || data[0]?.full_name, role: updates.role || data[0]?.role, team: updates.team !== undefined ? updates.team : data[0]?.team },
        });

        logAudit(req.user.id, req.user.email, "USER_UPDATE", id, "profiles", updates);
        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ message: "User update failed" });
    }
};

// PUT /api/admin/users/:id/toggle-active
const toggleUserActive = async (req, res) => {
    try {
        const { id } = req.params;
        if (id === req.user.id) return res.status(400).json({ message: "Cannot disable yourself" });

        const { data: current } = await supabase.from("profiles").select("is_active").eq("id", id).single();
        const newActive = !(current?.is_active ?? true);

        const { data, error } = await supabase.from("profiles")
            .update({ is_active: newActive, deleted_at: newActive ? null : new Date().toISOString() })
            .eq("id", id).select();
        if (error) throw error;

        logAudit(req.user.id, req.user.email, newActive ? "USER_ENABLE" : "USER_DISABLE", id, "profiles", null);
        res.json({ is_active: newActive, user: data[0] });
    } catch (err) {
        res.status(500).json({ message: "Failed to update user status" });
    }
};

// GET /api/admin/feature-requests
const listFeatureRequests = async (req, res) => {
    try {
        const { data, error } = await supabase.from("feature_requests").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        const userIds = [...new Set((data || []).map((r) => r.user_id))];
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, role, team").in("id", userIds.length ? userIds : ["_"]);
        const profileMap = {};
        (profiles || []).forEach((p) => (profileMap[p.id] = p));
        res.json((data || []).map((r) => ({ ...r, user: profileMap[r.user_id] || { full_name: "Unknown" } })));
    } catch (err) {
        res.status(500).json({ message: "Failed to load feature requests" });
    }
};

// PUT /api/admin/feature-requests/:id
const updateFeatureRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, admin_comment, apply_flags } = req.body;
        if (!["Approved", "Rejected"].includes(status)) return res.status(400).json({ message: "Invalid status" });

        const { data: request } = await supabase.from("feature_requests").select("*").eq("id", id).single();
        if (!request) return res.status(404).json({ message: "Not found" });

        await supabase.from("feature_requests").update({ status, admin_comment: admin_comment || null, updated_at: new Date().toISOString() }).eq("id", id);

        if (status === "Approved" && apply_flags) {
            const { data: profile } = await supabase.from("profiles").select("feature_flags").eq("id", request.user_id).single();
            await supabase.from("profiles").update({ feature_flags: { ...(profile?.feature_flags || {}), ...apply_flags } }).eq("id", request.user_id);
        }

        logAudit(req.user.id, req.user.email, "FEATURE_REQUEST_" + status.toUpperCase(), id, "feature_requests", { apply_flags });
        res.json({ message: `Request ${status.toLowerCase()}` });
    } catch (err) {
        res.status(500).json({ message: "Failed to update request" });
    }
};

// GET /api/admin/audit-log
const getAuditLog = async (req, res) => {
    try {
        let query = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
        if (req.query.action) query = query.eq("action_type", req.query.action);
        if (req.query.user_id) query = query.eq("user_id", req.query.user_id);
        const { data, error } = await query;
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ message: "Failed to load audit log" });
    }
};

// PUT /api/admin/validation-rules/:id
const updateValidationRule = async (req, res) => {
    try {
        const { required, regex, message } = req.body;
        const updates = {};
        if (required !== undefined) updates.required = required;
        if (regex !== undefined) updates.regex = regex;
        if (message !== undefined) updates.message = message;
        updates.updated_at = new Date().toISOString();
        const { data, error } = await supabase.from("validation_rules").update(updates).eq("id", req.params.id).select();
        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ message: "Failed to update rule" });
    }
};

// GET /api/admin/validation-rules
const getValidationRules = async (req, res) => {
    try {
        const { data, error } = await supabase.from("validation_rules").select("*").order("field_name");
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.json([]);
    }
};

module.exports = {
    requireAdmin, listUsers, updateUser, toggleUserActive,
    listFeatureRequests, updateFeatureRequest,
    getAuditLog, getValidationRules, updateValidationRule,
};
