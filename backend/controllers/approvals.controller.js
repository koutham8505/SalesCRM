// D:\SalesCRM\backend\controllers\approvals.controller.js
const supabase = require("../config/supabase");

const MANAGER_ROLES = ["Admin", "Manager"];

// Helper: create a notification for all Managers/Admins
const notifyManagers = async (title, body, leadId) => {
    try {
        const { data: mgrs } = await supabase
            .from("profiles")
            .select("id")
            .in("role", ["Admin", "Manager"]);
        if (!mgrs?.length) return;
        const inserts = mgrs.map((m) => ({
            user_id: m.id,
            type: "approval_request",
            title,
            body,
            lead_id: leadId || null,
        }));
        await supabase.from("notifications").insert(inserts);
    } catch { /* non-fatal */ }
};

// Helper: create a notification for one user
const notifyUser = async (userId, title, body, leadId) => {
    try {
        await supabase.from("notifications").insert([{
            user_id: userId,
            type: "approval_update",
            title,
            body,
            lead_id: leadId || null,
        }]);
    } catch { /* non-fatal */ }
};

// GET /api/approvals  — Managers see all; Executives see their own
exports.getApprovals = async (req, res) => {
    try {
        const user = req.user;
        let query = supabase.from("approvals").select("*").order("created_at", { ascending: false });
        if (!MANAGER_ROLES.includes(user.role)) {
            query = query.eq("requested_by", user.id);
        } else if (user.role === "Manager" && user.team) {
            // Manager sees all — no extra filter needed
        }
        const { data, error } = await query;
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ message: "Failed to load approvals" });
    }
};

// POST /api/approvals — Any user can request
exports.createApproval = async (req, res) => {
    try {
        const user = req.user;
        const { lead_id, lead_name, request_type, description, amount } = req.body;
        if (!description?.trim()) return res.status(400).json({ message: "description required" });

        const { data, error } = await supabase
            .from("approvals")
            .insert([{
                lead_id: lead_id || null,
                lead_name: lead_name || null,
                requested_by: user.id,
                requested_by_name: user.full_name || user.email,
                request_type: request_type || "custom",
                description: description.trim(),
                amount: amount ? parseFloat(amount) : null,
                status: "Pending",
            }])
            .select();
        if (error) throw error;

        // Notify managers
        await notifyManagers(
            `📋 New Approval Request`,
            `${user.full_name || user.email} requested ${request_type || "approval"}: "${description.slice(0, 60)}"`,
            lead_id
        );

        res.status(201).json(data[0]);
    } catch (err) {
        res.status(500).json({ message: "Failed to create approval" });
    }
};

// PUT /api/approvals/:id — Manager/Admin can approve or reject
exports.reviewApproval = async (req, res) => {
    try {
        const user = req.user;
        if (!MANAGER_ROLES.includes(user.role)) {
            return res.status(403).json({ message: "Only Managers/Admins can review approvals" });
        }
        const { status, reviewer_note } = req.body;
        if (!["Approved", "Rejected"].includes(status)) {
            return res.status(400).json({ message: "status must be Approved or Rejected" });
        }

        const { data: existing } = await supabase.from("approvals").select("*").eq("id", req.params.id).single();
        if (!existing) return res.status(404).json({ message: "Approval not found" });
        if (existing.status !== "Pending") return res.status(400).json({ message: "Already reviewed" });

        const { data, error } = await supabase
            .from("approvals")
            .update({
                status,
                reviewed_by: user.id,
                reviewed_by_name: user.full_name || user.email,
                reviewer_note: reviewer_note || null,
                reviewed_at: new Date().toISOString(),
            })
            .eq("id", req.params.id)
            .select();
        if (error) throw error;

        // Notify the requester
        const emoji = status === "Approved" ? "✅" : "❌";
        await notifyUser(
            existing.requested_by,
            `${emoji} Approval ${status}`,
            `Your request "${existing.description.slice(0, 60)}" was ${status.toLowerCase()} by ${user.full_name || user.email}${reviewer_note ? `: "${reviewer_note}"` : ""}`,
            existing.lead_id
        );

        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ message: "Failed to review approval" });
    }
};

// DELETE /api/approvals/:id — requester can cancel pending requests
exports.cancelApproval = async (req, res) => {
    try {
        const user = req.user;
        const { data: existing } = await supabase.from("approvals").select("*").eq("id", req.params.id).single();
        if (!existing) return res.status(404).json({ message: "Not found" });

        const canDelete = MANAGER_ROLES.includes(user.role) || existing.requested_by === user.id;
        if (!canDelete) return res.status(403).json({ message: "Not allowed" });
        if (existing.status !== "Pending") return res.status(400).json({ message: "Can only cancel Pending approvals" });

        await supabase.from("approvals").delete().eq("id", req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Failed to cancel approval" });
    }
};
