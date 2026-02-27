// test_save_lead.js — test creating a lead to see the real error
const http = require("http");
const https = require("https");

const SUPABASE_URL = process.env.SUPABASE_URL || require("dotenv").config({ path: ".env" }) && process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;

function loginSupabase(email, pw) {
    return new Promise((resolve) => {
        const body = JSON.stringify({ email, password: pw });
        const url = new URL(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`);
        const opts = {
            hostname: url.hostname, path: url.pathname + url.search, method: "POST",
            headers: { apikey: process.env.SUPABASE_ANON_KEY, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
        };
        const req = https.request(opts, (res) => { let d = ""; res.on("data", c => d += c); res.on("end", () => resolve(JSON.parse(d).access_token)); });
        req.on("error", () => resolve(null));
        req.write(body); req.end();
    });
}

function postLocal(tok, path, body) {
    return new Promise((resolve) => {
        const b = JSON.stringify(body);
        const opts = { hostname: "localhost", port: 3000, path, method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(b) } };
        const req = http.request(opts, (res) => { let d = ""; res.on("data", c => d += c); res.on("end", () => resolve({ s: res.statusCode, d: JSON.parse(d) })); });
        req.on("error", (e) => resolve({ s: 0, d: { message: e.message } }));
        req.write(b); req.end();
    });
}

(async () => {
    require("dotenv").config({ path: "backend/.env", override: true });

    console.log("=== Test: Create Lead ===");

    // Login as admin
    const tok = await loginSupabase("admin@salescrm.com", "Koutham@512");
    if (!tok) { console.log("❌ Login failed"); return; }
    console.log("✅ Login OK");

    // Try to create a lead as admin
    const lead = {
        lead_name: "Test School",
        institution_name: "Test Institute",
        phone: "9999000001",
        status: "New",
        lead_source: "Cold Call",
    };

    const result = await postLocal(tok, "/api/leads", lead);
    console.log("STATUS:", result.s);
    console.log("RESPONSE:", JSON.stringify(result.d, null, 2));
})();
