// D:\SalesCRM\backend\controllers\tasks.controller.js
const supabase = require("../config/supabase");

const applyTaskFilters = (query, user) => {
    if (user.role === "Admin") return query;
    if (user.role === "Manager" || user.role === "TeamLead") {
        if (user.team) return query.eq("team", user.team);
        return query.eq("owner_id", user.id);
    }
    return query.eq("owner_id", user.id);
};

// GET /api/tasks
exports.getTasks = async (req, res) => {
    try {
        let query = supabase.from("tasks").select("*").order("due_date", { ascending: true });
        query = applyTaskFilters(query, req.user);
        const { data, error } = await query;
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error("getTasks error:", err);
        res.status(500).json({ message: "Failed to load tasks" });
    }
};

// POST /api/tasks
exports.createTask = async (req, res) => {
    try {
        const { title, description, due_date, lead_id, lead_name, assigned_to, assigned_to_name } = req.body;
        if (!title) return res.status(400).json({ message: "title is required" });

        const { data, error } = await supabase
            .from("tasks")
            .insert([{
                title,
                description: description || "",
                due_date: due_date || null,
                lead_id: lead_id || null,
                lead_name: lead_name || null,
                owner_id: req.user.id,
                team: req.user.team || null,
                status: "Pending",
                assigned_to: assigned_to || null,
                assigned_to_name: assigned_to_name || null,
            }])
            .select();

        if (error) throw error;

        // Notify assigned user if it's not self-assignment
        if (assigned_to && assigned_to !== req.user.id) {
            try {
                await require("../config/supabase").from("notifications").insert([{
                    user_id: assigned_to,
                    type: "task_assigned",
                    title: `📌 Task assigned to you`,
                    body: `${req.user.full_name || req.user.email} assigned you: "${title}"${lead_name ? ` (${lead_name})` : ""}`,
                    lead_id: lead_id || null,
                }]);
            } catch { /* non-fatal */ }
        }

        res.status(201).json(data[0]);
    } catch (err) {
        console.error("createTask error:", err);
        res.status(500).json({ message: "Failed to create task" });
    }
};

// PUT /api/tasks/:id
exports.updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, due_date, status } = req.body;
        const updates = {};
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (due_date !== undefined) updates.due_date = due_date;
        if (status !== undefined) updates.status = status;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "No fields to update" });
        }

        const { data, error } = await supabase.from("tasks").update(updates).eq("id", id).select();
        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        console.error("updateTask error:", err);
        res.status(500).json({ message: "Failed to update task" });
    }
};

// DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
    try {
        const { error } = await supabase.from("tasks").delete().eq("id", req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error("deleteTask error:", err);
        res.status(500).json({ message: "Failed to delete task" });
    }
};
