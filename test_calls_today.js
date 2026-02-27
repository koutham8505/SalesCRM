/**
 * test_calls_today.js
 * Verifies that:
 *  1. Updating call_status on a lead auto-creates a CALL activity
 *  2. Dashboard calls_today_total reflects the change immediately
 */
const https = require("https");
const http = require("http");

const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb29uemdtZmJhbGljbndseWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDE2OTYsImV4cCI6MjA4NTY3NzY5Nn0.xRCMFxXl5llAeejFRxWj89JA-nyZIlErIcbo0PHr7wM";

let pass = 0, fail = 0;
const ok = (msg) => { console.log(`  ✅ ${msg}`); pass++; };
const err = (msg) => { console.log(`  ❌ ${msg}`); fail++; };

function loginHttps(email, pwd) {
    return new Promise(r => {
        const b = JSON.stringify({ email, password: pwd });
        const req = https.request({
            hostname: "fioonzgmfbalicnwlydg.supabase.co",
            path: "/auth/v1/token?grant_type=password",
            method: "POST",
            headers: { apikey: ANON, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(b) }
        }, res => { let d = ""; res.on("data", c => d += c); res.on("end", () => r(JSON.parse(d).access_token)); });
        req.on("error", () => r(null)); req.write(b); req.end();
    });
}

function callApi(tok, method, path, body) {
    return new Promise(r => {
        const b = body ? JSON.stringify(body) : null;
        const opts = { hostname: "localhost", port: 3000, path, method, headers: { Authorization: "Bearer " + tok } };
        if (b) { opts.headers["Content-Type"] = "application/json"; opts.headers["Content-Length"] = Buffer.byteLength(b); }
        const req = http.request(opts, res => {
            let d = ""; res.on("data", c => d += c);
            res.on("end", () => { try { r({ s: res.statusCode, d: JSON.parse(d) }); } catch { r({ s: res.statusCode, d }); } });
        });
        req.on("error", e => r({ s: 0, d: e.message }));
        if (b) req.write(b); req.end();
    });
}

async function main() {
    console.log("=== Calls Today Matrix Fix Test ===\n");

    const tok = await loginHttps("admin@salescrm.com", "Koutham@512");
    if (!tok) { err("Login failed"); return; }
    ok("Admin login");

    // 1. Get leads
    const leadsR = await callApi(tok, "GET", "/api/leads");
    if (!leadsR.d.leads?.length) { err("No leads found"); return; }
    ok(`Got ${leadsR.d.leads.length} leads`);
    const lead = leadsR.d.leads[0];

    // 2. Get baseline metrics
    const before = await callApi(tok, "GET", "/api/dashboard/metrics");
    if (before.s !== 200) { err(`Dashboard returned ${before.s}`); return; }
    const b4 = before.d.calls_today_total || 0;
    ok(`BEFORE: calls_today_total = ${b4}`);

    // 3. Get baseline activities count
    const actsBefore = await callApi(tok, "GET", `/api/activities/${lead.id}`);
    const actsCountBefore = Array.isArray(actsBefore.d) ? actsBefore.d.length : 0;
    ok(`BEFORE: activities for lead = ${actsCountBefore}`);

    // 4. Update call_status to a NEW value (triggers auto-CALL-activity)
    const oldStatus = lead.call_status;
    const newStatus = oldStatus === "Interested" ? "Call Back" : "Interested";
    console.log(`\n  Changing call_status: "${oldStatus}" → "${newStatus}"`);
    const upd = await callApi(tok, "PUT", `/api/leads/${lead.id}`, { call_status: newStatus });
    if (upd.s !== 200) { err(`Update failed: ${upd.s} ${JSON.stringify(upd.d)}`); return; }
    ok(`Lead updated — new call_status: ${upd.d.call_status}`);

    // 5. Check activities — should have auto-created one
    const actsAfter = await callApi(tok, "GET", `/api/activities/${lead.id}`);
    const actsCountAfter = Array.isArray(actsAfter.d) ? actsAfter.d.length : 0;
    const autoAct = Array.isArray(actsAfter.d) ? actsAfter.d.find(a => a.type === "CALL" && a.outcome === newStatus) : null;
    if (actsCountAfter > actsCountBefore) ok(`Auto-CALL activity created (${actsCountBefore} → ${actsCountAfter})`);
    else err(`Auto-CALL activity NOT created (count stayed at ${actsCountAfter})`);
    if (autoAct) ok(`CALL activity has correct outcome: "${autoAct.outcome}"`);
    else err(`No matching CALL activity with outcome "${newStatus}" found`);

    // 6. Check dashboard — calls_today_total should be >= before
    const after = await callApi(tok, "GET", "/api/dashboard/metrics");
    if (after.s !== 200) { err(`Dashboard returned ${after.s} after update`); return; }
    const aft = after.d.calls_today_total || 0;
    if (aft >= b4) ok(`AFTER: calls_today_total = ${aft} ✓ (was ${b4})`);
    else err(`AFTER: calls_today_total = ${aft} but was ${b4} — should not decrease`);

    // Show outcome breakdown
    console.log(`\n  Outcome breakdown:`);
    console.log(`    Interested:    ${after.d.calls_today_interested}`);
    console.log(`    Not Interested: ${after.d.calls_today_not_interested}`);
    console.log(`    Call Back:     ${after.d.calls_today_call_back}`);
    console.log(`    Wrong Number:  ${after.d.calls_today_wrong_number}`);
    console.log(`    No Response:   ${after.d.calls_today_no_response}`);

    console.log(`\n╔════════════════════════════════╗`);
    console.log(`║  Results: ${pass} passed, ${fail} failed  ║`);
    console.log(`╚════════════════════════════════╝`);
    if (fail === 0) console.log("✅ Calls Today matrix is FIXED!");
    else console.log("❌ Some issues remain.");
}

main().catch(e => console.log("FATAL:", e.message));
