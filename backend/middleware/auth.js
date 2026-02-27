// D:\SalesCRM\backend\middleware\auth.js
const supabase = require("../config/supabase");

module.exports = async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Missing Authorization token" });
    }

    // Verify token
    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !authData?.user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const user = authData.user;
    const meta = user.user_metadata || {};

    // Get profile from DB
    let profile = null;
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profileError && profileData) {
      profile = profileData;

      // AUTO-FIX: If the profile has a placeholder name but user_metadata has the real name, sync it
      const isPlaceholder =
        !profile.full_name ||
        profile.full_name === "New User" ||
        profile.full_name === user.email;

      if (isPlaceholder && meta.full_name && meta.full_name !== "New User") {
        // Update profiles table with the real name from user_metadata
        const { error: updateErr } = await supabase
          .from("profiles")
          .update({ full_name: meta.full_name })
          .eq("id", user.id);

        if (!updateErr) {
          profile.full_name = meta.full_name;
        }
      }

      // Also sync role/team from metadata if profile is missing them
      if (!profile.role && meta.role) {
        await supabase.from("profiles").update({ role: meta.role }).eq("id", user.id);
        profile.role = meta.role;
      }
      if (!profile.team && meta.team) {
        await supabase.from("profiles").update({ team: meta.team }).eq("id", user.id);
        profile.team = meta.team;
      }
    } else {
      // No profile row — fallback to user_metadata and create one
      if (meta.role) {
        profile = {
          full_name: meta.full_name || user.email,
          role: meta.role,
          team: meta.team || null,
          job_title: null,
          is_active: true,
          feature_flags: {},
        };
        // Try to insert a profile row for next time
        await supabase.from("profiles").insert([{
          id: user.id,
          full_name: profile.full_name,
          role: profile.role,
          team: profile.team,
        }]).select();
      }
    }

    if (!profile) {
      return res.status(403).json({ message: "Profile not found for this user" });
    }

    // Check is_active
    if (profile.is_active === false) {
      return res.status(403).json({ message: "Your account has been disabled" });
    }

    req.user = {
      id: user.id,
      email: user.email,
      full_name: profile.full_name,
      job_title: profile.job_title || null,
      role: profile.role,
      team: profile.team,
      feature_flags: profile.feature_flags || {},
    };

    next();
  } catch (err) {
    console.error("Auth middleware exception:", err);
    res.status(500).json({ message: "Auth error" });
  }
};
