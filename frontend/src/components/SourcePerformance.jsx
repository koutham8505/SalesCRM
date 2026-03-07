// D:\SalesCRM\frontend\src\components\SourcePerformance.jsx
import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function SourcePerformance({ token }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        fetch(`${API}/api/dashboard/source-performance`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then((d) => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [token]);

    if (loading) return <div className="phase2-card"><div className="p2-loading">Loading sources…</div></div>;
    if (!data) return null;

    const maxTotal = Math.max(...(data.sources || []).map((s) => s.total), 1);

    return (
        <div className="phase2-card">
            <h3 className="p2-title">🎯 Lead Source Performance</h3>

            {/* Highlight cards */}
            <div className="src-highlights">
                {(data.top3_by_volume || []).map((s, i) => (
                    <div key={s.source} className="src-highlight-card">
                        <div className="src-rank">#{i + 1}</div>
                        <div className="src-name">{s.source}</div>
                        <div className="src-count">{s.total} leads</div>
                        <div className="src-wr" style={{ color: "#22c55e" }}>{s.win_rate}% win</div>
                    </div>
                ))}
                {data.highest_win_rate && (
                    <div className="src-highlight-card src-highlight-winner">
                        <div className="src-rank">🏆</div>
                        <div className="src-name">{data.highest_win_rate.source}</div>
                        <div className="src-count">Best Win Rate</div>
                        <div className="src-wr" style={{ color: "#22c55e", fontSize: 18, fontWeight: 700 }}>
                            {data.highest_win_rate.win_rate}%
                        </div>
                    </div>
                )}
            </div>

            {/* Bar chart by source */}
            <div className="src-bars">
                {(data.sources || []).map((s) => {
                    const pct = Math.max((s.total / maxTotal) * 100, 2);
                    return (
                        <div key={s.source} className="src-bar-row">
                            <div className="src-bar-label">{s.source || "Unknown"}</div>
                            <div className="src-bar-track">
                                <div className="src-bar-fill" style={{ width: `${pct}%` }} />
                                <span className="src-bar-text">{s.total} · {s.win_rate}% won</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
