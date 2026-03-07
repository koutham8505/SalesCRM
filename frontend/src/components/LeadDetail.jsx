// D:\SalesCRM\frontend\src\components\LeadDetail.jsx
import { useState, useEffect } from "react";

const API_BASE = `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api`;
const typeIcons = { CALL: "📞", EMAIL: "✉️", MEETING: "🤝", NOTE: "📝", PITCH_DECK: "📊" };

export default function LeadDetail({ lead, session, profile, onClose, showToast }) {
    const [tab, setTab] = useState("details");
    const [activities, setActivities] = useState([]);
    const [actForm, setActForm] = useState({ type: "NOTE", description: "", outcome: "", duration: "" });
    const [saving, setSaving] = useState(false);

    const auth = { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };

    useEffect(() => {
        if (lead?.id) fetchActivities();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lead?.id]);

    const fetchActivities = async () => {
        try {
            const res = await fetch(`${API_BASE}/activities/${lead.id}`, { headers: auth });
            if (res.ok) setActivities(await res.json());
        } catch { /* ignore */ }
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

    const handleEmail = () => {
        const subject = encodeURIComponent(`Introduction about our services`);
        const body = encodeURIComponent(`Hi ${lead.lead_name || ""},\n\nI wanted to reach out regarding...\n\nBest regards,\n${profile?.full_name || ""}`);
        window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`, "_self");
    };

    const scoreLabel = (s) => s >= 70 ? "Hot" : s >= 40 ? "Warm" : "Cold";
    const scoreClass = (s) => s >= 70 ? "score-hot" : s >= 40 ? "score-warm" : "score-cold";

    if (!lead) return null;

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-card lead-detail-modal">
                <div className="lead-detail-header">
                    <div>
                        <h2>{lead.lead_name || "Unnamed Lead"}</h2>
                        <p className="lead-detail-sub">
                            {lead.institution_name && <span>🏢 {lead.institution_name}</span>}
                            {lead.job_title && <span> · {lead.job_title}</span>}
                        </p>
                    </div>
                    <div className="lead-detail-badges">
                        {lead.score !== undefined && (
                            <span className={`score-pill ${scoreClass(lead.score)}`}>{scoreLabel(lead.score)} ({lead.score})</span>
                        )}
                        <span className={`status-chip status-${(lead.status || "").toLowerCase().replace(/\s+/g, "-")}`}>{lead.status || "—"}</span>
                    </div>
                </div>

                <div className="detail-tabs">
                    <button className={`ptab ${tab === "details" ? "active" : ""}`} onClick={() => setTab("details")}>Details</button>
                    <button className={`ptab ${tab === "timeline" ? "active" : ""}`} onClick={() => setTab("timeline")}>Timeline ({activities.length})</button>
                </div>

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
                        {/* Proposal fields */}
                        <div className="ld-field"><span className="ld-label">Proposal Sent</span><span>{lead.proposal_sent ? "Yes" : "No"}</span></div>
                        {lead.proposal_link && <div className="ld-field"><span className="ld-label">Proposal Link</span><span><a href={lead.proposal_link} target="_blank" rel="noreferrer">{lead.proposal_link}</a></span></div>}
                        {/* School Details */}
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

                {tab === "timeline" && (
                    <div className="timeline-section">
                        {/* Quick actions */}
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

                        {/* Timeline */}
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

                <div className="form-actions" style={{ marginTop: 16 }}>
                    <button onClick={onClose} className="btn-secondary">Close</button>
                </div>
            </div>
        </div>
    );
}
