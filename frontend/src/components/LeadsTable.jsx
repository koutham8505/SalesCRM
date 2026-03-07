// D:\SalesCRM\frontend\src\components\LeadsTable.jsx
import { useMemo } from "react";

const hasFeature = (role, ff, feature) => {
    const rp = { Admin: ["import", "bulk_update", "delete", "team_filters"], Manager: ["import", "bulk_update", "delete", "team_filters"], TeamLead: ["import", "bulk_update"], Executive: [] };
    if ((rp[role] || []).includes(feature)) return true;
    return ff?.[feature] === true;
};

const scoreLabel = (s) => s >= 70 ? "Hot" : s >= 40 ? "Warm" : "Cold";
const scoreClass = (s) => s >= 70 ? "score-hot" : s >= 40 ? "score-warm" : "score-cold";

const STAGE_COLORS = {
    "New": "#64748b", "Contacted": "#3b82f6", "Demo/Meeting": "#8b5cf6",
    "Proposal": "#f59e0b", "Negotiation": "#f97316", "Won": "#22c55e", "Lost": "#ef4444"
};

const today = new Date().toISOString().slice(0, 10);

export default function LeadsTable({
    leads, role, featureFlags, search, filterTeam, filterOwner,
    selectedIds, onToggleSelect, onSelectAll, onEdit, onDelete, onView,
}) {
    const canDelete = hasFeature(role, featureFlags, "delete");
    const canBulk = hasFeature(role, featureFlags, "bulk_update");

    const filtered = useMemo(() => {
        let result = leads;
        if (search) {
            const t = search.toLowerCase();
            result = result.filter((l) =>
                l.lead_name?.toLowerCase().includes(t) || l.institution_name?.toLowerCase().includes(t) ||
                l.phone?.toString().includes(t) || l.email?.toLowerCase().includes(t)
            );
        }
        if (filterTeam) result = result.filter((l) => l.team === filterTeam);
        if (filterOwner) result = result.filter((l) => l.owner_id === filterOwner);
        return result;
    }, [leads, search, filterTeam, filterOwner]);

    const allSelected = filtered.length > 0 && filtered.every((l) => selectedIds.includes(l.id));

    return (
        <div className="table-card">
            <h2>Leads ({filtered.length})</h2>
            {filtered.length === 0 ? (<p className="empty-message">No leads found</p>) : (
                <>
                    <div className="table-wrapper desktop-only">
                        <table>
                            <thead>
                                <tr>
                                    {canBulk && <th style={{ width: 36 }}><input type="checkbox" checked={allSelected} onChange={() => onSelectAll(filtered.map((l) => l.id))} /></th>}
                                    <th>Lead Name</th>
                                    <th>Stage</th>
                                    <th>Next Action</th>
                                    <th>Job Title</th>
                                    <th>Institution</th>
                                    <th>Phone</th>
                                    <th>Email</th>
                                    <th>WhatsApp</th>
                                    <th>Alt Phone</th>
                                    <th>Website</th>
                                    <th>Lead Source</th>
                                    <th>Score</th>
                                    <th>Call Status</th>
                                    <th>Next F/U</th>
                                    <th>Meeting Date</th>
                                    <th>Status</th>
                                    <th>Deal Value</th>
                                    <th>Owner</th>
                                    <th>Board</th>
                                    <th>Tier</th>
                                    <th>Geo</th>
                                    <th>Fees</th>
                                    <th>Strength</th>
                                    <th>School Type</th>
                                    <th>Medium</th>
                                    <th>Grades</th>
                                    <th>Proposal Sent</th>
                                    <th>Proposal Link</th>
                                    <th>Last Called</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((lead) => (
                                    <tr key={lead.id} className={selectedIds.includes(lead.id) ? "row-selected" : ""}>
                                        {canBulk && <td><input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => onToggleSelect(lead.id)} /></td>}
                                        <td><strong className="lead-name-link" onClick={() => onView?.(lead)}>{lead.lead_name || "-"}</strong></td>
                                        <td>
                                            <span className="stage-pill" style={{ background: STAGE_COLORS[lead.stage] || "#64748b", color: "#fff", padding: "2px 8px", borderRadius: 12, fontSize: 11, whiteSpace: "nowrap" }}>
                                                {lead.stage || "New"}
                                            </span>
                                        </td>
                                        <td>
                                            {lead.next_action ? (
                                                <span style={{ color: lead.next_action_date && lead.next_action_date < today ? "#ef4444" : "#0f172a", fontSize: 12 }}>
                                                    {lead.next_action}{lead.next_action_date ? ` · ${lead.next_action_date}` : ""}
                                                    {lead.next_action_date && lead.next_action_date < today && " ⚠️"}
                                                </span>
                                            ) : <span style={{ color: "#94a3b8", fontSize: 11 }}>None</span>}
                                        </td>
                                        <td>{lead.job_title || "-"}</td>
                                        <td>{lead.institution_name || "-"}</td>
                                        <td>{lead.phone || "-"}</td>
                                        <td>{lead.email || "-"}</td>
                                        <td>{lead.whatsapp || "-"}</td>
                                        <td>{lead.alt_phone || "-"}</td>
                                        <td>{lead.website || "-"}</td>
                                        <td>{lead.lead_source || "-"}</td>
                                        <td>
                                            {lead.score !== undefined && lead.score !== null && (
                                                <span className={`score-pill ${scoreClass(lead.score)}`}>{scoreLabel(lead.score)}</span>
                                            )}
                                        </td>
                                        <td><span className={`status-chip call-${(lead.call_status || "").toLowerCase().replace(/\s+/g, "-")}`}>{lead.call_status || "-"}</span></td>
                                        <td>{lead.next_follow_up?.slice(0, 10) || "-"}</td>
                                        <td>{lead.meeting_date ? lead.meeting_date.replace("T", " ").slice(0, 16) : "-"}</td>
                                        <td><span className={`status-chip status-${(lead.status || "").toLowerCase().replace(/\s+/g, "-")}`}>{lead.status || "-"}</span></td>
                                        <td>{lead.deal_value ? `₹${Number(lead.deal_value).toLocaleString()}` : "-"}</td>
                                        <td title={lead.owner_email || ""}>{lead.owner_name || lead.lead_owner || "-"}</td>
                                        <td>{lead.board || "-"}</td>
                                        <td>{lead.tier || "-"}</td>
                                        <td>{lead.geo_classification || "-"}</td>
                                        <td>{lead.fees || "-"}</td>
                                        <td>{lead.student_strength ?? "-"}</td>
                                        <td>{lead.school_type || "-"}</td>
                                        <td>{lead.medium_of_instruction || "-"}</td>
                                        <td>{lead.grades_offered || "-"}</td>
                                        <td>{lead.proposal_sent ? "Yes" : "No"}</td>
                                        <td>{lead.proposal_link ? <a href={lead.proposal_link} target="_blank" rel="noreferrer" style={{ fontSize: 11 }}>View</a> : "-"}</td>
                                        <td>{lead.last_called_at ? new Date(lead.last_called_at).toLocaleDateString() : "-"}</td>
                                        <td className="actions-cell">
                                            <button onClick={() => onView?.(lead)} className="btn-sm" title="View details">👁</button>
                                            <button onClick={() => onEdit(lead)} className="btn-sm">Edit</button>
                                            {lead.email && <button onClick={() => { window.location.href = `mailto:${lead.email}`; }} className="btn-sm" title={`Email ${lead.email}`}>✉️</button>}
                                            {canDelete && <button onClick={() => onDelete(lead)} className="btn-sm btn-danger">✕</button>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mobile-cards mobile-only">
                        {filtered.map((lead) => (
                            <div key={lead.id} className={`lead-card ${selectedIds.includes(lead.id) ? "card-selected" : ""}`} onClick={() => onView?.(lead)}>
                                <div className="lead-card-header">
                                    {canBulk && <input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={(e) => { e.stopPropagation(); onToggleSelect(lead.id); }} />}
                                    <strong>{lead.lead_name || "Unnamed"}</strong>
                                    {lead.score !== undefined && <span className={`score-pill ${scoreClass(lead.score)}`}>{scoreLabel(lead.score)}</span>}
                                    <span className={`status-chip status-${(lead.status || "").toLowerCase().replace(/\s+/g, "-")}`}>{lead.status || "?"}</span>
                                </div>
                                <div className="lead-card-body">
                                    {lead.institution_name && <div>🏢 {lead.institution_name}</div>}
                                    {lead.phone && <div>📞 {lead.phone}</div>}
                                    {lead.email && <div>✉️ {lead.email}</div>}
                                    {lead.next_follow_up && <div>📅 {lead.next_follow_up.slice(0, 10)}</div>}
                                    {lead.board && <div>🎓 {lead.board}</div>}
                                    {lead.tier && <div>📊 {lead.tier}</div>}
                                    {lead.school_type && <div>🏫 {lead.school_type}</div>}
                                    {lead.geo_classification && <div>🌍 {lead.geo_classification}</div>}
                                    {lead.fees && <div>💰 {lead.fees}</div>}
                                </div>
                                <div className="lead-card-actions" onClick={(e) => e.stopPropagation()}>
                                    <button onClick={() => onEdit(lead)} className="btn-sm">Edit</button>
                                    {canDelete && <button onClick={() => onDelete(lead)} className="btn-sm btn-danger">✕</button>}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
