// D:\SalesCRM\frontend\src\components\WinLossAnalysis.jsx
import { useMemo } from "react";

const BAR_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#22c55e", "#f97316", "#14b8a6", "#ec4899"];

function Bar({ label, value, max, color, extra }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="wl-bar-row">
            <div className="wl-bar-label">{label}</div>
            <div className="wl-bar-track">
                <div className="wl-bar-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
            <div className="wl-bar-value">{value}{extra}</div>
        </div>
    );
}

function StatCard({ icon, label, value, sub, color }) {
    return (
        <div className="wl-stat-card" style={{ borderTop: `3px solid ${color}` }}>
            <div className="wl-stat-icon">{icon}</div>
            <div className="wl-stat-value" style={{ color }}>{value}</div>
            <div className="wl-stat-label">{label}</div>
            {sub && <div className="wl-stat-sub">{sub}</div>}
        </div>
    );
}

export default function WinLossAnalysis({ leads }) {
    const stats = useMemo(() => {
        const total = leads.length;
        const won = leads.filter(l => l.stage === "Won");
        const lost = leads.filter(l => l.stage === "Lost");
        const active = leads.filter(l => !["Won", "Lost"].includes(l.stage));

        // Win rate
        const winRate = total ? Math.round((won.length / total) * 100) : 0;
        const lossRate = total ? Math.round((lost.length / total) * 100) : 0;

        // Lost reasons
        const lostReasonMap = {};
        lost.forEach(l => {
            const r = l.lost_reason || "Not specified";
            lostReasonMap[r] = (lostReasonMap[r] || 0) + 1;
        });
        const lostReasons = Object.entries(lostReasonMap).sort((a, b) => b[1] - a[1]);

        // Win/loss by source
        const sourceMap = {};
        leads.forEach(l => {
            const src = l.lead_source || "Unknown";
            if (!sourceMap[src]) sourceMap[src] = { total: 0, won: 0, lost: 0 };
            sourceMap[src].total++;
            if (l.stage === "Won") sourceMap[src].won++;
            if (l.stage === "Lost") sourceMap[src].lost++;
        });
        const sourceStats = Object.entries(sourceMap)
            .map(([src, d]) => ({ src, ...d, winRate: d.total ? Math.round((d.won / d.total) * 100) : 0 }))
            .sort((a, b) => b.total - a.total);

        // Stage distribution
        const stageOrder = ["New", "Contacted", "Demo/Meeting", "Proposal", "Negotiation", "Won", "Lost"];
        const stageMap = {};
        leads.forEach(l => {
            const s = l.stage || "New";
            stageMap[s] = (stageMap[s] || 0) + 1;
        });
        const stageStats = stageOrder.map(s => ({ stage: s, count: stageMap[s] || 0 }));

        // Avg deal value
        const wonWithValue = won.filter(l => l.deal_value && Number(l.deal_value) > 0);
        const avgDealValue = wonWithValue.length
            ? Math.round(wonWithValue.reduce((s, l) => s + Number(l.deal_value), 0) / wonWithValue.length)
            : 0;

        // Pipeline value
        const pipelineValue = active.reduce((s, l) => s + (Number(l.deal_value) || 0), 0);

        // Avg days to close (Won leads with lead_date)
        const closedWithDates = won.filter(l => l.lead_date);
        const avgDaysToClose = closedWithDates.length
            ? Math.round(closedWithDates.reduce((s, l) => {
                const d = (new Date() - new Date(l.lead_date)) / (1000 * 60 * 60 * 24);
                return s + d;
            }, 0) / closedWithDates.length)
            : null;

        // Best performer (most wins)
        const ownerWins = {};
        won.forEach(l => { const o = l.owner_name || l.lead_owner || "Unknown"; ownerWins[o] = (ownerWins[o] || 0) + 1; });
        const bestOwner = Object.entries(ownerWins).sort((a, b) => b[1] - a[1])[0];

        return {
            total, won: won.length, lost: lost.length, active: active.length,
            winRate, lossRate, lostReasons, sourceStats, stageStats,
            avgDealValue, pipelineValue, avgDaysToClose, bestOwner
        };
    }, [leads]);

    const maxStage = Math.max(...stats.stageStats.map(s => s.count), 1);
    const maxSource = Math.max(...stats.sourceStats.map(s => s.total), 1);
    const maxLostReason = Math.max(...stats.lostReasons.map(r => r[1]), 1);

    const STAGE_COLORS = { New: "#64748b", Contacted: "#3b82f6", "Demo/Meeting": "#8b5cf6", Proposal: "#f59e0b", Negotiation: "#f97316", Won: "#22c55e", Lost: "#ef4444" };

    return (
        <div className="wl-shell">
            <div className="wl-page-header">
                <h2 className="wl-title">🏆 Win / Loss Analysis</h2>
                <p className="wl-subtitle">Insights into your pipeline performance based on {stats.total} leads</p>
            </div>

            {/* ── KPI row ── */}
            <div className="wl-stat-row">
                <StatCard icon="✅" label="Won" value={stats.won} sub={`${stats.winRate}% win rate`} color="#22c55e" />
                <StatCard icon="❌" label="Lost" value={stats.lost} sub={`${stats.lossRate}% loss rate`} color="#ef4444" />
                <StatCard icon="⚡" label="Active" value={stats.active} sub="Leads in pipeline" color="#3b82f6" />
                <StatCard icon="💰" label="Avg Deal" value={stats.avgDealValue ? `₹${stats.avgDealValue.toLocaleString()}` : "—"} sub="Avg won deal value" color="#f59e0b" />
                <StatCard icon="📦" label="Pipeline" value={`₹${(stats.pipelineValue / 100000).toFixed(1)}L`} sub="Active deal value" color="#8b5cf6" />
                <StatCard icon="📅" label="Avg to Close" value={stats.avgDaysToClose ? `${stats.avgDaysToClose}d` : "—"} sub="Days to win" color="#14b8a6" />
            </div>

            <div className="wl-charts-row">
                {/* ── Stage Distribution ── */}
                <div className="wl-chart-card">
                    <h3 className="wl-chart-title">📊 Lead Stage Distribution</h3>
                    <div className="wl-bars">
                        {stats.stageStats.map((s, i) => (
                            <Bar key={s.stage} label={s.stage} value={s.count} max={maxStage}
                                color={STAGE_COLORS[s.stage] || "#64748b"} extra="" />
                        ))}
                    </div>
                </div>

                {/* ── Lost Reasons ── */}
                <div className="wl-chart-card">
                    <h3 className="wl-chart-title">❌ Why Deals Are Lost</h3>
                    {stats.lostReasons.length === 0 ? (
                        <div className="wl-empty">No lost deals recorded yet</div>
                    ) : (
                        <div className="wl-bars">
                            {stats.lostReasons.map(([reason, count], i) => (
                                <Bar key={reason} label={reason} value={count} max={maxLostReason}
                                    color={["#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16"][i] || "#94a3b8"}
                                    extra={` (${Math.round((count / stats.lost) * 100)}%)`} />
                            ))}
                        </div>
                    )}
                    {stats.lostReasons.length > 0 && (
                        <div className="wl-insight">
                            💡 Top reason: <strong>{stats.lostReasons[0][0]}</strong> — consider addressing this in your pitch
                        </div>
                    )}
                </div>
            </div>

            {/* ── Source Performance ── */}
            <div className="wl-chart-card wl-source-card">
                <h3 className="wl-chart-title">🎯 Performance by Lead Source</h3>
                <div className="wl-source-table">
                    <div className="wl-source-head">
                        <span>Source</span><span>Total</span><span>Won</span><span>Lost</span><span>Win Rate</span><span>Win Rate Bar</span>
                    </div>
                    {stats.sourceStats.map((s, i) => (
                        <div key={s.src} className="wl-source-row">
                            <span className="wl-source-name">
                                <span className="wl-source-dot" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} />
                                {s.src}
                            </span>
                            <span>{s.total}</span>
                            <span style={{ color: "#22c55e", fontWeight: 600 }}>{s.won}</span>
                            <span style={{ color: "#ef4444" }}>{s.lost}</span>
                            <span style={{ color: "#3b82f6", fontWeight: 700 }}>{s.winRate}%</span>
                            <span className="wl-source-bar-wrap">
                                <div className="wl-source-bar" style={{ width: `${s.winRate}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} />
                            </span>
                        </div>
                    ))}
                </div>
                {stats.sourceStats.length > 0 && (
                    <div className="wl-insight">
                        🏆 Best source by win rate: <strong>
                            {[...stats.sourceStats].sort((a, b) => b.winRate - a.winRate)[0].src}
                        </strong> with {[...stats.sourceStats].sort((a, b) => b.winRate - a.winRate)[0].winRate}% win rate
                    </div>
                )}
            </div>

            {/* ── Best performer ── */}
            {stats.bestOwner && (
                <div className="wl-winner-banner">
                    🥇 Top closer this period: <strong>{stats.bestOwner[0]}</strong> with {stats.bestOwner[1]} win{stats.bestOwner[1] !== 1 ? "s" : ""}
                </div>
            )}
        </div>
    );
}
