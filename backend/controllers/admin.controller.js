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
        // 1. Get all auth users (source of truth)
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;
        const authUsers = authData?.users || [];

        // 2. Get all profiles
        const { data: profiles } = await supabase.from("profiles").select("*");
        const profileMap = {};
        (profiles || []).map(p => profileMap[p.id] = p);

        // 3. Auto-create missing profile rows for any auth user without one
        const missing = authUsers.filter(u => !profileMap[u.id]);
        if (missing.length > 0) {
            const toInsert = missing.map(u => ({
                id: u.id,
                full_name: u.user_metadata?.full_name || u.email?.split("@")[0] || "New User",
                role: u.user_metadata?.role || "Executive",
                team: u.user_metadata?.team || null,
                department: u.user_metadata?.department || u.user_metadata?.team || "School",
                is_active: true,
            }));
            const { data: inserted } = await supabase.from("profiles").upsert(toInsert, { onConflict: "id" }).select();
            (inserted || []).forEach(p => profileMap[p.id] = p);
        }

        // 4. Build enriched list: every auth user, with their profile data
        const enriched = authUsers.map(u => {
            const profile = profileMap[u.id] || {};
            return {
                id: u.id,
                email: u.email || "unknown",
                full_name: profile.full_name || u.user_metadata?.full_name || u.email?.split("@")[0] || "Unknown",
                role: profile.role || u.user_metadata?.role || "Executive",
                team: profile.team || u.user_metadata?.team || null,
                department: profile.department || u.user_metadata?.department || "School",
                team_lead_id: profile.team_lead_id || null,
                is_active: profile.is_active !== false,
                feature_flags: profile.feature_flags || {},
                created_at: u.created_at,
                deleted_at: profile.deleted_at || null,
            };
        }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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
        const { full_name, role, team, department, team_lead_id, feature_flags } = req.body;
        const updates = {};
        if (full_name !== undefined) updates.full_name = full_name;
        if (role !== undefined) updates.role = role;
        if (team !== undefined) updates.team = team;
        if (department !== undefined) updates.department = department;
        if (team_lead_id !== undefined) updates.team_lead_id = team_lead_id;
        if (feature_flags !== undefined) updates.feature_flags = feature_flags;
        if (Object.keys(updates).length === 0) return res.status(400).json({ message: "No fields to update" });

        // Pass 1: Try full update (requires department + team_lead_id columns in profiles)
        let { data, error } = await supabase.from("profiles").update(updates).eq("id", id).select();

        if (error) {
            console.warn("updateUser full pass failed:", error.message, "— falling back to base fields");
            // Pass 2: Fallback — only update columns guaranteed to exist
            const base = {};
            if (full_name !== undefined) base.full_name = full_name;
            if (role !== undefined) base.role = role;
            if (team !== undefined) base.team = team;
            if (feature_flags !== undefined) base.feature_flags = feature_flags;
            ({ data, error } = await supabase.from("profiles").update(base).eq("id", id).select());
            if (error) throw error;
            await supabase.auth.admin.updateUserById(id, {
                user_metadata: { full_name: base.full_name || data[0]?.full_name, role: base.role || data[0]?.role },
            });
            logAudit(req.user.id, req.user.email, "USER_UPDATE", id, "profiles", base);
            return res.json({ ...data[0], _warning: "Run SQL migration to enable department/team_lead_id" });
        }

        await supabase.auth.admin.updateUserById(id, {
            user_metadata: {
                full_name: updates.full_name || data[0]?.full_name,
                role: updates.role || data[0]?.role,
                team: updates.team !== undefined ? updates.team : data[0]?.team,
                department: updates.department || data[0]?.department,
            },
        });
        logAudit(req.user.id, req.user.email, "USER_UPDATE", id, "profiles", updates);
        res.json(data[0]);
    } catch (err) {
        console.error("updateUser error:", err);
        res.status(500).json({ message: `User update failed: ${err.message}` });
    }
};


// PUT /api/admin/users/:id/toggle-active
const toggleUserActive = async (req, res) => {
    try {
        const { id } = req.params;
        if (id === req.user.id) return res.status(400).json({ message: "Cannot disable yourself" });

        // Ensure profile row exists first
        const { data: existing } = await supabase.from("profiles").select("id, is_active").eq("id", id).single();
        if (!existing) {
            // Auto-create profile for this auth user
            const { data: authUser } = await supabase.auth.admin.getUserById(id);
            const u = authUser?.user;
            if (!u) return res.status(404).json({ message: "User not found" });
            await supabase.from("profiles").insert({
                id: u.id,
                full_name: u.user_metadata?.full_name || u.email?.split("@")[0] || "User",
                role: u.user_metadata?.role || "Executive",
                team: u.user_metadata?.team || null,
                is_active: true,
            });
        }

        const currentActive = existing?.is_active ?? true;
        const newActive = !currentActive;

        const { data, error } = await supabase.from("profiles")
            .update({ is_active: newActive, deleted_at: newActive ? null : new Date().toISOString() })
            .eq("id", id).select();
        if (error) throw error;

        logAudit(req.user.id, req.user.email, newActive ? "USER_ENABLE" : "USER_DISABLE", id, "profiles", null);
        res.json({ is_active: newActive, user: data[0] });
    } catch (err) {
        console.error("toggleUserActive error:", err);
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

// DELETE /api/admin/users/:id  — permanently delete user from auth + profiles
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (id === req.user.id) return res.status(400).json({ message: "Cannot delete yourself" });

        // 1. Delete profile row first
        await supabase.from("profiles").delete().eq("id", id);

        // 2. Permanently delete from Supabase Auth
        const { error } = await supabase.auth.admin.deleteUser(id);
        if (error) throw error;

        logAudit(req.user.id, req.user.email, "USER_DELETE", id, "profiles", null);
        res.json({ success: true, deleted_id: id });
    } catch (err) {
        console.error("deleteUser error:", err);
        res.status(500).json({ message: "Failed to delete user" });
    }
};

module.exports = {
    requireAdmin, listUsers, updateUser, toggleUserActive, deleteUser,
    listFeatureRequests, updateFeatureRequest,
    getAuditLog, getValidationRules, updateValidationRule,
};
