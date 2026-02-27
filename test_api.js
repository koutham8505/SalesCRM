// Quick API integration test
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
    console.log("=== SalesCRM API Integration Test ===\n");

    // 1. Health check
    const health = await req("http://localhost:3000/health");
    console.log(`1. Health: ${health.status} ${health.status === 200 ? "PASS" : "FAIL"}`);

    // 2. Login
    let token;
    try {
        const login = await req(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: "POST",
            headers: { "apikey": ANON_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ email: "admin@salescrm.com", password: "Koutham@512" }),
        });
        if (login.data?.access_token) {
            token = login.data.access_token;
            console.log(`2. Login: PASS (token: ${token.slice(0, 20)}...)`);
        } else {
            console.log(`2. Login: FAIL`, JSON.stringify(login.data).slice(0, 200));
            return;
        }
    } catch (err) {
        console.log(`2. Login: FAIL (${err.message})`);
        return;
    }

    const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    // 3-12: Test all endpoints
    const tests = [
        { name: "GET /api/leads", url: `${API}/leads`, check: (d) => `${d.leads?.length ?? "?"} leads, profile.name=${d.profile?.full_name || "?"}, role=${d.profile?.role || "?"}` },
        { name: "GET /api/profile/me", url: `${API}/profile/me`, check: (d) => `name=${d.full_name || "?"}, role=${d.role || "?"}` },
        { name: "GET /api/tasks", url: `${API}/tasks`, check: (d) => `${Array.isArray(d) ? d.length : "?"} tasks` },
        { name: "GET /api/templates", url: `${API}/templates`, check: (d) => `${Array.isArray(d) ? d.length : "?"} templates` },
        { name: "GET /api/admin/users", url: `${API}/admin/users`, check: (d) => `${Array.isArray(d) ? d.length : "?"} users` },
        { name: "GET /api/admin/audit-log", url: `${API}/admin/audit-log`, check: (d) => `${Array.isArray(d) ? d.length : "?"} entries` },
        { name: "GET /api/admin/validation-rules", url: `${API}/admin/validation-rules`, check: (d) => `${Array.isArray(d) ? d.length : "?"} rules` },
        { name: "GET /api/admin/feature-requests", url: `${API}/admin/feature-requests`, check: (d) => `${Array.isArray(d) ? d.length : "?"} requests` },
        { name: "GET /api/leads/owners", url: `${API}/leads/owners`, check: (d) => `${Array.isArray(d) ? d.length : "?"} owners` },
        { name: "GET /api/leads/validation-rules", url: `${API}/leads/validation-rules`, check: (d) => `${Array.isArray(d) ? d.length : "?"} rules` },
        // New dashboard metrics endpoint
        { name: "GET /api/dashboard/metrics", url: `${API}/dashboard/metrics`, check: (d) => `total=${d.calls_today_total ?? "?"}, interested=${d.calls_today_interested ?? "?"}, pd_total=${d.pitch_decks_sent_total ?? "?"}, em_total=${d.emails_sent_total ?? "?"}` },
    ];

    for (let i = 0; i < tests.length; i++) {
        const t = tests[i];
        try {
            const res = await req(t.url, { headers: auth });
            const status = res.status === 200 ? "PASS" : "FAIL";
            const detail = res.status === 200 ? t.check(res.data) : (res.data?.message || JSON.stringify(res.data).slice(0, 80));
            console.log(`${i + 3}. ${t.name}: ${status} (${res.status}) — ${detail}`);
        } catch (err) {
            console.log(`${i + 3}. ${t.name}: FAIL — ${err.message}`);
        }
    }

    // 13. Frontend serving
    const fe = await req("http://localhost:5173");
    console.log(`13. Frontend: ${fe.status === 200 ? "PASS" : "FAIL"} (${fe.status})`);

    console.log("\n=== Done ===");
}

run().catch((err) => console.error("Error:", err.message));
