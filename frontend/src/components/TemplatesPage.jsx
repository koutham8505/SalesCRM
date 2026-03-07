// D:\SalesCRM\frontend\src\components\TemplatesPage.jsx
import { useState, useEffect, useCallback } from "react";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/templates`;
const TYPE_ICONS = { call_script: "📞", email: "✉️", proposal_checklist: "📋", other: "📄" };
const TYPE_LABELS = { call_script: "Call Script", email: "Email Template", proposal_checklist: "Proposal Checklist", other: "Other" };

const EMPTY_FORM = { title: "", type: "call_script", content: "" };

export default function TemplatesPage({ session, role }) {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [filterType, setFilterType] = useState("all");
    const [viewTemplate, setViewTemplate] = useState(null);

    const auth = { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };
    const canManage = role === "Admin" || role === "Manager";

    const fetchTemplates = useCallback(async () => {
        try {
            setLoading(true);
            const r = await fetch(API, { headers: auth });
            if (r.ok) setTemplates(await r.json());
        } catch { } finally { setLoading(false); }
    }, [session]);

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    const handleSave = async () => {
        if (!form.title.trim() || !form.content.trim()) return alert("Title and content required");
        try {
            setSaving(true);
            const url = editId ? `${API}/${editId}` : API;
            const r = await fetch(url, { method: editId ? "PUT" : "POST", headers: auth, body: JSON.stringify(form) });
            if (!r.ok) throw new Error((await r.json()).message);
            setShowForm(false); setEditId(null); setForm(EMPTY_FORM); fetchTemplates();
        } catch (err) { alert(err.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this template?")) return;
        try {
            await fetch(`${API}/${id}`, { method: "DELETE", headers: auth });
            fetchTemplates();
        } catch { }
    };

    const filtered = filterType === "all" ? templates : templates.filter((t) => t.type === filterType);

    return (
        <div className="templates-page">
            <div className="tp-header">
                <div>
                    <h2 className="tp-title">📋 Templates Library</h2>
                    <p className="tp-subtitle">Call scripts, email templates & proposal checklists</p>
                </div>
                {canManage && (
                    <button className="btn-primary" onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); }}>
                        + New Template
                    </button>
                )}
            </div>

            {/* Filter tabs */}
            <div className="tp-filter-tabs">
                {["all", "call_script", "email", "proposal_checklist", "other"].map((t) => (
                    <button key={t} className={`ptab ${filterType === t ? "active" : ""}`} onClick={() => setFilterType(t)}>
                        {t === "all" ? "All" : `${TYPE_ICONS[t]} ${TYPE_LABELS[t]}`}
                    </button>
                ))}
            </div>

            {/* Templates Grid */}
            {loading ? <p className="p2-loading">Loading templates...</p> : (
                filtered.length === 0 ? (
                    <div className="empty-message" style={{ paddingTop: 60 }}>
                        No templates yet {canManage ? "— create your first one!" : ""}
                    </div>
                ) : (
                    <div className="tp-grid">
                        {filtered.map((t) => (
                            <div key={t.id} className="tp-card" onClick={() => setViewTemplate(t)}>
                                <div className="tp-card-icon">{TYPE_ICONS[t.type] || "📄"}</div>
                                <div className="tp-card-content">
                                    <div className="tp-card-title">{t.title}</div>
                                    <div className="tp-card-type">{TYPE_LABELS[t.type] || t.type}</div>
                                    <p className="tp-card-preview">{t.content?.slice(0, 100)}{t.content?.length > 100 ? "..." : ""}</p>
                                </div>
                                {canManage && (
                                    <div className="tp-card-actions" onClick={(e) => e.stopPropagation()}>
                                        <button className="btn-sm" onClick={() => { setForm({ title: t.title, type: t.type, content: t.content }); setEditId(t.id); setShowForm(true); }}>Edit</button>
                                        <button className="btn-sm btn-danger" onClick={() => handleDelete(t.id)}>Delete</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Create/Edit Modal */}
            {showForm && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
                    <div className="modal-card" style={{ maxWidth: 600, width: "90%" }}>
                        <h3 style={{ margin: "0 0 16px" }}>{editId ? "Edit Template" : "New Template"}</h3>
                        <label>Title
                            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. CBSE School Cold Call Script" />
                        </label>
                        <label style={{ marginTop: 10 }}>Type
                            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                <option value="call_script">📞 Call Script</option>
                                <option value="email">✉️ Email Template</option>
                                <option value="proposal_checklist">📋 Proposal Checklist</option>
                                <option value="other">📄 Other</option>
                            </select>
                        </label>
                        <label style={{ marginTop: 10 }}>Content
                            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={10} placeholder="Paste your script, email body, or checklist here..." style={{ fontFamily: "monospace", fontSize: 13 }} />
                        </label>
                        <div className="form-actions" style={{ marginTop: 16 }}>
                            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save Template"}</button>
                            <button onClick={() => { setShowForm(false); setEditId(null); }} className="btn-secondary">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {viewTemplate && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setViewTemplate(null)}>
                    <div className="modal-card" style={{ maxWidth: 640, width: "95%" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                            <div>
                                <h3 style={{ margin: 0 }}>{TYPE_ICONS[viewTemplate.type]} {viewTemplate.title}</h3>
                                <span style={{ fontSize: 12, color: "#64748b" }}>{TYPE_LABELS[viewTemplate.type]}</span>
                            </div>
                            {canManage && (
                                <button className="btn-sm" onClick={() => { setForm({ title: viewTemplate.title, type: viewTemplate.type, content: viewTemplate.content }); setEditId(viewTemplate.id); setShowForm(true); setViewTemplate(null); }}>Edit</button>
                            )}
                        </div>
                        <pre style={{ background: "#f8fafc", borderRadius: 8, padding: 16, whiteSpace: "pre-wrap", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#1e293b", maxHeight: 400, overflowY: "auto" }}>
                            {viewTemplate.content}
                        </pre>
                        <button onClick={() => setViewTemplate(null)} className="btn-secondary" style={{ marginTop: 16 }}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}
