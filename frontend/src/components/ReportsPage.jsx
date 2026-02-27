// D:\SalesCRM\frontend\src\components\ReportsPage.jsx
import { useMemo } from "react";

const STATUS_COLORS = { New: "#3b82f6", "In Progress": "#f59e0b", Won: "#22c55e", Loss: "#ef4444", "On Hold": "#94a3b8" };

function BarChart({ data, title }) {
    const max = Math.max(...data.map((d) => d.value), 1);
    return (
        <div className="chart-card">
            <h3>{title}</h3>
            <div className="bar-chart">
                {data.map((d, i) => (
                    <div key={i} className="bar-row">
                        <span className="bar-label">{d.label}</span>
                        <div className="bar-track">
                            <div className="bar-fill" style={{ width: `${(d.value / max) * 100}%`, background: d.color || "#3b82f6" }} />
                        </div>
                        <span className="bar-value">{d.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MetricCard({ title, value, sub, color }) {
    return (
        <div className="metric-card" style={{ borderLeftColor: color || "#3b82f6" }}>
            <div className="metric-title">{title}</div>
            <div className="metric-value">{value}</div>
            {sub && <div className="metric-sub">{sub}</div>}
        </div>
    );
}

export default function ReportsPage({ leads, role, profile }) {
    const now = new Date();
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const statusCounts = useMemo(() => {
        const c = {};
        leads.forEach((l) => { c[l.status || "Unknown"] = (c[l.status || "Unknown"] || 0) + 1; });
        return Object.entries(c).map(([label, value]) => ({ label, value, color: STATUS_COLORS[label] || "#64748b" }));
    }, [leads]);

    const sourceCounts = useMemo(() => {
        const c = {};
        leads.forEach((l) => { c[l.lead_source || "Unknown"] = (c[l.lead_source || "Unknown"] || 0) + 1; });
        return Object.entries(c).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
    }, [leads]);

    const teamCounts = useMemo(() => {
        const c = {};
        leads.forEach((l) => { c[l.team || "No Team"] = (c[l.team || "No Team"] || 0) + 1; });
        return Object.entries(c).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
    }, [leads]);

    const activeLeads = leads.filter((l) => l.status !== "Won" && l.status !== "Loss").length;
    const meetingsThisWeek = leads.filter((l) => l.meeting_date && new Date(l.meeting_date) >= weekAgo && new Date(l.meeting_date) <= now).length;
    const wonThisMonth = leads.filter((l) => l.status === "Won" && l.created_at && new Date(l.created_at) >= monthStart).length;
    const totalValue = leads.reduce((s, l) => s + (Number(l.deal_value) || 0), 0);

    const prefix = role === "Admin" ? "All" : role === "Manager" ? "Dept" : role === "TeamLead" ? "Team" : "My";

    return (
        <div className="reports-page">
            <h2>📊 Reports — {prefix} Overview</h2>

            <div className="metrics-row">
                <MetricCard title={`${prefix} Active Leads`} value={activeLeads} color="#3b82f6" />
                <MetricCard title="Meetings This Week" value={meetingsThisWeek} color="#eab308" />
                <MetricCard title="Won This Month" value={wonThisMonth} color="#22c55e" />
                {(role === "Manager" || role === "Admin") && totalValue > 0 && (
                    <MetricCard title="Total Deal Value" value={`₹${totalValue.toLocaleString()}`} color="#8b5cf6" />
                )}
            </div>

            <div className="charts-grid">
                <BarChart data={statusCounts} title="Leads by Status (Funnel)" />
                {(role === "Manager" || role === "Admin") && <BarChart data={sourceCounts} title="Leads by Source" />}
                {role === "Admin" && <BarChart data={teamCounts} title="Leads by Team" />}
            </div>

            {(role === "TeamLead" || role === "Manager" || role === "Admin") && (
                <div className="chart-card">
                    <h3>Team Members Performance</h3>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr><th>Owner</th><th>Total</th><th>Active</th><th>Won</th><th>Meetings</th></tr>
                            </thead>
                            <tbody>
                                {Object.entries(
                                    leads.reduce((acc, l) => {
                                        const key = l.owner_name || l.lead_owner || "Unassigned";
                                        if (!acc[key]) acc[key] = { total: 0, active: 0, won: 0, meetings: 0 };
                                        acc[key].total++;
                                        if (l.status !== "Won" && l.status !== "Loss") acc[key].active++;
                                        if (l.status === "Won") acc[key].won++;
                                        if (l.meeting_date) acc[key].meetings++;
                                        return acc;
                                    }, {})
                                ).sort((a, b) => b[1].total - a[1].total).map(([name, d]) => (
                                    <tr key={name}>
                                        <td><strong>{name}</strong></td>
                                        <td>{d.total}</td>
                                        <td>{d.active}</td>
                                        <td>{d.won}</td>
                                        <td>{d.meetings}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
