// D:\SalesCRM\frontend\src\components\NavBar.jsx
import { useState, useRef, useEffect } from "react";
import NotificationBell from "./NotificationBell";

export default function NavBar({ profile, currentView, onNavigate, onLogout, session, onNotifLeadClick }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const [darkMode, setDarkMode] = useState(() => localStorage.getItem("crm_theme") === "dark");

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

    const initials = (profile?.full_name || "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    const displayName = profile?.full_name || profile?.email || "User";

    return (
        <nav className="navbar">
            <div className="nav-left">
                <span className="nav-logo" onClick={() => onNavigate("dashboard")}>Sales CRM</span>
                <div className="nav-tabs">
                    {["dashboard", "leads", "today", "calendar", "tasks", "targets", "reports", "templates", "approvals"].map((v) => (
                        <button key={v} className={`nav-tab ${currentView === v ? "active" : ""}`} onClick={() => onNavigate(v)}>
                            {v === "templates" ? "📋 Templates" : v === "approvals" ? "✅ Approvals" : v === "calendar" ? "📅 Calendar" : v.charAt(0).toUpperCase() + v.slice(1)}
                        </button>
                    ))}
                </div>
            </div>
            <div className="nav-right" ref={menuRef}>
                <button
                    className="dark-mode-toggle"
                    onClick={toggleTheme}
                    title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    aria-label="Toggle dark mode"
                >
                    {darkMode ? "☀️" : "🌙"}
                </button>
                <NotificationBell session={session} onNotifClick={onNotifLeadClick} />
                <div className="nav-avatar" onClick={() => setMenuOpen(!menuOpen)} title={displayName}>{initials}</div>
                {menuOpen && (
                    <div className="nav-dropdown">
                        <div className="nav-dropdown-header">
                            <strong>{displayName}</strong>
                            <span className="nav-dropdown-meta">{profile?.email}</span>
                            <span className={`role-badge role-${profile?.role?.toLowerCase()}`}>{profile?.role}</span>
                        </div>
                        <div className="nav-dropdown-divider" />
                        <button className="nav-dropdown-item" onClick={() => { onNavigate("profile"); setMenuOpen(false); }}>👤 My Profile</button>
                        {["Admin", "Manager"].includes(profile?.role) && (<>
                            <button className="nav-dropdown-item" onClick={() => { onNavigate("announcements_mgmt"); setMenuOpen(false); }}>📢 Announcements</button>
                            <button className="nav-dropdown-item" onClick={() => { onNavigate("reminders"); setMenuOpen(false); }}>🔁 Reminders Setup</button>
                        </>)}
                        {profile?.role === "Admin" && (
                            <button className="nav-dropdown-item" onClick={() => { onNavigate("admin"); setMenuOpen(false); }}>⚙️ Admin Panel</button>
                        )}
                        <button className="nav-dropdown-item" onClick={() => { toggleTheme(); setMenuOpen(false); }}>
                            {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
                        </button>
                        <div className="nav-dropdown-divider" />
                        <button className="nav-dropdown-item danger" onClick={onLogout}>Logout</button>
                    </div>
                )}
            </div>
        </nav>
    );
}
