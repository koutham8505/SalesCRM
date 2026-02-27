// D:\SalesCRM\backend\controllers\dashboard.controller.js
// All metrics computed from my_leads (pipeline) + lead_activities (call/outreach outcomes)
const supabase = require("../config/supabase");

/** Apply the same RBAC scope used in leads.controller.js. */
const applyRoleFilters = (query, user) => {
    if (user.role === "Admin") return query;
    if (user.role === "Manager" || user.role === "TeamLead") {
        if (user.team) return query.eq("team", user.team);
        return query.eq("owner_id", user.id);
    }
    return query.eq("owner_id", user.id);
};

/** Start of today in UTC ISO string. */
const todayStartISO = () => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
};

/** Returns true if the given ISO string is today (UTC calendar date). */
const isToday = (isoStr) => {
    if (!isoStr) return false;
    return isoStr.slice(0, 10) === todayStartISO().slice(0, 10);
};

/** True if value equals 'Yes' (string) or true (boolean). */
const isYes = (val) => val === "Yes" || val === true;

/**
 * GET /api/dashboard/metrics
 * Single endpoint — returns all dashboard numbers.
 * RBAC-scoped identical to getLeads.
 *
 * Call outcome counts come from lead_activities (type=CALL, created today).
 * This is more accurate than reading call_status from my_leads because:
 *   - A lead can be called multiple times per day
 *   - Different outcomes per call are tracked individually
 * Outreach counts (pitch decks, mail) come from my_leads columns.
 */
exports.getMetrics = async (req, res) => {
    try {
        const todayISO = todayStartISO();
        const todayStr = todayISO.slice(0, 10); // "YYYY-MM-DD"

        // ── 1. Fetch leads (RBAC-scoped) ──
        const selectCols = [
            "id", "owner_id", "team", "status", "call_status",
            "meeting_date", "next_follow_up",
            "last_called_at",
            "proposal_sent", "pitch_deck_sent", "mail_sent",
            "updated_at",
        ].join(", ");

        let leadsQuery = supabase.from("my_leads").select(selectCols);
        leadsQuery = applyRoleFilters(leadsQuery, req.user);
        const { data: leads, error: leadsErr } = await leadsQuery;
        if (leadsErr) throw leadsErr;
        const rows = leads || [];
        const leadIds = rows.map((r) => r.id).filter(Boolean);

        // ── 2. Pipeline summary cards ──
        const todayStart = new Date(todayISO);
        const todayEnd = new Date(todayStart.getTime() + 86400000);

        const all_leads_count = rows.length;

        const all_meetings = rows.filter((r) => !!r.meeting_date).length;
        const all_followups = rows.filter((r) => r.next_follow_up && r.status !== "Loss").length;
        const all_overdue = rows.filter(
            (r) => r.next_follow_up && new Date(r.next_follow_up) < todayStart && r.status !== "Loss"
        ).length;

        const meetings_today = rows.filter((r) => {
            if (!r.meeting_date) return false;
            const d = new Date(r.meeting_date);
            return d >= todayStart && d < todayEnd;
        }).length;

        const followups_today = rows.filter((r) => {
            if (!r.next_follow_up || r.status === "Loss") return false;
            return r.next_follow_up.slice(0, 10) === todayStr;
        }).length;

        // ── 3. Calls Today — Hybrid + Deduplicated by lead ──
        // Counts UNIQUE LEADS called today (max = total leads).
        // Each lead is counted once using its LATEST call outcome today.
        // Primary source: lead_activities (type=CALL, created today)
        // Fallback: leads with last_called_at today but no activity row yet

        // Map of lead_id → latest call entry (deduplicated)
        const latestCallPerLead = new Map();

        if (leadIds.length > 0) {
            // a) Explicit CALL activities today — ordered ascending so last write wins
            const { data: callActs } = await supabase
                .from("lead_activities")
                .select("id, lead_id, outcome, created_at")
                .eq("type", "CALL")
                .gte("created_at", todayISO)
                .in("lead_id", leadIds)
                .order("created_at", { ascending: true }); // oldest first so latest overwrites

            (callActs || []).forEach(a => {
                // Always overwrite — last activity wins for this lead
                latestCallPerLead.set(a.lead_id, {
                    lead_id: a.lead_id,
                    outcome: a.outcome,
                    created_at: a.created_at,
                });
            });

            // b) Fallback: leads with last_called_at today but no activity entry yet
            rows.forEach(r => {
                if (
                    isToday(r.last_called_at) &&
                    r.call_status && r.call_status !== "Not Called" &&
                    !latestCallPerLead.has(r.id)
                ) {
                    latestCallPerLead.set(r.id, {
                        lead_id: r.id,
                        outcome: r.call_status,
                        created_at: r.last_called_at,
                    });
                }
            });
        }

        // Final deduplicated array — one entry per unique lead called today
        const callsToday = Array.from(latestCallPerLead.values());
        const calls_today_total = callsToday.length; // max = number of leads visible

        const countOutcome = (outcome) =>
            callsToday.filter(a => a.outcome === outcome).length;


        // ── 4. Outreach Summary — from my_leads columns ──
        // "Today" = updated_at is today (pitch_deck_sent/mail_sent set today)
        const pitchAll = rows.filter((r) => isYes(r.pitch_deck_sent));
        const mailAll = rows.filter((r) => isYes(r.mail_sent));

        const pitchToday = rows.filter((r) => isYes(r.pitch_deck_sent) && isToday(r.updated_at));
        const mailToday = rows.filter((r) => isYes(r.mail_sent) && isToday(r.updated_at));

        // Also count PITCH_DECK activities created today (more granular)
        let pitchActsToday = 0;
        let emailActsToday = 0;
        if (leadIds.length > 0) {
            const { data: outreachActs } = await supabase
                .from("lead_activities")
                .select("id, type")
                .in("type", ["PITCH_DECK", "EMAIL"])
                .gte("created_at", todayISO)
                .in("lead_id", leadIds);

            if (outreachActs) {
                pitchActsToday = outreachActs.filter((a) => a.type === "PITCH_DECK").length;
                emailActsToday = outreachActs.filter((a) => a.type === "EMAIL").length;
            }
        }

        res.json({
            // Pipeline summary (all-time)
            all_leads_count,
            all_meetings,
            all_followups,
            all_overdue,
            // Today's agenda
            meetings_today,
            followups_today,
            // Calls Today — from lead_activities (not lead.call_status)
            calls_today_total,
            calls_today_interested: countOutcome("Interested"),
            calls_today_not_interested: countOutcome("Not Interested"),
            calls_today_call_back: countOutcome("Call Back"),
            calls_today_wrong_number: countOutcome("Wrong Number"),
            calls_today_no_response: countOutcome("No Response"),
            // Outreach — combined: lead columns (total) + activity count (today)
            pitch_decks_sent_today: Math.max(pitchToday.length, pitchActsToday),
            pitch_decks_sent_total: pitchAll.length,
            emails_sent_today: Math.max(mailToday.length, emailActsToday),
            emails_sent_total: mailAll.length,
        });
    } catch (err) {
        console.error("getMetrics error:", err.message);
        res.status(500).json({ message: "Failed to load dashboard metrics" });
    }
};
