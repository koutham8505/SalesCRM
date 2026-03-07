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
import ConversionFunnel from "./components/ConversionFunnel";
import SourcePerformance from "./components/SourcePerformance";
import TeamProductivity from "./components/TeamProductivity";
import TemplatesPage from "./components/TemplatesPage";
import ApprovalsPanel from "./components/ApprovalsPanel";
import CalendarView from "./components/CalendarView";
import WinLossAnalysis from "./components/WinLossAnalysis";
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
  const [tasks, setTasks] = useState([]);
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
  const [drillFilter, setDrillFilter] = useState(null);
  // drillFilter types:
  // leads: demos | proposals | not_contacted_24h | no_next_action
  //        meetings_today | followups_today | overdue | pitch_decks
  //        all_meetings | all_followups | all_leads
  // activities: calls_today | calls_interested | calls_not_interested
  //             calls_call_back | calls_wrong_number | calls_no_response

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

  // Fetch tasks for My Day view
  const fetchTasks = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/tasks`, { headers: auth });
      if (r.ok) setTasks(await r.json());
    } catch { }
  }, [session]);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const teams = [...new Set(leads.map((l) => l.team).filter(Boolean))].sort();

  // Drill-down from dashboard KPI cards → Leads tab with preset filter
  const handleDrillDown = (type) => {
    setDrillFilter(type);
    setView("leads"); // always navigate to leads view; filter logic decides what to show
  };

  // Clear drill filter when user changes view manually
  const handleNavigate = (v) => {
    if (v !== "leads") setDrillFilter(null);
    setView(v);
  };

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
      case "templates":
        return <TemplatesPage session={session} role={role} />;
      case "approvals":
        return <ApprovalsPanel session={session} role={role} showToast={notify} />;
      case "today":
        return <TodayView leads={leads} tasks={tasks} role={role} token={session?.access_token} onViewLead={(l) => setViewLead(l)} onTaskUpdate={fetchTasks} />;
      case "tasks":
        return <TasksPanel session={session} showToast={notify} />;
      case "targets":
        return <TargetsPanel session={session} profile={profile} showToast={notify} />;
      case "calendar":
        return <CalendarView leads={leads} onViewLead={(l) => setViewLead(l)} />;
      case "win_loss":
        return <WinLossAnalysis leads={leads} />;
      case "reports":
        return (
          <>
            <WinLossAnalysis leads={leads} />
            <ReportsPage leads={leads} role={role} profile={profile} />
          </>
        );
      case "dashboard":
        return (
          <>
            <DashboardCards leads={leads} role={role} session={session} onLogout={onLogout} onDrillDown={handleDrillDown} />
            <div className="phase2-analytics">
              <ConversionFunnel token={session?.access_token} />
              <SourcePerformance token={session?.access_token} />
              <TeamProductivity token={session?.access_token} role={role} />
            </div>
          </>
        );
      case "leads":
      default:
        return (
          <>
            {drillFilter && (
              <div className="drill-banner">
                <span>{
                  drillFilter === "demos" ? "🎬 Showing: Leads with Demo Fixed (Demo/Meeting stage)" :
                    drillFilter === "proposals" ? "📄 Showing: Leads where Proposal was Sent" :
                      drillFilter === "not_contacted_24h" ? "🔴 Showing: New leads not contacted within 24 hours" :
                        drillFilter === "no_next_action" ? "🎯 Showing: Active leads with no next action set" :
                          drillFilter === "meetings_today" ? "📅 Showing: Leads with Meeting/Demo scheduled today" :
                            drillFilter === "followups_today" ? "🔔 Showing: Leads with Follow-up due today" :
                              drillFilter === "overdue" ? "⚠️ Showing: Overdue leads (past follow-up date)" :
                                drillFilter === "pitch_decks" ? "📁 Showing: Leads where Pitch Deck/Brochure was Sent" :
                                  drillFilter === "all_meetings" ? "📋 Showing: All leads with meetings scheduled" :
                                    drillFilter === "all_followups" ? "🔔 Showing: All leads with follow-ups" :
                                      drillFilter === "all_leads" ? "👥 Showing: All leads" :
                                        drillFilter === "calls_today" ? "📞 Showing: Leads with calls logged today" :
                                          drillFilter === "calls_interested" ? "✅ Showing: Leads marked Interested today" :
                                            drillFilter === "calls_not_interested" ? "❌ Showing: Leads marked Not Interested today" :
                                              drillFilter === "calls_call_back" ? "🔁 Showing: Leads marked Call Back today" :
                                                drillFilter === "calls_wrong_number" ? "📵 Showing: Leads marked Wrong Number today" :
                                                  drillFilter === "calls_no_response" ? "📭 Showing: Leads with No Response today" :
                                                    `Showing filtered leads`
                }</span>
                <button className="drill-clear" onClick={() => setDrillFilter(null)}>✕ Clear filter</button>
              </div>
            )}
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
              drillFilter={drillFilter}
            />
          </>
        );
    }
  };

  if (loading && leads.length === 0) {
    return (
      <div className="app-shell">
        <NavBar profile={profile} currentView={view} onNavigate={setView} onLogout={onLogout} session={session} />
        <div className="app-container"><div className="loading-state">Loading...</div></div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <NavBar profile={profile} currentView={view} onNavigate={handleNavigate} onLogout={onLogout}
        session={session}
        onNotifLeadClick={(leadId) => {
          const found = leads.find((l) => l.id === leadId);
          if (found) setViewLead(found);
        }}
      />
      {isPlaceholderName && (
        <div className="name-prompt-banner">
          <span>👋 Welcome! Please set your full name:</span>
          <input type="text" placeholder="Enter your full name" value={namePrompt} onChange={(e) => setNamePrompt(e.target.value)} className="name-prompt-input" />
          <button onClick={handleSetName} className="btn-primary">Save Name</button>
        </div>
      )}
      <div className="app-container">{renderContent()}</div>
      {viewLead && <LeadDetail lead={viewLead} session={session} profile={profile} owners={owners} onClose={() => setViewLead(null)} showToast={notify} />}
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />
    </div>
  );
}
