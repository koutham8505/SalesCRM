// D:\SalesCRM\frontend\src\components\WhatsAppBroadcast.jsx
import { useState, useMemo } from "react";

const TODAY = new Date().toISOString().slice(0, 10);
const FINAL = ["Won", "Lost"];

const QUICK_FILTERS = [
    { id: "followup_today", label: "📅 Follow-ups Today", fn: (l) => l.next_follow_up?.slice(0, 10) === TODAY },
    { id: "overdue", label: "⚠️ Overdue", fn: (l) => l.next_follow_up && l.next_follow_up.slice(0, 10) < TODAY && !FINAL.includes(l.stage) },
    { id: "not_contacted", label: "🔴 Not Contacted", fn: (l) => (!l.stage || l.stage === "New") && !l.last_follow_up },
    { id: "demo_stage", label: "🎬 Demo Stage", fn: (l) => l.stage === "Demo/Meeting" },
    { id: "proposal_stage", label: "📄 Proposal Stage", fn: (l) => l.stage === "Proposal" },
    { id: "all_active", label: "⚡ All Active", fn: (l) => !FINAL.includes(l.stage) },
];

const DEFAULT_TEMPLATES = [
    {
        id: "followup",
        name: "📅 Follow-up Reminder",
        text: "Hello {name}! 👋\n\nI hope you're doing well. I'm following up on our earlier conversation about our EdTech solutions for *{school}*.\n\nWould you have 10 minutes this week for a quick chat?\n\nBest regards,\n{owner}",
    },
    {
        id: "demo",
        name: "🎬 Demo Invite",
        text: "Hello {name}! 👋\n\nI'd love to schedule a quick demo of our platform for *{school}*. It only takes 20 minutes and I'll show you exactly how it fits your needs.\n\nPlease let me know your availability.\n\nBest,\n{owner}",
    },
    {
        id: "proposal",
        name: "📄 Proposal Follow-up",
        text: "Hello {name}! 👋\n\nI wanted to follow up on the proposal I sent for *{school}*. Do you have any questions or would you like to discuss the details?\n\nI'm here to help!\n\n{owner}",
    },
    {
        id: "morning",
        name: "🌅 Morning Check-in",
        text: "Good morning {name}! ☀️\n\nJust checking in to see if you've had a chance to think about our solution for *{school}*.\n\nHave a great day!\n{owner}",
    },
];

function personalize(template, lead, ownerName) {
    return template
        .replace(/{name}/g, lead.lead_name || "there")
        .replace(/{school}/g, lead.institution_name || "your school")
        .replace(/{owner}/g, ownerName || "the team")
        .replace(/{stage}/g, lead.stage || "")
        .replace(/{phone}/g, lead.phone || "");
}

function getPhone(lead) {
    return (lead.whatsapp || lead.phone || "").replace(/\D/g, "");
}

export default function WhatsAppBroadcast({ leads, profile, onClose }) {
    const [step, setStep] = useState(1); // 1=select 2=compose 3=send
    const [quickFilter, setQuickFilter] = useState(null);
    const [manualSelected, setManualSelected] = useState(new Set());
    const [selectMode, setSelectMode] = useState("quick"); // quick | manual
    const [templateIdx, setTemplateIdx] = useState(0);
    const [messageText, setMessageText] = useState(DEFAULT_TEMPLATES[0].text);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [sentIds, setSentIds] = useState(new Set());
    const [skippedIds, setSkippedIds] = useState(new Set());

    const ownerName = profile?.full_name || "Sales Team";

    // Build lead pool (only leads with a phone)
    const leadsWithPhone = useMemo(() => leads.filter(l => getPhone(l)), [leads]);

    // Selected leads based on mode
    const selectedLeads = useMemo(() => {
        if (selectMode === "quick" && quickFilter) {
            const fn = QUICK_FILTERS.find(f => f.id === quickFilter)?.fn;
            return fn ? leadsWithPhone.filter(fn) : [];
        }
        if (selectMode === "manual") {
            return leadsWithPhone.filter(l => manualSelected.has(l.id));
        }
        return [];
    }, [selectMode, quickFilter, manualSelected, leadsWithPhone]);

    const toggleManual = (id) => {
        setManualSelected(prev => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
        });
    };

    const handleTemplateChange = (idx) => {
        setTemplateIdx(idx);
        setMessageText(DEFAULT_TEMPLATES[idx].text);
    };

    // Queue item for current send
    const currentLead = selectedLeads[currentIdx];
    const pendingLeads = selectedLeads.filter(l => !sentIds.has(l.id) && !skippedIds.has(l.id));
    const progress = selectedLeads.length > 0 ? Math.round(((sentIds.size + skippedIds.size) / selectedLeads.length) * 100) : 0;

    const sendCurrent = () => {
        if (!currentLead) return;
        const phone = getPhone(currentLead);
        const msg = personalize(messageText, currentLead, ownerName);
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
        setSentIds(prev => new Set([...prev, currentLead.id]));
        // Advance to next unsent+unskipped
        const nextIdx = selectedLeads.findIndex((l, i) => i > currentIdx && !sentIds.has(l.id) && !skippedIds.has(l.id) && l.id !== currentLead.id);
        setCurrentIdx(nextIdx === -1 ? selectedLeads.length : nextIdx);
    };

    const skipCurrent = () => {
        if (!currentLead) return;
        setSkippedIds(prev => new Set([...prev, currentLead.id]));
        const nextIdx = selectedLeads.findIndex((l, i) => i > currentIdx && !sentIds.has(l.id) && !skippedIds.has(l.id));
        setCurrentIdx(nextIdx === -1 ? currentIdx + 1 : nextIdx);
    };

    const jumpTo = (idx) => {
        if (!sentIds.has(selectedLeads[idx]?.id)) setCurrentIdx(idx);
    };

    const isDone = selectedLeads.length > 0 && (sentIds.size + skippedIds.size) >= selectedLeads.length;

    return (
        <div className="wa-broadcast-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="wa-broadcast-modal">
                {/* ── Header ── */}
                <div className="wa-modal-header">
                    <div className="wa-modal-title">
                        <span className="wa-modal-icon">📣</span>
                        <div>
                            <div className="wa-modal-heading">WhatsApp Broadcast</div>
                            <div className="wa-modal-sub">Send personalised messages to multiple leads</div>
                        </div>
                    </div>
                    <button className="wa-modal-close" onClick={onClose}>✕</button>
                </div>

                {/* ── Steps indicator ── */}
                <div className="wa-steps">
                    {["Select Leads", "Compose Message", "Send Queue"].map((s, i) => (
                        <div key={i} className={`wa-step ${step === i + 1 ? "active" : ""} ${step > i + 1 ? "done" : ""}`}>
                            <div className="wa-step-num">{step > i + 1 ? "✓" : i + 1}</div>
                            <div className="wa-step-label">{s}</div>
                        </div>
                    ))}
                </div>

                <div className="wa-modal-body">
                    {/* ════════ STEP 1: SELECT ════════ */}
                    {step === 1 && (
                        <div className="wa-step-content">
                            <div className="wa-select-tabs">
                                <button className={`wa-select-tab ${selectMode === "quick" ? "active" : ""}`} onClick={() => setSelectMode("quick")}>⚡ Quick Filter</button>
                                <button className={`wa-select-tab ${selectMode === "manual" ? "active" : ""}`} onClick={() => setSelectMode("manual")}>☑️ Manual Select</button>
                            </div>

                            {selectMode === "quick" && (
                                <div className="wa-quick-filters">
                                    {QUICK_FILTERS.map(f => {
                                        const count = leadsWithPhone.filter(f.fn).length;
                                        return (
                                            <button
                                                key={f.id}
                                                className={`wa-filter-btn ${quickFilter === f.id ? "active" : ""}`}
                                                onClick={() => setQuickFilter(quickFilter === f.id ? null : f.id)}
                                            >
                                                <span>{f.label}</span>
                                                <span className="wa-filter-count">{count}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {selectMode === "manual" && (
                                <div className="wa-manual-list">
                                    <div className="wa-manual-header">
                                        <span>{leadsWithPhone.length} leads with phone number</span>
                                        <button className="wa-select-all" onClick={() => {
                                            if (manualSelected.size === leadsWithPhone.length) setManualSelected(new Set());
                                            else setManualSelected(new Set(leadsWithPhone.map(l => l.id)));
                                        }}>
                                            {manualSelected.size === leadsWithPhone.length ? "Deselect All" : "Select All"}
                                        </button>
                                    </div>
                                    {leadsWithPhone.map(l => (
                                        <label key={l.id} className={`wa-manual-row ${manualSelected.has(l.id) ? "checked" : ""}`}>
                                            <input type="checkbox" checked={manualSelected.has(l.id)} onChange={() => toggleManual(l.id)} />
                                            <div className="wa-manual-info">
                                                <div className="wa-manual-name">{l.lead_name || "Unnamed"}</div>
                                                <div className="wa-manual-meta">{l.institution_name} · {l.whatsapp || l.phone}</div>
                                            </div>
                                            <span className="wa-stage-pill" style={{ background: { New: "#64748b", Contacted: "#3b82f6", "Demo/Meeting": "#8b5cf6", Proposal: "#f59e0b", Negotiation: "#f97316", Won: "#22c55e", Lost: "#ef4444" }[l.stage] || "#64748b" }}>{l.stage || "New"}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {selectedLeads.length > 0 && (
                                <div className="wa-selection-info">
                                    <strong>✅ {selectedLeads.length} lead{selectedLeads.length !== 1 ? "s" : ""} selected</strong>
                                    <span>{selectedLeads.filter(l => getPhone(l)).length} have WhatsApp/phone numbers</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ════════ STEP 2: COMPOSE ════════ */}
                    {step === 2 && (
                        <div className="wa-step-content">
                            <div className="wa-templates-row">
                                {DEFAULT_TEMPLATES.map((t, i) => (
                                    <button key={t.id} className={`wa-template-chip ${templateIdx === i ? "active" : ""}`} onClick={() => handleTemplateChange(i)}>
                                        {t.name}
                                    </button>
                                ))}
                            </div>

                            <div className="wa-compose-area">
                                <label className="wa-label">Message (use {"{name}"}, {"{school}"}, {"{owner}"})</label>
                                <textarea
                                    className="wa-textarea"
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    rows={8}
                                />
                            </div>

                            {selectedLeads[0] && (
                                <div className="wa-preview">
                                    <div className="wa-preview-label">👁 Preview for <strong>{selectedLeads[0].lead_name}</strong>:</div>
                                    <div className="wa-preview-bubble">
                                        {personalize(messageText, selectedLeads[0], ownerName).split("\n").map((line, i) => (
                                            <div key={i}>{line || <br />}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ════════ STEP 3: SEND QUEUE ════════ */}
                    {step === 3 && (
                        <div className="wa-step-content wa-send-layout">
                            {/* Progress */}
                            <div className="wa-progress-section">
                                <div className="wa-progress-stats">
                                    <span className="wa-stat-sent">✅ {sentIds.size} sent</span>
                                    <span className="wa-stat-skip">⏭ {skippedIds.size} skipped</span>
                                    <span className="wa-stat-left">📋 {selectedLeads.length - sentIds.size - skippedIds.size} remaining</span>
                                </div>
                                <div className="wa-progress-bar-wrap">
                                    <div className="wa-progress-bar-fill" style={{ width: `${progress}%` }} />
                                </div>
                                <div className="wa-progress-pct">{progress}% complete</div>
                            </div>

                            {isDone ? (
                                <div className="wa-done-banner">
                                    🎉 <strong>Broadcast complete!</strong> You sent messages to {sentIds.size} leads.
                                    {skippedIds.size > 0 && ` (${skippedIds.size} skipped)`}
                                </div>
                            ) : currentLead ? (
                                <>
                                    {/* Current lead card */}
                                    <div className="wa-current-card">
                                        <div className="wa-current-label">▶ Now sending to:</div>
                                        <div className="wa-current-name">{currentLead.lead_name || "Unnamed"}</div>
                                        <div className="wa-current-meta">
                                            🏢 {currentLead.institution_name || "—"} &nbsp;·&nbsp;
                                            📞 {currentLead.whatsapp || currentLead.phone}
                                        </div>
                                        <div className="wa-current-preview">
                                            {personalize(messageText, currentLead, ownerName).split("\n").slice(0, 4).join("\n")}...
                                        </div>
                                        <div className="wa-current-actions">
                                            <button className="wa-send-btn" onClick={sendCurrent}>
                                                💬 Open WhatsApp & Send
                                            </button>
                                            <button className="wa-skip-btn" onClick={skipCurrent}>⏭ Skip</button>
                                        </div>
                                    </div>

                                    {/* Remaining queue */}
                                    <div className="wa-queue-list">
                                        <div className="wa-queue-title">Queue ({pendingLeads.length} remaining)</div>
                                        {selectedLeads.map((l, i) => {
                                            const isSent = sentIds.has(l.id);
                                            const isSkipped = skippedIds.has(l.id);
                                            const isCurrent = i === currentIdx;
                                            return (
                                                <div
                                                    key={l.id}
                                                    className={`wa-queue-item ${isCurrent ? "current" : ""} ${isSent ? "sent" : ""} ${isSkipped ? "skipped" : ""}`}
                                                    onClick={() => !isSent && jumpTo(i)}
                                                >
                                                    <span className="wa-q-idx">{i + 1}</span>
                                                    <span className="wa-q-name">{l.lead_name || "Unnamed"}</span>
                                                    <span className="wa-q-phone">{l.whatsapp || l.phone}</span>
                                                    <span className="wa-q-status">
                                                        {isSent ? "✅ Sent" : isSkipped ? "⏭ Skip" : isCurrent ? "▶ Now" : "⏳"}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : null}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="wa-modal-footer">
                    {step > 1 && !isDone && (
                        <button className="wa-btn-back" onClick={() => setStep(s => s - 1)}>‹ Back</button>
                    )}
                    <div style={{ flex: 1 }} />
                    {step === 1 && (
                        <button
                            className="wa-btn-next"
                            disabled={selectedLeads.length === 0}
                            onClick={() => setStep(2)}
                        >
                            Next: Compose Message ({selectedLeads.length} leads) ›
                        </button>
                    )}
                    {step === 2 && (
                        <button
                            className="wa-btn-next"
                            disabled={!messageText.trim()}
                            onClick={() => { setStep(3); setCurrentIdx(0); setSentIds(new Set()); setSkippedIds(new Set()); }}
                        >
                            Start Broadcast ({selectedLeads.length} leads) →
                        </button>
                    )}
                    {step === 3 && isDone && (
                        <button className="wa-btn-close" onClick={onClose}>Close</button>
                    )}
                </div>
            </div>
        </div>
    );
}
