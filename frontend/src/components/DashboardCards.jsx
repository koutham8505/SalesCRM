// D:\SalesCRM\frontend\src\components\DashboardCards.jsx
import { useState, useEffect } from "react";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/dashboard/metrics`;

export default function DashboardCards({ leads, role, session, showMetrics = true, onLogout, onDrillDown }) {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const prefix = role === "Executive" ? "My" : role === "TeamLead" ? "Team" : role === "Manager" ? "Dept" : "All";

    const loadMetrics = () => {
        if (!session?.access_token) { setLoading(false); return; }
        setLoading(true);
        setError(null);
        fetch(API, { headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" } })
            .then(async (r) => {
                if (r.status === 401) { setError("Session expired."); onLogout?.(); return null; }
                if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.message || `Server error (${r.status})`); }
                return r.json();
            })
            .then((data) => { if (data) setMetrics(data); })
            .catch((err) => { setError(err.message || "Failed to load metrics"); setMetrics(null); })
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadMetrics(); }, [session?.access_token]);

    const m = metrics || {};
    const drill = (type) => () => onDrillDown?.(type);

    // ── Shared card renderer ──────────────────────────────────────────────
    const KpiCard = ({ drillType, icon, label, value, subtitle, accentClass, countClass, disabled: forceDisabled }) => (
        <button
            className={`dashboard-card kpi-clickable ${accentClass || ""}`}
            onClick={drill(drillType)}
            title={`View ${label} →`}
            disabled={loading || forceDisabled}
        >
            {icon && <div className="kpi-icon">{icon}</div>}
            <div className="dash-title">{label}</div>
            <div className={`dash-count ${countClass || ""}`}>{loading ? "…" : value}</div>
            {subtitle && <div className="dash-subtitle">{subtitle}</div>}
            <div className="kpi-cta">View leads →</div>
        </button>
    );

    const CallPillCard = ({ drillType, label, value, pillClass }) => (
        <button
            className={`call-pill ${pillClass} kpi-pill-btn`}
            onClick={drill(drillType)}
            title={`View ${label} calls`}
            disabled={loading}
        >
            <span className="pill-count">{loading ? "…" : value}</span>
            <span className="pill-label">{label}</span>
        </button>
    );

    // ── Compute per-department stats from leads prop ──────────────────────────
    const deptStats = ["School", "College", "Corporate"].map(dept => {
        const dl = (leads || []).filter(l => (l.department || "School") === dept);
        return {
            dept,
            total: dl.length,
            demos: dl.filter(l => l.stage === "Demo/Meeting").length,
            proposals: dl.filter(l => l.proposal_sent === true || l.proposal_sent === "Yes").length,
        };
    });

    const DEPT_META = {
        School: { icon: "🏫", cardClass: "dept-school-card" },
        College: { icon: "🎓", cardClass: "dept-college-card" },
        Corporate: { icon: "🏢", cardClass: "dept-corp-card" },
    };

    return (
        <div className="dashboard-container">
            {/* Error Banner */}
            {error && (
                <div className="dash-error-banner">
                    <span>⚠️ {error}</span>
                    <button onClick={loadMetrics} className="dash-retry-btn">Retry</button>
                </div>
            )}

            {/* ─── Department Breakdown ─── */}
            <div className="dashboard-section">
                <h3 className="section-title">🏢 Department Breakdown</h3>
                <div className="dept-breakdown">
                    {deptStats.map(({ dept, total, demos, proposals }) => (
                        <div
                            key={dept}
                            className={`dept-stat-card ${DEPT_META[dept].cardClass}`}
                            onClick={() => onDrillDown?.("all_leads")}
                            title={`Filter by ${dept}`}
                        >
                            <div className="dept-stat-name">{DEPT_META[dept].icon} {dept}</div>
                            <div className="dept-stat-count">{total}</div>
                            <div className="dept-stat-sub">
                                {demos} demo{demos !== 1 ? "s" : ""} · {proposals} proposal{proposals !== 1 ? "s" : ""}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── Row 1: Summary ─── */}
            <div className="dashboard-row">
                <KpiCard drillType="all_meetings" icon="📋" label={`${prefix} Meetings`} value={m.all_meetings ?? 0} accentClass="kpi-yellow" />
                <KpiCard drillType="all_followups" icon="🔔" label={`${prefix} Follow-ups`} value={m.all_followups ?? 0} accentClass="kpi-green" />
                <KpiCard drillType="overdue" icon="⚠️" label={`${prefix} Overdue`} value={m.all_overdue ?? 0} accentClass="kpi-red" />
                <KpiCard drillType="all_leads" icon="👥" label={`${prefix} Leads`} value={m.all_leads_count ?? 0} accentClass="kpi-blue" />
            </div>

            {/* ─── Row 2: SLA + KPI ─── */}
            <div className="dashboard-row">
                <KpiCard
                    drillType="not_contacted_24h" icon="🔴"
                    label="Not Contacted 24h"
                    value={m.not_contacted_24h ?? 0}
                    subtitle="New leads waiting >24h"
                    accentClass="kpi-sla-danger"
                    countClass="sla-danger-count"
                />
                <KpiCard
                    drillType="no_next_action" icon="🎯"
                    label="No Next Action"
                    value={m.no_next_action ?? 0}
                    subtitle="Active leads without a next step"
                    accentClass="kpi-sla-warning"
                    countClass="sla-warning-count"
                />
                <KpiCard
                    drillType="demos" icon="🎬"
                    label="DEMOS FIXED"
                    value={m.demos_fixed ?? 0}
                    subtitle="Demo/Meeting stage leads"
                    accentClass="kpi-demos"
                    countClass="kpi-demos-count"
                />
                <KpiCard
                    drillType="proposals" icon="📄"
                    label="PROPOSALS SENT"
                    value={m.proposals_sent ?? 0}
                    subtitle="Leads with proposal sent"
                    accentClass="kpi-proposals"
                    countClass="kpi-proposals-count"
                />
            </div>

            {/* ─── Row 3: Today ─── */}
            <div className="dashboard-row today-activity-row">
                <KpiCard
                    drillType="meetings_today" icon="📅"
                    label="Meetings Today"
                    value={m.meetings_today ?? 0}
                    subtitle="Demos & meetings scheduled today"
                    accentClass="kpi-purple"
                />
                <KpiCard
                    drillType="followups_today" icon="🔔"
                    label="Follow-ups Today"
                    value={m.followups_today ?? 0}
                    subtitle="Leads to follow up today"
                    accentClass="kpi-teal"
                />
                <KpiCard
                    drillType="overdue" icon="⚠️"
                    label="Overdue"
                    value={m.all_overdue ?? 0}
                    subtitle="Past due follow-up date"
                    accentClass="kpi-red"
                />
            </div>

            {/* ─── Calls Today ─── */}
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
                                <KpiCard
                                    drillType="calls_today" icon="📞"
                                    label={`${prefix} Calls Today`}
                                    value={m.calls_today_total ?? 0}
                                    subtitle="All calls logged today"
                                    accentClass="kpi-indigo"
                                />
                            </div>
                            <div className="call-pills-row">
                                <CallPillCard drillType="calls_interested" label="Interested" value={m.calls_today_interested ?? 0} pillClass="pill-green" />
                                <CallPillCard drillType="calls_not_interested" label="Not Interested" value={m.calls_today_not_interested ?? 0} pillClass="pill-red" />
                                <CallPillCard drillType="calls_call_back" label="Call Back" value={m.calls_today_call_back ?? 0} pillClass="pill-amber" />
                                <CallPillCard drillType="calls_wrong_number" label="Wrong Number" value={m.calls_today_wrong_number ?? 0} pillClass="pill-gray" />
                                <CallPillCard drillType="calls_no_response" label="No Response" value={m.calls_today_no_response ?? 0} pillClass="pill-slate" />
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ─── Outreach Summary ─── */}
            {showMetrics && (
                <div className="dashboard-section">
                    <h3 className="section-title">📤 Outreach Summary</h3>
                    {loading ? (
                        <div className="dashboard-row skeleton-row">
                            <div className="skeleton-card" /><div className="skeleton-card" />
                        </div>
                    ) : (
                        <div className="dashboard-row outreach-row">
                            <KpiCard
                                drillType="pitch_decks" icon="📁"
                                label="Pitch Decks Sent"
                                value={<>{m.pitch_decks_sent_today ?? 0} <span className="dash-total">/ {m.pitch_decks_sent_total ?? 0} total</span></>}
                                subtitle="Brochures/decks sent"
                                accentClass="kpi-violet"
                            />
                            <div className="dashboard-card outreach-email">
                                <div className="kpi-icon">✉️</div>
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
