// D:\SalesCRM\frontend\src\components\AdminPanel.jsx
import { useState, useEffect, useCallback } from "react";

const ADMIN_API = `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/admin`;

export default function AdminPanel({ session, showToast }) {
    const [tab, setTab] = useState("users");
    const [users, setUsers] = useState([]);
    const [requests, setRequests] = useState([]);
    const [auditLog, setAuditLog] = useState([]);
    const [validationRules, setValidationRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editUser, setEditUser] = useState(null);
    const [search, setSearch] = useState("");
    const auth = { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };

    const fetchUsers = useCallback(async () => {
        try { setLoading(true); const r = await fetch(`${ADMIN_API}/users`, { headers: auth }); if (r.ok) setUsers(await r.json()); } catch { } finally { setLoading(false); }
    }, [session]);
    const fetchRequests = useCallback(async () => {
        try { const r = await fetch(`${ADMIN_API}/feature-requests`, { headers: auth }); if (r.ok) setRequests(await r.json()); } catch { }
    }, [session]);
    const fetchAudit = useCallback(async () => {
        try { const r = await fetch(`${ADMIN_API}/audit-log`, { headers: auth }); if (r.ok) setAuditLog(await r.json()); } catch { }
    }, [session]);
    const fetchRules = useCallback(async () => {
        try { const r = await fetch(`${ADMIN_API}/validation-rules`, { headers: auth }); if (r.ok) setValidationRules(await r.json()); } catch { }
    }, [session]);

    useEffect(() => { fetchUsers(); fetchRequests(); }, [fetchUsers, fetchRequests]);
    useEffect(() => { if (tab === "audit") fetchAudit(); if (tab === "validation") fetchRules(); }, [tab, fetchAudit, fetchRules]);

    const handleUserSave = async () => {
        if (!editUser) return;
        try {
            const r = await fetch(`${ADMIN_API}/users/${editUser.id}`, { method: "PUT", headers: auth, body: JSON.stringify({ full_name: editUser.full_name, role: editUser.role, team: editUser.team, feature_flags: editUser.feature_flags }) });
            if (!r.ok) throw new Error((await r.json()).message);
            showToast("User updated", "success"); setEditUser(null); fetchUsers();
        } catch (err) { showToast(err.message, "error"); }
    };

    const handleToggleActive = async (id) => {
        if (!confirm("Toggle user status?")) return;
        try {
            const r = await fetch(`${ADMIN_API}/users/${id}/toggle-active`, { method: "PUT", headers: auth });
            if (!r.ok) throw new Error((await r.json()).message);
            const d = await r.json(); showToast(d.is_active ? "User enabled" : "User disabled", "success"); fetchUsers();
        } catch (err) { showToast(err.message, "error"); }
    };

    const handleRequestAction = async (id, status, apply_flags) => {
        try {
            const r = await fetch(`${ADMIN_API}/feature-requests/${id}`, { method: "PUT", headers: auth, body: JSON.stringify({ status, apply_flags }) });
            if (!r.ok) throw new Error((await r.json()).message);
            showToast(`Request ${status.toLowerCase()}`, "success"); fetchRequests();
        } catch (err) { showToast(err.message, "error"); }
    };

    const handleRuleUpdate = async (rule) => {
        try {
            const r = await fetch(`${ADMIN_API}/validation-rules/${rule.id}`, { method: "PUT", headers: auth, body: JSON.stringify({ required: rule.required }) });
            if (!r.ok) throw new Error((await r.json()).message);
            showToast("Rule updated", "success"); fetchRules();
        } catch (err) { showToast(err.message, "error"); }
    };

    const filteredUsers = users.filter((u) => !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));

    const pendingCount = requests.filter((r) => r.status === "Pending").length;

    return (
        <div className="admin-panel">
            <h2>🔧 Admin Panel</h2>
            <div className="admin-tabs">
                <button className={`ptab ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>Users ({users.length})</button>
                <button className={`ptab ${tab === "requests" ? "active" : ""}`} onClick={() => setTab("requests")}>Feature Requests {pendingCount > 0 && `(${pendingCount})`}</button>
                <button className={`ptab ${tab === "audit" ? "active" : ""}`} onClick={() => setTab("audit")}>Audit Log</button>
                <button className={`ptab ${tab === "validation" ? "active" : ""}`} onClick={() => setTab("validation")}>Validation Rules</button>
            </div>

            {tab === "users" && (
                <div className="admin-section">
                    <input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="search-input" style={{ marginBottom: 12, maxWidth: 300 }} />
                    {loading ? <p>Loading...</p> : (
                        <div className="table-wrapper">
                            <table>
                                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Team</th><th>Status</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {filteredUsers.map((u) => (
                                        <tr key={u.id}>
                                            <td><strong>{u.full_name}</strong></td>
                                            <td>{u.email}</td>
                                            <td><span className={`role-badge role-${u.role?.toLowerCase()}`}>{u.role}</span></td>
                                            <td>{u.team || "—"}</td>
                                            <td><span className={`status-chip ${u.is_active !== false ? "status-won" : "status-loss"}`}>{u.is_active !== false ? "Active" : "Disabled"}</span></td>
                                            <td className="actions-cell">
                                                <button className="btn-sm" onClick={() => setEditUser({ ...u, feature_flags: u.feature_flags || {} })}>Edit</button>
                                                <button className={`btn-sm ${u.is_active !== false ? "btn-danger" : ""}`} onClick={() => handleToggleActive(u.id)}>{u.is_active !== false ? "Disable" : "Enable"}</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {editUser && (
                        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEditUser(null)}>
                            <div className="modal-card">
                                <h3>Edit: {editUser.full_name}</h3>
                                <label>Full Name<input value={editUser.full_name} onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })} /></label>
                                <label>Role<select value={editUser.role} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}>
                                    <option value="Executive">Executive</option><option value="TeamLead">TeamLead</option><option value="Manager">Manager</option><option value="Admin">Admin</option>
                                </select></label>
                                <label>Team<input value={editUser.team || ""} onChange={(e) => setEditUser({ ...editUser, team: e.target.value })} /></label>
                                <fieldset className="form-section" style={{ marginTop: 12 }}>
                                    <legend>Feature Flags</legend>
                                    {["import", "bulk_update", "delete", "team_filters", "sensitive_fields"].map((flag) => (
                                        <label key={flag} className="checkbox-label">
                                            <input type="checkbox" checked={editUser.feature_flags?.[flag] === true} onChange={(e) => setEditUser({ ...editUser, feature_flags: { ...editUser.feature_flags, [flag]: e.target.checked } })} />
                                            {flag.replace(/_/g, " ")}
                                        </label>
                                    ))}
                                </fieldset>
                                <div className="form-actions" style={{ marginTop: 16 }}>
                                    <button onClick={handleUserSave} className="btn-primary">Save</button>
                                    <button onClick={() => setEditUser(null)} className="btn-secondary">Cancel</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {tab === "requests" && (
                <div className="admin-section">
                    {requests.length === 0 ? <p className="empty-message">No feature requests</p> : (
                        <div className="requests-list-admin">
                            {requests.map((r) => (
                                <div key={r.id} className="req-card">
                                    <div className="req-card-header">
                                        <strong>{r.user?.full_name || "Unknown"}</strong>
                                        <span className={`role-badge role-${r.user?.role?.toLowerCase()}`}>{r.user?.role}</span>
                                        <span className={`status-chip status-${r.status?.toLowerCase()}`}>{r.status}</span>
                                    </div>
                                    <div className="req-card-body">
                                        <div><strong>Features:</strong> {r.requested_features}</div>
                                        {r.reason && <div><strong>Reason:</strong> {r.reason}</div>}
                                        <div className="req-date">{new Date(r.created_at).toLocaleDateString()}</div>
                                    </div>
                                    {r.status === "Pending" && (
                                        <div className="req-card-actions">
                                            <button className="btn-sm" style={{ background: "#d1fae5", color: "#065f46" }}
                                                onClick={() => {
                                                    const flagMap = { "Import leads": "import", "Bulk update": "bulk_update", "Delete leads": "delete", "Team/Owner filters": "team_filters" };
                                                    const af = {}; r.requested_features.split(", ").forEach((f) => { if (flagMap[f]) af[flagMap[f]] = true; });
                                                    handleRequestAction(r.id, "Approved", af);
                                                }}>Approve</button>
                                            <button className="btn-sm btn-danger" onClick={() => handleRequestAction(r.id, "Rejected")}>Reject</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {tab === "audit" && (
                <div className="admin-section">
                    <h3>Recent Actions</h3>
                    {auditLog.length === 0 ? <p className="empty-message">No audit entries</p> : (
                        <div className="table-wrapper">
                            <table>
                                <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
                                <tbody>
                                    {auditLog.slice(0, 100).map((a) => (
                                        <tr key={a.id}>
                                            <td style={{ whiteSpace: "nowrap" }}>{new Date(a.created_at).toLocaleString()}</td>
                                            <td>{a.user_email || "—"}</td>
                                            <td><span className="status-chip">{a.action_type}</span></td>
                                            <td><span style={{ fontSize: 11 }}>{a.target_table} / {a.target_id?.slice(0, 8) || "—"}</span></td>
                                            <td style={{ fontSize: 11, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{a.payload_snapshot ? JSON.stringify(a.payload_snapshot) : "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {tab === "validation" && (
                <div className="admin-section">
                    <h3>Field Validation Rules</h3>
                    <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Toggle which fields are required for lead creation.</p>
                    <div className="rules-list">
                        {validationRules.map((rule) => (
                            <div key={rule.id} className="rule-item">
                                <label className="checkbox-label">
                                    <input type="checkbox" checked={rule.required} onChange={() => handleRuleUpdate({ ...rule, required: !rule.required })} />
                                    <strong>{rule.field_name}</strong>
                                </label>
                                <span className="rule-meta">{rule.message || ""}</span>
                                {rule.regex && <code className="rule-regex">{rule.regex}</code>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
