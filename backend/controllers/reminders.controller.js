// D:\SalesCRM\backend\controllers\reminders.controller.js
const supabase = require("../config/supabase");
const nodemailer = require("nodemailer");

// ─── Email transporter ─────────────────────────────────────────
function createTransporter() {
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,   // Gmail App Password (16-char)
        },
    });
}

// ─── Core: find due leads & send email to owners ───────────────
async function sendFollowUpEmails(dryRun = false) {
    const today = new Date().toISOString().slice(0, 10);

    // Fetch leads where next_follow_up = today and not Won/Lost
    const { data: leads, error } = await supabase
        .from("my_leads")
        .select("id, lead_name, institution_name, phone, stage, next_follow_up, lead_owner")
        .eq("next_follow_up", today)
        .not("stage", "in", '("Won","Lost")')
        .order("lead_name");

    if (error) throw error;
    if (!leads || leads.length === 0) return { sent: 0, leads: [] };

    // Group by owner
    const byOwner = {};
    leads.forEach(l => {
        const oid = l.lead_owner;
        if (!byOwner[oid]) byOwner[oid] = [];
        byOwner[oid].push(l);
    });

    // Fetch owner emails
    const ownerIds = Object.keys(byOwner);
    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ownerIds);

    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    if (dryRun) return { sent: 0, leads, owners: profiles, dryRun: true };

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return { sent: 0, error: "SMTP_USER and SMTP_PASS not configured in .env", leads };
    }

    const transporter = createTransporter();
    let sent = 0;

    for (const [ownerId, ownerLeads] of Object.entries(byOwner)) {
        const profile = profileMap[ownerId];
        if (!profile?.email) continue;

        const rows = ownerLeads.map(l =>
            `<tr>
                <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${l.lead_name || "—"}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${l.institution_name || "—"}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${l.phone || "—"}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${l.stage || "New"}</td>
            </tr>`
        ).join("");

        const html = `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto">
          <div style="background:linear-gradient(135deg,#1e293b,#0f172a);padding:24px;border-radius:12px 12px 0 0">
            <h1 style="color:#fff;margin:0;font-size:20px">📅 Follow-up Reminders</h1>
            <p style="color:#94a3b8;margin:4px 0 0">Hi ${profile.full_name || profile.email} — you have ${ownerLeads.length} follow-up${ownerLeads.length !== 1 ? "s" : ""} due today</p>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #e2e8f0">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <thead>
                <tr style="background:#f8fafc">
                  <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Lead Name</th>
                  <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">School</th>
                  <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Phone</th>
                  <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Stage</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div style="margin-top:20px;padding:16px;background:#eff6ff;border-radius:8px;border-left:4px solid #3b82f6">
              <strong style="color:#1e40af">💡 Tip:</strong>
              <span style="color:#1e3a8a"> Open each lead in Sales CRM and log your call outcome after following up.</span>
            </div>
          </div>
          <div style="background:#f8fafc;padding:16px;border-radius:0 0 12px 12px;text-align:center;font-size:12px;color:#94a3b8">
            Sales CRM · Automated reminder · ${new Date().toLocaleDateString("en-IN")}
          </div>
        </div>`;

        await transporter.sendMail({
            from: `"Sales CRM" <${process.env.SMTP_USER}>`,
            to: profile.email,
            subject: `📅 ${ownerLeads.length} Follow-up${ownerLeads.length !== 1 ? "s" : ""} due today — ${new Date().toLocaleDateString("en-IN")}`,
            html,
        });
        sent++;
    }

    return { sent, leads };
}

// POST /api/reminders/trigger — manual trigger (admin only)
exports.triggerReminders = async (req, res) => {
    try {
        if (!["Admin", "Manager"].includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        const { dryRun } = req.body;
        const result = await sendFollowUpEmails(!!dryRun);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error("Reminder error:", err);
        res.status(500).json({ message: err.message || "Failed to send reminders" });
    }
};

// GET /api/reminders/due-today — preview who gets reminders (admin only)
exports.getDueToday = async (req, res) => {
    try {
        if (!["Admin", "Manager"].includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        const result = await sendFollowUpEmails(true); // dry run
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed" });
    }
};

// Export for cron job use
exports.sendFollowUpEmails = sendFollowUpEmails;
