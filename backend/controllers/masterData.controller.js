// D:\SalesCRM\backend\controllers\masterData.controller.js
const supabase = require("../config/supabase");

// GET /api/master-data?category=board
exports.getMasterData = async (req, res) => {
    try {
        let query = supabase.from("master_data").select("*").eq("is_active", true).order("sort_order");
        if (req.query.category) query = query.eq("category", req.query.category);
        const { data, error } = await query;
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ message: "Failed to load master data" });
    }
};

// GET /api/master-data/all — Admin: all including inactive
exports.getAllMasterData = async (req, res) => {
    try {
        if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin only" });
        const { data, error } = await supabase.from("master_data").select("*").order("category").order("sort_order");
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ message: "Failed to load master data" });
    }
};

// POST /api/master-data — Admin only
exports.createMasterData = async (req, res) => {
    try {
        if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin only" });
        const { category, value, sort_order } = req.body;
        if (!category || !value) return res.status(400).json({ message: "category and value required" });
        const { data, error } = await supabase
            .from("master_data")
            .insert([{ category, value, sort_order: sort_order || 0, is_active: true }])
            .select();
        if (error) {
            if (error.code === "23505") return res.status(400).json({ message: `"${value}" already exists in ${category}` });
            throw error;
        }
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(500).json({ message: "Failed to create entry" });
    }
};

// PUT /api/master-data/:id — Admin only
exports.updateMasterData = async (req, res) => {
    try {
        if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin only" });
        const updates = {};
        if (req.body.value !== undefined) updates.value = req.body.value;
        if (req.body.is_active !== undefined) updates.is_active = req.body.is_active;
        if (req.body.sort_order !== undefined) updates.sort_order = req.body.sort_order;
        const { data, error } = await supabase.from("master_data").update(updates).eq("id", req.params.id).select();
        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ message: "Failed to update entry" });
    }
};

// DELETE /api/master-data/:id — Admin only
exports.deleteMasterData = async (req, res) => {
    try {
        if (req.user.role !== "Admin") return res.status(403).json({ message: "Admin only" });
        const { error } = await supabase.from("master_data").delete().eq("id", req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Failed to delete entry" });
    }
};
