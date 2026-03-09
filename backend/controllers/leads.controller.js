// D:\SalesCRM\backend\controllers\leads.controller.js
const supabase = require("../config/supabase");
const logAudit = require("../middleware/auditLog");

// --- Helpers ---

// Convert empty strings to null so optional columns don't fail NOT NULL constraints
const nullifyEmpty = (obj) => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === "" || v === undefined) out[k] = null;
    else out[k] = v;
  }
  return out;
};

const STAGE_PIPELINE = ["New", "Contacted", "Demo/Meeting", "Proposal", "Negotiation", "Won", "Lost"];
const LOCKED_STAGES = ["Won", "Lost"];
const LOCKED_FIELDS = ["lead_name", "institution_name", "phone", "email", "deal_value", "stage", "status"];

const cleanForDb = (body) => {
  // Strip virtual / computed fields that don't exist as DB columns
  const { follow_up_status, meeting_today, id, created_at, score, ...rest } = body;
  // Convert tags JS array → pg array format or null
  if (rest.tags !== undefined) {
    rest.tags = Array.isArray(rest.tags) && rest.tags.length > 0 ? rest.tags : null;
  }
  return nullifyEmpty(rest);
};

const hasFeature = (user, feature) => {
  const rolePerms = {
    Admin: ["import", "bulk_update", "delete", "team_filters", "sensitive_fields"],
    Manager: ["import", "bulk_update", "delete", "team_filters", "sensitive_fields"],
    TeamLead: ["import", "bulk_update"],
    Executive: [],
  };
  if ((rolePerms[user.role] || []).includes(feature)) return true;
  return user.feature_flags?.[feature] === true;
};

const applyRoleFilters = (query, user) => {
  if (user.role === "Admin") return query;
  if (user.role === "Manager" || user.role === "TeamLead") {
    if (user.team) return query.eq("team", user.team);
    return query.eq("owner_id", user.id);
  }
  return query.eq("owner_id", user.id);
};

const computeScore = (lead) => {
  let score = 0;
  const statusScores = { Won: 100, "In Progress": 60, New: 30, "On Hold": 20, Loss: 0 };
  score += statusScores[lead.status] || 10;

  const sourceScores = { Referral: 25, "Walk-in": 20, LinkedIn: 15, "Cold Call": 10, Website: 15, "Email Campaign": 12, Other: 5 };
  score += sourceScores[lead.lead_source] || 5;

  if (lead.meeting_date) {
    const daysToMeeting = Math.ceil((new Date(lead.meeting_date) - new Date()) / 86400000);
    if (daysToMeeting >= 0 && daysToMeeting <= 7) score += 20;
    else if (daysToMeeting < 0 && daysToMeeting > -3) score += 10;
  }
  if (lead.next_follow_up) {
    const daysToFu = Math.ceil((new Date(lead.next_follow_up) - new Date()) / 86400000);
    if (daysToFu >= 0 && daysToFu <= 3) score += 15;
  }
  if (lead.call_status === "Interested") score += 15;
  if (lead.call_status === "Callback Requested") score += 10;

  return Math.min(score, 100);
};

const stripSensitive = (lead, user) => {
  if (hasFeature(user, "sensitive_fields")) return lead;
  const { deal_value, margin, ...safe } = lead;
  return safe;
};

const checkDuplicates = async (email, phone, excludeId) => {
  const dupes = [];
  if (email) {
    let q = supabase.from("my_leads").select("id,lead_name,email,phone").eq("email", email);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q;
    if (data?.length) dupes.push(...data);
  }
  if (phone) {
    let q = supabase.from("my_leads").select("id,lead_name,email,phone").eq("phone", phone);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q;
    if (data?.length) {
      data.forEach((d) => { if (!dupes.find((x) => x.id === d.id)) dupes.push(d); });
    }
  }
  return dupes;
};

const validateLead = async (lead) => {
  const errors = [];
  try {
    const { data: rules } = await supabase.from("validation_rules").select("*");
    if (rules) {
      for (const rule of rules) {
        const val = lead[rule.field_name];
        if (rule.required && (!val || !String(val).trim())) {
          errors.push(rule.message || `${rule.field_name} is required`);
        }
        if (rule.regex && val && !new RegExp(rule.regex).test(val)) {
          errors.push(rule.message || `${rule.field_name} is invalid`);
        }
      }
    }
  } catch { /* validation table may not exist yet */ }
  return errors;
};

// --- Endpoints ---

exports.getMe = async (req, res) => {
  res.json({
    id: req.user.id, email: req.user.email, full_name: req.user.full_name,
    role: req.user.role, team: req.user.team, feature_flags: req.user.feature_flags || {},
  });
};

exports.getLeads = async (req, res) => {
  try {
    let query = supabase.from("my_leads").select("*").order("created_at", { ascending: false });
    query = applyRoleFilters(query, req.user);
    const { data, error } = await query;
    if (error) throw error;

    const leads = (data || []).map((l) => stripSensitive(l, req.user));

    res.json({
      leads,
      profile: {
        id: req.user.id, email: req.user.email, full_name: req.user.full_name,
        role: req.user.role, team: req.user.team, feature_flags: req.user.feature_flags || {},
      },
    });
  } catch (err) {
    console.error("getLeads error:", err);
    res.status(500).json({ message: err.message || "Error fetching leads" });
  }
};

exports.createLead = async (req, res) => {
  try {
    const user = req.user;
    const cleaned = cleanForDb(req.body);

    // Validation
    const vErrors = await validateLead(cleaned);
    if (vErrors.length) return res.status(400).json({ message: vErrors.join("; "), validationErrors: vErrors });

    // Duplicate detection
    const dupes = await checkDuplicates(cleaned.email, cleaned.phone);
    const hasDuplicates = dupes.length > 0;

    // Strip sensitive for non-authorized
    if (!hasFeature(user, "sensitive_fields")) {
      delete cleaned.deal_value;
      delete cleaned.margin;
    }

    // Auto-fill owner
    const payload = {
      ...cleaned,
      owner_id: cleaned.owner_id || user.id,
      owner_name: cleaned.owner_name || user.full_name || user.email,
      owner_email: cleaned.owner_email || user.email,
      team: cleaned.team || user.team,
    };
    // Auto-stamp last_called_at whenever call_status is set
    if (payload.call_status && payload.call_status !== "Not Called" && payload.call_status !== "") {
      payload.last_called_at = new Date().toISOString();
    }
    payload.score = computeScore(payload);

    const { data, error } = await supabase.from("my_leads").insert([payload]).select();
    if (error) throw error;

    logAudit(user.id, user.email, "LEAD_CREATE", data[0]?.id, "my_leads", { lead_name: payload.lead_name });

    res.status(201).json({
      ...stripSensitive(data[0], user),
      duplicates: hasDuplicates ? dupes : undefined,
    });
  } catch (err) {
    console.error("createLead error:", err?.message, err?.code, err?.details);
    res.status(500).json({ message: err?.message || "Save failed", code: err?.code, details: err?.details });
  }
};

exports.updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const { data: existing, error: fetchError } = await supabase.from("my_leads").select("*").eq("id", id).single();
    if (fetchError || !existing) return res.status(404).json({ message: "Lead not found" });

    const canEdit = user.role === "Admin" || user.role === "Manager" ||
      (user.role === "TeamLead" && existing.team === user.team) ||
      (user.role === "Executive" && existing.owner_id === user.id);
    if (!canEdit) return res.status(403).json({ message: "Not allowed to edit this lead" });

    let cleaned = cleanForDb(req.body);

    // ── Stage Lock: Won/Lost leads — only Manager/Admin can edit locked fields ──
    const existingStage = existing.stage || "New";
    if (LOCKED_STAGES.includes(existingStage)) {
      const isPrivileged = user.role === "Admin" || user.role === "Manager";
      if (!isPrivileged) {
        const attemptedLockedFields = LOCKED_FIELDS.filter((f) => cleaned[f] !== undefined && cleaned[f] !== existing[f]);
        if (attemptedLockedFields.length > 0) {
          return res.status(403).json({
            message: `This lead is ${existingStage}. Only Managers/Admins can edit: ${attemptedLockedFields.join(", ")}.`,
            locked: true,
          });
        }
      }
    }

    // Validation
    const merged = { ...existing, ...cleaned };
    const vErrors = await validateLead(merged);
    if (vErrors.length) return res.status(400).json({ message: vErrors.join("; "), validationErrors: vErrors });

    // Duplicate detection
    const dupes = await checkDuplicates(cleaned.email || existing.email, cleaned.phone || existing.phone, id);

    // Strip owner for Executive/TeamLead
    if (user.role === "Executive" || user.role === "TeamLead") {
      delete cleaned.owner_id; delete cleaned.owner_name; delete cleaned.owner_email;
    }
    // Strip sensitive for non-authorized
    if (!hasFeature(user, "sensitive_fields")) {
      delete cleaned.deal_value; delete cleaned.margin;
    }

    // ── Auto-stamp first_contacted_at when stage moves to Contacted for first time ──
    const newStage = cleaned.stage;
    if (newStage && newStage !== "New" && newStage !== existingStage && !existing.first_contacted_at) {
      cleaned.first_contacted_at = new Date().toISOString();
    }

    // Auto-stamp last_called_at whenever call_status is being set or changed
    const newCallStatus = cleaned.call_status;
    const prevCallStatus = existing.call_status;
    if (newCallStatus && newCallStatus !== "Not Called" && newCallStatus !== "") {
      cleaned.last_called_at = new Date().toISOString();
    }

    // Recompute score
    cleaned.score = computeScore({ ...existing, ...cleaned });

    const { data, error } = await supabase.from("my_leads").update(cleaned).eq("id", id).select();
    if (error) throw error;

    // Auto-log a CALL activity when call_status is set/changed
    if (newCallStatus && newCallStatus !== "Not Called" && newCallStatus !== "" && newCallStatus !== prevCallStatus) {
      await supabase.from("lead_activities").insert([{
        lead_id: id,
        user_id: user.id,
        type: "CALL",
        description: `Call status updated to: ${newCallStatus}`,
        outcome: newCallStatus,
      }]).select();
    }

    logAudit(user.id, user.email, "LEAD_UPDATE", id, "my_leads", { changes: Object.keys(cleaned) });

    res.json({
      ...stripSensitive(data[0], user),
      duplicates: dupes.length ? dupes : undefined,
    });
  } catch (err) {
    console.error("updateLead error:", err);
    res.status(500).json({ message: "Update failed" });
  }
};

exports.deleteLead = async (req, res) => {
  try {
    if (!hasFeature(req.user, "delete")) return res.status(403).json({ message: "Not allowed to delete leads" });
    const { error } = await supabase.from("my_leads").delete().eq("id", req.params.id);
    if (error) throw error;
    logAudit(req.user.id, req.user.email, "LEAD_DELETE", req.params.id, "my_leads", null);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
};

exports.importLeads = async (req, res) => {
  try {
    if (!hasFeature(req.user, "import")) return res.status(403).json({ message: "Not allowed to import" });
    const user = req.user;
    const cleaned = (req.body || []).map((l) => {
      const base = cleanForDb(l);
      const payload = {
        ...base,
        owner_id: base.owner_id || user.id,
        owner_name: base.owner_name || user.full_name,
        owner_email: base.owner_email || user.email,
        team: base.team || user.team,
      };
      payload.score = computeScore(payload);
      return payload;
    });
    if (!cleaned.length) return res.status(400).json({ message: "No data to import" });
    const { error } = await supabase.from("my_leads").insert(cleaned);
    if (error) throw error;
    logAudit(user.id, user.email, "LEAD_IMPORT", null, "my_leads", { count: cleaned.length });
    res.status(201).json({ message: `Imported ${cleaned.length} leads` });
  } catch (err) {
    res.status(500).json({ message: "Import failed" });
  }
};

exports.bulkUpdateLeads = async (req, res) => {
  try {
    if (!hasFeature(req.user, "bulk_update")) return res.status(403).json({ message: "Not allowed" });
    const { ids, updates } = req.body || {};
    if (!Array.isArray(ids) || !ids.length || !updates) return res.status(400).json({ message: "ids[] and updates required" });
    const { error } = await supabase.from("my_leads").update(cleanForDb(updates)).in("id", ids);
    if (error) throw error;
    logAudit(req.user.id, req.user.email, "LEAD_BULK_UPDATE", null, "my_leads", { ids, changes: Object.keys(updates) });
    res.json({ success: true, updatedCount: ids.length });
  } catch (err) {
    res.status(500).json({ message: "Bulk update failed" });
  }
};

exports.getOwners = async (req, res) => {
  try {
    // Sync: ensure all auth users have a profile row (light version)
    const { data: authData } = await supabase.auth.admin.listUsers();
    const authUsers = authData?.users || [];
    const { data: existingProfiles } = await supabase.from("profiles").select("id");
    const profileIds = new Set((existingProfiles || []).map(p => p.id));
    const missing = authUsers.filter(u => !profileIds.has(u.id));
    if (missing.length > 0) {
      await supabase.from("profiles").upsert(
        missing.map(u => ({
          id: u.id,
          full_name: u.user_metadata?.full_name || u.email?.split("@")[0] || "User",
          role: u.user_metadata?.role || "Executive",
          team: u.user_metadata?.team || null,
          is_active: true,
        })),
        { onConflict: "id" }
      );
    }
    // Fetch all non-disabled users (null is_active = active, only exclude explicit false)
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, team, department, team_lead_id")
      .or("is_active.eq.true,is_active.is.null")
      .order("full_name");
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("getOwners error:", err);
    res.status(500).json({ message: "Failed to load owners" });
  }
};

// GET /api/leads/validation-rules
exports.getValidationRules = async (req, res) => {
  try {
    const { data, error } = await supabase.from("validation_rules").select("*");
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.json([]);
  }
};

// POST /api/leads/merge  (Manager/Admin only)
// Body: { master_id, duplicate_id }
exports.mergeLeads = async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== "Admin" && user.role !== "Manager") {
      return res.status(403).json({ message: "Only Managers/Admins can merge leads" });
    }
    const { master_id, duplicate_id } = req.body;
    if (!master_id || !duplicate_id) return res.status(400).json({ message: "master_id and duplicate_id required" });
    if (master_id === duplicate_id) return res.status(400).json({ message: "Cannot merge a lead with itself" });

    const [{ data: master }, { data: dupe }] = await Promise.all([
      supabase.from("my_leads").select("*").eq("id", master_id).single(),
      supabase.from("my_leads").select("*").eq("id", duplicate_id).single(),
    ]);
    if (!master || !dupe) return res.status(404).json({ message: "Lead not found" });

    // Merge: fill in missing fields from duplicate into master
    const patch = {};
    const mergeField = (field) => { if (!master[field] && dupe[field]) patch[field] = dupe[field]; };
    ["phone", "alt_phone", "whatsapp", "email", "website", "board", "fees", "student_strength", "medium_of_instruction", "school_type", "tier", "geo_classification", "remark"].forEach(mergeField);

    // Merge tags
    const masterTags = Array.isArray(master.tags) ? master.tags : [];
    const dupeTags = Array.isArray(dupe.tags) ? dupe.tags : [];
    const mergedTags = [...new Set([...masterTags, ...dupeTags])];
    if (mergedTags.length !== masterTags.length) patch.tags = mergedTags;

    if (Object.keys(patch).length > 0) {
      await supabase.from("my_leads").update(patch).eq("id", master_id);
    }

    // Re-assign activities from duplicate to master
    await supabase.from("lead_activities").update({ lead_id: master_id }).eq("lead_id", duplicate_id);

    // Re-assign notes from duplicate to master (if table exists)
    try { await supabase.from("lead_notes").update({ lead_id: master_id }).eq("lead_id", duplicate_id); } catch { }

    // Delete the duplicate
    await supabase.from("my_leads").delete().eq("id", duplicate_id);
    logAudit(user.id, user.email, "LEAD_MERGE", master_id, "my_leads", { merged_from: duplicate_id });

    res.json({ success: true, master_id, merged_from: duplicate_id });
  } catch (err) {
    console.error("mergeLeads error:", err);
    res.status(500).json({ message: "Merge failed" });
  }
};

// GET /api/leads/duplicates (Manager/Admin only)
exports.getDuplicates = async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== "Admin" && user.role !== "Manager") {
      return res.status(403).json({ message: "Only Managers/Admins can view duplicates" });
    }

    let query = supabase.from("my_leads").select("id, lead_name, institution_name, phone, email, owner_name, stage, created_at");
    if (user.role === "Manager" && user.team) query = query.eq("team", user.team);
    const { data, error } = await query;
    if (error) throw error;
    const rows = data || [];

    // Group by phone and by name+institution
    const phoneMap = {};
    rows.forEach((r) => {
      if (r.phone) {
        const key = r.phone.replace(/\D/g, "").slice(-10);
        if (!phoneMap[key]) phoneMap[key] = [];
        phoneMap[key].push(r);
      }
    });

    const duplicateSets = [];
    const seen = new Set();
    Object.values(phoneMap).forEach((group) => {
      if (group.length > 1) {
        const key = group.map((g) => g.id).sort().join("|");
        if (!seen.has(key)) { seen.add(key); duplicateSets.push({ reason: "Same phone", leads: group }); }
      }
    });

    res.json(duplicateSets);
  } catch (err) {
    res.status(500).json({ message: "Failed to find duplicates" });
  }
};
