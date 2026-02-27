// D:\SalesCRM\frontend\src\components\ProfilePage.jsx
import { useState, useEffect } from "react";

const API_BASE = "http://localhost:3000/api/profile";

export default function ProfilePage({ profile, session, onProfileUpdated, showToast }) {
    const [tab, setTab] = useState("profile");
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        full_name: profile?.full_name || "",
        job_title: profile?.job_title || "",
        team: profile?.team || "",
    });
    const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
    const [reqForm, setReqForm] = useState({ features: [], reason: "" });
    const [myRequests, setMyRequests] = useState([]);

    const authHeaders = {
        Authorization: `Bearer ${session?.access_token}`,
        "Content-Type": "application/json",
    };

    const canEditTeam = profile?.role === "Manager" || profile?.role === "Admin";

    useEffect(() => {
        if (tab === "security") fetchMyRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    const fetchMyRequests = async () => {
        try {
            const res = await fetch(`${API_BASE}/feature-requests`, { headers: authHeaders });
            if (res.ok) setMyRequests(await res.json());
        } catch { /* ignore */ }
    };

    const handleProfileSave = async () => {
        try {
            setSaving(true);
            const body = { full_name: form.full_name, job_title: form.job_title };
            if (canEditTeam) body.team = form.team;

            const res = await fetch(`${API_BASE}/me`, {
                method: "PUT", headers: authHeaders, body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error((await res.json()).message);
            showToast("Profile updated", "success");
            setEditing(false);
            onProfileUpdated();
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async () => {
        if (pwForm.newPw.length < 8) return showToast("Min 8 characters", "error");
        if (pwForm.newPw !== pwForm.confirm) return showToast("Passwords don't match", "error");
        try {
            setSaving(true);
            const res = await fetch(`${API_BASE}/change-password`, {
                method: "POST", headers: authHeaders,
                body: JSON.stringify({ new_password: pwForm.newPw }),
            });
            if (!res.ok) throw new Error((await res.json()).message);
            showToast("Password changed", "success");
            setPwForm({ current: "", newPw: "", confirm: "" });
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleFeatureRequest = async () => {
        if (reqForm.features.length === 0) return showToast("Select at least one feature", "error");
        try {
            setSaving(true);
            const res = await fetch(`${API_BASE}/feature-request`, {
                method: "POST", headers: authHeaders,
                body: JSON.stringify({
                    requested_features: reqForm.features.join(", "),
                    reason: reqForm.reason,
                }),
            });
            if (!res.ok) throw new Error((await res.json()).message);
            showToast("Request submitted", "success");
            setReqForm({ features: [], reason: "" });
            fetchMyRequests();
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const toggleFeature = (f) => {
        setReqForm((prev) => ({
            ...prev,
            features: prev.features.includes(f)
                ? prev.features.filter((x) => x !== f)
                : [...prev.features, f],
        }));
    };

    const initials = (profile?.full_name || "U")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="profile-page">
            <div className="profile-tabs">
                <button className={`ptab ${tab === "profile" ? "active" : ""}`} onClick={() => setTab("profile")}>
                    Profile
                </button>
                <button className={`ptab ${tab === "security" ? "active" : ""}`} onClick={() => setTab("security")}>
                    Security &amp; Access
                </button>
            </div>

            {tab === "profile" && (
                <div className="profile-card-wrapper">
                    <div className="profile-hero">
                        <div className="profile-avatar-lg">{initials}</div>
                        <div className="profile-hero-info">
                            <h2>{profile?.full_name}</h2>
                            <p className="profile-email">{profile?.email}</p>
                            <div className="profile-badges">
                                <span className={`role-badge role-${profile?.role?.toLowerCase()}`}>
                                    {profile?.role}
                                </span>
                                {profile?.team && <span className="team-badge">{profile?.team}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="profile-details">
                        {!editing ? (
                            <>
                                <div className="profile-field">
                                    <span className="pf-label">Full Name</span>
                                    <span className="pf-value">{profile?.full_name}</span>
                                </div>
                                <div className="profile-field">
                                    <span className="pf-label">Job Title</span>
                                    <span className="pf-value">{profile?.job_title || "—"}</span>
                                </div>
                                <div className="profile-field">
                                    <span className="pf-label">Email</span>
                                    <span className="pf-value">{profile?.email}</span>
                                </div>
                                <div className="profile-field">
                                    <span className="pf-label">Role</span>
                                    <span className="pf-value">{profile?.role}</span>
                                </div>
                                <div className="profile-field">
                                    <span className="pf-label">Team</span>
                                    <span className="pf-value">{profile?.team || "—"}</span>
                                </div>
                                <button onClick={() => setEditing(true)} className="btn-primary" style={{ marginTop: 16 }}>
                                    Edit Profile
                                </button>
                            </>
                        ) : (
                            <>
                                <label>
                                    Full Name
                                    <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                                </label>
                                <label>
                                    Job Title
                                    <input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
                                </label>
                                <div className="profile-field">
                                    <span className="pf-label">Email</span>
                                    <span className="pf-value">{profile?.email} <small>(read-only)</small></span>
                                </div>
                                <div className="profile-field">
                                    <span className="pf-label">Role</span>
                                    <span className="pf-value">{profile?.role} <small>(read-only)</small></span>
                                </div>
                                {canEditTeam ? (
                                    <label>
                                        Team
                                        <input value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} />
                                    </label>
                                ) : (
                                    <div className="profile-field">
                                        <span className="pf-label">Team</span>
                                        <span className="pf-value">{profile?.team || "—"} <small>(read-only)</small></span>
                                    </div>
                                )}
                                <div className="form-actions" style={{ marginTop: 16 }}>
                                    <button onClick={handleProfileSave} disabled={saving} className="btn-primary">
                                        {saving ? "Saving..." : "Save"}
                                    </button>
                                    <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {tab === "security" && (
                <div className="security-wrapper">
                    {/* Change Password */}
                    <div className="sec-card">
                        <h3>Change Password</h3>
                        <label>
                            New Password <small>(min 8 chars)</small>
                            <input type="password" value={pwForm.newPw}
                                onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })} />
                        </label>
                        <label>
                            Confirm New Password
                            <input type="password" value={pwForm.confirm}
                                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} />
                        </label>
                        <button onClick={handlePasswordChange} disabled={saving} className="btn-primary" style={{ marginTop: 12 }}>
                            {saving ? "Updating..." : "Update Password"}
                        </button>
                    </div>

                    {/* Request Feature Access */}
                    <div className="sec-card">
                        <h3>Request Feature Access</h3>
                        <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 12px" }}>
                            Request additional features that are not available for your current role.
                        </p>
                        <div className="feature-checkboxes">
                            {["Import leads", "Bulk update", "Delete leads", "Team/Owner filters"].map((f) => (
                                <label key={f} className="checkbox-label">
                                    <input type="checkbox" checked={reqForm.features.includes(f)}
                                        onChange={() => toggleFeature(f)} />
                                    {f}
                                </label>
                            ))}
                        </div>
                        <label>
                            Reason
                            <textarea value={reqForm.reason} rows={2}
                                onChange={(e) => setReqForm({ ...reqForm, reason: e.target.value })}
                                placeholder="Why do you need this access?" />
                        </label>
                        <button onClick={handleFeatureRequest} disabled={saving} className="btn-primary" style={{ marginTop: 12 }}>
                            Submit Request
                        </button>
                    </div>

                    {/* My Requests */}
                    {myRequests.length > 0 && (
                        <div className="sec-card">
                            <h3>My Requests</h3>
                            <div className="requests-list">
                                {myRequests.map((r) => (
                                    <div key={r.id} className="request-item">
                                        <div className="req-features">{r.requested_features}</div>
                                        <span className={`status-chip status-${r.status?.toLowerCase()}`}>
                                            {r.status}
                                        </span>
                                        {r.admin_comment && <div className="req-comment">Admin: {r.admin_comment}</div>}
                                        <div className="req-date">{new Date(r.created_at).toLocaleDateString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
