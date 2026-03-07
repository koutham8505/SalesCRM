// D:\SalesCRM\frontend\src\components\AnnouncementBanner.jsx
// Shows active announcements as a dismissible banner on the dashboard
import { useState, useEffect } from "react";

const PRIORITY_STYLE = {
    urgent: { bg: "#fef2f2", border: "#fca5a5", icon: "🚨", label: "URGENT", color: "#991b1b" },
    important: { bg: "#fffbeb", border: "#fcd34d", icon: "⚠️", label: "IMPORTANT", color: "#92400e" },
    normal: { bg: "#eff6ff", border: "#93c5fd", icon: "📢", label: "INFO", color: "#1e40af" },
};

const DARK_STYLE = {
    urgent: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)", color: "#fca5a5" },
    important: { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", color: "#fcd34d" },
    normal: { bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.3)", color: "#93c5fd" },
};

export default function AnnouncementBanner({ token, isDark }) {
    const [announcements, setAnnouncements] = useState([]);
    const [dismissed, setDismissed] = useState(() => {
        try { return new Set(JSON.parse(localStorage.getItem("crm_dismissed_ann") || "[]")); }
        catch { return new Set(); }
    });

    const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

    useEffect(() => {
        if (!token) return;
        fetch(`${BASE}/api/announcements`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(d => Array.isArray(d) && setAnnouncements(d))
            .catch(() => { });
    }, [token]);

    const dismiss = (id) => {
        const next = new Set([...dismissed, id]);
        setDismissed(next);
        localStorage.setItem("crm_dismissed_ann", JSON.stringify([...next]));
    };

    const visible = announcements.filter(a => !dismissed.has(a.id));
    if (visible.length === 0) return null;

    return (
        <div className="ann-banner-stack">
            {visible.map(ann => {
                const p = ann.priority || "normal";
                const style = isDark ? DARK_STYLE[p] : PRIORITY_STYLE[p];
                const cfg = PRIORITY_STYLE[p];
                return (
                    <div
                        key={ann.id}
                        className="ann-banner"
                        style={{ background: style.bg, borderLeft: `4px solid ${style.border}` }}
                    >
                        <span className="ann-icon">{cfg.icon}</span>
                        <div className="ann-content">
                            <span className="ann-tag" style={{ color: style.color }}>{cfg.label}</span>
                            <strong className="ann-title" style={{ color: style.color }}>{ann.title}</strong>
                            <span className="ann-body">{ann.body}</span>
                            {ann.created_by_name && (
                                <span className="ann-meta">— {ann.created_by_name} · {new Date(ann.created_at).toLocaleDateString("en-IN")}</span>
                            )}
                        </div>
                        <button className="ann-dismiss" onClick={() => dismiss(ann.id)} title="Dismiss">✕</button>
                    </div>
                );
            })}
        </div>
    );
}
