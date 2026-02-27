// D:\SalesCRM\backend\controllers\activities.controller.js
const supabase = require("../config/supabase");
const logAudit = require("../middleware/auditLog");

// GET /api/activities/:leadId
exports.getActivities = async (req, res) => {
    try {
        const { leadId } = req.params;
        const { data, error } = await supabase
            .from("lead_activities")
            .select("*")
            .eq("lead_id", leadId)
            .order("created_at", { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error("getActivities error:", err);
        res.status(500).json({ message: "Failed to load activities" });
    }
};

// POST /api/activities
// Creates an activity and, for CALL type, updates last_called_at on the lead.
exports.createActivity = async (req, res) => {
    try {
        const { lead_id, type, description, duration, outcome } = req.body;
        if (!lead_id || !type) {
            return res.status(400).json({ message: "lead_id and type are required" });
        }
        // PITCH_DECK added for pitch-deck outreach tracking
        const validTypes = ["CALL", "EMAIL", "MEETING", "NOTE", "PITCH_DECK"];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ message: `type must be one of: ${validTypes.join(", ")}` });
        }

        const { data, error } = await supabase
            .from("lead_activities")
            .insert([{
                lead_id,
                user_id: req.user.id,
                type,
                description: description || "",
                duration: duration || null,
                outcome: outcome || null,
            }])
            .select();

        if (error) throw error;

        // When a CALL activity is logged, update last_called_at on the lead
        if (type === "CALL") {
            await supabase
                .from("my_leads")
                .update({ last_called_at: new Date().toISOString() })
                .eq("id", lead_id);
        }

        logAudit(req.user.id, req.user.email, "ACTIVITY_CREATE", data[0]?.id, "lead_activities", { lead_id, type });

        res.status(201).json(data[0]);
    } catch (err) {
        console.error("createActivity error:", err);
        res.status(500).json({ message: "Failed to create activity" });
    }
};
