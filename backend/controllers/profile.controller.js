// D:\SalesCRM\backend\controllers\profile.controller.js
const supabase = require("../config/supabase");

// GET /api/profile/me
exports.getMyProfile = async (req, res) => {
    try {
        res.json({
            id: req.user.id,
            email: req.user.email,
            full_name: req.user.full_name,
            job_title: req.user.job_title || "",
            role: req.user.role,
            team: req.user.team || "",
            feature_flags: req.user.feature_flags || {},
        });
    } catch (err) {
        console.error("getMyProfile error:", err);
        res.status(500).json({ message: "Failed to load profile" });
    }
};

// PUT /api/profile/me
exports.updateMyProfile = async (req, res) => {
    try {
        const user = req.user;
        const { full_name, job_title, team } = req.body;
        const updates = {};

        // Everyone can edit full_name and job_title
        if (full_name !== undefined) updates.full_name = full_name;
        if (job_title !== undefined) updates.job_title = job_title;

        // Only Manager and Admin can edit their own team
        if (team !== undefined && (user.role === "Manager" || user.role === "Admin")) {
            updates.team = team;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "No valid fields to update" });
        }

        const { data, error } = await supabase
            .from("profiles")
            .update(updates)
            .eq("id", user.id)
            .select();

        if (error) throw error;

        // Also update user_metadata in auth
        await supabase.auth.admin.updateUserById(user.id, {
            user_metadata: {
                full_name: updates.full_name || user.full_name,
                role: user.role,
                team: updates.team || user.team,
            },
        });

        res.json(data[0] || updates);
    } catch (err) {
        console.error("updateMyProfile error:", err);
        res.status(500).json({ message: "Profile update failed" });
    }
};

// POST /api/profile/change-password
exports.changePassword = async (req, res) => {
    try {
        const { new_password } = req.body;

        if (!new_password || new_password.length < 8) {
            return res
                .status(400)
                .json({ message: "Password must be at least 8 characters" });
        }

        const { error } = await supabase.auth.admin.updateUserById(req.user.id, {
            password: new_password,
        });

        if (error) throw error;

        res.json({ message: "Password updated successfully" });
    } catch (err) {
        console.error("changePassword error:", err);
        res.status(500).json({ message: "Password change failed" });
    }
};

// POST /api/profile/feature-request
exports.submitFeatureRequest = async (req, res) => {
    try {
        const { requested_features, reason } = req.body;

        if (!requested_features) {
            return res
                .status(400)
                .json({ message: "requested_features is required" });
        }

        const { data, error } = await supabase
            .from("feature_requests")
            .insert([
                {
                    user_id: req.user.id,
                    requested_features,
                    reason: reason || "",
                    status: "Pending",
                },
            ])
            .select();

        if (error) throw error;

        res.status(201).json({
            message: "Request submitted",
            request: data[0],
        });
    } catch (err) {
        console.error("submitFeatureRequest error:", err);
        res.status(500).json({ message: "Failed to submit request" });
    }
};

// GET /api/profile/feature-requests — user's own requests
exports.getMyFeatureRequests = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("feature_requests")
            .select("*")
            .eq("user_id", req.user.id)
            .order("created_at", { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error("getMyFeatureRequests error:", err);
        res.status(500).json({ message: "Failed to load requests" });
    }
};
