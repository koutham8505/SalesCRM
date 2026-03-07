// D:\SalesCRM\frontend\src\components\ConversionFunnel.jsx
import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

const STAGE_COLORS = {
    "New": "#64748b", "Contacted": "#3b82f6", "Demo/Meeting": "#8b5cf6",
    "Proposal": "#f59e0b", "Negotiation": "#f97316", "Won": "#22c55e"
};

export default function ConversionFunnel({ token }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        fetch(`${API}/api/dashboard/funnel`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then((d) => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [token]);

    if (loading) return <div className="phase2-card"><div className="p2-loading">Loading funnel…</div></div>;
    if (!data) return null;

    const maxCount = Math.max(...(data.conversions || []).map((c) => c.count), 1);

    return (
        <div className="phase2-card">
            <h3 className="p2-title">📊 Conversion Funnel</h3>
            <div className="funnel-container">
                {(data.conversions || []).map((item) => {
                    const widthPct = Math.max((item.count / maxCount) * 100, 4);
                    const color = STAGE_COLORS[item.stage] || "#64748b";
                    return (
                        <div key={item.stage} className="funnel-row">
                            <div className="funnel-label">{item.stage}</div>
                            <div className="funnel-bar-wrap">
                                <div
                                    className="funnel-bar"
                                    style={{ width: `${widthPct}%`, background: color }}
                                >
                                    <span className="funnel-bar-count">{item.count}</span>
                                </div>
                            </div>
                            <div className="funnel-rate" style={{ color }}>
                                {item.conversion_rate}%
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Owner breakdown table */}
            {data.owner_breakdown?.length > 0 && (
                <div className="p2-sub-section">
                    <div className="p2-sub-title">Per Owner Win Rate</div>
                    <table className="p2-table">
                        <thead>
                            <tr><th>Owner</th><th>Total</th><th>Won</th><th>Lost</th><th>Win %</th></tr>
                        </thead>
                        <tbody>
                            {data.owner_breakdown.map((o) => (
                                <tr key={o.owner}>
                                    <td>{o.owner}</td>
                                    <td>{o.total}</td>
                                    <td style={{ color: "#22c55e", fontWeight: 600 }}>{o.won}</td>
                                    <td style={{ color: "#ef4444", fontWeight: 600 }}>{o.lost}</td>
                                    <td>
                                        <span className="win-rate-badge" style={{
                                            background: o.win_rate >= 50 ? "#dcfce7" : o.win_rate >= 20 ? "#fef3c7" : "#fee2e2",
                                            color: o.win_rate >= 50 ? "#166534" : o.win_rate >= 20 ? "#92400e" : "#991b1b",
                                        }}>
                                            {o.win_rate}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
