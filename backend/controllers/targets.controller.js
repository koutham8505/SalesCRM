// D:\SalesCRM\backend\controllers\targets.controller.js
const supabase = require("../config/supabase");

// Helper to filter targets properly based on role
const applyTargetFilters = (query, user) => {
    if (user.role === "Admin" || user.role === "Manager") return query;
    if (user.role === "TeamLead") {
        if (user.team) return query.eq("team", user.team);
        return query.eq("owner_id", user.id);
    }
    return query.eq("owner_id", user.id);
};

// GET /api/targets
exports.getTargets = async (req, res) => {
    try {
        let query = supabase
            .from("sales_targets")
            .select("*")
            .order("created_at", { ascending: false });
        query = applyTargetFilters(query, req.user);

        const { data, error } = await query;
        if (error) throw error;

        const targets = data || [];

        // Enrich with owner profile names (separate query, no FK dependency)
        if (targets.length > 0) {
            const ownerIds = [...new Set(targets.map(t => t.owner_id).filter(Boolean))];
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, full_name, role")
                .in("id", ownerIds);

            const profileMap = {};
            (profiles || []).forEach(p => { profileMap[p.id] = p; });

            targets.forEach(t => {
                t.owner = profileMap[t.owner_id] || null;
            });
        }

        res.json(targets);
    } catch (err) {
        console.error("getTargets error:", err.message);
        res.status(500).json({ message: "Failed to load sales targets" });
    }
};

// POST /api/targets
// Only Managers/Admins can set targets, or TeamLeads for their own team
exports.createTarget = async (req, res) => {
    try {
        const { owner_id, team, target_type, period_label, target_leads, target_won, target_value, notes } = req.body;

        if (!owner_id || !target_type || !period_label) {
            return res.status(400).json({ message: "owner_id, target_type, period_label required" });
        }

        const payload = {
            owner_id,
            team: team || req.user.team,
            target_type,
            period_label,
            target_leads: target_leads || 0,
            target_won: target_won || 0,
            target_value: target_value || 0,
            notes: notes || "",
            created_by: req.user.id
        };

        const { data, error } = await supabase.from("sales_targets").insert([payload]).select();
        if (error) throw error;

        res.status(201).json(data[0]);
    } catch (err) {
        console.error("createTarget error:", err);
        res.status(500).json({ message: "Failed to create sales target" });
    }
};

// PUT /api/targets/:id
exports.updateTarget = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };
        delete updates.id;
        delete updates.created_at;

        // Ensure no malicious field update
        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabase.from("sales_targets").update(updates).eq("id", id).select();
        if (error) throw error;

        res.json(data[0]);
    } catch (err) {
        console.error("updateTarget error:", err);
        res.status(500).json({ message: "Failed to update sales target" });
    }
};

// DELETE /api/targets/:id
exports.deleteTarget = async (req, res) => {
    try {
        const { error } = await supabase.from("sales_targets").delete().eq("id", req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error("deleteTarget error:", err);
        res.status(500).json({ message: "Failed to delete sales target" });
    }
};
