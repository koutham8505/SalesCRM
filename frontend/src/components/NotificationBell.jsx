// D:\SalesCRM\frontend\src\components\NotificationBell.jsx
import { useState, useEffect, useRef, useCallback } from "react";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/notifications`;

const TYPE_ICONS = {
    mention: "💬",
    approval_request: "📋",
    approval_update: "✅",
    task_assigned: "📌",
};

export default function NotificationBell({ session, onNotifClick }) {
    const [count, setCount] = useState(0);
    const [notifs, setNotifs] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const panelRef = useRef(null);
    const token = session?.access_token;
    const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    // Close on outside click
    useEffect(() => {
        const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const fetchCount = useCallback(async () => {
        if (!token) return;
        try {
            const r = await fetch(`${API}/unread-count`, { headers: auth });
            if (r.ok) { const d = await r.json(); setCount(d.count || 0); }
        } catch { }
    }, [token]);

    // Poll unread count every 30 seconds
    useEffect(() => {
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, [fetchCount]);

    const fetchNotifs = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const r = await fetch(API, { headers: auth });
            if (r.ok) setNotifs(await r.json());
        } catch { } finally { setLoading(false); }
    };

    const handleOpen = () => {
        const newOpen = !open;
        setOpen(newOpen);
        if (newOpen) fetchNotifs();
    };

    const markAllRead = async () => {
        try {
            await fetch(`${API}/mark-read`, { method: "PUT", headers: auth });
            setCount(0);
            setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
        } catch { }
    };

    const markOne = async (notif) => {
        if (!notif.is_read) {
            try {
                await fetch(`${API}/${notif.id}/read`, { method: "PUT", headers: auth });
                setNotifs((prev) => prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n));
                setCount((c) => Math.max(0, c - 1));
            } catch { }
        }
        if (notif.lead_id) onNotifClick?.(notif.lead_id);
        setOpen(false);
    };

    return (
        <div className="notif-wrap" ref={panelRef}>
            <button className="notif-bell" onClick={handleOpen} title="Notifications">
                🔔
                {count > 0 && <span className="notif-dot">{count > 9 ? "9+" : count}</span>}
            </button>

            {open && (
                <div className="notif-panel">
                    <div className="notif-panel-header">
                        <span className="notif-panel-title">Notifications</span>
                        {count > 0 && (
                            <button className="notif-mark-read" onClick={markAllRead}>
                                Mark all read
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="notif-empty">Loading...</div>
                    ) : notifs.length === 0 ? (
                        <div className="notif-empty">🎉 All caught up!</div>
                    ) : (
                        <div className="notif-list">
                            {notifs.map((n) => (
                                <div
                                    key={n.id}
                                    className={`notif-item ${!n.is_read ? "notif-unread" : ""}`}
                                    onClick={() => markOne(n)}
                                >
                                    <span className="notif-item-icon">{TYPE_ICONS[n.type] || "🔔"}</span>
                                    <div className="notif-item-body">
                                        <div className="notif-item-title">{n.title}</div>
                                        {n.body && <div className="notif-item-text">{n.body}</div>}
                                        <div className="notif-item-time">
                                            {new Date(n.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                                        </div>
                                    </div>
                                    {!n.is_read && <div className="notif-unread-dot" />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
