// D:\SalesCRM\frontend\src\components\LeadDetail.jsx
import { useState, useEffect } from "react";
import { computeCompleteness } from "./TodayView";

const API_BASE = `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api`;
const typeIcons = { CALL: "📞", EMAIL: "✉️", MEETING: "🤝", NOTE: "📝", PITCH_DECK: "📊" };

const STAGE_COLORS = {
    "New": "#64748b", "Contacted": "#3b82f6", "Demo/Meeting": "#8b5cf6",
    "Proposal": "#f59e0b", "Negotiation": "#f97316", "Won": "#22c55e", "Lost": "#ef4444"
};

const TAG_COLORS = ["#dbeafe", "#fce7f3", "#d1fae5", "#fef3c7", "#e0e7ff", "#fee2e2", "#ccfbf1", "#fef9c3"];

export default function LeadDetail({ lead, session, profile, onClose, showToast, owners }) {
    const [tab, setTab] = useState("details");
    const [activities, setActivities] = useState([]);
    const [notes, setNotes] = useState([]);
    const [approvals, setApprovals] = useState([]);
    const [actForm, setActForm] = useState({ type: "NOTE", description: "", outcome: "", duration: "" });
    const [noteText, setNoteText] = useState("");
    const [saving, setSaving] = useState(false);
    const [savingNote, setSavingNote] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [showTemplates, setShowTemplates] = useState(false);
    const [approvalForm, setApprovalForm] = useState({ request_type: "discount", description: "", amount: "" });
    const [savingApproval, setSavingApproval] = useState(false);
    const [taskForm, setTaskForm] = useState({ title: "", description: "", due_date: "", assigned_to: "", assigned_to_name: "" });
    const [savingTask, setSavingTask] = useState(false);

    const auth = { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };

    useEffect(() => {
        if (lead?.id) { fetchActivities(); fetchNotes(); fetchLeadApprovals(); }
    }, [lead?.id]);

    useEffect(() => {
        if (tab === "notes") fetchNotes();
        if (tab === "timeline") fetchActivities();
        if (tab === "approvals") fetchLeadApprovals();
    }, [tab]);

    const fetchActivities = async () => {
        try {
            const res = await fetch(`${API_BASE}/activities/${lead.id}`, { headers: auth });
            if (res.ok) setActivities(await res.json());
        } catch { /* ignore */ }
    };

    const fetchNotes = async () => {
        try {
            const res = await fetch(`${API_BASE}/leads/${lead.id}/notes`, { headers: auth });
            if (res.ok) setNotes(await res.json());
        } catch { }
    };

    const fetchLeadApprovals = async () => {
        try {
            const res = await fetch(`${API_BASE}/approvals`, { headers: auth });
            if (res.ok) {
                const all = await res.json();
                setApprovals(all.filter((a) => a.lead_id === lead.id));
            }
        } catch { }
    };

    const fetchTemplates = async () => {
        try {
            const res = await fetch(`${API_BASE}/templates`, { headers: auth });
            if (res.ok) setTemplates(await res.json());
        } catch { }
    };

    const handleLogActivity = async () => {
        if (!actForm.description.trim()) return showToast("Description required", "error");
        try {
            setSaving(true);
            const res = await fetch(`${API_BASE}/activities`, {
                method: "POST", headers: auth,
                body: JSON.stringify({ lead_id: lead.id, type: actForm.type, description: actForm.description, outcome: actForm.outcome, duration: actForm.duration ? parseInt(actForm.duration) : null }),
            });
            if (!res.ok) throw new Error((await res.json()).message);
            showToast("Activity logged", "success");
            setActForm({ type: "NOTE", description: "", outcome: "", duration: "" });
            fetchActivities();
        } catch (err) { showToast(err.message, "error"); }
        finally { setSaving(false); }
    };

    const handleAddNote = async () => {
        if (!noteText.trim()) return;
        try {
            setSavingNote(true);
            const res = await fetch(`${API_BASE}/leads/${lead.id}/notes`, {
                method: "POST", headers: auth,
                body: JSON.stringify({ note: noteText.trim() }),
            });
            if (!res.ok) throw new Error((await res.json()).message);
            setNoteText("");
            fetchNotes();
        } catch (err) { showToast(err.message, "error"); }
        finally { setSavingNote(false); }
    };

    const handleDeleteNote = async (noteId) => {
        try {
            await fetch(`${API_BASE}/leads/${lead.id}/notes/${noteId}`, { method: "DELETE", headers: auth });
            setNotes((prev) => prev.filter((n) => n.id !== noteId));
        } catch { }
    };

    const handleUseTemplate = (template) => {
        setActForm((prev) => ({ ...prev, description: template.content, type: template.type === "email" ? "EMAIL" : template.type === "call_script" ? "CALL" : "NOTE" }));
        setTab("timeline");
        setShowTemplates(false);
    };

    const handleEmail = () => {
        const subject = encodeURIComponent(`Introduction about our services`);
        const body = encodeURIComponent(`Hi ${lead.lead_name || ""},\n\nI wanted to reach out regarding...\n\nBest regards,\n${profile?.full_name || ""}`);
        window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`, "_self");
    };

    const handleRequestApproval = async () => {
        if (!approvalForm.description.trim()) return showToast("Description required", "error");
        try {
            setSavingApproval(true);
            const r = await fetch(`${API_BASE}/approvals`, {
                method: "POST", headers: auth,
                body: JSON.stringify({
                    lead_id: lead.id,
                    lead_name: lead.lead_name,
                    ...approvalForm,
                    amount: approvalForm.amount ? parseFloat(approvalForm.amount) : undefined,
                }),
            });
            if (!r.ok) throw new Error((await r.json()).message);
            showToast("Approval request sent to Manager", "success");
            setApprovalForm({ request_type: "discount", description: "", amount: "" });
            fetchLeadApprovals();
        } catch (err) { showToast(err.message, "error"); }
        finally { setSavingApproval(false); }
    };

    const handleCreateTask = async () => {
        if (!taskForm.title.trim()) return showToast("Task title required", "error");
        try {
            setSavingTask(true);
            const r = await fetch(`${API_BASE}/tasks`, {
                method: "POST", headers: auth,
                body: JSON.stringify({
                    ...taskForm,
                    lead_id: lead.id,
                    lead_name: lead.lead_name,
                }),
            });
            if (!r.ok) throw new Error((await r.json()).message);
            showToast("Task created", "success");
            setTaskForm({ title: "", description: "", due_date: "", assigned_to: "", assigned_to_name: "" });
        } catch (err) { showToast(err.message, "error"); }
        finally { setSavingTask(false); }
    };

    const scoreLabel = (s) => s >= 70 ? "Hot" : s >= 40 ? "Warm" : "Cold";
    const scoreClass = (s) => s >= 70 ? "score-hot" : s >= 40 ? "score-warm" : "score-cold";
    const tags = Array.isArray(lead.tags) ? lead.tags : (lead.tags ? JSON.parse(lead.tags) : []);
    const completeness = computeCompleteness(lead);

    if (!lead) return null;

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-card lead-detail-modal">
                {/* Header */}
                <div className="lead-detail-header">
                    <div>
                        <h2>{lead.lead_name || "Unnamed Lead"}</h2>
                        <p className="lead-detail-sub">
                            {lead.institution_name && <span>🏢 {lead.institution_name}</span>}
                            {lead.job_title && <span> · {lead.job_title}</span>}
                        </p>
                        {/* Tags */}
                        {tags.length > 0 && (
                            <div className="ld-tags">
                                {tags.map((tag, i) => (
                                    <span key={tag} className="ld-tag" style={{ background: TAG_COLORS[i % TAG_COLORS.length] }}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="lead-detail-badges">
                        {lead.stage && (
                            <span className="stage-pill" style={{ background: STAGE_COLORS[lead.stage] || "#64748b", color: "#fff", padding: "3px 10px", borderRadius: 12, fontSize: 11 }}>
                                {lead.stage}
                            </span>
                        )}
                        {lead.score !== undefined && (
                            <span className={`score-pill ${scoreClass(lead.score)}`}>{scoreLabel(lead.score)} ({lead.score})</span>
                        )}
                        <span className={`status-chip status-${(lead.status || "").toLowerCase().replace(/\s+/g, "-")}`}>{lead.status || "—"}</span>
                    </div>
                </div>

                {/* Completeness bar */}
                <div className="ld-completeness">
                    <span style={{ fontSize: 11, color: "#64748b" }}>Profile {completeness}% complete</span>
                    <div className="completeness-track" style={{ flex: 1, margin: "0 8px" }}>
                        <div className="completeness-fill" style={{
                            width: `${completeness}%`,
                            background: completeness >= 80 ? "#22c55e" : completeness >= 50 ? "#f59e0b" : "#ef4444"
                        }} />
                    </div>
                </div>

                {/* Next action banner */}
                {lead.next_action && (
                    <div className="ld-next-action">
                        🎯 Next: <strong>{lead.next_action}</strong>
                        {lead.next_action_date && <span> · Due {lead.next_action_date}</span>}
                    </div>
                )}

                {/* Tabs */}
                <div className="detail-tabs">
                    <button className={`ptab ${tab === "details" ? "active" : ""}`} onClick={() => setTab("details")}>Details</button>
                    <button className={`ptab ${tab === "notes" ? "active" : ""}`} onClick={() => setTab("notes")}>📝 Notes ({notes.length})</button>
                    <button className={`ptab ${tab === "timeline" ? "active" : ""}`} onClick={() => setTab("timeline")}>Timeline ({activities.length})</button>
                    <button className={`ptab ${tab === "task" ? "active" : ""}`} onClick={() => setTab("task")}>📌 Create Task</button>
                    <button className={`ptab ${tab === "approvals" ? "active" : ""}`} onClick={() => setTab("approvals")}>
                        📋 Approvals {approvals.filter((a) => a.status === "Pending").length > 0 && <span className="admin-tab-badge">{approvals.filter((a) => a.status === "Pending").length}</span>}
                    </button>
                </div>

                {/* Details Tab */}
                {tab === "details" && (
                    <div className="lead-detail-grid">
                        <div className="ld-field"><span className="ld-label">Phone</span><span>{lead.phone || "—"}</span></div>
                        <div className="ld-field"><span className="ld-label">Alt Phone</span><span>{lead.alt_phone || "—"}</span></div>
                        <div className="ld-field"><span className="ld-label">WhatsApp</span><span>{lead.whatsapp || "—"}</span></div>
                        <div className="ld-field"><span className="ld-label">Email</span>
                            <span>{lead.email || "—"}
                                {lead.email && <button className="btn-sm" style={{ marginLeft: 6 }} onClick={handleEmail}>✉️ Email</button>}
                            </span>
                        </div>
                        <div className="ld-field"><span className="ld-label">Website</span><span>{lead.website || "—"}</span></div>
                        <div className="ld-field"><span className="ld-label">Lead Source</span><span>{lead.lead_source || "—"}</span></div>
                        <div className="ld-field"><span className="ld-label">Call Status</span><span className={`status-chip call-${(lead.call_status || "").toLowerCase().replace(/\s+/g, "-")}`}>{lead.call_status || "—"}</span></div>
                        <div className="ld-field"><span className="ld-label">Next Follow Up</span><span>{lead.next_follow_up?.slice(0, 10) || "—"}</span></div>
                        <div className="ld-field"><span className="ld-label">Meeting Date</span><span>{lead.meeting_date ? lead.meeting_date.replace("T", " ").slice(0, 16) : "—"}</span></div>
                        <div className="ld-field"><span className="ld-label">Owner</span><span>{lead.owner_name || lead.lead_owner || "—"}</span></div>
                        {lead.deal_value !== undefined && <div className="ld-field"><span className="ld-label">Deal Value</span><span>₹{Number(lead.deal_value || 0).toLocaleString()}</span></div>}
                        {lead.lost_reason && <div className="ld-field"><span className="ld-label">Loss Reason</span><span style={{ color: "#dc2626" }}>{lead.lost_reason}</span></div>}
                        <div className="ld-field"><span className="ld-label">Proposal Sent</span><span>{lead.proposal_sent ? "Yes" : "No"}</span></div>
                        {lead.proposal_link && <div className="ld-field"><span className="ld-label">Proposal Link</span><span><a href={lead.proposal_link} target="_blank" rel="noreferrer">{lead.proposal_link}</a></span></div>}
                        {lead.board && <div className="ld-field"><span className="ld-label">Board</span><span>{lead.board}</span></div>}
                        {lead.grades_offered && <div className="ld-field"><span className="ld-label">Grades Offered</span><span>{lead.grades_offered}</span></div>}
                        {lead.student_strength && <div className="ld-field"><span className="ld-label">Student Strength</span><span>{lead.student_strength}</span></div>}
                        {lead.fees && <div className="ld-field"><span className="ld-label">Fees</span><span>{lead.fees}</span></div>}
                        {lead.medium_of_instruction && <div className="ld-field"><span className="ld-label">Medium</span><span>{lead.medium_of_instruction}</span></div>}
                        {lead.school_type && <div className="ld-field"><span className="ld-label">School Type</span><span>{lead.school_type}</span></div>}
                        {lead.tier && <div className="ld-field"><span className="ld-label">Tier</span><span>{lead.tier}</span></div>}
                        {lead.geo_classification && <div className="ld-field"><span className="ld-label">Geo Classification</span><span>{lead.geo_classification}</span></div>}
                        {lead.remark && <div className="ld-field full-width"><span className="ld-label">Remark</span><span>{lead.remark}</span></div>}
                    </div>
                )}

                {/* Notes Tab */}
                {tab === "notes" && (
                    <div className="notes-section">
                        <div className="note-compose">
                            <textarea
                                className="note-input"
                                placeholder="Write a quick note (call summary, campus visit, decision maker insight...)..."
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                rows={3}
                            />
                            <button onClick={handleAddNote} disabled={savingNote || !noteText.trim()} className="btn-primary">
                                {savingNote ? "Saving..." : "Add Note"}
                            </button>
                        </div>
                        <div className="notes-list">
                            {notes.length === 0 && <p className="empty-message">No notes yet. Add your first one above.</p>}
                            {notes.map((n) => (
                                <div key={n.id} className="note-card">
                                    <div className="note-header">
                                        <span className="note-author">👤 {n.user_name || "Unknown"}</span>
                                        <span className="note-date">{new Date(n.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                                        <button className="note-delete-btn" onClick={() => handleDeleteNote(n.id)} title="Delete note">✕</button>
                                    </div>
                                    <p className="note-text">{n.note}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Timeline Tab */}
                {tab === "timeline" && (
                    <div className="timeline-section">
                        {/* Use Template button */}
                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                            <button className="btn-sm" onClick={() => { if (!templates.length) fetchTemplates(); setShowTemplates((v) => !v); }}>
                                📋 {showTemplates ? "Hide" : "Use Template"}
                            </button>
                        </div>

                        {showTemplates && (
                            <div className="templates-picker">
                                {templates.length === 0 && <p style={{ fontSize: 12, color: "#94a3b8" }}>No templates yet</p>}
                                {templates.map((t) => (
                                    <div key={t.id} className="template-pick-card" onClick={() => handleUseTemplate(t)}>
                                        <span className="template-pick-type">{t.type === "call_script" ? "📞" : t.type === "email" ? "✉️" : "📋"}</span>
                                        <span>{t.title}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="quick-actions">
                            <div className="qa-row">
                                <select value={actForm.type} onChange={(e) => setActForm({ ...actForm, type: e.target.value })}>
                                    <option value="NOTE">📝 Note</option>
                                    <option value="CALL">📞 Call</option>
                                    <option value="EMAIL">✉️ Email</option>
                                    <option value="MEETING">🤝 Meeting</option>
                                    <option value="PITCH_DECK">📊 Pitch Deck</option>
                                </select>
                                {actForm.type === "CALL" && (
                                    <>
                                        <input placeholder="Duration (min)" type="number" value={actForm.duration} onChange={(e) => setActForm({ ...actForm, duration: e.target.value })} style={{ width: 100 }} />
                                        <select value={actForm.outcome} onChange={(e) => setActForm({ ...actForm, outcome: e.target.value })} style={{ width: 140 }}>
                                            <option value="">-- Outcome --</option>
                                            <option value="Interested">Interested</option>
                                            <option value="Not Interested">Not Interested</option>
                                            <option value="Call Back">Call Back</option>
                                            <option value="Wrong Number">Wrong Number</option>
                                            <option value="No Response">No Response</option>
                                        </select>
                                    </>
                                )}
                            </div>
                            <textarea placeholder="Description..." value={actForm.description} onChange={(e) => setActForm({ ...actForm, description: e.target.value })} rows={2} />
                            <button onClick={handleLogActivity} disabled={saving} className="btn-primary">{saving ? "Saving..." : "Log Activity"}</button>
                        </div>

                        <div className="activity-timeline">
                            {activities.length === 0 && <p className="empty-message">No activities yet</p>}
                            {activities.map((a) => (
                                <div key={a.id} className="timeline-item">
                                    <span className="tl-icon">{typeIcons[a.type] || "📋"}</span>
                                    <div className="tl-content">
                                        <div className="tl-header">
                                            <strong>{a.type}</strong>
                                            {a.outcome && <span className="tl-outcome">{a.outcome}</span>}
                                            {a.duration && <span className="tl-duration">{a.duration} min</span>}
                                        </div>
                                        <p>{a.description}</p>
                                        <span className="tl-date">{new Date(a.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {/* Create Task Tab */}
                {tab === "task" && (
                    <div className="ld-task-form">
                        <div className="ld-task-header">
                            <h4>📌 Create a Task linked to this Lead</h4>
                            <p>This task will appear in the Tasks panel and the assignee's My Day.</p>
                        </div>
                        <label>Task Title *
                            <input
                                placeholder="e.g. Send proposal to principal"
                                value={taskForm.title}
                                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                            />
                        </label>
                        <label style={{ marginTop: 8 }}>Description
                            <input
                                placeholder="Optional details..."
                                value={taskForm.description}
                                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                            />
                        </label>
                        <label style={{ marginTop: 8 }}>Due Date
                            <input
                                type="date"
                                value={taskForm.due_date}
                                onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                            />
                        </label>
                        {owners?.length > 0 && (
                            <label style={{ marginTop: 8 }}>Assign To
                                <select
                                    value={taskForm.assigned_to}
                                    onChange={(e) => {
                                        const owner = owners.find((o) => o.id === e.target.value);
                                        setTaskForm({ ...taskForm, assigned_to: e.target.value, assigned_to_name: owner?.full_name || "" });
                                    }}
                                >
                                    <option value="">— Myself —</option>
                                    {owners.map((o) => (
                                        <option key={o.id} value={o.id}>{o.full_name} ({o.role})</option>
                                    ))}
                                </select>
                            </label>
                        )}
                        <div className="form-actions" style={{ marginTop: 14 }}>
                            <button onClick={handleCreateTask} disabled={savingTask || !taskForm.title.trim()} className="btn-primary">
                                {savingTask ? "Creating..." : "📌 Create Task"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Approvals Tab */}
                {tab === "approvals" && (
                    <div className="ld-approvals">
                        {/* Request form */}
                        <div className="ap-request-form">
                            <h4>Request Approval from Manager</h4>
                            <div className="ap-form-row">
                                <label>Type
                                    <select value={approvalForm.request_type} onChange={(e) => setApprovalForm({ ...approvalForm, request_type: e.target.value })}>
                                        <option value="discount">💸 Discount</option>
                                        <option value="proposal">📄 Proposal Authorization</option>
                                        <option value="custom">📋 Custom</option>
                                    </select>
                                </label>
                                {approvalForm.request_type === "discount" && (
                                    <label>Amount (₹)
                                        <input type="number" placeholder="0" value={approvalForm.amount} onChange={(e) => setApprovalForm({ ...approvalForm, amount: e.target.value })} />
                                    </label>
                                )}
                            </div>
                            <label style={{ marginTop: 8 }}>Reason / Details *
                                <textarea
                                    rows={3}
                                    placeholder="Describe what you need approved and why..."
                                    value={approvalForm.description}
                                    onChange={(e) => setApprovalForm({ ...approvalForm, description: e.target.value })}
                                />
                            </label>
                            <button onClick={handleRequestApproval} disabled={savingApproval || !approvalForm.description.trim()} className="btn-primary" style={{ marginTop: 10 }}>
                                {savingApproval ? "Sending..." : "📤 Send Request"}
                            </button>
                        </div>

                        {/* Existing requests */}
                        {approvals.length > 0 && (
                            <div className="ap-lead-history">
                                <h4>Previous Requests</h4>
                                {approvals.map((a) => (
                                    <div key={a.id} className="ap-mini-card">
                                        <div className="ap-mini-top">
                                            <span>{a.request_type === "discount" ? "💸" : a.request_type === "proposal" ? "📄" : "📋"} {a.description.slice(0, 80)}</span>
                                            <span className="ap-status-badge" style={
                                                a.status === "Approved" ? { background: "#d1fae5", color: "#065f46" }
                                                    : a.status === "Rejected" ? { background: "#fee2e2", color: "#991b1b" }
                                                        : { background: "#fef3c7", color: "#92400e" }
                                            }>{a.status}</span>
                                        </div>
                                        {a.reviewer_note && <div className="ap-mini-note">💬 {a.reviewer_note}</div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="form-actions" style={{ marginTop: 16 }}>
                    <button onClick={onClose} className="btn-secondary">Close</button>

                </div>
            </div>
        </div>
    );
}
