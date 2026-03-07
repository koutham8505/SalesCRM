// D:\SalesCRM\frontend\src\components\AnnouncementsPanel.jsx
// Admin panel for creating and managing team announcements
import { useState, useEffect } from "react";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function AnnouncementsPanel({ token, role }) {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ title: "", body: "", priority: "normal" });
    const [showForm, setShowForm] = useState(false);
    const [msg, setMsg] = useState(null);

    const canManage = ["Admin", "Manager"].includes(role);

    const load = () => {
        setLoading(true);
        fetch(`${BASE}/api/announcements`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => { setList(Array.isArray(d) ? d : []); setLoading(false); })
            .catch(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.body.trim()) return;
        setSaving(true);
        try {
            const r = await fetch(`${BASE}/api/announcements`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (r.ok) {
                setMsg({ type: "success", text: "Announcement posted!" });
                setForm({ title: "", body: "", priority: "normal" });
                setShowForm(false);
                load();
            } else {
                const d = await r.json();
                setMsg({ type: "error", text: d.message || "Failed" });
            }
        } catch { setMsg({ type: "error", text: "Network error" }); }
        setSaving(false);
        setTimeout(() => setMsg(null), 3000);
    };

    const handleDelete = async (id) => {
        if (!confirm("Remove this announcement?")) return;
        await fetch(`${BASE}/api/announcements/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });
        load();
    };

    const PRIORITY_CFG = {
        urgent: { icon: "🚨", label: "Urgent", class: "ann-p-urgent" },
        important: { icon: "⚠️", label: "Important", class: "ann-p-important" },
        normal: { icon: "📢", label: "Info", class: "ann-p-normal" },
    };

    return (
        <div className="ann-panel">
            <div className="ann-panel-header">
                <div>
                    <h2 className="ann-panel-title">📢 Team Announcements</h2>
                    <p className="ann-panel-sub">Post updates that all reps see on their dashboard</p>
                </div>
                {canManage && (
                    <button className="ann-new-btn" onClick={() => setShowForm(!showForm)}>
                        {showForm ? "✕ Cancel" : "+ New Announcement"}
                    </button>
                )}
            </div>

            {msg && (
                <div className={`ann-msg ${msg.type === "success" ? "ann-msg-ok" : "ann-msg-err"}`}>{msg.text}</div>
            )}

            {/* ── Create form ── */}
            {showForm && canManage && (
                <form className="ann-form" onSubmit={handleCreate}>
                    <div className="ann-form-row">
                        <div className="ann-form-group" style={{ flex: 3 }}>
                            <label className="ann-label">Title *</label>
                            <input
                                className="ann-input"
                                value={form.title}
                                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                placeholder="e.g. Q1 Target Update"
                                required
                            />
                        </div>
                        <div className="ann-form-group" style={{ flex: 1 }}>
                            <label className="ann-label">Priority</label>
                            <select
                                className="ann-input"
                                value={form.priority}
                                onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                            >
                                <option value="normal">📢 Info</option>
                                <option value="important">⚠️ Important</option>
                                <option value="urgent">🚨 Urgent</option>
                            </select>
                        </div>
                    </div>
                    <div className="ann-form-group">
                        <label className="ann-label">Message *</label>
                        <textarea
                            className="ann-input ann-textarea"
                            value={form.body}
                            onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                            placeholder="Write your announcement here..."
                            rows={3}
                            required
                        />
                    </div>
                    <div className="ann-form-actions">
                        <button type="submit" className="ann-post-btn" disabled={saving}>
                            {saving ? "Posting..." : "📢 Post Announcement"}
                        </button>
                    </div>
                </form>
            )}

            {/* ── List ── */}
            {loading ? (
                <div className="ann-loading">Loading...</div>
            ) : list.length === 0 ? (
                <div className="ann-empty">
                    <div style={{ fontSize: 36 }}>📭</div>
                    <div>No announcements yet</div>
                    {canManage && <div style={{ fontSize: 12 }}>Post an announcement to inform your team</div>}
                </div>
            ) : (
                <div className="ann-list">
                    {list.map(ann => {
                        const cfg = PRIORITY_CFG[ann.priority] || PRIORITY_CFG.normal;
                        return (
                            <div key={ann.id} className={`ann-item ${cfg.class}`}>
                                <div className="ann-item-icon">{cfg.icon}</div>
                                <div className="ann-item-content">
                                    <div className="ann-item-top">
                                        <span className="ann-item-priority-tag">{cfg.label}</span>
                                        <strong className="ann-item-title">{ann.title}</strong>
                                    </div>
                                    <p className="ann-item-body">{ann.body}</p>
                                    <div className="ann-item-meta">
                                        Posted by {ann.created_by_name || "Admin"} · {new Date(ann.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                    </div>
                                </div>
                                {canManage && (
                                    <button className="ann-delete-btn" onClick={() => handleDelete(ann.id)} title="Remove">🗑</button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
