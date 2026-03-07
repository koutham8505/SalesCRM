// D:\SalesCRM\backend\controllers\announcements.controller.js
const supabase = require("../config/supabase");

// GET /api/announcements — all active (everyone)
exports.getAnnouncements = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("announcements")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(20);
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ message: "Failed to load announcements" });
    }
};

// POST /api/announcements — admin/manager only
exports.createAnnouncement = async (req, res) => {
    try {
        if (!["Admin", "Manager"].includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        const { title, body, priority = "normal", expires_at } = req.body;
        if (!title || !body) return res.status(400).json({ message: "title and body required" });

        const { data, error } = await supabase
            .from("announcements")
            .insert([{
                title,
                body,
                priority,       // normal | important | urgent
                expires_at: expires_at || null,
                created_by: req.user.id,
                created_by_name: req.user.full_name || req.user.email,
                is_active: true,
            }])
            .select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(500).json({ message: "Failed to create announcement" });
    }
};

// DELETE /api/announcements/:id — admin/manager only
exports.deleteAnnouncement = async (req, res) => {
    try {
        if (!["Admin", "Manager"].includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        await supabase
            .from("announcements")
            .update({ is_active: false })
            .eq("id", req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Failed" });
    }
};
