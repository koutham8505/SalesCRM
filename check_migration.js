// Applies the PITCH_DECK constraint update via Supabase service role
// Also verifies Phase 3 tables (rbac_permissions, rbac_role_defaults, sales_targets)
const path = require("path");
const { createClient } = require(path.join(__dirname, "backend", "node_modules", "@supabase/supabase-js"));

const PROJECT_REF = "fioonzgmfbalicnwlydg";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb29uemdtZmJhbGljbndseWRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDEwMTY5NiwiZXhwIjoyMDg1Njc3Njk2fQ.wtm8A0MsAY_igg4QlwAbe9N6MK50Fga_l26qtskeSOU";

const supabase = createClient(`https://${PROJECT_REF}.supabase.co`, SERVICE_KEY);

async function main() {
    console.log("=== Phase 3 Migration Check ===\n");

    // 1. Test PITCH_DECK insert (will fail with constraint error if not applied)
    console.log("1. Testing PITCH_DECK constraint...");
    const { error: pitchErr } = await supabase
        .from("lead_activities")
        .insert([{
            lead_id: "00000000-0000-0000-0000-000000000001",
            user_id: "00000000-0000-0000-0000-000000000001",
            type: "PITCH_DECK",
            description: "__constraint_probe__"
        }]);

    if (pitchErr) {
        if (pitchErr.message.includes("type_check") || pitchErr.message.includes("check")) {
            console.log("❌ PITCH_DECK constraint MISSING — must run extend_schema.sql in Supabase SQL Editor");
            console.log("   ALTER: DROP CONSTRAINT lead_activities_type_check, then ADD with PITCH_DECK\n");
        } else if (pitchErr.message.includes("foreign key") || pitchErr.message.includes("violates")) {
            console.log("✅ PITCH_DECK constraint OK (FK error expected for dummy UUIDs)");
            // Clean up if accidentally inserted
            await supabase.from("lead_activities").delete().eq("description", "__constraint_probe__");
        } else {
            console.log("⚠️  PITCH_DECK test:", pitchErr.message);
        }
    } else {
        console.log("✅ PITCH_DECK inserted (constraint OK) — cleaning up");
        await supabase.from("lead_activities").delete().eq("description", "__constraint_probe__");
    }

    // 2. Check Phase 3 tables
    console.log("\n2. Checking Phase 3 tables...");
    const tables = ["rbac_permissions", "rbac_role_defaults", "sales_targets"];
    for (const tbl of tables) {
        const { error } = await supabase.from(tbl).select("id").limit(1);
        if (error && (error.message.includes("does not exist") || error.code === "42P01")) {
            console.log(`   ❌ Table '${tbl}' missing — run phase3_schema.sql`);
        } else if (error) {
            console.log(`   ⚠️  '${tbl}': ${error.message}`);
        } else {
            console.log(`   ✅ '${tbl}' exists`);
        }
    }

    // 3. Check rbac_role_defaults has data
    console.log("\n3. Checking rbac_role_defaults seed data...");
    const { data: roleRows, error: roleErr } = await supabase.from("rbac_role_defaults").select("*");
    if (roleErr) {
        console.log("   ⚠️  Cannot read rbac_role_defaults:", roleErr.message);
    } else {
        console.log(`   ✅ ${roleRows?.length || 0} role default rows`);
    }

    // 4. Test dashboard/metrics endpoint
    console.log("\n4. Checking /api/dashboard/metrics...");
    const https = require("https");
    const http = require("http");

    // Login first
    const loginRes = await new Promise((resolve, reject) => {
        const body = JSON.stringify({ email: "admin@salescrm.com", password: "Koutham@512" });
        const r = https.request({
            hostname: `${PROJECT_REF}.supabase.co`,
            path: "/auth/v1/token?grant_type=password",
            method: "POST",
            headers: { "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb29uemdtZmJhbGljbndseWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDE2OTYsImV4cCI6MjA4NTY3NzY5Nn0.xRCMFxXl5llAeejFRxWj89JA-nyZIlErIcbo0PHr7wM", "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
        }, res => { let d = ""; res.on("data", c => d += c); res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } }); });
        r.on("error", reject); r.write(body); r.end();
    });

    if (!loginRes.access_token) {
        console.log("   ⚠️  Login failed, skipping API test");
    } else {
        const metricsRes = await new Promise((resolve, reject) => {
            const r = http.request({ hostname: "localhost", port: 3000, path: "/api/dashboard/metrics", method: "GET", headers: { "Authorization": `Bearer ${loginRes.access_token}` } },
                res => { let d = ""; res.on("data", c => d += c); res.on("end", () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, data: d }); } }); });
            r.on("error", reject); r.end();
        });
        if (metricsRes.status === 200) {
            const m = metricsRes.data;
            console.log(`   ✅ /api/dashboard/metrics OK`);
            console.log(`      all_leads_count=${m.all_leads_count}, calls_today_total=${m.calls_today_total}`);
            console.log(`      pitch_decks_sent_total=${m.pitch_decks_sent_total}, emails_sent_total=${m.emails_sent_total}`);
        } else {
            console.log(`   ❌ /api/dashboard/metrics ${metricsRes.status}: ${JSON.stringify(metricsRes.data).slice(0, 120)}`);
        }
    }

    console.log("\n=== Done ===");
}

main().catch(console.error);
