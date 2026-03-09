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

    const handleDeleteUser = async (id) => {
        try {
            const r = await fetch(`${ADMIN_API}/users/${id}`, { method: "DELETE", headers: auth });
            if (!r.ok) throw new Error((await r.json()).message);
            showToast("User permanently deleted 🗑️", "success");
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
                                                        <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>⚠️ Delete?</span>
                                                        <button className="btn-sm btn-danger" onClick={() => handleDeleteUser(u.id)}>✓ Yes</button>
                                                        <button className="btn-sm" onClick={() => setConfirmDisable(null)}>✕ No</button>
                                                    </>
                                                ) : (
                                                    <button className="btn-sm btn-danger" onClick={() => setConfirmDisable(u.id)}>
                                                        🗑️ Delete
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

            {/* Team Map — 3-Level Reporting Tree */}
            {tab === "team_map" && (() => {
                const DEPTS = ["School", "College", "Corporate"];
                const DEPT_COLORS = { School: "#3b82f6", College: "#8b5cf6", Corporate: "#f59e0b" };
                const DEPT_ICONS = { School: "🏫", College: "🎓", Corporate: "🏢" };
                const DEPT_LIGHT = { School: "#eff6ff", College: "#f5f3ff", Corporate: "#fffbeb" };

                const managers = users.filter(u => u.role === "Manager" || u.role === "Admin");
                const teamLeads = users.filter(u => u.role === "TeamLead");
                const executives = users.filter(u => u.role === "Executive");

                // Quick assign state
                const [quickAssign, setQuickAssign] = React.useState({});
                const [assignLoading, setAssignLoading] = React.useState(null);

                const handleQuickAssign = async (userId, reportTo) => {
                    setAssignLoading(userId);
                    try {
                        const r = await fetch(`${ADMIN_API}/users/${userId}`, {
                            method: "PUT", headers: auth,
                            body: JSON.stringify({ team_lead_id: reportTo || null }),
                        });
                        if (!r.ok) throw new Error((await r.json()).message);
                        showToast("Reporting assigned ✅", "success");
                        fetchUsers();
                    } catch (e) { showToast(e.message, "error"); }
                    finally { setAssignLoading(null); setQuickAssign({}); }
                };

                const NodeCard = ({ user, level = 0, accentColor }) => (
                    <div style={{
                        background: level === 0 ? "var(--bg-card)" : level === 1 ? "var(--bg-card2, #f8fafc)" : "var(--bg)",
                        border: `1.5px solid ${accentColor}${level === 0 ? "80" : "40"}`,
                        borderLeft: `3px solid ${accentColor}`,
                        borderRadius: 10, padding: "10px 14px",
                        marginBottom: level === 2 ? 6 : 0,
                        fontSize: 13,
                        boxShadow: level === 0 ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                        opacity: assignLoading === user.id ? 0.6 : 1,
                        transition: "opacity 0.2s",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 18 }}>
                                {level === 0 ? "👑" : level === 1 ? "🧑‍💼" : "👤"}
                            </span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
                                    {user.full_name}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                                    <span style={{
                                        background: accentColor + "20", color: accentColor,
                                        padding: "1px 6px", borderRadius: 4, fontWeight: 600, marginRight: 4,
                                    }}>{user.role}</span>
                                    {user.department && (
                                        <span style={{ color: "var(--text-faint)" }}>· {DEPT_ICONS[user.department]} {user.department}</span>
                                    )}
                                </div>
                            </div>
                            {level > 0 && (
                                <div style={{ position: "relative" }}>
                                    {quickAssign[user.id] ? (
                                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                            <select
                                                style={{ fontSize: 11, padding: "3px 6px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", maxWidth: 140 }}
                                                defaultValue={user.team_lead_id || ""}
                                                onChange={e => handleQuickAssign(user.id, e.target.value)}
                                            >
                                                <option value="">— Unassign —</option>
                                                {(level === 1 ? managers : [...managers, ...teamLeads]).filter(u => u.id !== user.id).map(u => (
                                                    <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                                                ))}
                                            </select>
                                            <button onClick={() => setQuickAssign(p => ({ ...p, [user.id]: false }))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--text-muted)" }}>✕</button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setQuickAssign(p => ({ ...p, [user.id]: true }))}
                                            style={{ fontSize: 10, padding: "2px 8px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-card2, #f8f9fa)", cursor: "pointer", color: "var(--text-muted)", whiteSpace: "nowrap" }}
                                        >✏️ Reassign</button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );

                const TreeBranch = ({ children, isLast }) => (
                    <div style={{ paddingLeft: 20, marginTop: 8, position: "relative" }}>
                        <div style={{
                            position: "absolute", left: 0, top: 0, bottom: isLast ? "50%" : 0,
                            width: 1, background: "var(--border, #e2e8f0)",
                        }} />
                        <div style={{
                            position: "absolute", left: 0, top: "50%",
                            width: 16, height: 1, background: "var(--border, #e2e8f0)",
                        }} />
                        {children}
                    </div>
                );

                return (
                    <div className="admin-section">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                            <h3 style={{ margin: 0 }}>🌳 Reporting Tree</h3>
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                Hover any user → click <strong>✏️ Reassign</strong> to change reporting line
                            </span>
                        </div>
                        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
                            3-level hierarchy: <strong>Manager → Team Lead → Executive</strong> · Grouped by Department
                        </p>

                        {/* Department columns */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
                            {DEPTS.map(dept => {
                                const deptColor = DEPT_COLORS[dept];
                                const deptManagers = managers.filter(m => (m.department || "School") === dept);
                                const deptTeamLeads = teamLeads.filter(tl => (tl.department || "School") === dept);
                                const deptExecs = executives.filter(e => (e.department || "School") === dept);

                                // Build tree: for each manager, find their TLs, for each TL find their execs
                                const assignedExecIds = new Set();
                                const assignedTLIds = new Set();

                                return (
                                    <div key={dept} style={{
                                        background: DEPT_LIGHT[dept] || "var(--bg-card)",
                                        border: `2px solid ${deptColor}30`,
                                        borderTop: `4px solid ${deptColor}`,
                                        borderRadius: 14, padding: 16,
                                    }}>
                                        {/* Dept Header */}
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                                            <span style={{ fontSize: 22 }}>{DEPT_ICONS[dept]}</span>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: 15, color: deptColor }}>{dept}</div>
                                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                                    {deptManagers.length} manager · {deptTeamLeads.length} team lead · {deptExecs.length} executive
                                                </div>
                                            </div>
                                        </div>

                                        {/* If no one in this dept */}
                                        {deptManagers.length === 0 && deptTeamLeads.length === 0 && deptExecs.length === 0 && (
                                            <div style={{ fontSize: 12, color: "var(--text-faint)", fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>
                                                No users in {dept} department yet
                                            </div>
                                        )}

                                        {/* Manager → TL → Exec tree */}
                                        {deptManagers.map((mgr, mi) => {
                                            const mgrTLs = deptTeamLeads.filter(tl => tl.team_lead_id === mgr.id);
                                            mgrTLs.forEach(tl => assignedTLIds.add(tl.id));
                                            return (
                                                <div key={mgr.id} style={{ marginBottom: 12 }}>
                                                    <NodeCard user={mgr} level={0} accentColor={deptColor} />
                                                    {/* Team Leads under this manager */}
                                                    {mgrTLs.map((tl, ti) => {
                                                        const tlExecs = deptExecs.filter(e => e.team_lead_id === tl.id);
                                                        tlExecs.forEach(e => assignedExecIds.add(e.id));
                                                        return (
                                                            <TreeBranch key={tl.id} isLast={ti === mgrTLs.length - 1}>
                                                                <NodeCard user={tl} level={1} accentColor={deptColor} />
                                                                {tlExecs.map((exec, ei) => {
                                                                    assignedExecIds.add(exec.id);
                                                                    return (
                                                                        <TreeBranch key={exec.id} isLast={ei === tlExecs.length - 1}>
                                                                            <NodeCard user={exec} level={2} accentColor={deptColor} />
                                                                        </TreeBranch>
                                                                    );
                                                                })}
                                                                {tlExecs.length === 0 && (
                                                                    <div style={{ paddingLeft: 20, marginTop: 6, fontSize: 11, color: "var(--text-faint)", fontStyle: "italic" }}>
                                                                        No executives assigned
                                                                    </div>
                                                                )}
                                                            </TreeBranch>
                                                        );
                                                    })}
                                                    {/* Execs directly under manager (no TL) */}
                                                    {deptExecs.filter(e => e.team_lead_id === mgr.id).map((exec, ei) => {
                                                        assignedExecIds.add(exec.id);
                                                        return (
                                                            <TreeBranch key={exec.id} isLast={ei === deptExecs.filter(e => e.team_lead_id === mgr.id).length - 1}>
                                                                <NodeCard user={exec} level={2} accentColor={deptColor} />
                                                            </TreeBranch>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}

                                        {/* Unassigned TLs in this dept */}
                                        {deptTeamLeads.filter(tl => !assignedTLIds.has(tl.id)).length > 0 && (
                                            <div style={{ marginTop: 12, borderTop: `1px dashed ${deptColor}40`, paddingTop: 10 }}>
                                                <div style={{ fontSize: 11, fontWeight: 600, color: deptColor, marginBottom: 6 }}>📋 Unassigned Team Leads</div>
                                                {deptTeamLeads.filter(tl => !assignedTLIds.has(tl.id)).map(tl => (
                                                    <div key={tl.id} style={{ marginBottom: 6 }}>
                                                        <NodeCard user={tl} level={1} accentColor={deptColor} />
                                                        {/* Their execs if any */}
                                                        {deptExecs.filter(e => e.team_lead_id === tl.id).map((exec, ei) => {
                                                            assignedExecIds.add(exec.id);
                                                            return (
                                                                <TreeBranch key={exec.id} isLast>
                                                                    <NodeCard user={exec} level={2} accentColor={deptColor} />
                                                                </TreeBranch>
                                                            );
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Unassigned Executives */}
                                        {deptExecs.filter(e => !assignedExecIds.has(e.id)).length > 0 && (
                                            <div style={{ marginTop: 12, borderTop: `1px dashed ${deptColor}40`, paddingTop: 10 }}>
                                                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>👤 Unassigned Executives</div>
                                                {deptExecs.filter(e => !assignedExecIds.has(e.id)).map(exec => (
                                                    <div key={exec.id} style={{ marginBottom: 6 }}>
                                                        <NodeCard user={exec} level={2} accentColor={deptColor} />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Summary bar */}
                        <div style={{ marginTop: 20, padding: "12px 16px", background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", display: "flex", gap: 24, flexWrap: "wrap" }}>
                            {[
                                { label: "Total Users", val: users.length, icon: "👥" },
                                { label: "Managers", val: managers.length, icon: "👑" },
                                { label: "Team Leads", val: teamLeads.length, icon: "🧑‍💼" },
                                { label: "Executives", val: executives.length, icon: "👤" },
                                { label: "Assigned", val: executives.filter(e => e.team_lead_id).length, icon: "✅" },
                                { label: "Unassigned", val: executives.filter(e => !e.team_lead_id).length, icon: "⚠️" },
                            ].map(s => (
                                <div key={s.label} style={{ textAlign: "center" }}>
                                    <div style={{ fontSize: 20 }}>{s.icon}</div>
                                    <div style={{ fontWeight: 700, fontSize: 18 }}>{s.val}</div>
                                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.label}</div>
                                </div>
                            ))}
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
