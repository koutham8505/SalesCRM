// D:\SalesCRM\backend\controllers\templates.controller.js
const supabase = require("../config/supabase");

// GET /api/templates
exports.getTemplates = async (req, res) => {
    try {
        let query = supabase.from("lead_templates").select("*").order("type").order("title");
        const { data, error } = await query;
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ message: "Failed to load templates" });
    }
};

// POST /api/templates  (Admin/Manager)
exports.createTemplate = async (req, res) => {
    try {
        if (!["Admin", "Manager"].includes(req.user.role))
            return res.status(403).json({ message: "Admin or Manager only" });
        const { title, type, content } = req.body;
        if (!title?.trim() || !content?.trim()) return res.status(400).json({ message: "title and content required" });
        const { data, error } = await supabase
            .from("lead_templates")
            .insert([{
                title: title.trim(),
                type: type || "call_script",
                content: content.trim(),
                created_by: req.user.id,
                created_by_name: req.user.full_name || req.user.email,
            }])
            .select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(500).json({ message: "Failed to create template" });
    }
};

// PUT /api/templates/:id (Admin/Manager)
exports.updateTemplate = async (req, res) => {
    try {
        if (!["Admin", "Manager"].includes(req.user.role))
            return res.status(403).json({ message: "Admin or Manager only" });
        const updates = { updated_at: new Date().toISOString() };
        if (req.body.title) updates.title = req.body.title;
        if (req.body.type) updates.type = req.body.type;
        if (req.body.content) updates.content = req.body.content;
        const { data, error } = await supabase.from("lead_templates").update(updates).eq("id", req.params.id).select();
        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ message: "Failed to update template" });
    }
};

// DELETE /api/templates/:id (Admin/Manager)
exports.deleteTemplate = async (req, res) => {
    try {
        if (!["Admin", "Manager"].includes(req.user.role))
            return res.status(403).json({ message: "Admin or Manager only" });
        const { error } = await supabase.from("lead_templates").delete().eq("id", req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Failed to delete template" });
    }
};
