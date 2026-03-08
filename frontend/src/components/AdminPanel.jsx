// D:\SalesCRM\frontend\src\components\AdminPanel.jsx
import { useState, useEffect, useCallback } from "react";

const ADMIN_API = `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/admin`;
const LEADS_API = `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/leads`;
const MD_API = `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/master-data`;

const MD_CATEGORIES = [
    { key: "board", label: "Boards" },
    { key: "school_type", label: "School Types" },
    { key: "lead_source", label: "Lead Sources" },
    { key: "tag", label: "Tags" },
];

export default function AdminPanel({ session, showToast }) {
    const [tab, setTab] = useState("users");
    const [users, setUsers] = useState([]);
    const [requests, setRequests] = useState([]);
    const [auditLog, setAuditLog] = useState([]);
    const [validationRules, setValidationRules] = useState([]);
    const [duplicates, setDuplicates] = useState([]);
    const [masterData, setMasterData] = useState([]);
    const [mdCategory, setMdCategory] = useState("board");
    const [mdNewValue, setMdNewValue] = useState("");
    const [loading, setLoading] = useState(true);
    const [editUser, setEditUser] = useState(null);
    const [search, setSearch] = useState("");
    const [merging, setMerging] = useState(null);
    const [confirmDisable, setConfirmDisable] = useState(null); // id of user pending confirm
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
    const fetchDuplicates = useCallback(async () => {
        try { const r = await fetch(`${LEADS_API}/duplicates`, { headers: auth }); if (r.ok) setDuplicates(await r.json()); } catch { }
    }, [session]);
    const fetchMasterData = useCallback(async () => {
        try { const r = await fetch(`${MD_API}/all`, { headers: auth }); if (r.ok) setMasterData(await r.json()); } catch { }
    }, [session]);

    useEffect(() => { fetchUsers(); fetchRequests(); }, [fetchUsers, fetchRequests]);
    useEffect(() => {
        if (tab === "audit") fetchAudit();
        if (tab === "validation") fetchRules();
        if (tab === "duplicates") fetchDuplicates();
        if (tab === "settings") fetchMasterData();
    }, [tab]);

    const handleUserSave = async () => {
        if (!editUser) return;
        try {
            const r = await fetch(`${ADMIN_API}/users/${editUser.id}`, {
                method: "PUT", headers: auth,
                body: JSON.stringify({
                    full_name: editUser.full_name,
                    role: editUser.role,
                    team: editUser.team,
                    department: editUser.department,
                    team_lead_id: editUser.team_lead_id || null,
                    feature_flags: editUser.feature_flags,
                })
            });
            if (!r.ok) throw new Error((await r.json()).message);
            showToast("User updated", "success"); setEditUser(null); fetchUsers();
        } catch (err) { showToast(err.message, "error"); }
    };

    const handleToggleActive = async (id) => {
        try {
            const r = await fetch(`${ADMIN_API}/users/${id}/toggle-active`, { method: "PUT", headers: auth });
            if (!r.ok) throw new Error((await r.json()).message);
            const d = await r.json();
            showToast(d.is_active ? "User enabled ✅" : "User disabled", "success");
            setConfirmDisable(null);
            fetchUsers();
        } catch (err) { showToast(err.message, "error"); setConfirmDisable(null); }
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

    const handleMerge = async (masterId, duplicateId) => {
        if (!confirm("Merge leads? The duplicate will be deleted and its data merged into the master.")) return;
        try {
            setMerging(duplicateId);
            const r = await fetch(`${LEADS_API}/merge`, { method: "POST", headers: auth, body: JSON.stringify({ master_id: masterId, duplicate_id: duplicateId }) });
            if (!r.ok) throw new Error((await r.json()).message);
            showToast("Leads merged successfully", "success"); fetchDuplicates();
        } catch (err) { showToast(err.message, "error"); }
        finally { setMerging(null); }
    };

    const handleMdAdd = async () => {
        if (!mdNewValue.trim()) return;
        try {
            const r = await fetch(MD_API, { method: "POST", headers: auth, body: JSON.stringify({ category: mdCategory, value: mdNewValue.trim() }) });
            if (!r.ok) throw new Error((await r.json()).message);
            setMdNewValue(""); fetchMasterData(); showToast("Entry added", "success");
        } catch (err) { showToast(err.message, "error"); }
    };

    const handleMdToggle = async (item) => {
        try {
            await fetch(`${MD_API}/${item.id}`, { method: "PUT", headers: auth, body: JSON.stringify({ is_active: !item.is_active }) });
            fetchMasterData();
        } catch { }
    };

    const handleMdDelete = async (id) => {
        if (!confirm("Delete this entry?")) return;
        try {
            await fetch(`${MD_API}/${id}`, { method: "DELETE", headers: auth });
            fetchMasterData(); showToast("Deleted", "success");
        } catch { }
    };

    const filteredUsers = users.filter((u) => !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));
    const pendingCount = requests.filter((r) => r.status === "Pending").length;
    const dupeCount = duplicates.length;
    const mdFiltered = masterData.filter((m) => m.category === mdCategory);

    return (
        <div className="admin-panel">
            <h2>🔧 Admin Panel</h2>
            <div className="admin-tabs">
                <button className={`ptab ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>Users ({users.length})</button>
                <button className={`ptab ${tab === "team_map" ? "active" : ""}`} onClick={() => setTab("team_map")}>🗂️ Team Map</button>
                <button className={`ptab ${tab === "requests" ? "active" : ""}`} onClick={() => setTab("requests")}>Feature Requests {pendingCount > 0 && `(${pendingCount})`}</button>
                <button className={`ptab ${tab === "audit" ? "active" : ""}`} onClick={() => setTab("audit")}>Audit Log</button>
                <button className={`ptab ${tab === "validation" ? "active" : ""}`} onClick={() => setTab("validation")}>Validation Rules</button>
                <button className={`ptab ${tab === "duplicates" ? "active" : ""}`} onClick={() => setTab("duplicates")}>
                    🔀 Duplicates {dupeCount > 0 && <span className="admin-tab-badge">{dupeCount}</span>}
                </button>
                <button className={`ptab ${tab === "settings" ? "active" : ""}`} onClick={() => setTab("settings")}>⚙️ Settings</button>
            </div>

            {/* Users */}
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
                                                {confirmDisable === u.id ? (
                                                    <>
                                                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Sure?</span>
                                                        <button className="btn-sm btn-danger" onClick={() => handleToggleActive(u.id)}>✓</button>
                                                        <button className="btn-sm" onClick={() => setConfirmDisable(null)}>✕</button>
                                                    </>
                                                ) : (
                                                    <button
                                                        className={`btn-sm ${u.is_active !== false ? "btn-danger" : "btn-success-outline"}`}
                                                        onClick={() => u.is_active !== false ? setConfirmDisable(u.id) : handleToggleActive(u.id)}
                                                    >
                                                        {u.is_active !== false ? "Disable" : "Enable"}
                                                    </button>
                                                )}
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
                                <label>Department<select value={editUser.department || "School"} onChange={(e) => setEditUser({ ...editUser, department: e.target.value })}>
                                    <option value="School">🏫 School</option>
                                    <option value="College">🎓 College</option>
                                    <option value="Corporate">🏢 Corporate</option>
                                </select></label>
                                <label>Team<input value={editUser.team || ""} onChange={(e) => setEditUser({ ...editUser, team: e.target.value })} /></label>
                                {(editUser.role === "Executive" || editUser.role === "TeamLead") && (
                                    <label>Reports To (Team Lead)
                                        <select value={editUser.team_lead_id || ""} onChange={(e) => setEditUser({ ...editUser, team_lead_id: e.target.value || null })}>
                                            <option value="">— None —</option>
                                            {users.filter(u => u.role === "TeamLead" || u.role === "Manager").map(u => (
                                                <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                                            ))}
                                        </select>
                                    </label>
                                )}
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

            {/* Team Map */}
            {tab === "team_map" && (() => {
                const teamLeads = users.filter(u => u.role === "TeamLead" || u.role === "Manager");
                const executives = users.filter(u => u.role === "Executive");
                const DEPT_COLORS = { School: "#3b82f6", College: "#8b5cf6", Corporate: "#f59e0b" };
                return (
                    <div className="admin-section">
                        <h3>🗂️ Team Structure Map</h3>
                        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Shows which Executives report to which Team Lead. Use "Edit" on a user to assign their Team Lead.</p>
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                            {teamLeads.map(tl => {
                                const myExecs = executives.filter(e => e.team_lead_id === tl.id);
                                const dept = tl.department || "School";
                                return (
                                    <div key={tl.id} style={{ background: "var(--bg-card)", border: `2px solid ${DEPT_COLORS[dept]}40`, borderTop: `3px solid ${DEPT_COLORS[dept]}`, borderRadius: 12, padding: "16px 20px", minWidth: 220, flex: "1 1 220px" }}>
                                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{tl.full_name}</div>
                                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>{tl.role} · <span className={`dept-badge dept-${dept.toLowerCase()}`}>{dept}</span></div>
                                        {myExecs.length === 0 ? (
                                            <div style={{ fontSize: 12, color: "var(--text-faint)", fontStyle: "italic" }}>No executives assigned</div>
                                        ) : myExecs.map(e => (
                                            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                                                <span>👤</span>
                                                <span style={{ flex: 1 }}>{e.full_name}</span>
                                                <span className={`dept-badge dept-${(e.department || "School").toLowerCase()}`}>{e.department || "School"}</span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                            {teamLeads.length === 0 && <p className="empty-message">No Team Leads found. Assign TeamLead role to users first.</p>}
                        </div>
                        <div style={{ marginTop: 20 }}>
                            <h4 style={{ fontSize: 14, marginBottom: 8 }}>Unassigned Executives</h4>
                            {executives.filter(e => !e.team_lead_id).length === 0 ? (
                                <p style={{ fontSize: 13, color: "var(--text-faint)" }}>✅ All executives are assigned</p>
                            ) : (
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    {executives.filter(e => !e.team_lead_id).map(e => (
                                        <div key={e.id} style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", fontSize: 13 }}>
                                            👤 {e.full_name} <span className={`dept-badge dept-${(e.department || "School").toLowerCase()}`}>{e.department || "School"}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Feature Requests */}
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
                                            <button className="btn-sm" style={{ background: "#d1fae5", color: "#065f46" }} onClick={() => {
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

            {/* Audit Log */}
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

            {/* Validation Rules */}
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

            {/* Duplicates */}
            {tab === "duplicates" && (
                <div className="admin-section">
                    <h3>🔀 Duplicate Leads</h3>
                    <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>Leads grouped by matching phone number. Select which one to keep as master — the other will be merged into it and deleted.</p>
                    {duplicates.length === 0 ? (
                        <div className="empty-message" style={{ paddingTop: 40 }}>✅ No duplicates found!</div>
                    ) : (
                        duplicates.map((group, gi) => (
                            <div key={gi} className="dupe-group">
                                <div className="dupe-reason">{group.reason}</div>
                                <div className="dupe-leads">
                                    {group.leads.map((lead) => (
                                        <div key={lead.id} className="dupe-card">
                                            <div className="dupe-name">{lead.lead_name || "Unnamed"}</div>
                                            <div className="dupe-meta">
                                                {lead.institution_name && <span>🏢 {lead.institution_name}</span>}
                                                {lead.phone && <span> · 📞 {lead.phone}</span>}
                                                {lead.stage && <span> · {lead.stage}</span>}
                                            </div>
                                            <div className="dupe-date">{new Date(lead.created_at).toLocaleDateString()}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="dupe-actions">
                                    {group.leads.length === 2 && (
                                        <>
                                            <button className="btn-sm" style={{ background: "#dbeafe", color: "#1e40af" }} disabled={merging !== null} onClick={() => handleMerge(group.leads[0].id, group.leads[1].id)}>
                                                {merging === group.leads[1].id ? "Merging..." : `Keep "${group.leads[0].lead_name}" → Delete "${group.leads[1].lead_name}"`}
                                            </button>
                                            <button className="btn-sm" style={{ background: "#d1fae5", color: "#065f46" }} disabled={merging !== null} onClick={() => handleMerge(group.leads[1].id, group.leads[0].id)}>
                                                {merging === group.leads[0].id ? "Merging..." : `Keep "${group.leads[1].lead_name}" → Delete "${group.leads[0].lead_name}"`}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Settings — Configurable Dropdowns */}
            {tab === "settings" && (
                <div className="admin-section">
                    <h3>⚙️ Dropdown Settings</h3>
                    <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>Manage the values available in dropdowns across the app.</p>

                    <div className="settings-tabs">
                        {MD_CATEGORIES.map((c) => (
                            <button key={c.key} className={`ptab ${mdCategory === c.key ? "active" : ""}`} onClick={() => setMdCategory(c.key)}>{c.label}</button>
                        ))}
                    </div>

                    <div className="md-add-row">
                        <input
                            type="text" placeholder={`Add new ${mdCategory} option...`}
                            value={mdNewValue} onChange={(e) => setMdNewValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleMdAdd()}
                            className="search-input" style={{ flex: 1, maxWidth: 300 }}
                        />
                        <button className="btn-primary" onClick={handleMdAdd}>+ Add</button>
                    </div>

                    <div className="md-list">
                        {mdFiltered.length === 0 && <p className="empty-message">No entries yet</p>}
                        {mdFiltered.map((item) => (
                            <div key={item.id} className={`md-item ${!item.is_active ? "md-item-inactive" : ""}`}>
                                <span className="md-value">{item.value}</span>
                                <div className="md-actions">
                                    <label className="switch" title={item.is_active ? "Disable" : "Enable"}>
                                        <input type="checkbox" checked={item.is_active} onChange={() => handleMdToggle(item)} />
                                        <span className="switch-slider" />
                                    </label>
                                    <button className="btn-sm btn-danger" onClick={() => handleMdDelete(item.id)}>✕</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
