// Debug the dashboard for the KK Executive user
const { createClient } = require("./backend/node_modules/@supabase/supabase-js");

const s = createClient(
    "https://fioonzgmfbalicnwlydg.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb29uemdtZmJhbGljbndseWRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDEwMTY5NiwiZXhwIjoyMDg1Njc3Njk2fQ.wtm8A0MsAY_igg4QlwAbe9N6MK50Fga_l26qtskeSOU"
);

const KK_ID = "b5a0066a-1ca3-4d4d-a2fd-e04f95c66100";

const todayUTC = () => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
};

const isToday = (isoStr) => {
    if (!isoStr) return false;
    return isoStr.slice(0, 10) === todayUTC().slice(0, 10);
};

async function main() {
    console.log("=== Dashboard Debug for KK Executive ===");
    console.log("UTC now:", new Date().toISOString());
    console.log("Today UTC:", todayUTC());

    const { data: leads, error } = await s
        .from("my_leads")
        .select("id,status,call_status,meeting_date,next_follow_up,last_called_at,pitch_deck_sent,mail_sent,updated_at")
        .eq("owner_id", KK_ID);

    if (error) { console.log("Query error:", error.message); return; }

    console.log("\nKK's leads:", leads.length);
    leads.forEach((l, i) => {
        console.log(`\nLead ${i + 1}:`);
        console.log("  meeting_date:", l.meeting_date);
        console.log("  next_follow_up:", l.next_follow_up);
        console.log("  status:", l.status);
        console.log("  call_status:", l.call_status);
        console.log("  last_called_at:", l.last_called_at);
        console.log("  isToday(last_called_at):", isToday(l.last_called_at));
        console.log("  pitch_deck_sent:", l.pitch_deck_sent);
        console.log("  mail_sent:", l.mail_sent);
    });

    const todayStart = new Date(todayUTC());
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const todayStr = todayUTC().slice(0, 10);

    console.log("\n=== Expected Metrics ===");
    console.log("all_meetings:", leads.filter(r => !!r.meeting_date).length, "(leads with a meeting_date set)");
    console.log("all_followups:", leads.filter(r => r.next_follow_up && r.status !== "Loss").length);
    console.log("all_overdue:", leads.filter(r => r.next_follow_up && new Date(r.next_follow_up) < todayStart && r.status !== "Loss").length);
    console.log("meetings_today:", leads.filter(r => {
        if (!r.meeting_date) return false;
        const d = new Date(r.meeting_date);
        return d >= todayStart && d < todayEnd;
    }).length);
    console.log("followups_today:", leads.filter(r => {
        if (!r.next_follow_up || r.status === "Loss") return false;
        return r.next_follow_up.slice(0, 10) === todayStr;
    }).length);
    console.log("calls_today:", leads.filter(r => r.call_status && r.call_status !== "Not Called" && isToday(r.last_called_at)).length, "(leads called today using last_called_at)");

    // Also check if DashboardCards is calling the right API
    const http = require("http");
    const https = require("https");

    // Login as KK via the Supabase user system - check what password they use
    console.log("\n=== Checking API for all users ===");
    const { data: profiles } = await s.from("profiles").select("id,email,role");
    console.log("All profiles:", profiles?.map(p => `${p.email} (${p.role})`).join(", "));

    // Try fetching dashboard metrics for admin via the API 
    const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb29uemdtZmJhbGljbndseWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDE2OTYsImV4cCI6MjA4NTY3NzY5Nn0.xRCMFxXl5llAeejFRxWj89JA-nyZIlErIcbo0PHr7wM";

    const testUsers = [
        { email: "admin@salescrm.com", password: "Koutham@512", label: "Admin" },
    ];

    for (const u of testUsers) {
        const body = JSON.stringify({ email: u.email, password: u.password });
        const tok = await new Promise((resolve) => {
            const r = https.request({
                hostname: "fioonzgmfbalicnwlydg.supabase.co",
                path: "/auth/v1/token?grant_type=password",
                method: "POST",
                headers: { apikey: ANON_KEY, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
            }, res => {
                let d = ""; res.on("data", c => d += c);
                res.on("end", () => {
                    try { resolve(JSON.parse(d).access_token); } catch { resolve(null); }
                });
            });
            r.on("error", () => resolve(null));
            r.write(body); r.end();
        });

        if (!tok) { console.log(`[${u.label}] Login failed`); continue; }

        const metricsResult = await new Promise((resolve) => {
            const r = http.request({
                hostname: "localhost", port: 3000,
                path: "/api/dashboard/metrics",
                headers: { Authorization: `Bearer ${tok}` }
            }, res => {
                let d = ""; res.on("data", c => d += c);
                res.on("end", () => {
                    try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, data: d }); }
                });
            });
            r.on("error", e => resolve({ error: e.message }));
            r.end();
        });

        if (metricsResult.error) {
            console.log(`[${u.label}] API error:`, metricsResult.error);
        } else {
            console.log(`[${u.label}] Status: ${metricsResult.status}`);
            console.log(`[${u.label}] all_leads_count: ${metricsResult.data.all_leads_count}`);
            console.log(`[${u.label}] all_meetings: ${metricsResult.data.all_meetings}`);
            console.log(`[${u.label}] all_followups: ${metricsResult.data.all_followups}`);
            if (metricsResult.status !== 200) {
                console.log(`[${u.label}] ERROR:`, JSON.stringify(metricsResult.data));
            }
        }
    }
}

main().catch(console.error);
