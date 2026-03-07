// D:\SalesCRM\frontend\src\components\RemindersPage.jsx
// Admin page to configure email reminders and manually trigger them
import { useState, useEffect } from "react";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function RemindersPage({ token, role }) {
    const [dueLeads, setDueLeads] = useState(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);
    const [smtpOk, setSmtpOk] = useState(null); // null=unknown, true, false

    const canUse = ["Admin", "Manager"].includes(role);

    const loadDue = async () => {
        setLoading(true);
        try {
            const r = await fetch(`${BASE}/api/reminders/due-today`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const d = await r.json();
            setDueLeads(d);
            setSmtpOk(!d.error);
        } catch { }
        setLoading(false);
    };

    useEffect(() => { if (canUse) loadDue(); }, []);

    const handleSend = async () => {
        if (!confirm(`Send reminder emails to all owners with follow-ups today?`)) return;
        setSending(true);
        try {
            const r = await fetch(`${BASE}/api/reminders/trigger`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ dryRun: false }),
            });
            const d = await r.json();
            setResult(d);
        } catch (e) { setResult({ error: e.message }); }
        setSending(false);
    };

    if (!canUse) return <div className="rem-forbidden">🔒 Only Admins and Managers can access this page.</div>;

    const leads = dueLeads?.leads || [];

    return (
        <div className="rem-shell">
            <div className="rem-header">
                <div>
                    <h2 className="rem-title">🔁 Automated Follow-up Reminders</h2>
                    <p className="rem-sub">Every day at <strong>8:00 AM IST</strong>, the system automatically emails each rep a list of leads due for follow-up that day.</p>
                </div>
            </div>

            {/* SMTP Status */}
            <div className={`rem-smtp-card ${smtpOk === false ? "rem-smtp-warn" : smtpOk === true ? "rem-smtp-ok" : "rem-smtp-neutral"}`}>
                <div className="rem-smtp-icon">{smtpOk === false ? "⚠️" : smtpOk === true ? "✅" : "⚙️"}</div>
                <div>
                    <div className="rem-smtp-title">
                        {smtpOk === false ? "SMTP Not Configured" : smtpOk === true ? "Email Service Ready" : "Checking configuration..."}
                    </div>
                    {smtpOk === false && (
                        <div className="rem-smtp-body">
                            Add these to your backend <code>.env</code> file:
                            <pre className="rem-env-block">{`SMTP_USER=your.gmail@gmail.com\nSMTP_PASS=xxxx xxxx xxxx xxxx  # Gmail App Password`}</pre>
                            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="rem-link">→ Generate Gmail App Password</a>
                        </div>
                    )}
                    {smtpOk === true && (
                        <div className="rem-smtp-body">Emails will be sent automatically every morning at 8 AM IST. You can also trigger manually below.</div>
                    )}
                </div>
            </div>

            {/* Today's preview */}
            <div className="rem-section">
                <div className="rem-section-header">
                    <h3 className="rem-section-title">📋 Today's Follow-up Queue</h3>
                    <button className="rem-refresh-btn" onClick={loadDue} disabled={loading}>
                        {loading ? "Loading..." : "🔄 Refresh"}
                    </button>
                </div>

                {loading ? (
                    <div className="rem-loading">Checking due leads...</div>
                ) : leads.length === 0 ? (
                    <div className="rem-empty">
                        <div style={{ fontSize: 36 }}>🎉</div>
                        <div>No follow-ups due today!</div>
                    </div>
                ) : (
                    <>
                        <div className="rem-count-badge">{leads.length} lead{leads.length !== 1 ? "s" : ""} due today</div>
                        <div className="rem-leads-table">
                            <div className="rem-leads-head">
                                <span>Lead Name</span><span>School</span><span>Phone</span><span>Stage</span>
                            </div>
                            {leads.map(l => (
                                <div key={l.id} className="rem-leads-row">
                                    <span className="rem-lead-name">{l.lead_name || "—"}</span>
                                    <span>{l.institution_name || "—"}</span>
                                    <span>{l.phone || "—"}</span>
                                    <span className="rem-stage">{l.stage || "New"}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Manual send */}
            <div className="rem-manual-card">
                <h3 className="rem-section-title">📧 Send Reminders Now</h3>
                <p className="rem-manual-desc">Click below to immediately send reminder emails to all owners with follow-ups due today. The cron already does this at 8 AM automatically.</p>
                <button className="rem-send-btn" onClick={handleSend} disabled={sending || leads.length === 0}>
                    {sending ? "Sending..." : `📧 Send to ${leads.length} rep${leads.length !== 1 ? "s" : ""} now`}
                </button>
                {result && (
                    <div className={`rem-result ${result.error ? "rem-result-err" : "rem-result-ok"}`}>
                        {result.error
                            ? `❌ Error: ${result.error}`
                            : `✅ Sent to ${result.sent} owner(s) covering ${result.leads?.length || 0} lead(s).`}
                    </div>
                )}
            </div>

            {/* How it works */}
            <div className="rem-how-card">
                <h3 className="rem-section-title">ℹ️ How It Works</h3>
                <div className="rem-steps">
                    {[
                        { icon: "⏰", title: "8 AM every day", desc: "Server cron job runs automatically at 8:00 AM IST" },
                        { icon: "🔍", title: "Finds due leads", desc: "Queries all leads where Next Follow-up Date = today (not Won/Lost)" },
                        { icon: "👥", title: "Groups by owner", desc: "Each rep gets one consolidated email with all their due leads" },
                        { icon: "📧", title: "Sends HTML email", desc: "Beautiful branded email with lead name, school, phone and stage" },
                    ].map((s, i) => (
                        <div key={i} className="rem-how-step">
                            <div className="rem-how-icon">{s.icon}</div>
                            <div>
                                <div className="rem-how-title">{s.title}</div>
                                <div className="rem-how-desc">{s.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
