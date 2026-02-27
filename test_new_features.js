// Comprehensive feature test for new SalesCRM extensions
// Tests: new lead fields, call activity logging, dashboard metrics, pitch deck activity
const http = require("http");
const https = require("https");

const SUPABASE_URL = "https://fioonzgmfbalicnwlydg.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb29uemdtZmJhbGljbndseWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDE2OTYsImV4cCI6MjA4NTY3NzY5Nn0.xRCMFxXl5llAeejFRxWj89JA-nyZIlErIcbo0PHr7wM";
const API = "http://localhost:3000/api";

let passed = 0, failed = 0, total = 0;

function req(url, opts = {}) {
    return new Promise((resolve, reject) => {
        const isHttps = url.startsWith("https");
        const mod = isHttps ? https : http;
        const parsed = new URL(url);
        const o = {
            hostname: parsed.hostname, port: parsed.port || (isHttps ? 443 : 80),
            path: parsed.pathname + parsed.search, method: opts.method || "GET",
            headers: opts.headers || {},
        };
        const r = mod.request(o, (res) => {
            let d = "";
            res.on("data", (c) => (d += c));
            res.on("end", () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
                catch { resolve({ status: res.statusCode, data: d }); }
            });
        });
        r.on("error", reject);
        if (opts.body) r.write(opts.body);
        r.end();
    });
}

function assert(name, condition, detail = "") {
    total++;
    if (condition) {
        passed++;
        console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ""}`);
    } else {
        failed++;
        console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
    }
}

async function run() {
    console.log("╔══════════════════════════════════════════════════════╗");
    console.log("║   SalesCRM — New Features End-to-End Test Suite     ║");
    console.log("╚══════════════════════════════════════════════════════╝\n");

    // 1. Login
    console.log("🔐 Step 1: Authentication");
    let token;
    try {
        const login = await req(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: "POST",
            headers: { "apikey": ANON_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ email: "admin@salescrm.com", password: "Koutham@512" }),
        });
        token = login.data?.access_token;
        assert("Login successful", !!token, `token: ${(token || "").slice(0, 20)}...`);
    } catch (err) {
        console.log(`  ❌ Login FAILED: ${err.message}`);
        return;
    }

    const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    // Pre-cleanup: delete any leftover test leads from previous interrupted runs
    console.log("\n🧹 Pre-cleanup: removing leftover test data...");
    try {
        const res = await req(`${API}/leads`, { headers: auth });
        const staleLeads = (res.data.leads || []).filter((l) => l.lead_name === "Test School Lead");
        for (const sl of staleLeads) {
            await req(`${API}/leads/${sl.id}`, { method: "DELETE", headers: auth });
            console.log(`  Deleted stale lead: ${sl.id}`);
        }
    } catch { /* ignore */ }

    // ─────────────────────────────────────────────────────
    // 2. Create lead with new school fields
    // ─────────────────────────────────────────────────────
    console.log("\n📝 Step 2: Create Lead with New School Fields");
    const ts = Date.now();
    const newLead = {
        lead_name: "Test School Lead",
        institution_name: "Springfield Academy",
        phone: `+91${ts}`.slice(0, 13),
        email: `test_school_${ts}@example.com`,
        status: "New",
        lead_source: "Website",
        // New fields
        alt_phone: "+919999977777",
        proposal_sent: true,
        proposal_link: "https://drive.google.com/test-proposal",
        tier: "Tier 1",
        geo_classification: "Metro",
        board: "CBSE",
        fees: "₹80,000 – ₹1,20,000",
        grades_offered: "Pre KG to XII",
        student_strength: 2500,
        medium_of_instruction: "English",
        school_type: "Co-ed",
    };

    let createdLeadId = null;
    try {
        const res = await req(`${API}/leads`, {
            method: "POST", headers: auth,
            body: JSON.stringify(newLead),
        });
        assert("Lead created (201)", res.status === 201, `status=${res.status}`);
        const d = res.data;
        createdLeadId = d.id;

        // Verify new fields are persisted
        assert("alt_phone saved", d.alt_phone === "+919999977777", `got: ${d.alt_phone}`);
        assert("proposal_sent saved", d.proposal_sent === true, `got: ${d.proposal_sent}`);
        assert("proposal_link saved", d.proposal_link === "https://drive.google.com/test-proposal", `got: ${d.proposal_link}`);
        assert("tier saved", d.tier === "Tier 1", `got: ${d.tier}`);
        assert("geo_classification saved", d.geo_classification === "Metro", `got: ${d.geo_classification}`);
        assert("board saved", d.board === "CBSE", `got: ${d.board}`);
        assert("fees saved", d.fees === "₹80,000 – ₹1,20,000", `got: ${d.fees}`);
        assert("grades_offered saved", d.grades_offered === "Pre KG to XII", `got: ${d.grades_offered}`);
        assert("student_strength saved", d.student_strength === 2500, `got: ${d.student_strength}`);
        assert("medium_of_instruction saved", d.medium_of_instruction === "English", `got: ${d.medium_of_instruction}`);
        assert("school_type saved", d.school_type === "Co-ed", `got: ${d.school_type}`);
    } catch (err) {
        console.log(`  ❌ Create lead FAILED: ${err.message}`);
    }

    // ─────────────────────────────────────────────────────
    // 3. Verify lead appears in getLeads with new fields
    // ─────────────────────────────────────────────────────
    console.log("\n📋 Step 3: Verify Lead in getLeads Response");
    try {
        const res = await req(`${API}/leads`, { headers: auth });
        assert("getLeads returns 200", res.status === 200);
        const found = res.data.leads?.find((l) => l.id === createdLeadId);
        assert("Created lead found in list", !!found, found ? `name=${found.lead_name}` : "NOT FOUND");
        if (found) {
            assert("board in list data", found.board === "CBSE");
            assert("tier in list data", found.tier === "Tier 1");
            assert("student_strength in list data", found.student_strength === 2500);
        }
    } catch (err) {
        console.log(`  ❌ getLeads FAILED: ${err.message}`);
    }

    // ─────────────────────────────────────────────────────
    // 4. Update lead — change school fields
    // ─────────────────────────────────────────────────────
    console.log("\n✏️  Step 4: Update Lead School Fields");
    if (createdLeadId) {
        try {
            const updates = {
                lead_name: "Test School Lead",
                institution_name: "Springfield Academy",
                status: "In Progress",
                board: "ICSE",
                student_strength: 3000,
                tier: "Tier 2",
                call_status: "Interested",
            };
            const res = await req(`${API}/leads/${createdLeadId}`, {
                method: "PUT", headers: auth,
                body: JSON.stringify(updates),
            });
            assert("Lead updated (200)", res.status === 200, `status=${res.status}`);
            assert("board updated to ICSE", res.data.board === "ICSE", `got: ${res.data.board}`);
            assert("student_strength updated to 3000", res.data.student_strength === 3000, `got: ${res.data.student_strength}`);
            assert("tier updated to Tier 2", res.data.tier === "Tier 2", `got: ${res.data.tier}`);
        } catch (err) {
            console.log(`  ❌ Update lead FAILED: ${err.message}`);
        }
    }

    // ─────────────────────────────────────────────────────
    // 5. Log CALL activities with different outcomes
    // ─────────────────────────────────────────────────────
    console.log("\n📞 Step 5: Log CALL Activities (various outcomes)");
    const callOutcomes = ["Interested", "Not Interested", "Call Back", "Wrong Number", "No Response"];
    if (createdLeadId) {
        for (const outcome of callOutcomes) {
            try {
                const res = await req(`${API}/activities`, {
                    method: "POST", headers: auth,
                    body: JSON.stringify({
                        lead_id: createdLeadId,
                        type: "CALL",
                        description: `Test call — ${outcome}`,
                        outcome,
                        duration: 5,
                    }),
                });
                assert(`CALL logged: ${outcome}`, res.status === 201, `status=${res.status}`);
            } catch (err) {
                console.log(`  ❌ CALL ${outcome} FAILED: ${err.message}`);
            }
        }
    }

    // ─────────────────────────────────────────────────────
    // 6. Verify last_called_at was updated on the lead
    // ─────────────────────────────────────────────────────
    console.log("\n🕐 Step 6: Verify last_called_at Updated");
    if (createdLeadId) {
        try {
            const res = await req(`${API}/leads`, { headers: auth });
            const found = res.data.leads?.find((l) => l.id === createdLeadId);
            assert("last_called_at is set", !!found?.last_called_at, `got: ${found?.last_called_at || "null"}`);
        } catch (err) {
            console.log(`  ❌ Verify last_called_at FAILED: ${err.message}`);
        }
    }

    // ─────────────────────────────────────────────────────
    // 7. Log PITCH_DECK activity
    // ─────────────────────────────────────────────────────
    console.log("\n📊 Step 7: Log PITCH_DECK Activity");
    if (createdLeadId) {
        try {
            const res = await req(`${API}/activities`, {
                method: "POST", headers: auth,
                body: JSON.stringify({
                    lead_id: createdLeadId,
                    type: "PITCH_DECK",
                    description: "Sent EdTech pitch deck v3",
                }),
            });
            assert("PITCH_DECK activity created", res.status === 201, `status=${res.status}`);
            assert("type is PITCH_DECK", res.data.type === "PITCH_DECK");
        } catch (err) {
            console.log(`  ❌ PITCH_DECK FAILED: ${err.message}`);
        }
    }

    // ─────────────────────────────────────────────────────
    // 8. Log EMAIL activity
    // ─────────────────────────────────────────────────────
    console.log("\n✉️  Step 8: Log EMAIL Activity");
    if (createdLeadId) {
        try {
            const res = await req(`${API}/activities`, {
                method: "POST", headers: auth,
                body: JSON.stringify({
                    lead_id: createdLeadId,
                    type: "EMAIL",
                    description: "Follow-up email sent",
                }),
            });
            assert("EMAIL activity created", res.status === 201, `status=${res.status}`);
        } catch (err) {
            console.log(`  ❌ EMAIL FAILED: ${err.message}`);
        }
    }

    console.log("\n📈 Step 9: Dashboard Call Metrics");
    try {
        const res = await req(`${API}/dashboard/metrics`, { headers: auth });
        assert("call-metrics returns 200", res.status === 200);
        const m = res.data;
        assert("calls_today_total >= 5", m.calls_today_total >= 5, `got: ${m.calls_today_total}`);
        assert("calls_today_interested >= 1", m.calls_today_interested >= 1, `got: ${m.calls_today_interested}`);
        assert("calls_today_not_interested >= 1", m.calls_today_not_interested >= 1, `got: ${m.calls_today_not_interested}`);
        assert("calls_today_call_back >= 1", m.calls_today_call_back >= 1, `got: ${m.calls_today_call_back}`);
        assert("calls_today_wrong_number >= 1", m.calls_today_wrong_number >= 1, `got: ${m.calls_today_wrong_number}`);
        assert("calls_today_no_response >= 1", m.calls_today_no_response >= 1, `got: ${m.calls_today_no_response}`);
    } catch (err) {
        console.log(`  ❌ Call metrics FAILED: ${err.message}`);
    }

    console.log("\n📤 Step 10: Dashboard Outreach Metrics");
    try {
        const res = await req(`${API}/dashboard/metrics`, { headers: auth });
        assert("outreach-metrics returns 200", res.status === 200);
        const m = res.data;
        assert("pitch_decks_sent_today >= 1", m.pitch_decks_sent_today >= 1, `got: ${m.pitch_decks_sent_today}`);
        assert("pitch_decks_sent_total >= 1", m.pitch_decks_sent_total >= 1, `got: ${m.pitch_decks_sent_total}`);
        assert("emails_sent_today >= 1", m.emails_sent_today >= 1, `got: ${m.emails_sent_today}`);
        assert("emails_sent_total >= 1", m.emails_sent_total >= 1, `got: ${m.emails_sent_total}`);
    } catch (err) {
        console.log(`  ❌ Outreach metrics FAILED: ${err.message}`);
    }

    // ─────────────────────────────────────────────────────
    // 11. Verify activities timeline for the lead
    // ─────────────────────────────────────────────────────
    console.log("\n📜 Step 11: Verify Activities Timeline");
    if (createdLeadId) {
        try {
            const res = await req(`${API}/activities/${createdLeadId}`, { headers: auth });
            assert("activities returns 200", res.status === 200);
            const acts = res.data;
            assert("At least 7 activities logged", acts.length >= 7, `got: ${acts.length}`);
            const types = acts.map((a) => a.type);
            assert("Has CALL activities", types.includes("CALL"));
            assert("Has PITCH_DECK activity", types.includes("PITCH_DECK"));
            assert("Has EMAIL activity", types.includes("EMAIL"));
        } catch (err) {
            console.log(`  ❌ Activities timeline FAILED: ${err.message}`);
        }
    }

    // ─────────────────────────────────────────────────────
    // Cleanup: delete the test lead
    // ─────────────────────────────────────────────────────
    console.log("\n🧹 Cleanup: Delete Test Lead");
    if (createdLeadId) {
        try {
            const res = await req(`${API}/leads/${createdLeadId}`, { method: "DELETE", headers: auth });
            assert("Test lead deleted", res.status === 200, `status=${res.status}`);
        } catch (err) {
            console.log(`  ⚠️  Cleanup failed: ${err.message}`);
        }
    }

    // ─────────────────────────────────────────────────────
    // Summary
    // ─────────────────────────────────────────────────────
    console.log("\n╔══════════════════════════════════════════════════════╗");
    console.log(`║  Results: ${passed}/${total} passed, ${failed} failed${" ".repeat(Math.max(0, 26 - String(passed).length - String(total).length - String(failed).length))}║`);
    console.log("╚══════════════════════════════════════════════════════╝");

    if (failed > 0) process.exit(1);
}

run().catch((err) => { console.error("Fatal error:", err.message); process.exit(1); });
