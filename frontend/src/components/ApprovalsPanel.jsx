// D:\SalesCRM\frontend\src\components\ApprovalsPanel.jsx
import { useState, useEffect, useCallback } from "react";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/approvals`;

const TYPE_ICONS = { discount: "💸", proposal: "📄", custom: "📋" };
const TYPE_LABELS = { discount: "Discount", proposal: "Proposal Auth", custom: "Custom" };

const STATUS_STYLES = {
    Pending: { background: "#fef3c7", color: "#92400e" },
    Approved: { background: "#d1fae5", color: "#065f46" },
    Rejected: { background: "#fee2e2", color: "#991b1b" },
};

export default function ApprovalsPanel({ session, role, showToast }) {
    const [approvals, setApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("Pending");
    const [reviewing, setReviewing] = useState(null);
    const [note, setNote] = useState("");
    const auth = { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };
    const canReview = role === "Admin" || role === "Manager";

    const fetchApprovals = useCallback(async () => {
        try {
            setLoading(true);
            const r = await fetch(API, { headers: auth });
            if (r.ok) setApprovals(await r.json());
        } catch { } finally { setLoading(false); }
    }, [session]);

    useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

    const handleReview = async (id, status) => {
        try {
            const r = await fetch(`${API}/${id}/review`, {
                method: "PUT", headers: auth,
                body: JSON.stringify({ status, reviewer_note: note || undefined }),
            });
            if (!r.ok) throw new Error((await r.json()).message);
            showToast(`Approval ${status.toLowerCase()}`, "success");
            setReviewing(null); setNote(""); fetchApprovals();
        } catch (err) { showToast(err.message, "error"); }
    };

    const handleCancel = async (id) => {
        if (!confirm("Cancel this request?")) return;
        try {
            await fetch(`${API}/${id}`, { method: "DELETE", headers: auth });
            fetchApprovals();
        } catch { }
    };

    const filtered = approvals.filter((a) => filter === "all" || a.status === filter);
    const pendingCount = approvals.filter((a) => a.status === "Pending").length;

    return (
        <div className="approvals-panel">
            {/* Header */}
            <div className="ap-header">
                <div>
                    <h2 className="ap-title">📋 Approvals</h2>
                    <p className="ap-subtitle">
                        {canReview
                            ? `${pendingCount} pending approval${pendingCount !== 1 ? "s" : ""} awaiting your review`
                            : "Track your approval requests"}
                    </p>
                </div>
            </div>

            {/* Filter */}
            <div className="ap-filters">
                {["Pending", "Approved", "Rejected", "all"].map((f) => (
                    <button key={f} className={`ptab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
                        {f === "all" ? "All" : f}
                        {f === "Pending" && pendingCount > 0 && <span className="admin-tab-badge">{pendingCount}</span>}
                    </button>
                ))}
            </div>

            {loading ? <p className="p2-loading">Loading approvals...</p> : (
                filtered.length === 0 ? (
                    <div className="empty-message" style={{ paddingTop: 40 }}>
                        {filter === "Pending" ? "🎉 No pending approvals!" : `No ${filter.toLowerCase()} approvals.`}
                    </div>
                ) : (
                    <div className="ap-list">
                        {filtered.map((a) => (
                            <div key={a.id} className="ap-card">
                                <div className="ap-card-top">
                                    <div className="ap-card-left">
                                        <span className="ap-type-icon">{TYPE_ICONS[a.request_type] || "📋"}</span>
                                        <div>
                                            <div className="ap-type-label">{TYPE_LABELS[a.request_type] || a.request_type}</div>
                                            {a.lead_name && <div className="ap-lead">🏢 {a.lead_name}</div>}
                                        </div>
                                    </div>
                                    <span className="ap-status-badge" style={STATUS_STYLES[a.status] || {}}>
                                        {a.status}
                                    </span>
                                </div>

                                <p className="ap-description">{a.description}</p>

                                {a.amount && (
                                    <div className="ap-amount">💰 Amount: <strong>₹{Number(a.amount).toLocaleString()}</strong></div>
                                )}

                                <div className="ap-meta">
                                    <span>👤 {a.requested_by_name}</span>
                                    <span>·</span>
                                    <span>📅 {new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                                    {a.reviewed_by_name && <><span>·</span><span>Reviewed by {a.reviewed_by_name}</span></>}
                                </div>

                                {a.reviewer_note && (
                                    <div className="ap-reviewer-note">
                                        💬 {a.reviewer_note}
                                    </div>
                                )}

                                {/* Review actions */}
                                {a.status === "Pending" && canReview && (
                                    <div className="ap-actions">
                                        {reviewing === a.id ? (
                                            <div className="ap-review-box">
                                                <input
                                                    placeholder="Optional review note..."
                                                    value={note}
                                                    onChange={(e) => setNote(e.target.value)}
                                                    className="ap-note-input"
                                                />
                                                <div className="ap-review-btns">
                                                    <button className="btn-primary" style={{ background: "#16a34a" }} onClick={() => handleReview(a.id, "Approved")}>✅ Approve</button>
                                                    <button className="btn-primary" style={{ background: "#dc2626" }} onClick={() => handleReview(a.id, "Rejected")}>❌ Reject</button>
                                                    <button className="btn-secondary" onClick={() => { setReviewing(null); setNote(""); }}>Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button className="btn-sm" style={{ background: "#dbeafe", color: "#1e40af" }} onClick={() => setReviewing(a.id)}>Review</button>
                                        )}
                                    </div>
                                )}

                                {/* Cancel own pending request */}
                                {a.status === "Pending" && !canReview && (
                                    <div className="ap-actions">
                                        <button className="btn-sm btn-danger" onClick={() => handleCancel(a.id)}>Cancel Request</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}
