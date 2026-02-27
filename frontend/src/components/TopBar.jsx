// D:\SalesCRM\frontend\src\components\TopBar.jsx

export default function TopBar({ profile, session, onLogout }) {
    return (
        <header className="top-header">
            <div className="top-header-left">
                <h1 className="app-title">Sales CRM Dashboard</h1>
                <div className="user-info">
                    {profile ? (
                        <span>
                            <strong>{profile.full_name}</strong>
                            <span className={`role-badge role-${profile.role?.toLowerCase()}`}>
                                {profile.role}
                            </span>
                            {profile.team && (
                                <span className="team-badge">{profile.team}</span>
                            )}
                        </span>
                    ) : (
                        <span>{session?.user?.email}</span>
                    )}
                </div>
            </div>
            <button onClick={onLogout} className="btn-secondary">
                Logout
            </button>
        </header>
    );
}
