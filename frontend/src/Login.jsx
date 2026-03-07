// D:\SalesCRM\frontend\src\Login.jsx
import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import "./auth.css";

const API_URL = import.meta.env.VITE_API_URL + "/api";

export default function Login({ onLogin, onSwitchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login"); // "login" | "forgot"
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotReason, setForgotReason] = useState("");
  const [forgotDone, setForgotDone] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  // Apply stored theme on mount
  useEffect(() => {
    const stored = localStorage.getItem("crm_theme") || "light";
    document.documentElement.setAttribute("data-theme", stored);
    setDarkMode(stored === "dark");
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    const theme = next ? "dark" : "light";
    localStorage.setItem("crm_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  };

  const login = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); return; }
      if (!data.session) { setError("No session returned. Please try again."); return; }
      onLogin(data.session);
    } catch {
      setError("Login failed — please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    setError("");
    if (!forgotEmail.trim()) { setError("Email is required"); return; }
    if (!forgotReason.trim()) { setError("Please provide a reason"); return; }
    try {
      setForgotLoading(true);
      const res = await fetch(`${API_URL}/auth/forgot-password-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim(), reason: forgotReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Request failed"); return; }
      setForgotDone(true);
    } catch {
      setError("Could not connect to server. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <>
      {/* Theme toggle — fixed top-right */}
      <button className="theme-toggle" onClick={toggleTheme}>
        {darkMode ? "☀️ Light" : "🌙 Dark"}
      </button>

      {/* Full-screen centered login page */}
      <div className="login-page">
        <div className="login-card">
          {/* Logo */}
          <div className="login-logo">
            <span className="login-logo-icon">📊</span>
            <h1>Sales CRM</h1>
            <p>Your sales command centre</p>
          </div>

          {/* ── Login Form ── */}
          {mode === "login" && (
            <form onSubmit={login} className="login-form">
              {error && <div className="login-error">{error}</div>}

              <div className="login-field">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoFocus
                />
              </div>

              <div className="login-field">
                <label>Password</label>
                <div className="password-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="show-password-btn"
                    onClick={() => setShowPassword((p) => !p)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "🙈" : "👁"}
                  </button>
                </div>
              </div>

              <div className="login-forgot-link">
                <button type="button" className="link-btn" onClick={() => { setMode("forgot"); setError(""); }}>
                  Forgot password?
                </button>
              </div>

              <div className="login-actions">
                <button type="submit" className="btn-login" disabled={loading}>
                  {loading ? "Signing in…" : "Login"}
                </button>
                <button type="button" className="btn-register" onClick={onSwitchToRegister}>
                  Create Account
                </button>
              </div>
            </form>
          )}

          {/* ── Forgot Password Form ── */}
          {mode === "forgot" && !forgotDone && (
            <form onSubmit={submitForgot} className="login-form">
              <h2>Forgot Password</h2>
              <p style={{ margin: "0 0 4px", fontSize: "0.83rem", color: "#64748b" }}>
                Your request will be reviewed by an Admin or Manager before a reset link is sent.
              </p>
              {error && <div className="login-error">{error}</div>}

              <div className="login-field">
                <label>Your Email</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoFocus
                />
              </div>

              <div className="login-field">
                <label>Reason for request</label>
                <textarea
                  value={forgotReason}
                  onChange={(e) => setForgotReason(e.target.value)}
                  placeholder="e.g. I forgot my password / device was lost…"
                  rows={3}
                  required
                />
              </div>

              <div className="login-actions">
                <button type="submit" className="btn-login" disabled={forgotLoading}>
                  {forgotLoading ? "Submitting…" : "Submit Request"}
                </button>
                <button type="button" className="btn-register" onClick={() => { setMode("login"); setError(""); }}>
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {/* ── Success ── */}
          {mode === "forgot" && forgotDone && (
            <div className="login-form" style={{ textAlign: "center", gap: 16 }}>
              <div style={{ fontSize: "3rem" }}>✅</div>
              <h2>Request Submitted!</h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
                Your password reset request is pending admin/manager approval.<br />
                You will receive an email once approved.
              </p>
              <button
                className="btn-login"
                onClick={() => { setMode("login"); setForgotDone(false); setForgotEmail(""); setForgotReason(""); }}
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
