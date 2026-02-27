// Full dashboard statistics analysis
// Tests BOTH users against actual DB data and shows exactly what should display
const https = require("https");
const http = require("http");

const SUPABASE_URL = "https://fioonzgmfbalicnwlydg.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb29uemdtZmJhbGljbndseWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDE2OTYsImV4cCI6MjA4NTY3NzY5Nn0.xRCMFxXl5llAeejFRxWj89JA-nyZIlErIcbo0PHr7wM";
const API = "http://localhost:3000/api";

function req(url, opts = {}) {
    return new Promise((resolve, reject) => {
        const isHttps = url.startsWith("https");
        const mod = isHttps ? https : http;
        const parsed = new URL(url);
        const o = {
            hostname: parsed.hostname,
            port: parsed.port || (isHttps ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: opts.method || "GET",
            headers: opts.headers || {},
        };
        const r = mod.request(o, (res) => {
            let d = "";
            res.on("data", c => (d += c));
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

async function loginAs(email, password) {
    const res = await req(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "apikey": ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    if (!res.data?.access_token) {
        console.log(`  ⚠️  Login failed for ${email}: ${JSON.stringify(res.data?.error_description || res.data)}`);
        return null;
    }
    return res.data.access_token;
}

const NOW = new Date();
const TODAY_UTC = (() => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d.toISOString(); })();
const TODAY_DATE = TODAY_UTC.slice(0, 10);

console.log("=".repeat(60));
console.log("DASHBOARD STATISTICS — FULL ANALYSIS");
console.log("=".repeat(60));
console.log(`Server UTC time : ${NOW.toISOString()}`);
console.log(`Local IST time  : 2026-02-26T15:17:45+05:30 (from user)`);
console.log(`Today UTC date  : ${TODAY_DATE}`);
console.log();

function analyzeLeads(leads, label) {
    console.log(`\n── ${label}: ${leads.length} leads ──`);

    const isToday = (v) => v && v.slice(0, 10) === TODAY_DATE;
    const isYes = (v) => v === "Yes" || v === true;

    // Print each lead
    leads.forEach((l, i) => {
        console.log(`  Lead ${i + 1}: "${l.lead_name}" | owner_id=${l.owner_id?.slice(0, 8)}...`);
        console.log(`    call_status=${l.call_status || "null"} | last_called_at=${l.last_called_at || "null"}`);
        console.log(`    meeting_date=${l.meeting_date || "null"} | next_follow_up=${l.next_follow_up || "null"} | status=${l.status}`);
        console.log(`    mail_sent=${l.mail_sent || "null"} | pitch_deck_sent=${l.pitch_deck_sent || "null"}`);
        console.log(`    last_called_at is today? ${isToday(l.last_called_at)}`);
    });

    // Compute metrics exactly as the backend does
    const all_leads_count = leads.length;
    const all_meetings = leads.filter(r => !!r.meeting_date).length;
    const all_followups = leads.filter(r => r.next_follow_up && r.status !== "Loss").length;
    const all_overdue = leads.filter(r => r.next_follow_up && new Date(r.next_follow_up) < NOW && r.status !== "Loss").length;

    const callsToday = leads.filter(r => r.call_status && r.call_status !== "Not Called" && isToday(r.last_called_at));
    const calls_total = callsToday.length;
    const interested = callsToday.filter(r => r.call_status === "Interested").length;
    const not_interested = callsToday.filter(r => r.call_status === "Not Interested").length;
    const call_back = callsToday.filter(r => r.call_status === "Call Back").length;
    const wrong_number = callsToday.filter(r => r.call_status === "Wrong Number").length;
    const no_response = callsToday.filter(r => r.call_status === "No Response").length;

    const pitch_total = leads.filter(r => isYes(r.pitch_deck_sent)).length;
    const mail_total = leads.filter(r => isYes(r.mail_sent)).length;

    console.log(`\n  📊 Expected Dashboard Values for ${label}:`);
    console.log(`     All Leads      : ${all_leads_count}`);
    console.log(`     All Meetings   : ${all_meetings}`);
    console.log(`     All Follow-ups : ${all_followups}`);
    console.log(`     All Overdue    : ${all_overdue}`);
    console.log(`     Calls Today    : ${calls_total}  (Interested=${interested}, Not Interested=${not_interested}, Call Back=${call_back}, Wrong Number=${wrong_number}, No Response=${no_response})`);
    console.log(`     Pitch Decks    : today=N/A (needs updated_at) / total=${pitch_total}`);
    console.log(`     Emails Sent    : today=N/A (needs updated_at) / total=${mail_total}`);

    if (calls_total === 0 && leads.some(r => r.call_status)) {
        console.log(`\n  ⚠️  ISSUE DETECTED: ${leads.filter(r => r.call_status && r.call_status !== 'Not Called').length} leads have a call_status set`);
        console.log(`     but calls_today=0 because last_called_at is NOT set to today.`);
        const withStatus = leads.filter(r => r.call_status && r.call_status !== 'Not Called');
        withStatus.forEach(l => {
            console.log(`     → "${l.lead_name}": call_status=${l.call_status}, last_called_at=${l.last_called_at || "NULL"}`);
        });
        console.log(`\n  💡 FIX: Either:`);
        console.log(`     A) Set last_called_at=now() when saving a lead with a call_status (in leads.controller.js)`);
        console.log(`     B) OR use updated_at instead of last_called_at for "calls today" filter`);
    }

    return { all_leads_count, calls_total, pitch_total, mail_total };
}

async function main() {
    const adminToken = await loginAs("admin@salescrm.com", "Koutham@512");
    if (!adminToken) return;

    const adminAuth = { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" };

    // Fetch all leads (Admin sees all)
    const allLeadsRes = await req(`${API}/leads`, { headers: adminAuth });
    if (allLeadsRes.status !== 200) {
        console.log("Failed to fetch leads:", allLeadsRes.data);
        return;
    }
    const allLeads = allLeadsRes.data.leads || [];

    // Admin analysis
    analyzeLeads(allLeads, "ADMIN (all leads)");

    // Find KK user's leads
    const KK_ID = "b5a0066a-1ca3-4d4d-a2fd-e04f95c66100";
    const kkLeads = allLeads.filter(l => l.owner_id === KK_ID);
    analyzeLeads(kkLeads, "EXECUTIVE KK (owner_id=b5a0066a)");

    // Now compare with what the API actually returns
    console.log("\n" + "=".repeat(60));
    console.log("ACTUAL API RESPONSE vs EXPECTED");
    console.log("=".repeat(60));

    const apiMetrics = await req(`${API}/dashboard/metrics`, { headers: adminAuth });
    console.log(`\nAdmin /api/dashboard/metrics (HTTP ${apiMetrics.status}):`);
    console.log(JSON.stringify(apiMetrics.data, null, 2));

    // Identify root cause
    console.log("\n" + "=".repeat(60));
    console.log("ROOT CAUSE ANALYSIS");
    console.log("=".repeat(60));
    const m = apiMetrics.data || {};
    if (m.calls_today_total === 0 && allLeads.some(l => l.call_status)) {
        console.log("\n❌ CONFIRMED: calls_today_total=0 even though leads have call_status values.");
        console.log("   CAUSE: Dashboard uses last_called_at for 'calls today' filter.");
        console.log("   BUT: last_called_at is NOT being set when leads are created/updated via the form.");
        console.log("   last_called_at is only set in activities.controller.js (when logging a CALL activity).");
        console.log("   The correct fix: Set last_called_at=now() in leads.controller.js when call_status is set.");
    } else if (m.calls_today_total > allLeads.length) {
        console.log("\n❌ CONFIRMED: calls_today_total exceeds total leads — impossible if using lead rows.");
    } else {
        console.log("\n✅ Metrics look consistent with lead data.");
    }
}

main().catch(console.error);
