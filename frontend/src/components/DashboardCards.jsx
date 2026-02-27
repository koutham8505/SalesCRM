// D:\SalesCRM\frontend\src\components\DashboardCards.jsx
// All dashboard numbers come exclusively from /api/dashboard/metrics
// No local mocks, no hardcoded values.
import { useState, useEffect } from "react";

const API = "http://localhost:3000/api/dashboard/metrics";

export default function DashboardCards({ leads, role, session, showMetrics = true, onLogout }) {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Prefix label by role
    const prefix = role === "Executive" ? "My" : role === "TeamLead" ? "Team" : role === "Manager" ? "Dept" : "All";

    const loadMetrics = () => {
        if (!session?.access_token) { setLoading(false); return; }
        setLoading(true);
        setError(null);
        fetch(API, {
            headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json",
            },
        })
            .then(async (r) => {
                if (r.status === 401) {
                    setError("Session expired. Please log in again.");
                    onLogout?.();
                    return null;
                }
                if (!r.ok) {
                    const body = await r.json().catch(() => ({}));
                    throw new Error(body.message || `Server error (${r.status})`);
                }
                return r.json();
            })
            .then((data) => { if (data) setMetrics(data); })
            .catch((err) => { setError(err.message || "Failed to load metrics"); setMetrics(null); })
            .finally(() => setLoading(false));
    };

    // Fetch metrics from backend whenever the session changes
    useEffect(() => { loadMetrics(); }, [session?.access_token]);

    // Outcome pill config
    const callPills = [
        { key: "calls_today_interested", label: "Interested", color: "pill-green" },
        { key: "calls_today_not_interested", label: "Not Interested", color: "pill-red" },
        { key: "calls_today_call_back", label: "Call Back", color: "pill-amber" },
        { key: "calls_today_wrong_number", label: "Wrong Number", color: "pill-gray" },
        { key: "calls_today_no_response", label: "No Response", color: "pill-slate" },
    ];

    const m = metrics || {};

    // If the server returned an error object as metrics (old bug guard)
    const isValidMetrics = metrics && typeof metrics.all_leads_count === "number";

    return (
        <div className="dashboard-container">
            {/* Error Banner */}
            {error && (
                <div style={{
                    background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8,
                    padding: "12px 16px", marginBottom: 16, display: "flex",
                    justifyContent: "space-between", alignItems: "center", color: "#7f1d1d"
                }}>
                    <span>⚠️ {error}</span>
                    <button onClick={loadMetrics} style={{
                        background: "#dc2626", color: "#fff", border: "none",
                        borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 13
                    }}>Retry</button>
                </div>
            )}
            {/* ─── Row 1: Summary cards (always visible) ─── */}
            <div className="dashboard-row">
                <div className="dashboard-card meetings">
                    <div className="dash-title">{prefix} Meetings</div>
                    <div className="dash-count">
                        {loading ? "…" : (m.all_meetings ?? 0)}
                    </div>
                </div>
                <div className="dashboard-card followups">
                    <div className="dash-title">{prefix} Follow-ups</div>
                    <div className="dash-count">
                        {loading ? "…" : (m.all_followups ?? 0)}
                    </div>
                </div>
                <div className="dashboard-card overdue">
                    <div className="dash-title">{prefix} Overdue</div>
                    <div className="dash-count">
                        {loading ? "…" : (m.all_overdue ?? 0)}
                    </div>
                </div>
                <div className="dashboard-card total">
                    <div className="dash-title">{prefix} Leads</div>
                    <div className="dash-count">
                        {loading ? "…" : (m.all_leads_count ?? 0)}
                    </div>
                </div>
            </div>

            {/* ─── Row 2: Today's Activity (always visible) ─── */}
            <div className="dashboard-row today-activity-row">
                <div className="dashboard-card today-meetings">
                    <div className="dash-title">📅 Meetings Today</div>
                    <div className="dash-count">
                        {loading ? "…" : (m.meetings_today ?? 0)}
                    </div>
                </div>
                <div className="dashboard-card today-followups">
                    <div className="dash-title">🔔 Follow-ups Today</div>
                    <div className="dash-count">
                        {loading ? "…" : (m.followups_today ?? 0)}
                    </div>
                </div>
                <div className="dashboard-card today-overdue">
                    <div className="dash-title">⚠️ Overdue</div>
                    <div className="dash-count">
                        {loading ? "…" : (m.all_overdue ?? 0)}
                    </div>
                </div>
            </div>

            {/* ─── Calls Today (Dashboard tab only) ─── */}
            {showMetrics && (
                <div className="dashboard-section">
                    <h3 className="section-title">📞 Calls Today</h3>
                    {loading ? (
                        <div className="dashboard-row skeleton-row">
                            <div className="skeleton-card" /><div className="skeleton-card" /><div className="skeleton-card" />
                        </div>
                    ) : (
                        <>
                            <div className="dashboard-row calls-today-row">
                                <div className="dashboard-card calls-total">
                                    <div className="dash-title">{prefix} Calls Today</div>
                                    <div className="dash-count">{m.calls_today_total ?? 0}</div>
                                </div>
                            </div>
                            <div className="call-pills-row">
                                {callPills.map((p) => (
                                    <div key={p.key} className={`call-pill ${p.color}`}>
                                        <span className="pill-count">{m[p.key] ?? 0}</span>
                                        <span className="pill-label">{p.label}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ─── Outreach Summary (Dashboard tab only) ─── */}
            {showMetrics && (
                <div className="dashboard-section">
                    <h3 className="section-title">📤 Outreach Summary</h3>
                    {loading ? (
                        <div className="dashboard-row skeleton-row">
                            <div className="skeleton-card" /><div className="skeleton-card" />
                        </div>
                    ) : (
                        <div className="dashboard-row outreach-row">
                            <div className="dashboard-card outreach-pitch">
                                <div className="dash-title">Pitch Decks Sent</div>
                                <div className="dash-count">
                                    {m.pitch_decks_sent_today ?? 0}{" "}
                                    <span className="dash-total">/ {m.pitch_decks_sent_total ?? 0} total</span>
                                </div>
                            </div>
                            <div className="dashboard-card outreach-email">
                                <div className="dash-title">Emails Sent</div>
                                <div className="dash-count">
                                    {m.emails_sent_today ?? 0}{" "}
                                    <span className="dash-total">/ {m.emails_sent_total ?? 0} total</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
