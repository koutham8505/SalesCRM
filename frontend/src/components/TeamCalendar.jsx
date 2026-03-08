// D:\SalesCRM\frontend\src\components\TeamCalendar.jsx
import { useState, useMemo, useEffect } from "react";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// 12 distinct rep colours (cycles if team is bigger)
const REP_PALETTE = [
    "#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6",
    "#ec4899", "#14b8a6", "#f97316", "#8b5cf6", "#84cc16",
    "#06b6d4", "#e11d48",
];

const EVENT_TYPES = {
    meeting: { label: "Meeting/Demo", icon: "🤝", shape: "circle" },
    followup: { label: "Follow-up", icon: "🔔", shape: "circle" },
    action: { label: "Next Action", icon: "🎯", shape: "circle" },
    overdue: { label: "Overdue", icon: "⚠️", shape: "circle" },
};

const STAGE_COLORS = {
    New: "#64748b", Contacted: "#3b82f6", "Demo/Meeting": "#8b5cf6",
    Proposal: "#f59e0b", Negotiation: "#f97316", Won: "#22c55e", Lost: "#ef4444",
};

function buildRepMap(owners) {
    const map = {};
    (owners || []).forEach((o, i) => {
        map[o.id] = {
            id: o.id,
            name: o.full_name || o.email || "Unknown",
            color: REP_PALETTE[i % REP_PALETTE.length],
            initials: (o.full_name || o.email || "?").slice(0, 2).toUpperCase(),
        };
    });
    return map;
}

function buildEventMap(leads, repMap) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const map = {};

    const add = (dateStr, ev) => {
        if (!dateStr) return;
        const key = dateStr.slice(0, 10);
        if (!map[key]) map[key] = [];
        map[key].push(ev);
    };

    leads.forEach(l => {
        const name = l.lead_name || l.institution_name || "Lead";
        const repInfo = repMap[l.lead_owner] || { name: "Unassigned", color: "#94a3b8", initials: "?" };

        if (l.meeting_date)
            add(l.meeting_date, { type: "meeting", lead: l, label: name, rep: repInfo, date: l.meeting_date });

        if (l.next_follow_up) {
            const isOverdue = l.next_follow_up.slice(0, 10) < todayStr && !["Won", "Lost"].includes(l.stage);
            add(l.next_follow_up, { type: isOverdue ? "overdue" : "followup", lead: l, label: name, rep: repInfo, date: l.next_follow_up });
        }

        if (l.next_action_date && l.next_action_date !== l.next_follow_up)
            add(l.next_action_date, { type: "action", lead: l, label: `${l.next_action || "Action"}: ${name}`, rep: repInfo, date: l.next_action_date });
    });

    return map;
}

// ── Small rep-coloured event chip ──────────────────────────────
function TeamEventChip({ ev, onClick }) {
    const cfg = EVENT_TYPES[ev.type] || EVENT_TYPES.action;
    return (
        <div
            className="tcal-chip"
            style={{ background: ev.rep.color + "18", borderLeft: `3px solid ${ev.rep.color}` }}
            title={`${cfg.icon} ${ev.label} (${ev.rep.name})`}
            onClick={(e) => { e.stopPropagation(); onClick(ev.lead); }}
        >
            <span className="tcal-chip-dot" style={{ background: ev.rep.color }} />
            <span className="tcal-chip-type">{cfg.icon}</span>
            <span className="tcal-chip-label">{ev.label}</span>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────
export default function TeamCalendar({ leads, owners: ownersProp, role, profile, onViewLead, onBack, token }) {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [selectedDay, setSelectedDay] = useState(null);
    const [filterType, setFilterType] = useState("all");
    const [hiddenReps, setHiddenReps] = useState(new Set());
    const [fetchedOwners, setFetchedOwners] = useState([]);

    // Fetch owners ourselves so we don't depend on feature-flag gating in App.jsx
    useEffect(() => {
        if (!token) return;
        fetch(`${BASE}/api/leads/owners`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.ok ? r.json() : [])
            .then(d => Array.isArray(d) && d.length > 0 && setFetchedOwners(d))
            .catch(() => { });
    }, [token]);

    // Merge: fetched owners > prop owners > fallback from leads data
    const owners = useMemo(() => {
        if (fetchedOwners.length > 0) return fetchedOwners;
        if (ownersProp && ownersProp.length > 0) return ownersProp;
        // Build from leads: unique owner ids with names from lead data
        const seen = new Map();
        leads.forEach(l => {
            if (l.lead_owner && !seen.has(l.lead_owner)) {
                seen.set(l.lead_owner, {
                    id: l.lead_owner,
                    full_name: l.owner_name || l.lead_owner_name || "Rep " + seen.size + 1,
                    email: "",
                });
            }
        });
        return [...seen.values()];
    }, [fetchedOwners, ownersProp, leads]);

    const repMap = useMemo(() => buildRepMap(owners), [owners]);
    const eventMap = useMemo(() => buildEventMap(leads, repMap), [leads, repMap]);

    const todayStr = now.toISOString().slice(0, 10);

    // Calendar grid
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
    const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
    const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelectedDay(now.getDate()); };

    const getDateStr = (d) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    // Filter events
    const filterEvents = (evs) => {
        let result = evs;
        if (filterType !== "all") result = result.filter(e => e.type === filterType);
        if (hiddenReps.size > 0) result = result.filter(e => !hiddenReps.has(e.rep.id));
        return result;
    };

    const getDayEvents = (d) => {
        if (!d) return [];
        return filterEvents(eventMap[getDateStr(d)] || []);
    };

    // Sidebar
    const sidebarDate = selectedDay ? getDateStr(selectedDay) : null;
    const sidebarEvents = sidebarDate ? filterEvents(eventMap[sidebarDate] || []) : [];

    // Month totals
    const monthCounts = useMemo(() => {
        const counts = { meeting: 0, followup: 0, action: 0, overdue: 0, total: 0 };
        for (let d = 1; d <= daysInMonth; d++) {
            (eventMap[getDateStr(d)] || []).forEach(e => { if (counts[e.type] !== undefined) { counts[e.type]++; counts.total++; } });
        }
        return counts;
    }, [eventMap, year, month, daysInMonth]);

    // Toggle rep visibility
    const toggleRep = (repId) => {
        setHiddenReps(prev => {
            const s = new Set(prev);
            s.has(repId) ? s.delete(repId) : s.add(repId);
            return s;
        });
    };

    // Active reps this month
    const activeReps = useMemo(() => {
        const seen = new Set();
        for (let d = 1; d <= daysInMonth; d++) {
            (eventMap[getDateStr(d)] || []).forEach(e => seen.add(e.rep.id));
        }
        return [...seen].map(id => repMap[id]).filter(Boolean);
    }, [eventMap, repMap, year, month, daysInMonth]);

    return (
        <div className="tcal-shell">
            {/* ── Header ── */}
            <div className="tcal-header">
                <div className="tcal-nav-row">
                    <div className="tcal-nav">
                        <button className="tcal-nav-btn" onClick={prevMonth}>‹</button>
                        <h2 className="tcal-month-title">{MONTHS[month]} {year}</h2>
                        <button className="tcal-nav-btn" onClick={nextMonth}>›</button>
                        <button className="tcal-today-btn" onClick={goToday}>Today</button>
                    </div>
                    <div className="tcal-summary">
                        <span className="tcal-summary-item">🤝 {monthCounts.meeting}</span>
                        <span className="tcal-summary-item">🔔 {monthCounts.followup}</span>
                        <span className="tcal-summary-item">⚠️ {monthCounts.overdue}</span>
                        <span className="tcal-summary-total">{monthCounts.total} events</span>
                    </div>
                </div>

                {/* Event type filter pills */}
                <div className="tcal-filter-row">
                    <div className="tcal-filter-pills">
                        <button className={`tcal-filter-pill ${filterType === "all" ? "active" : ""}`} onClick={() => setFilterType("all")}>All Events</button>
                        {Object.entries(EVENT_TYPES).map(([k, v]) => (
                            <button key={k} className={`tcal-filter-pill ${filterType === k ? "active" : ""}`} onClick={() => setFilterType(filterType === k ? "all" : k)}>
                                {v.icon} {v.label}
                                <span className="tcal-pill-count">{monthCounts[k] || 0}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Rep filter chips */}
                {activeReps.length > 0 && (
                    <div className="tcal-rep-row">
                        <span className="tcal-rep-label">Reps:</span>
                        <div className="tcal-rep-chips">
                            {activeReps.map(rep => (
                                <button
                                    key={rep.id}
                                    className={`tcal-rep-chip ${hiddenReps.has(rep.id) ? "hidden" : "visible"}`}
                                    style={hiddenReps.has(rep.id) ? {} : { borderColor: rep.color, background: rep.color + "18" }}
                                    onClick={() => toggleRep(rep.id)}
                                    title={hiddenReps.has(rep.id) ? `Show ${rep.name}` : `Hide ${rep.name}`}
                                >
                                    <span className="tcal-rep-dot" style={{ background: hiddenReps.has(rep.id) ? "#94a3b8" : rep.color }} />
                                    {rep.name.split(" ")[0]}
                                    {hiddenReps.has(rep.id) && <span className="tcal-rep-hidden-x">✕</span>}
                                </button>
                            ))}
                            {hiddenReps.size > 0 && (
                                <button className="tcal-rep-reset" onClick={() => setHiddenReps(new Set())}>Show all</button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="tcal-body">
                {/* ── Calendar grid ── */}
                <div className="tcal-grid-wrap">
                    <div className="tcal-day-headers">
                        {DAYS.map(d => <div key={d} className="tcal-day-head">{d}</div>)}
                    </div>
                    <div className="tcal-grid">
                        {cells.map((d, i) => {
                            if (!d) return <div key={`e-${i}`} className="tcal-cell tcal-cell-empty" />;
                            const dateStr = getDateStr(d);
                            const evs = getDayEvents(d);
                            const isToday = dateStr === todayStr;
                            const isSel = d === selectedDay;
                            // Collect rep dots for the day
                            const repDots = [...new Set(evs.map(e => e.rep.id))].slice(0, 5).map(id => repMap[id]).filter(Boolean);
                            return (
                                <div
                                    key={d}
                                    className={`tcal-cell${isToday ? " tcal-today" : ""}${isSel ? " tcal-selected" : ""}${evs.length ? " tcal-has-events" : ""}`}
                                    onClick={() => setSelectedDay(d === selectedDay ? null : d)}
                                >
                                    <div className="tcal-cell-top">
                                        <span className="tcal-cell-num">{d}</span>
                                        {repDots.length > 0 && (
                                            <div className="tcal-rep-dots">
                                                {repDots.map(r => (
                                                    <span key={r.id} className="tcal-rep-dot-mini" style={{ background: r.color }} title={r.name} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="tcal-cell-events">
                                        {evs.slice(0, 2).map((ev, j) => <TeamEventChip key={j} ev={ev} onClick={onViewLead} />)}
                                        {evs.length > 2 && <div className="tcal-more-badge">+{evs.length - 2} more</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Sidebar ── */}
                <div className={`tcal-sidebar ${selectedDay ? "tcal-sidebar-open" : ""}`}>
                    {selectedDay ? (
                        <>
                            <div className="tcal-sidebar-header">
                                <div className="tcal-sidebar-date">
                                    {new Date(year, month, selectedDay).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                                    <span className="tcal-sidebar-count">{sidebarEvents.length} event{sidebarEvents.length !== 1 ? "s" : ""}</span>
                                </div>
                                <button className="tcal-sidebar-close" onClick={() => setSelectedDay(null)}>✕</button>
                            </div>

                            {sidebarEvents.length === 0 ? (
                                <div className="tcal-sidebar-empty">No events on this day.</div>
                            ) : (
                                <div className="tcal-sidebar-events">
                                    {sidebarEvents.map((ev, i) => {
                                        const cfg = EVENT_TYPES[ev.type];
                                        const l = ev.lead;
                                        return (
                                            <div key={i} className="tcal-sidebar-ev" style={{ borderLeft: `4px solid ${ev.rep.color}` }}>
                                                {/* Rep + type */}
                                                <div className="tcal-sb-ev-header">
                                                    <span className="tcal-sb-rep-badge" style={{ background: ev.rep.color + "22", color: ev.rep.color, border: `1px solid ${ev.rep.color}40` }}>
                                                        {ev.rep.initials}
                                                    </span>
                                                    <span className="tcal-sb-rep-name" style={{ color: ev.rep.color }}>{ev.rep.name}</span>
                                                    <span className="tcal-sb-ev-type">{cfg.icon} {cfg.label}</span>
                                                </div>
                                                {/* Lead info */}
                                                <div className="tcal-sb-ev-name" onClick={() => onViewLead?.(l)}>{l.lead_name || "Unnamed"}</div>
                                                {l.institution_name && <div className="tcal-sb-ev-inst">🏢 {l.institution_name}</div>}
                                                {l.phone && <div className="tcal-sb-ev-phone">📞 {l.phone}</div>}
                                                <div className="tcal-sb-ev-footer">
                                                    <span className="tcal-stage-pill" style={{ background: STAGE_COLORS[l.stage] || "#64748b" }}>
                                                        {l.stage || "New"}
                                                    </span>
                                                    <button className="tcal-sb-view-btn" onClick={() => onViewLead?.(l)}>View Lead →</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="tcal-sidebar-hint">
                            <div className="tcal-hint-icon">👥</div>
                            <div className="tcal-hint-title">Team Calendar</div>
                            <div className="tcal-hint-sub">Click any date to see all team events for that day</div>
                            {activeReps.length > 0 && (
                                <div className="tcal-hint-legend">
                                    {activeReps.map(rep => (
                                        <div key={rep.id} className="tcal-hint-rep">
                                            <span className="tcal-rep-dot-mini" style={{ background: rep.color }} />
                                            {rep.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Legend ── */}
            <div className="tcal-legend-row">
                <div className="tcal-legend-events">
                    {Object.entries(EVENT_TYPES).map(([k, v]) => (
                        <div key={k} className="tcal-legend-item">
                            <span>{v.icon}</span> {v.label}
                        </div>
                    ))}
                </div>
                {activeReps.length > 0 && (
                    <div className="tcal-legend-reps">
                        {activeReps.map(rep => (
                            <div key={rep.id} className="tcal-legend-item">
                                <span className="tcal-rep-dot-mini" style={{ background: rep.color }} />
                                {rep.name.split(" ")[0]}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
