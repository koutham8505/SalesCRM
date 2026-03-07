// D:\SalesCRM\frontend\src\Register.jsx
import { useState } from "react";
import "./auth.css";

const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/auth/register`;
const ROLES = ["Admin", "Manager", "TeamLead", "Executive"];

export default function Register({ onSwitchToLogin }) {
    const [form, setForm] = useState({
        full_name: "", email: "", password: "", confirm_password: "",
        role: "", team: "",
    });
    const [showPwd, setShowPwd] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((p) => ({ ...p, [name]: value }));
        if (error) setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (form.password !== form.confirm_password) {
            setError("Passwords do not match"); return;
        }
        if (form.password.length < 6) {
            setError("Password must be at least 6 characters"); return;
        }
        if (!form.role) {
            setError("Please select a role"); return;
        }

        try {
            setLoading(true);
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: form.email,
                    password: form.password,
                    full_name: form.full_name,
                    role: form.role,
                    team: form.team || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.message || "Registration failed"); return; }
            setSuccess(true);
        } catch {
            setError("Registration failed — is the backend running?");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-page">
            <div className="register-card">
                {/* Success state */}
                {success ? (
                    <div style={{ textAlign: "center", padding: "24px 0" }}>
                        <div style={{ fontSize: "3.5rem", marginBottom: 16 }}>🎉</div>
                        <h2 style={{ margin: "0 0 8px", fontSize: "1.4rem", fontWeight: 800, color: "#0f172a" }}>
                            Account Created!
                        </h2>
                        <p style={{ margin: "0 0 24px", color: "#64748b", fontSize: "0.9rem" }}>
                            Account for <strong>{form.email}</strong> has been created.<br />
                            You can now log in.
                        </p>
                        <button className="btn-login" onClick={onSwitchToLogin}>
                            Go to Login
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="register-logo">
                            <span style={{ fontSize: "2rem", display: "block", marginBottom: 8 }}>📝</span>
                            <h1>Create Account</h1>
                            <p>Set up your Sales CRM access</p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="register-form">
                            {error && <div className="reg-error">{error}</div>}

                            {/* Full Name */}
                            <div className="reg-field">
                                <label>Full Name *</label>
                                <input
                                    type="text"
                                    name="full_name"
                                    value={form.full_name}
                                    onChange={handleChange}
                                    placeholder="e.g. Koutham Singh"
                                    required
                                    autoFocus
                                />
                            </div>

                            {/* Email */}
                            <div className="reg-field">
                                <label>Email *</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="you@company.com"
                                    required
                                />
                            </div>

                            {/* Password + Confirm Password — side by side */}
                            <div className="reg-row">
                                <div className="reg-field">
                                    <label>Password *</label>
                                    <div className="password-wrapper">
                                        <input
                                            type={showPwd ? "text" : "password"}
                                            name="password"
                                            value={form.password}
                                            onChange={handleChange}
                                            placeholder="min 6 chars"
                                            required
                                        />
                                        <button type="button" className="show-password-btn" onClick={() => setShowPwd(p => !p)}>
                                            {showPwd ? "🙈" : "👁"}
                                        </button>
                                    </div>
                                </div>

                                <div className="reg-field">
                                    <label>Confirm Password *</label>
                                    <div className="password-wrapper">
                                        <input
                                            type={showConfirm ? "text" : "password"}
                                            name="confirm_password"
                                            value={form.confirm_password}
                                            onChange={handleChange}
                                            placeholder="repeat password"
                                            required
                                        />
                                        <button type="button" className="show-password-btn" onClick={() => setShowConfirm(p => !p)}>
                                            {showConfirm ? "🙈" : "👁"}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Role + Team — side by side */}
                            <div className="reg-row">
                                <div className="reg-field">
                                    <label>Role *</label>
                                    <select name="role" value={form.role} onChange={handleChange} required>
                                        <option value="">— Select Role —</option>
                                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>

                                <div className="reg-field">
                                    <label>Team <span style={{ fontWeight: 400, color: "#94a3b8" }}>(optional)</span></label>
                                    <input
                                        type="text"
                                        name="team"
                                        value={form.team}
                                        onChange={handleChange}
                                        placeholder="e.g. North Sales"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="reg-actions">
                                <button type="submit" className="btn-login" disabled={loading}>
                                    {loading ? "Creating account…" : "Register"}
                                </button>
                                <button type="button" className="btn-register" onClick={onSwitchToLogin}>
                                    Back to Login
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
