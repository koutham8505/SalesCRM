// D:\SalesCRM\frontend\src\components\ActionBar.jsx
import { useState } from "react";
import * as XLSX from "xlsx";

const hasFeature = (role, featureFlags, feature) => {
    const rolePerms = {
        Admin: ["import", "bulk_update", "delete", "team_filters", "export"],
        Manager: ["import", "bulk_update", "delete", "team_filters", "export"],
        TeamLead: ["import", "bulk_update", "export"],
        Executive: ["export"],
    };
    if ((rolePerms[role] || []).includes(feature)) return true;
    return featureFlags?.[feature] === true;
};

// All 30 lead fields in logical order
const ALL_LEAD_FIELDS = [
    "lead_date", "lead_name", "job_title", "institution_name",
    "phone", "alt_phone", "whatsapp", "email", "website",
    "lead_source", "status", "call_status",
    "mail_sent", "pitch_deck_sent", "proposal_sent", "proposal_link",
    "next_follow_up", "meeting_date", "remark",
    "board", "grades_offered", "student_strength", "fees",
    "medium_of_instruction", "school_type", "tier", "geo_classification",
    "lead_owner", "team", "deal_value",
];

export default function ActionBar({
    role, featureFlags, search, onSearchChange, onNewLead, onImport,
    onDownloadTemplate, filterTeam, onFilterTeamChange, filterOwner, onFilterOwnerChange,
    teams, owners, selectedIds, leads, onBroadcast,
}) {
    const [showImport, setShowImport] = useState(false);

    const canImport = hasFeature(role, featureFlags, "import");
    const canFilter = hasFeature(role, featureFlags, "team_filters");

    const handleImportFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const wb = XLSX.read(evt.target.result, { type: "binary" });
            const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            onImport(json);
            setShowImport(false);
        };
        reader.readAsBinaryString(file);
    };

    // Download blank import template with ALL fields
    const handleDownloadTemplate = () => {
        onDownloadTemplate?.();
    };

    // Export all currently visible leads to Excel
    const handleExportLeads = () => {
        if (!leads || leads.length === 0) {
            alert("No leads to export.");
            return;
        }
        const rows = leads.map((l) => {
            const row = {};
            ALL_LEAD_FIELDS.forEach((f) => {
                let val = l[f];
                if (f === "proposal_sent") val = val ? "Yes" : "No";
                if (val === null || val === undefined) val = "";
                row[f] = val;
            });
            return row;
        });
        const ws = XLSX.utils.json_to_sheet(rows, { header: ALL_LEAD_FIELDS });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Leads");
        const dateStr = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `leads_export_${dateStr}.xlsx`);
    };

    return (
        <div className="action-bar-wrapper">
            <div className="action-bar">
                <button onClick={onNewLead} className="btn-primary">+ New Lead</button>

                {canImport && (
                    <button onClick={() => setShowImport(!showImport)} className="btn-secondary">
                        {showImport ? "Close Import" : "⬆ Import"}
                    </button>
                )}

                {/* Export Leads — replaces Bulk Update */}
                <button onClick={handleExportLeads} className="btn-secondary" title="Export all leads to Excel">
                    ⬇ Export Leads
                </button>

                <button onClick={handleDownloadTemplate} className="btn-secondary" title="Download blank import template">
                    📋 Template
                </button>

                <button onClick={onBroadcast} className="btn-whatsapp-broadcast" title="Send WhatsApp message to multiple leads">
                    📣 WA Broadcast
                </button>

                <input
                    type="text"
                    placeholder="Search by name, institution, phone, email..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="search-input"
                />
            </div>

            {canFilter && (
                <div className="filter-bar">
                    <select value={filterTeam} onChange={(e) => onFilterTeamChange(e.target.value)} className="filter-select">
                        <option value="">All Teams</option>
                        {teams.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={filterOwner} onChange={(e) => onFilterOwnerChange(e.target.value)} className="filter-select">
                        <option value="">All Owners</option>
                        {owners.map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
                    </select>
                </div>
            )}

            {showImport && canImport && (
                <div className="import-box">
                    <p>Select an Excel file (.xlsx) matching the template columns.</p>
                    <input type="file" accept=".xlsx,.xls" onChange={handleImportFile} />
                </div>
            )}
        </div>
    );
}
