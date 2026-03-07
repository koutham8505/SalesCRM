// D:\SalesCRM\backend\controllers\notifications.controller.js
const supabase = require("../config/supabase");

// GET /api/notifications  — returns this user's notifications
exports.getNotifications = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", req.user.id)
            .order("created_at", { ascending: false })
            .limit(50);
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ message: "Failed to load notifications" });
    }
};

// GET /api/notifications/unread-count
exports.getUnreadCount = async (req, res) => {
    try {
        const { count, error } = await supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", req.user.id)
            .eq("is_read", false);
        if (error) throw error;
        res.json({ count: count || 0 });
    } catch (err) {
        res.json({ count: 0 });
    }
};

// PUT /api/notifications/mark-read  — mark all as read
exports.markAllRead = async (req, res) => {
    try {
        await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", req.user.id)
            .eq("is_read", false);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Failed" });
    }
};

// PUT /api/notifications/:id/read  — mark one as read
exports.markOneRead = async (req, res) => {
    try {
        await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", req.params.id)
            .eq("user_id", req.user.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Failed" });
    }
};

// POST /api/notifications/mention  — @mention another user from a lead activity
exports.createMention = async (req, res) => {
    try {
        const { mentioned_user_id, lead_id, lead_name, context } = req.body;
        if (!mentioned_user_id) return res.status(400).json({ message: "mentioned_user_id required" });

        const { data, error } = await supabase
            .from("notifications")
            .insert([{
                user_id: mentioned_user_id,
                type: "mention",
                title: `📢 ${req.user.full_name || req.user.email} mentioned you`,
                body: context ? `On ${lead_name || "a lead"}: "${context.slice(0, 120)}"` : `On lead: ${lead_name || "—"}`,
                lead_id: lead_id || null,
            }])
            .select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(500).json({ message: "Failed to create mention" });
    }
};
