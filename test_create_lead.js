// test_create_lead.js — test POST /api/leads and show exact error
const http = require("http");
const https = require("https");

const SUPABASE_URL = "https://fioonzgmfbalicnwlydg.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb29uemdtZmJhbGljbndseWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDE2OTYsImV4cCI6MjA4NTY3NzY5Nn0.xRCMFxXl5llAeejFRxWj89JA-nyZIlErIcbo0PHr7wM";
const API = "http://localhost:3000/api";

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

async function run() {
    console.log("=== Test: Create Lead ===\n");

    // Login as admin
    const login = await req(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "apikey": ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@salescrm.com", password: "Koutham@512" }),
    });

    if (!login.data?.access_token) {
        console.log("❌ Login failed:", login.data?.error_description || login.data);
        return;
    }
    const token = login.data.access_token;
    console.log("✅ Login OK as Admin");

    const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    // Try create a lead
    const leadBody = JSON.stringify({
        lead_name: "Test Save Lead",
        institution_name: "Test School",
        phone: "8888777701",
        status: "New",
        lead_source: "Cold Call",
    });

    const result = await req(`${API}/leads`, {
        method: "POST",
        headers: auth,
        body: leadBody,
    });

    console.log("POST /api/leads:");
    console.log("  Status:", result.status);
    if (result.status === 201 || result.status === 200) {
        console.log("  ✅ SUCCESS - Lead created:", result.data.lead_name || result.data.id);
        // Clean up - delete test lead
        const delResult = await req(`${API}/leads/${result.data.id}`, {
            method: "DELETE",
            headers: auth,
        });
        console.log("  🧹 Cleaned up test lead:", delResult.status);
    } else {
        console.log("  ❌ FAILED!");
        console.log("  message:", result.data?.message);
        console.log("  code:", result.data?.code);
        console.log("  details:", result.data?.details);
        console.log("  full response:", JSON.stringify(result.data, null, 2));
    }
}

run().catch(console.error);
