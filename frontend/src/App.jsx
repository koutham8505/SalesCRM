// D:\SalesCRM\frontend\src\App.jsx
import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";

import NavBar from "./components/NavBar";
import DashboardCards from "./components/DashboardCards";
import ActionBar from "./components/ActionBar";
import LeadForm from "./components/LeadForm";
import LeadsTable from "./components/LeadsTable";
import LeadDetail from "./components/LeadDetail";
import TodayView from "./components/TodayView";
import ReportsPage from "./components/ReportsPage";
import TasksPanel from "./components/TasksPanel";
import TargetsPanel from "./components/TargetsPanel";
import ProfilePage from "./components/ProfilePage";
import AdminPanel from "./components/AdminPanel";
import Toast from "./components/Toast";
import "./App.css";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
const API_URL = `${BASE}/api/leads`;

const hasFeature = (profile, feature) => {
  if (!profile) return false;
  const rp = { Admin: ["import", "bulk_update", "delete", "team_filters", "sensitive_fields"], Manager: ["import", "bulk_update", "delete", "team_filters", "sensitive_fields"], TeamLead: ["import", "bulk_update"], Executive: [] };
  if ((rp[profile.role] || []).includes(feature)) return true;
  return profile.feature_flags?.[feature] === true;
};

export default function App({ session, onLogout }) {
  const [view, setView] = useState("leads");
  const [leads, setLeads] = useState([]);
  const [profile, setProfile] = useState(null);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });

  const [showForm, setShowForm] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [viewLead, setViewLead] = useState(null);
  const [search, setSearch] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [namePrompt, setNamePrompt] = useState("");

  const role = profile?.role || "Executive";
  const auth = { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };
  const notify = (msg, type = "success") => setToast({ message: msg, type });

  const isPlaceholderName = profile && (!profile.full_name || profile.full_name === "New User" || profile.full_name === profile.email);

  const handleSetName = async () => {
    if (!namePrompt.trim()) return notify("Please enter your name", "error");
    try {
      const r = await fetch(`${BASE}/api/profile/me`, { method: "PUT", headers: auth, body: JSON.stringify({ full_name: namePrompt.trim() }) });
      if (!r.ok) throw new Error((await r.json()).message);
      notify("Name updated!");
      fetchLeads(); // re-fetch to get updated profile
    } catch (err) { notify(err.message, "error"); }
  };

  // -- Data Fetching --
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL, { headers: auth });
      if (res.status === 401) { notify("Session expired", "error"); onLogout?.(); return; }
      if (res.status === 403) {
        const d = await res.json();
        notify(d.message || "Account disabled", "error");
        if (d.message?.includes("disabled")) onLogout?.();
        return;
      }
      const data = await res.json();
      if (data.leads) { setLeads(data.leads); if (data.profile) setProfile(data.profile); }
      else if (Array.isArray(data)) setLeads(data);
      else setLeads([]);
    } catch (err) { notify("Failed to load leads", "error"); }
    finally { setLoading(false); }
  }, [session]);

  const fetchOwners = useCallback(async () => {
    if (!hasFeature(profile, "team_filters")) return;
    try { const r = await fetch(`${API_URL}/owners`, { headers: auth }); if (r.ok) setOwners(await r.json()); } catch { }
  }, [profile, session]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { fetchOwners(); }, [fetchOwners]);

  const teams = [...new Set(leads.map((l) => l.team).filter(Boolean))].sort();

  // -- CRUD Handlers --
  const handleSave = async (form, isEdit) => {
    try {
      setSaving(true);
      const url = isEdit ? `${API_URL}/${form.id}` : API_URL;
      const clean = { ...form }; if (!isEdit) delete clean.id;
      const res = await fetch(url, { method: isEdit ? "PUT" : "POST", headers: auth, body: JSON.stringify(clean) });
      const data = await res.json();
      if (!res.ok) { notify(data.message || "Save failed", "error"); return; }
      // Duplicate warning
      if (data.duplicates?.length) {
        notify(`⚠️ Possible duplicates found: ${data.duplicates.map(d => d.lead_name || d.email).join(", ")}`, "warning");
      } else {
        notify(isEdit ? "Lead updated" : "Lead saved");
      }
      setShowForm(false); setEditLead(null); fetchLeads();
    } catch (err) { notify(err.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (lead) => {
    if (!confirm(`Delete "${lead.lead_name}"?`)) return;
    try {
      const r = await fetch(`${API_URL}/${lead.id}`, { method: "DELETE", headers: auth });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "Delete failed");
      notify("Lead deleted"); fetchLeads();
    } catch (err) { notify(err.message, "error"); }
  };

  const handleImport = async (rows) => {
    try {
      setSaving(true);
      const r = await fetch(`${API_URL}/import`, { method: "POST", headers: auth, body: JSON.stringify(rows) });
      if (!r.ok) throw new Error((await r.json()).message); const d = await r.json();
      notify(d.message || `Imported ${rows.length} leads`); fetchLeads();
    } catch (err) { notify(err.message, "error"); }
    finally { setSaving(false); }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      setSaving(true);
      const r = await fetch(`${API_URL}/bulk-update`, { method: "POST", headers: auth, body: JSON.stringify({ ids: selectedIds, updates }) });
      if (!r.ok) throw new Error((await r.json()).message); const d = await r.json();
      notify(`Updated ${d.updatedCount} leads`); setSelectedIds([]); fetchLeads();
    } catch (err) { notify(err.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDownloadTemplate = () => {
    const cols = [
      "lead_date", "lead_name", "job_title", "institution_name",
      "phone", "alt_phone", "whatsapp", "email", "website",
      "lead_source", "status", "call_status",
      "mail_sent", "pitch_deck_sent", "proposal_sent", "proposal_link",
      "next_follow_up", "meeting_date", "remark",
      "board", "grades_offered", "student_strength", "fees",
      "medium_of_instruction", "school_type", "tier", "geo_classification",
      "lead_owner", "team", "deal_value",
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([cols]), "Template");
    XLSX.writeFile(wb, "leads_import_template.xlsx");
    notify("Template downloaded (30 fields)");
  };

  const toggleSelect = (id) => setSelectedIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const toggleSelectAll = (ids) => { const all = ids.every((id) => selectedIds.includes(id)); setSelectedIds((p) => all ? p.filter((x) => !ids.includes(x)) : [...new Set([...p, ...ids])]); };

  // -- Render Views --
  const renderContent = () => {
    switch (view) {
      case "profile":
        return <ProfilePage profile={profile} session={session} onProfileUpdated={fetchLeads} showToast={notify} />;
      case "admin":
        return role === "Admin" ? <AdminPanel session={session} showToast={notify} /> : null;
      case "today":
        return <TodayView leads={leads} role={role} onViewLead={(l) => setViewLead(l)} />;
      case "tasks":
        return <TasksPanel session={session} showToast={notify} />;
      case "targets":
        return <TargetsPanel session={session} profile={profile} showToast={notify} />;
      case "reports":
        return <ReportsPage leads={leads} role={role} profile={profile} />;
      case "dashboard":
        return <DashboardCards leads={leads} role={role} session={session} onLogout={onLogout} />;
      case "leads":
      default:
        return (
          <>
            <ActionBar
              role={role} featureFlags={profile?.feature_flags}
              search={search} onSearchChange={setSearch}
              onNewLead={() => { setEditLead(null); setShowForm(true); }}
              onImport={handleImport} onDownloadTemplate={handleDownloadTemplate}
              filterTeam={filterTeam} onFilterTeamChange={setFilterTeam}
              filterOwner={filterOwner} onFilterOwnerChange={setFilterOwner}
              teams={teams} owners={owners} selectedIds={selectedIds}
              leads={leads}
            />
            {showForm && (
              <LeadForm
                lead={editLead} editing={!!editLead} onSave={handleSave}
                onClose={() => { setShowForm(false); setEditLead(null); }}
                saving={saving} role={role} owners={owners} profile={profile}
              />
            )}
            <LeadsTable
              leads={leads} role={role} featureFlags={profile?.feature_flags}
              search={search} filterTeam={filterTeam} filterOwner={filterOwner}
              selectedIds={selectedIds} onToggleSelect={toggleSelect} onSelectAll={toggleSelectAll}
              onEdit={(l) => { setEditLead(l); setShowForm(true); }}
              onDelete={handleDelete} onView={(l) => setViewLead(l)}
            />
          </>
        );
    }
  };

  if (loading && leads.length === 0) {
    return (
      <div className="app-shell">
        <NavBar profile={profile} currentView={view} onNavigate={setView} onLogout={onLogout} />
        <div className="app-container"><div className="loading-state">Loading...</div></div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <NavBar profile={profile} currentView={view} onNavigate={setView} onLogout={onLogout} />
      {isPlaceholderName && (
        <div className="name-prompt-banner">
          <span>👋 Welcome! Please set your full name:</span>
          <input type="text" placeholder="Enter your full name" value={namePrompt} onChange={(e) => setNamePrompt(e.target.value)} className="name-prompt-input" />
          <button onClick={handleSetName} className="btn-primary">Save Name</button>
        </div>
      )}
      <div className="app-container">{renderContent()}</div>
      {viewLead && <LeadDetail lead={viewLead} session={session} profile={profile} onClose={() => setViewLead(null)} showToast={notify} />}
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />
    </div>
  );
}
