// D:\SalesCRM\backend\controllers\templates.controller.js
const supabase = require("../config/supabase");

// GET /api/templates
exports.getTemplates = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("email_templates")
            .select("*")
            .order("name");
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ message: "Failed to load templates" });
    }
};

// POST /api/templates (Admin only)
exports.createTemplate = async (req, res) => {
    try {
        if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin only" });
        const { name, subject, body } = req.body;
        if (!name || !subject || !body) return res.status(400).json({ message: "name, subject, body required" });
        const { data, error } = await supabase.from("email_templates")
            .insert([{ name, subject, body, created_by: req.user.id }]).select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(500).json({ message: "Failed to create template" });
    }
};

// PUT /api/templates/:id (Admin only)
exports.updateTemplate = async (req, res) => {
    try {
        if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin only" });
        const updates = {};
        if (req.body.name) updates.name = req.body.name;
        if (req.body.subject) updates.subject = req.body.subject;
        if (req.body.body) updates.body = req.body.body;
        const { data, error } = await supabase.from("email_templates")
            .update(updates).eq("id", req.params.id).select();
        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ message: "Failed to update template" });
    }
};

// DELETE /api/templates/:id (Admin only)
exports.deleteTemplate = async (req, res) => {
    try {
        if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin only" });
        const { error } = await supabase.from("email_templates").delete().eq("id", req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Failed to delete template" });
    }
};
