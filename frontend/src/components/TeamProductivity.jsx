// D:\SalesCRM\frontend\src\components\TeamProductivity.jsx
import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Color coding: green = above target, red = below
const callTarget = 5;   // example daily call target
const winTarget = 2;    // example monthly win target

function rowClass(member) {
    const score = member.calls_today + member.wins_month * 2;
    if (score >= (callTarget + winTarget * 2) * 0.8) return "prod-row-green";
    if (score <= (callTarget + winTarget * 2) * 0.3) return "prod-row-red";
    return "";
}

export default function TeamProductivity({ token, role }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!token || role === "Executive") return;
        fetch(`${API}/api/dashboard/team-productivity`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => { if (!r.ok) throw new Error("403"); return r.json(); })
            .then((d) => { setData(d); setLoading(false); })
            .catch((e) => { setError(e.message); setLoading(false); });
    }, [token, role]);

    if (role === "Executive") return null;
    if (loading) return <div className="phase2-card"><div className="p2-loading">Loading team data…</div></div>;
    if (error) return null;
    if (!data?.team?.length) return <div className="phase2-card"><p className="p2-loading">No team data yet.</p></div>;

    return (
        <div className="phase2-card">
            <h3 className="p2-title">👥 Team Productivity</h3>
            <div className="p2-legend">
                <span className="legend-green">■ Above target</span>
                <span className="legend-red">■ Below target</span>
            </div>
            <div className="table-wrapper">
                <table className="p2-table prod-table">
                    <thead>
                        <tr>
                            <th>Team Member</th>
                            <th>Role</th>
                            <th>📞 Calls Today</th>
                            <th>🤝 Meetings Today</th>
                            <th>➕ New Leads (Month)</th>
                            <th>🏆 Wins (Month)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.team.map((m) => (
                            <tr key={m.owner_id} className={rowClass(m)}>
                                <td><strong>{m.owner_name}</strong></td>
                                <td><span className={`role-badge role-${m.role?.toLowerCase()}`}>{m.role}</span></td>
                                <td>
                                    <span className="prod-num" style={{ color: m.calls_today >= callTarget ? "#16a34a" : "#dc2626" }}>
                                        {m.calls_today}
                                    </span>
                                </td>
                                <td><span className="prod-num">{m.meetings_today}</span></td>
                                <td><span className="prod-num">{m.new_leads_month}</span></td>
                                <td>
                                    <span className="prod-num" style={{ color: m.wins_month >= winTarget ? "#16a34a" : "#64748b" }}>
                                        {m.wins_month}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>
                As of {new Date(data.as_of).toLocaleTimeString()}
            </div>
        </div>
    );
}
