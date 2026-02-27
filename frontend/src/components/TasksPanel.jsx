// D:\SalesCRM\frontend\src\components\TasksPanel.jsx
import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:3000/api/tasks";

export default function TasksPanel({ session, showToast }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: "", description: "", due_date: "" });
    const [filter, setFilter] = useState("all");

    const auth = { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(API, { headers: auth });
            if (res.ok) setTasks(await res.json());
        } catch { /* ignore */ }
        finally { setLoading(false); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const handleCreate = async () => {
        if (!form.title.trim()) return showToast("Title required", "error");
        try {
            const res = await fetch(API, { method: "POST", headers: auth, body: JSON.stringify(form) });
            if (!res.ok) throw new Error((await res.json()).message);
            showToast("Task created", "success");
            setForm({ title: "", description: "", due_date: "" });
            setShowForm(false);
            fetchTasks();
        } catch (err) { showToast(err.message, "error"); }
    };

    const handleToggle = async (task) => {
        const newStatus = task.status === "Done" ? "Pending" : "Done";
        try {
            await fetch(`${API}/${task.id}`, { method: "PUT", headers: auth, body: JSON.stringify({ status: newStatus }) });
            fetchTasks();
        } catch { /* ignore */ }
    };

    const handleDelete = async (id) => {
        try {
            await fetch(`${API}/${id}`, { method: "DELETE", headers: auth });
            fetchTasks();
        } catch { /* ignore */ }
    };

    const today = new Date().toISOString().slice(0, 10);
    const filtered = tasks.filter((t) => {
        if (filter === "pending") return t.status !== "Done";
        if (filter === "overdue") return t.status !== "Done" && t.due_date && t.due_date < today;
        if (filter === "done") return t.status === "Done";
        return true;
    });

    return (
        <div className="tasks-panel">
            <div className="tasks-header">
                <h2>✅ Tasks</h2>
                <button onClick={() => setShowForm(!showForm)} className="btn-primary">+ New Task</button>
            </div>

            <div className="tasks-filters">
                {["all", "pending", "overdue", "done"].map((f) => (
                    <button key={f} className={`ptab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {showForm && (
                <div className="task-form">
                    <input placeholder="Task title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                    <div className="form-actions">
                        <button onClick={handleCreate} className="btn-primary">Save</button>
                        <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                    </div>
                </div>
            )}

            {loading ? <p>Loading...</p> : (
                <div className="tasks-list">
                    {filtered.length === 0 && <p className="empty-message">No tasks</p>}
                    {filtered.map((t) => (
                        <div key={t.id} className={`task-item ${t.status === "Done" ? "task-done" : ""} ${t.due_date && t.due_date < today && t.status !== "Done" ? "task-overdue" : ""}`}>
                            <input type="checkbox" checked={t.status === "Done"} onChange={() => handleToggle(t)} className="task-check" />
                            <div className="task-info">
                                <strong className={t.status === "Done" ? "line-through" : ""}>{t.title}</strong>
                                {t.description && <p className="task-desc">{t.description}</p>}
                                {t.due_date && <span className="task-due">{t.due_date}</span>}
                            </div>
                            <button onClick={() => handleDelete(t.id)} className="btn-sm btn-danger">✕</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
