// D:\SalesCRM\backend\controllers\leadNotes.controller.js
const supabase = require("../config/supabase");

// GET /api/leads/:id/notes
exports.getNotes = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("lead_notes")
            .select("*")
            .eq("lead_id", req.params.id)
            .order("created_at", { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ message: "Failed to load notes" });
    }
};

// POST /api/leads/:id/notes
exports.createNote = async (req, res) => {
    try {
        const { note } = req.body;
        if (!note?.trim()) return res.status(400).json({ message: "Note text required" });
        const { data, error } = await supabase
            .from("lead_notes")
            .insert([{
                lead_id: req.params.id,
                user_id: req.user.id,
                user_name: req.user.full_name || req.user.email,
                note: note.trim(),
            }])
            .select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(500).json({ message: "Failed to save note" });
    }
};

// DELETE /api/leads/:id/notes/:noteId
exports.deleteNote = async (req, res) => {
    try {
        const { error } = await supabase
            .from("lead_notes")
            .delete()
            .eq("id", req.params.noteId)
            .eq("user_id", req.user.id); // only own notes
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Failed to delete note" });
    }
};
