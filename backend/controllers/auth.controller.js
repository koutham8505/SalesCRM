// D:\SalesCRM\backend\controllers\auth.controller.js
const supabase = require("../config/supabase");

// POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { email, password, full_name, role, team } = req.body || {};

        // Basic validation
        if (!email || !password || !full_name || !role) {
            return res.status(400).json({
                message: "email, password, full_name and role are required",
            });
        }

        const validRoles = ["Admin", "Manager", "TeamLead", "Executive"];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                message: `role must be one of: ${validRoles.join(", ")}`,
            });
        }

        // Create auth user via Supabase admin (service role)
        const { data: authData, error: authError } =
            await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name, role, team: team || null },
            });

        if (authError) {
            console.error("Auth createUser error:", {
                message: authError.message,
                code: authError.code,
                status: authError.status,
            });

            // Supabase "unexpected_failure" / "Database error" = broken DB trigger
            // Provide a clearer message to the user
            if (authError.code === "unexpected_failure" || authError.message?.includes("Database error")) {
                return res.status(500).json({
                    message: "A database trigger is misconfigured. Please run fix_auth_trigger.sql in your Supabase SQL Editor to fix this.",
                    detail: authError.message,
                });
            }

            // Email already exists
            if (authError.message?.includes("already registered") || authError.status === 422) {
                return res.status(409).json({ message: "An account with this email already exists." });
            }

            return res.status(400).json({ message: authError.message });
        }

        const userId = authData.user.id;

        // Upsert profile — handles both: trigger already created it, or trigger is missing
        const { error: profileError } = await supabase
            .from("profiles")
            .upsert(
                [{ id: userId, full_name, role, team: team || null }],
                { onConflict: "id" } // update if trigger already inserted a row
            );

        if (profileError) {
            console.error("Profile upsert error:", profileError);
            // Don't roll back — auth user is created, profile can be fixed later
            // The user_metadata fallback in auth middleware will handle login
        }

        res.status(201).json({
            message: "User registered successfully",
            userId,
            email,
        });
    } catch (err) {
        console.error("register error:", err);
        res.status(500).json({ message: "Registration failed — " + (err.message || "unknown error") });
    }
};

// POST /api/auth/forgot-password-request
// User submits request → stored in DB → Admin/Manager approves → reset link sent
exports.forgotPasswordRequest = async (req, res) => {
    try {
        const { email, reason } = req.body || {};
        if (!email) return res.status(400).json({ message: "Email is required" });
        if (!reason) return res.status(400).json({ message: "Reason is required" });

        // Verify user exists
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const userExists = authUsers?.users?.some((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (!userExists) {
            // Don't reveal whether account exists — return success anyway (security)
            return res.json({ message: "If an account exists with that email, your request has been submitted." });
        }

        // Store request in feature_requests table (reusing existing table for admin review)
        await supabase.from("feature_requests").insert([{
            user_id: authUsers.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id,
            feature_name: "PASSWORD_RESET",
            description: `Password reset request from ${email}. Reason: ${reason}`,
            status: "Pending",
        }]);

        res.json({ message: "Your password reset request has been submitted and is pending admin/manager approval." });
    } catch (err) {
        console.error("forgotPasswordRequest error:", err);
        res.status(500).json({ message: "Failed to submit request — please try again later." });
    }
};
