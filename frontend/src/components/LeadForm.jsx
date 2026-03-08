// D:\SalesCRM\frontend\src\components\LeadForm.jsx
import { useState } from "react";

const STAGES = ["New", "Contacted", "Demo/Meeting", "Proposal", "Negotiation", "Won", "Lost"];
const STAGE_COLORS = {
    "New": "#64748b", "Contacted": "#3b82f6", "Demo/Meeting": "#8b5cf6",
    "Proposal": "#f59e0b", "Negotiation": "#f97316", "Won": "#22c55e", "Lost": "#ef4444"
};
const LOST_REASONS = ["Price Too High", "No Budget", "Not Interested", "Using Competitor", "Bad Timing", "Other"];

const DEPARTMENTS = [
    { value: "School", label: "🏫 School", color: "#3b82f6" },
    { value: "College", label: "🎓 College", color: "#8b5cf6" },
    { value: "Corporate", label: "🏢 Corporate", color: "#f59e0b" },
];

const EMPTY_LEAD = {
    id: null, lead_date: "", lead_name: "", job_title: "", institution_name: "",
    phone: "", alt_phone: "", whatsapp: "", email: "", website: "",
    mail_sent: "", pitch_deck_sent: "",
    proposal_sent: false, proposal_link: "",
    call_status: "", remark: "", next_follow_up: "", meeting_date: "", lead_source: "",
    lead_owner: "", status: "", owner_id: "", owner_name: "", owner_email: "",
    stage: "New", lost_reason: "", next_action: "", next_action_date: "",
    tags: [],
    department: "School",
    // School Details
    board: "", grades_offered: "", student_strength: "", fees: "",
    medium_of_instruction: "", school_type: "", tier: "", geo_classification: "",
};

export default function LeadForm({ lead, editing, onSave, onClose, saving, role, owners, profile }) {
    const [form, setForm] = useState(() => {
        if (!lead) return { ...EMPTY_LEAD };
        return {
            ...EMPTY_LEAD, ...lead,
            lead_date: lead.lead_date ? lead.lead_date.slice(0, 10) : "",
            next_follow_up: lead.next_follow_up ? lead.next_follow_up.slice(0, 10) : "",
            next_action_date: lead.next_action_date ? lead.next_action_date.slice(0, 10) : "",
            meeting_date: lead.meeting_date ? lead.meeting_date.slice(0, 16) : "",
            proposal_sent: lead.proposal_sent || false,
            stage: lead.stage || "New",
        };
    });
    const [errors, setErrors] = useState({});

    const canChangeOwner = role === "Manager" || role === "Admin";
    const isPrivileged = role === "Admin" || role === "Manager";

    // Lock key fields if lead is Won/Lost and user is not Manager/Admin
    const isLocked = editing && (form.stage === "Won" || form.stage === "Lost") && !isPrivileged;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const handleStageClick = (stage) => {
        if (isLocked) return;
        setForm((prev) => ({
            ...prev,
            stage,
            lost_reason: stage !== "Lost" ? "" : prev.lost_reason,
        }));
    };

    const handleOwnerChange = (e) => {
        const ownerId = e.target.value;
        if (!ownerId) {
            setForm((prev) => ({ ...prev, owner_id: "", owner_name: "", owner_email: "" }));
            return;
        }
        const owner = owners?.find((o) => o.id === ownerId);
        setForm((prev) => ({
            ...prev,
            owner_id: ownerId,
            owner_name: owner?.full_name || "",
            owner_email: "",
            lead_owner: owner?.full_name || "",
        }));
    };

    const validate = () => {
        const errs = {};
        if (!form.lead_name?.trim()) errs.lead_name = "Lead name is required";
        if (!form.institution_name?.trim()) errs.institution_name = "Institution is required";
        if (!form.phone?.trim() && !form.email?.trim()) errs.phone = "Phone or Email is required";
        if (!form.status) errs.status = "Status is required";
        if (form.stage === "Lost" && !form.lost_reason) errs.lost_reason = "Please select a reason for loss";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;
        const payload = { ...form };
        if (!payload.lead_date) delete payload.lead_date;
        if (!payload.next_follow_up) delete payload.next_follow_up;
        if (!payload.meeting_date) delete payload.meeting_date;
        if (!payload.next_action_date) delete payload.next_action_date;
        payload.proposal_sent = payload.proposal_sent === true || payload.proposal_sent === "Yes";
        if (payload.student_strength === "" || payload.student_strength === null) {
            payload.student_strength = null;
        } else {
            payload.student_strength = parseInt(payload.student_strength, 10) || null;
        }
        onSave(payload, editing);
    };

    const renderError = (field) => errors[field] ? <span className="field-error">{errors[field]}</span> : null;

    return (
        <div className="form-card">
            <h2>{editing ? "Edit Lead" : "Add New Lead"}</h2>

            {/* ─── Department Selector ─── */}
            <div className="dept-selector">
                {DEPARTMENTS.map((d) => (
                    <button
                        key={d.value}
                        type="button"
                        className={`dept-pill ${form.department === d.value ? "dept-pill-active" : ""}`}
                        style={form.department === d.value ? { background: d.color, borderColor: d.color, color: "#fff" } : { borderColor: d.color + "60", color: d.color }}
                        onClick={() => setForm(prev => ({ ...prev, department: d.value }))}
                    >
                        {d.label}
                    </button>
                ))}
            </div>

            {/* ─── Lock Banner ─── */}
            {isLocked && (
                <div className="lock-banner">
                    🔒 This lead is <strong>{form.stage}</strong>. Key fields are locked. Contact a Manager to make changes.
                </div>
            )}

            {/* ─── Stage Pipeline Stepper ─── */}
            <fieldset className="form-section">
                <legend>Pipeline Stage</legend>
                <div className="stage-stepper">
                    {STAGES.map((s, i) => {
                        const currentIdx = STAGES.indexOf(form.stage);
                        const isPast = i < currentIdx;
                        const isCurrent = s === form.stage;
                        return (
                            <div
                                key={s}
                                className={`stage-step ${isCurrent ? "stage-active" : ""} ${isPast ? "stage-past" : ""} ${isLocked ? "stage-locked" : ""}`}
                                onClick={() => handleStageClick(s)}
                                title={s}
                                style={{ "--stage-color": STAGE_COLORS[s] }}
                            >
                                <div className="stage-dot" />
                                <span className="stage-label">{s}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Lost Reason — only show when stage = Lost */}
                {form.stage === "Lost" && (
                    <div className="form-grid" style={{ marginTop: 12 }}>
                        <label>
                            Loss Reason *
                            <select name="lost_reason" value={form.lost_reason} onChange={handleChange}
                                className={errors.lost_reason ? "input-error" : ""} disabled={isLocked}>
                                <option value="">-- Select reason --</option>
                                {LOST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                            {renderError("lost_reason")}
                        </label>
                    </div>
                )}
            </fieldset>

            {/* ─── Next Action ─── */}
            <fieldset className="form-section">
                <legend>Next Action</legend>
                <div className="form-grid">
                    <label>
                        Next Action
                        <select name="next_action" value={form.next_action} onChange={handleChange} disabled={isLocked}>
                            <option value="">-- None --</option>
                            <option value="Call">📞 Call</option>
                            <option value="Send Proposal">📄 Send Proposal</option>
                            <option value="Visit Campus">🏫 Visit Campus</option>
                            <option value="Send Email">✉️ Send Email</option>
                            <option value="Demo">🖥️ Demo</option>
                            <option value="Follow Up">🔔 Follow Up</option>
                            <option value="Negotiate">🤝 Negotiate</option>
                        </select>
                    </label>
                    <label>
                        Due Date
                        <input type="date" name="next_action_date" value={form.next_action_date}
                            onChange={handleChange} disabled={isLocked} />
                    </label>
                </div>
            </fieldset>

            {/* ─── Contact Info ─── */}
            <fieldset className="form-section">
                <legend>Contact Info</legend>
                <div className="form-grid">
                    <label>Lead Name * <input type="text" name="lead_name" value={form.lead_name} onChange={handleChange} placeholder="Full name" className={errors.lead_name ? "input-error" : ""} disabled={isLocked} /> {renderError("lead_name")}</label>
                    <label>Job Title <input type="text" name="job_title" value={form.job_title} onChange={handleChange} placeholder="e.g. CEO" /></label>
                    <label>Institution * <input type="text" name="institution_name" value={form.institution_name} onChange={handleChange} placeholder="Company / Organisation" className={errors.institution_name ? "input-error" : ""} disabled={isLocked} /> {renderError("institution_name")}</label>
                    <label>Phone {!form.email && "*"} <input type="text" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 ..." className={errors.phone ? "input-error" : ""} disabled={isLocked} /> {renderError("phone")}</label>
                    <label>Alt Phone <input type="text" name="alt_phone" value={form.alt_phone} onChange={handleChange} placeholder="Alternative number" /></label>
                    <label>WhatsApp <input type="text" name="whatsapp" value={form.whatsapp} onChange={handleChange} placeholder="+91 ..." /></label>
                    <label>Email {!form.phone && "*"} <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="email@example.com" disabled={isLocked} /></label>
                    <label>Website <input type="text" name="website" value={form.website} onChange={handleChange} placeholder="https://..." /></label>
                </div>
            </fieldset>

            {/* ─── Lead Details ─── */}
            <fieldset className="form-section">
                <legend>Lead Details</legend>
                <div className="form-grid">
                    <label>Lead Date <input type="date" name="lead_date" value={form.lead_date} onChange={handleChange} /></label>
                    <label>Lead Source <select name="lead_source" value={form.lead_source} onChange={handleChange}>
                        <option value="">-- Select --</option>
                        <option value="Cold Call">Cold Call</option><option value="Referral">Referral</option>
                        <option value="LinkedIn">LinkedIn</option><option value="Website">Website</option>
                        <option value="Email Campaign">Email Campaign</option><option value="Walk-in">Walk-in</option>
                        <option value="Event">Event</option><option value="Digital Ad">Digital Ad</option>
                        <option value="Other">Other</option>
                    </select></label>

                    {canChangeOwner ? (
                        <label>Lead Owner
                            <select value={form.owner_id || ""} onChange={handleOwnerChange}>
                                <option value="">-- Auto (me) --</option>
                                {(owners || []).map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
                            </select>
                        </label>
                    ) : (
                        <label>Lead Owner
                            <input type="text" value={profile?.full_name || ""} readOnly style={{ background: "#f8fafc" }} />
                        </label>
                    )}

                    <label>Status * <select name="status" value={form.status} onChange={handleChange} className={errors.status ? "input-error" : ""}>
                        <option value="">-- Select --</option>
                        <option value="New">New</option><option value="In Progress">In Progress</option>
                        <option value="Won">Won</option><option value="Loss">Loss</option><option value="On Hold">On Hold</option>
                    </select> {renderError("status")}</label>
                    <label>Mail Sent <select name="mail_sent" value={form.mail_sent} onChange={handleChange}>
                        <option value="">-- Select --</option><option value="Yes">Yes</option><option value="No">No</option>
                    </select></label>
                    <label>Pitch Deck Sent <select name="pitch_deck_sent" value={form.pitch_deck_sent} onChange={handleChange}>
                        <option value="">-- Select --</option><option value="Yes">Yes</option><option value="No">No</option>
                    </select></label>
                    <label>Proposal Sent <select name="proposal_sent" value={form.proposal_sent === true || form.proposal_sent === "Yes" ? "Yes" : form.proposal_sent === false ? "No" : ""} onChange={(e) => setForm((prev) => ({ ...prev, proposal_sent: e.target.value === "Yes" }))}>
                        <option value="">-- Select --</option><option value="Yes">Yes</option><option value="No">No</option>
                    </select></label>
                    <label>Proposal Link <input type="url" name="proposal_link" value={form.proposal_link} onChange={handleChange} placeholder="https://drive.google.com/..." /></label>
                    <label>Deal Value (₹) <input type="number" name="deal_value" value={form.deal_value || ""} onChange={handleChange} placeholder="e.g. 50000" disabled={isLocked} /></label>
                </div>
            </fieldset>

            {/* ─── School Details ─── */}
            <fieldset className="form-section">
                <legend>School Details</legend>
                <div className="form-grid">
                    <label>Board <select name="board" value={form.board} onChange={handleChange}>
                        <option value="">-- Select --</option>
                        <option value="CBSE">CBSE</option><option value="ICSE">ICSE</option>
                        <option value="State">State Board</option><option value="IB">IB</option>
                        <option value="IGCSE">IGCSE</option><option value="Other">Other</option>
                    </select></label>
                    <label>Grades Offered <input type="text" name="grades_offered" value={form.grades_offered} onChange={handleChange} placeholder="e.g. Pre KG to XII" /></label>
                    <label>Student Strength <input type="number" name="student_strength" value={form.student_strength} onChange={handleChange} placeholder="Approx. number" min="0" /></label>
                    <label>Annual Fees <input type="text" name="fees" value={form.fees} onChange={handleChange} placeholder="e.g. ₹50,000 – ₹1,00,000" /></label>
                    <label>Medium of Instruction <select name="medium_of_instruction" value={form.medium_of_instruction} onChange={handleChange}>
                        <option value="">-- Select --</option>
                        <option value="English">English</option><option value="Hindi">Hindi</option>
                        <option value="Regional">Regional Language</option><option value="Bilingual">Bilingual</option>
                    </select></label>
                    <label>School Type <select name="school_type" value={form.school_type} onChange={handleChange}>
                        <option value="">-- Select --</option>
                        <option value="Individual">Individual</option><option value="Chain">Chain</option>
                        <option value="Group">Group</option><option value="Government">Government</option>
                        <option value="Trust">Trust</option><option value="Residential">Residential</option>
                    </select></label>
                    <label>Tier <select name="tier" value={form.tier} onChange={handleChange}>
                        <option value="">-- Select --</option>
                        <option value="Tier 1">Tier 1</option><option value="Tier 2">Tier 2</option><option value="Tier 3">Tier 3</option>
                    </select></label>
                    <label>Geo Classification <select name="geo_classification" value={form.geo_classification} onChange={handleChange}>
                        <option value="">-- Select --</option>
                        <option value="Metro">Metro</option><option value="Urban">Urban</option>
                        <option value="Semi Urban">Semi Urban</option><option value="Rural">Rural</option>
                    </select></label>
                </div>
            </fieldset>

            {/* ─── Follow-ups & Meetings ─── */}
            <fieldset className="form-section">
                <legend>Follow-ups &amp; Meetings</legend>
                <div className="form-grid">
                    <label>Call Status <select name="call_status" value={form.call_status} onChange={handleChange}>
                        <option value="">-- Select --</option>
                        <option value="Not Called">Not Called</option>
                        <option value="Interested">Interested</option>
                        <option value="Not Interested">Not Interested</option>
                        <option value="Call Back">Call Back</option>
                        <option value="Wrong Number">Wrong Number</option>
                        <option value="No Response">No Response</option>
                        <option value="Called">Called</option>
                    </select></label>
                    <label>Next Follow Up <input type="date" name="next_follow_up" value={form.next_follow_up} onChange={handleChange} /></label>
                    <label>Meeting Date &amp; Time <input type="datetime-local" name="meeting_date" value={form.meeting_date} onChange={handleChange} /></label>
                </div>
            </fieldset>

            {/* ─── Notes ─── */}
            <fieldset className="form-section">
                <legend>Notes</legend>
                <div className="form-grid">
                    <label className="full-width">Remark <textarea name="remark" value={form.remark} onChange={handleChange} rows={3} placeholder="Notes or remarks..." /></label>
                </div>
            </fieldset>

            <div className="form-actions">
                <button onClick={handleSubmit} disabled={saving} className="btn-primary">
                    {saving ? "Saving..." : editing ? "Update Lead" : "Save Lead"}
                </button>
                <button onClick={onClose} className="btn-secondary" disabled={saving}>Cancel</button>
            </div>
        </div>
    );
}

export { EMPTY_LEAD };
