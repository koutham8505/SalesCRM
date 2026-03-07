// D:\SalesCRM\frontend\src\components\CalendarView.jsx
import { useState, useMemo } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const EVENT_TYPES = {
    meeting: { color: "#8b5cf6", bg: "#f5f3ff", label: "Meeting/Demo", icon: "🤝" },
    followup: { color: "#3b82f6", bg: "#eff6ff", label: "Follow-up", icon: "🔔" },
    action: { color: "#f59e0b", bg: "#fffbeb", label: "Next Action", icon: "🎯" },
    overdue: { color: "#ef4444", bg: "#fef2f2", label: "Overdue", icon: "⚠️" },
};

function buildEvents(leads) {
    const map = {}; // date-string → [{...}]
    const add = (dateStr, ev) => {
        if (!dateStr) return;
        const key = dateStr.slice(0, 10);
        if (!map[key]) map[key] = [];
        map[key].push(ev);
    };

    const todayStr = new Date().toISOString().slice(0, 10);

    leads.forEach((l) => {
        const name = l.lead_name || l.institution_name || "Lead";
        if (l.meeting_date) add(l.meeting_date, { type: "meeting", lead: l, label: `${name}`, date: l.meeting_date });
        if (l.next_follow_up) {
            const isOverdue = l.next_follow_up.slice(0, 10) < todayStr && !["Won", "Lost"].includes(l.stage);
            add(l.next_follow_up, { type: isOverdue ? "overdue" : "followup", lead: l, label: name, date: l.next_follow_up });
        }
        if (l.next_action_date && l.next_action_date !== l.next_follow_up) {
            add(l.next_action_date, { type: "action", lead: l, label: `${l.next_action || "Action"}: ${name}`, date: l.next_action_date });
        }
    });
    return map;
}

function EventChip({ ev, onClick }) {
    const cfg = EVENT_TYPES[ev.type] || EVENT_TYPES.action;
    return (
        <div
            className="cal-event-chip"
            style={{ background: cfg.bg, borderLeft: `3px solid ${cfg.color}`, color: cfg.color }}
            title={`${cfg.icon} ${ev.label}`}
            onClick={(e) => { e.stopPropagation(); onClick(ev.lead); }}
        >
            <span className="cal-event-icon">{cfg.icon}</span>
            <span className="cal-event-label">{ev.label}</span>
        </div>
    );
}

export default function CalendarView({ leads, onViewLead }) {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [selectedDay, setSelectedDay] = useState(null);
    const [filterType, setFilterType] = useState("all");

    const eventMap = useMemo(() => buildEvents(leads), [leads]);
    const todayStr = now.toISOString().slice(0, 10);

    // Build calendar grid
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
    const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
    const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelectedDay(now.getDate()); };

    const getDateStr = (d) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    const getDayEvents = (d) => {
        if (!d) return [];
        const evs = eventMap[getDateStr(d)] || [];
        return filterType === "all" ? evs : evs.filter(e => e.type === filterType);
    };

    // Sidebar: selected day events
    const sidebarDate = selectedDay ? getDateStr(selectedDay) : null;
    const sidebarEvents = sidebarDate ? (eventMap[sidebarDate] || []).filter(e => filterType === "all" || e.type === filterType) : null;

    // Legend counts this month
    const monthCounts = useMemo(() => {
        const counts = { meeting: 0, followup: 0, action: 0, overdue: 0 };
        for (let d = 1; d <= daysInMonth; d++) {
            (eventMap[getDateStr(d)] || []).forEach(e => { if (counts[e.type] !== undefined) counts[e.type]++; });
        }
        return counts;
    }, [eventMap, year, month, daysInMonth]);

    return (
        <div className="cal-shell">
            {/* ── Header ── */}
            <div className="cal-header">
                <div className="cal-nav">
                    <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
                    <h2 className="cal-month-title">{MONTHS[month]} {year}</h2>
                    <button className="cal-nav-btn" onClick={nextMonth}>›</button>
                    <button className="cal-today-btn" onClick={goToday}>Today</button>
                </div>
                {/* Filter pills */}
                <div className="cal-filter-pills">
                    <button className={`cal-filter-pill ${filterType === "all" ? "active" : ""}`} onClick={() => setFilterType("all")}>All</button>
                    {Object.entries(EVENT_TYPES).map(([k, v]) => (
                        <button
                            key={k}
                            className={`cal-filter-pill ${filterType === k ? "active" : ""}`}
                            style={filterType === k ? { background: v.bg, borderColor: v.color, color: v.color } : {}}
                            onClick={() => setFilterType(filterType === k ? "all" : k)}
                        >
                            {v.icon} {v.label} <span className="cal-pill-count">{monthCounts[k]}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="cal-body">
                {/* ── Calendar grid ── */}
                <div className="cal-grid-wrap">
                    {/* Day headers */}
                    <div className="cal-day-headers">
                        {DAYS.map(d => <div key={d} className="cal-day-head">{d}</div>)}
                    </div>
                    {/* Cells */}
                    <div className="cal-grid">
                        {cells.map((d, i) => {
                            if (!d) return <div key={`empty-${i}`} className="cal-cell cal-cell-empty" />;
                            const dateStr = getDateStr(d);
                            const evs = getDayEvents(d);
                            const isToday = dateStr === todayStr;
                            const isSelected = d === selectedDay;
                            return (
                                <div
                                    key={d}
                                    className={`cal-cell${isToday ? " cal-cell-today" : ""}${isSelected ? " cal-cell-selected" : ""}${evs.length ? " cal-cell-has-events" : ""}`}
                                    onClick={() => setSelectedDay(d === selectedDay ? null : d)}
                                >
                                    <div className="cal-cell-num">{d}</div>
                                    <div className="cal-cell-events">
                                        {evs.slice(0, 3).map((ev, j) => (
                                            <EventChip key={j} ev={ev} onClick={onViewLead} />
                                        ))}
                                        {evs.length > 3 && (
                                            <div className="cal-more-badge">+{evs.length - 3} more</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Sidebar: selected day detail ── */}
                <div className={`cal-sidebar ${selectedDay ? "cal-sidebar-open" : ""}`}>
                    {selectedDay ? (
                        <>
                            <div className="cal-sidebar-header">
                                <div className="cal-sidebar-date">
                                    {new Date(year, month, selectedDay).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                                </div>
                                <button className="cal-sidebar-close" onClick={() => setSelectedDay(null)}>✕</button>
                            </div>
                            {sidebarEvents && sidebarEvents.length > 0 ? (
                                <div className="cal-sidebar-events">
                                    {sidebarEvents.map((ev, i) => {
                                        const cfg = EVENT_TYPES[ev.type];
                                        const l = ev.lead;
                                        return (
                                            <div key={i} className="cal-sidebar-ev" style={{ borderLeft: `4px solid ${cfg.color}` }}>
                                                <div className="cal-sidebar-ev-type" style={{ color: cfg.color }}>{cfg.icon} {cfg.label}</div>
                                                <div className="cal-sidebar-ev-name" onClick={() => onViewLead?.(l)}>{l.lead_name || "Unnamed"}</div>
                                                {l.institution_name && <div className="cal-sidebar-ev-inst">🏢 {l.institution_name}</div>}
                                                {l.phone && <div className="cal-sidebar-ev-phone">📞 {l.phone}</div>}
                                                <div className="cal-sidebar-ev-stage">
                                                    <span className="stage-pill" style={{ background: { New: "#64748b", Contacted: "#3b82f6", "Demo/Meeting": "#8b5cf6", Proposal: "#f59e0b", Negotiation: "#f97316", Won: "#22c55e", Lost: "#ef4444" }[l.stage] || "#64748b", color: "#fff", padding: "2px 8px", borderRadius: 10, fontSize: 11 }}>{l.stage || "New"}</span>
                                                </div>
                                                <button className="cal-sidebar-ev-btn" onClick={() => onViewLead?.(l)}>View Lead →</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="cal-sidebar-empty">No {filterType === "all" ? "" : EVENT_TYPES[filterType]?.label + " "}events on this day.</div>
                            )}
                        </>
                    ) : (
                        <div className="cal-sidebar-hint">
                            <div className="cal-sidebar-hint-icon">📅</div>
                            <div>Click any date to see events</div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Legend ── */}
            <div className="cal-legend">
                {Object.entries(EVENT_TYPES).map(([k, v]) => (
                    <div key={k} className="cal-legend-item">
                        <span className="cal-legend-dot" style={{ background: v.color }} />
                        {v.icon} {v.label}
                    </div>
                ))}
            </div>
        </div>
    );
}
