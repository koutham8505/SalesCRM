// D:\SalesCRM\frontend\src\components\TodayView.jsx
import { useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Field completeness calculation
const KEY_FIELDS = ["lead_name", "institution_name", "phone", "email", "stage", "lead_source", "board", "fees", "student_strength"];
export function computeCompleteness(lead) {
    const filled = KEY_FIELDS.filter((f) => {
        const v = lead[f];
        return v !== null && v !== undefined && String(v).trim() !== "" && v !== false;
    }).length;
    return Math.round((filled / KEY_FIELDS.length) * 100);
}

function CompletenessBar({ pct }) {
    const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
    return (
        <div className="completeness-wrap" title={`${pct}% complete`}>
            <div className="completeness-track">
                <div className="completeness-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="completeness-pct" style={{ color }}>{pct}%</span>
        </div>
    );
}

export default function TodayView({ leads, tasks, role, token, onViewLead, onTaskUpdate }) {
    const today = new Date().toISOString().slice(0, 10);
    const [doneIds, setDoneIds] = useState(new Set());
    const [updatingId, setUpdatingId] = useState(null);

    const todayFollowUps = useMemo(() =>
        leads.filter((l) => l.next_follow_up?.slice(0, 10) === today && l.stage !== "Won" && l.stage !== "Lost"),
        [leads, today]);

    const todayMeetings = useMemo(() =>
        leads.filter((l) => l.meeting_date?.slice(0, 10) === today),
        [leads, today]);

    const todayNextActions = useMemo(() =>
        leads.filter((l) => l.next_action_date?.slice(0, 10) === today && !doneIds.has(l.id)),
        [leads, today, doneIds]);

    const overdue = useMemo(() =>
        leads.filter((l) =>
            l.next_follow_up && l.next_follow_up.slice(0, 10) < today &&
            l.stage !== "Lost" && l.stage !== "Won"
        ), [leads, today]);

    const todayTasks = useMemo(() =>
        (tasks || []).filter((t) => t.due_date?.slice(0, 10) === today && t.status !== "Done"),
        [tasks, today]);

    const overdueTasks = useMemo(() =>
        (tasks || []).filter((t) => t.due_date && t.due_date.slice(0, 10) < today && t.status !== "Done"),
        [tasks, today]);

    // Mark a lead's next action done — clear next_action + next_action_date
    const markLeadDone = async (lead) => {
        setUpdatingId(lead.id);
        try {
            await fetch(`${API}/api/leads/${lead.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ next_action: null, next_action_date: null }),
            });
            setDoneIds((prev) => new Set([...prev, lead.id]));
        } catch {/* ignore */ } finally { setUpdatingId(null); }
    };

    // Mark a task done
    const markTaskDone = async (task) => {
        setUpdatingId(task.id);
        try {
            const r = await fetch(`${API}/api/tasks/${task.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: "Done" }),
            });
            if (r.ok) onTaskUpdate?.();
        } catch {/* ignore */ } finally { setUpdatingId(null); }
    };

    const totalItems = todayNextActions.length + todayFollowUps.length + todayMeetings.length + todayTasks.length;

    const renderLeadCard = (lead, showMarkDone = false) => (
        <div key={lead.id} className="myday-card">
            <div className="myday-card-header">
                <div>
                    <strong className="myday-lead-name" onClick={() => onViewLead?.(lead)}>
                        {lead.lead_name || "Unnamed"}
                    </strong>
                    {lead.stage && (
                        <span className="myday-stage-badge">{lead.stage}</span>
                    )}
                </div>
                {showMarkDone && (
                    <button
                        className="myday-done-btn"
                        onClick={() => markLeadDone(lead)}
                        disabled={updatingId === lead.id}
                    >
                        {updatingId === lead.id ? "…" : "✓ Done"}
                    </button>
                )}
            </div>
            <div className="myday-card-body">
                {lead.institution_name && <span>🏢 {lead.institution_name}</span>}
                {lead.phone && <span> · 📞 {lead.phone}</span>}
                {lead.next_action && <span> · 🎯 {lead.next_action}</span>}
                {lead.next_follow_up && <span> · 📅 {lead.next_follow_up.slice(0, 10)}</span>}
                {lead.meeting_date && <span> · 🤝 {lead.meeting_date.slice(0, 16).replace("T", " ")}</span>}
            </div>
            <CompletenessBar pct={computeCompleteness(lead)} />
        </div>
    );

    const renderTaskCard = (task) => (
        <div key={task.id} className="myday-card myday-task-card">
            <div className="myday-card-header">
                <div>
                    <strong>{task.title}</strong>
                    {task.description && <span className="myday-task-desc"> — {task.description}</span>}
                </div>
                <button
                    className="myday-done-btn"
                    onClick={() => markTaskDone(task)}
                    disabled={updatingId === task.id}
                >
                    {updatingId === task.id ? "…" : "✓ Done"}
                </button>
            </div>
            {task.due_date && (
                <div className="myday-card-body" style={{ color: task.due_date.slice(0, 10) < today ? "#ef4444" : "#64748b" }}>
                    📅 Due: {task.due_date.slice(0, 10)}
                    {task.due_date.slice(0, 10) < today && " ⚠️ Overdue"}
                </div>
            )}
        </div>
    );

    return (
        <div className="myday-view">
            {/* Header */}
            <div className="myday-header">
                <div>
                    <h2 className="myday-title">☀️ My Day</h2>
                    <p className="myday-subtitle">
                        {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </p>
                </div>
                <div className="myday-summary-badges">
                    <span className="myday-badge">{totalItems} items today</span>
                    {overdue.length > 0 && <span className="myday-badge myday-badge-red">{overdue.length} overdue</span>}
                    {overdueTasks.length > 0 && <span className="myday-badge myday-badge-red">{overdueTasks.length} overdue tasks</span>}
                </div>
            </div>

            {totalItems === 0 && overdue.length === 0 && overdueTasks.length === 0 && (
                <div className="myday-empty">
                    🎉 All clear! Nothing scheduled for today.
                </div>
            )}

            {/* Today's Next Actions */}
            {todayNextActions.length > 0 && (
                <div className="myday-section">
                    <h3 className="myday-section-title">🎯 Next Actions Due Today ({todayNextActions.length})</h3>
                    <div className="myday-cards-grid">
                        {todayNextActions.map((l) => renderLeadCard(l, true))}
                    </div>
                </div>
            )}

            {/* Today's follow-ups */}
            {todayFollowUps.length > 0 && (
                <div className="myday-section">
                    <h3 className="myday-section-title">🔔 Follow-ups Due Today ({todayFollowUps.length})</h3>
                    <div className="myday-cards-grid">
                        {todayFollowUps.map((l) => renderLeadCard(l, false))}
                    </div>
                </div>
            )}

            {/* Today's meetings */}
            {todayMeetings.length > 0 && (
                <div className="myday-section">
                    <h3 className="myday-section-title">🤝 Meetings Today ({todayMeetings.length})</h3>
                    <div className="myday-cards-grid">
                        {todayMeetings.map((l) => renderLeadCard(l, false))}
                    </div>
                </div>
            )}

            {/* Today's tasks */}
            {todayTasks.length > 0 && (
                <div className="myday-section">
                    <h3 className="myday-section-title">✅ Tasks Due Today ({todayTasks.length})</h3>
                    <div className="myday-cards-grid">
                        {todayTasks.map((t) => renderTaskCard(t))}
                    </div>
                </div>
            )}

            {/* Overdue follow-ups */}
            {overdue.length > 0 && (
                <div className="myday-section myday-section-danger">
                    <h3 className="myday-section-title" style={{ color: "#dc2626" }}>⚠️ Overdue Follow-ups ({overdue.length})</h3>
                    <div className="myday-cards-grid">
                        {overdue.map((l) => renderLeadCard(l, false))}
                    </div>
                </div>
            )}

            {/* Overdue tasks */}
            {overdueTasks.length > 0 && (
                <div className="myday-section myday-section-danger">
                    <h3 className="myday-section-title" style={{ color: "#dc2626" }}>⚠️ Overdue Tasks ({overdueTasks.length})</h3>
                    <div className="myday-cards-grid">
                        {overdueTasks.map((t) => renderTaskCard(t))}
                    </div>
                </div>
            )}
        </div>
    );
}
