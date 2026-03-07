// D:\SalesCRM\frontend\src\components\TargetsPanel.jsx
import { useState, useEffect, useCallback } from "react";

const TARGETS_API = `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/targets`;

export default function TargetsPanel({ session, profile, showToast }) {
    const [targets, setTargets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Setup form for target creation
    const now = new Date();
    const defaultPeriod = now.toLocaleString("default", { month: "short" }) + " " + now.getFullYear();
    const [form, setForm] = useState({
        owner_id: "",
        target_type: "Monthly",
        period_label: defaultPeriod,
        target_leads: 0,
        target_won: 0,
        target_value: 0
    });

    // Update owner_id when profile loads
    useEffect(() => {
        if (profile?.id && !form.owner_id) {
            setForm(f => ({ ...f, owner_id: profile.id }));
        }
    }, [profile?.id]);

    const isManagerOrAdmin = profile?.role === "Manager" || profile?.role === "Admin";
    const canCreate = isManagerOrAdmin || profile?.role === "TeamLead" || profile?.role === "Executive";

    const auth = { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };

    const fetchTargets = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(TARGETS_API, { headers: auth });
            if (res.ok) setTargets(await res.json());
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, [session]);

    useEffect(() => { fetchTargets(); }, [fetchTargets]);

    const handleCreate = async () => {
        try {
            const res = await fetch(TARGETS_API, { method: "POST", headers: auth, body: JSON.stringify(form) });
            if (!res.ok) throw new Error((await res.json()).message);
            showToast("Target created", "success");
            setShowForm(false);
            fetchTargets();
        } catch (err) { showToast(err.message, "error"); }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this target?")) return;
        try {
            const res = await fetch(`${TARGETS_API}/${id}`, { method: "DELETE", headers: auth });
            if (!res.ok) throw new Error((await res.json()).message);
            showToast("Target deleted");
            fetchTargets();
        } catch (err) { showToast(err.message, "error"); }
    };

    return (
        <div className="tasks-panel">
            <div className="tasks-header">
                <h2>🎯 Sales Targets</h2>
                {canCreate && <button onClick={() => setShowForm(!showForm)} className="btn-primary">+ New Target</button>}
            </div>

            {showForm && (
                <div className="task-form">
                    <select value={form.target_type} onChange={e => setForm({ ...form, target_type: e.target.value })}>
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Yearly">Yearly</option>
                    </select>
                    <input placeholder="Period Label (e.g. Feb 2026)" value={form.period_label} onChange={e => setForm({ ...form, period_label: e.target.value })} />
                    <input type="number" placeholder="Target Leads" value={form.target_leads || ""} onChange={e => setForm({ ...form, target_leads: e.target.value })} />
                    <input type="number" placeholder="Target Won (Deals)" value={form.target_won || ""} onChange={e => setForm({ ...form, target_won: e.target.value })} />
                    <input type="number" placeholder="Target Deal Value (₹)" value={form.target_value || ""} onChange={e => setForm({ ...form, target_value: e.target.value })} />

                    <div className="form-actions">
                        <button onClick={handleCreate} className="btn-primary">Save Target</button>
                        <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                    </div>
                </div>
            )}

            {loading ? <p>Loading...</p> : (
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Owner</th>
                                <th>Period</th>
                                <th>Targets (L/W/₹)</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {targets.map(t => (
                                <tr key={t.id}>
                                    <td><strong>{t.owner?.full_name || "Unknown"}</strong> <span className={`role-badge role-${t.owner?.role?.toLowerCase()}`}>{t.owner?.role}</span></td>
                                    <td>{t.period_label} ({t.target_type})</td>
                                    <td>
                                        Leads: {t.target_leads} | Won: {t.target_won} <br />
                                        Value: ₹{(Number(t.target_value) || 0).toLocaleString()}
                                    </td>
                                    <td>
                                        {canCreate && <button onClick={() => handleDelete(t.id)} className="btn-sm btn-danger">✕ Delete</button>}
                                    </td>
                                </tr>
                            ))}
                            {targets.length === 0 && <tr><td colSpan="4">No targets set yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
