// D:\SalesCRM\frontend\src\components\TodayView.jsx
import { useMemo } from "react";

export default function TodayView({ leads, role, onViewLead }) {
    const today = new Date().toISOString().slice(0, 10);

    const todayFollowUps = useMemo(() => leads.filter((l) => l.next_follow_up?.slice(0, 10) === today), [leads, today]);
    const todayMeetings = useMemo(() => leads.filter((l) => l.meeting_date?.slice(0, 10) === today), [leads, today]);
    const overdue = useMemo(() => leads.filter((l) =>
        l.next_follow_up && l.next_follow_up.slice(0, 10) < today && l.status !== "Loss" && l.status !== "Won"
    ), [leads, today]);

    const renderList = (items, label) => (
        <div className="today-section">
            <h3>{label} ({items.length})</h3>
            {items.length === 0
                ? <p className="empty-message">None</p>
                : <div className="today-cards">
                    {items.map((l) => (
                        <div key={l.id} className="today-card" onClick={() => onViewLead(l)}>
                            <div className="tc-header">
                                <strong>{l.lead_name || "Unnamed"}</strong>
                                <span className={`status-chip status-${(l.status || "").toLowerCase().replace(/\s+/g, "-")}`}>{l.status}</span>
                            </div>
                            <div className="tc-body">
                                {l.institution_name && <span>🏢 {l.institution_name}</span>}
                                {l.phone && <span> · 📞 {l.phone}</span>}
                                {l.next_follow_up && <span> · 📅 {l.next_follow_up.slice(0, 10)}</span>}
                                {l.meeting_date && <span> · 🤝 {l.meeting_date.slice(0, 16).replace("T", " ")}</span>}
                            </div>
                            {l.owner_name && <div className="tc-owner">👤 {l.owner_name}</div>}
                        </div>
                    ))}
                </div>
            }
        </div>
    );

    return (
        <div className="today-view">
            <h2>📋 Today's Agenda</h2>
            {renderList(todayFollowUps, "Follow-ups Due Today")}
            {renderList(todayMeetings, "Meetings Today")}
            {renderList(overdue, "⚠️ Overdue Follow-ups")}
        </div>
    );
}
