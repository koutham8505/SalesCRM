// Run migration using Supabase Management API
// Ref: https://supabase.com/docs/reference/management-api
const https = require("https");
const fs = require("fs");

const PROJECT_REF = "fioonzgmfbalicnwlydg";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb29uemdtZmJhbGljbndseWRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDEwMTY5NiwiZXhwIjoyMDg1Njc3Njk2fQ.wtm8A0MsAY_igg4QlwAbe9N6MK50Fga_l26qtskeSOU";

function postSQL(sql) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ query: sql });
        const options = {
            hostname: `${PROJECT_REF}.supabase.co`,
            port: 443,
            path: "/rest/v1/rpc/exec_sql",  // won't work — fallback needed
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": SERVICE_KEY,
                "Authorization": `Bearer ${SERVICE_KEY}`,
                "Prefer": "return=representation",
            },
        };

        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", (c) => data += c);
            res.on("end", () => resolve({ status: res.statusCode, data }));
        });
        req.on("error", reject);
        req.write(body);
        req.end();
    });
}

// Alternative: Use the database connection string directly via pg
// Supabase provides a Postgres connection at:
// postgres://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
// But we don't have the DB password here.

// Let's try another approach: create an RPC function first, then call it
async function createExecFunction() {
    // First, try to create a helper function via PostgREST
    // This won't work either since PostgREST can't create functions

    // The real solution: use the Supabase SQL HTTP API
    // POST to https://{ref}.supabase.co/rest/v1/rpc/ won't work for DDL

    // Let's try the newer Supabase pg endpoint
    const body = JSON.stringify({ query: fs.readFileSync(__dirname + "/extend_schema.sql", "utf8") });

    return new Promise((resolve, reject) => {
        const options = {
            hostname: `${PROJECT_REF}.supabase.co`,
            port: 443,
            path: "/pg/query",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": SERVICE_KEY,
                "Authorization": `Bearer ${SERVICE_KEY}`,
                "Content-Length": Buffer.byteLength(body),
            },
        };

        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", (c) => data += c);
            res.on("end", () => {
                console.log(`Response status: ${res.statusCode}`);
                console.log(`Response body: ${data.slice(0, 500)}`);
                resolve({ status: res.statusCode, data });
            });
        });
        req.on("error", reject);
        req.write(body);
        req.end();
    });
}

// Try yet another approach: use Supabase's database webhook/function mechanism
// Or simply use the supabase-js from backend node_modules

async function main() {
    console.log("Attempting to run migration...\n");

    // Approach: use require from backend/node_modules  
    try {
        const path = require("path");
        const backendPath = path.join(__dirname, "backend", "node_modules", "@supabase", "supabase-js");
        const { createClient } = require(path.join(__dirname, "backend", "node_modules", "@supabase", "supabase-js"));

        const supabase = createClient(
            `https://${PROJECT_REF}.supabase.co`,
            SERVICE_KEY,
            { db: { schema: "public" } }
        );

        // Test if columns exist already
        console.log("Checking if migration already applied...");
        const { data, error } = await supabase
            .from("my_leads")
            .select("alt_phone,board,tier,fees,student_strength,last_called_at,proposal_sent")
            .limit(1);

        if (error && error.message.includes("column")) {
            console.log(`❌ Columns missing: ${error.message}`);
            console.log("\n════════════════════════════════════════════");
            console.log("  PLEASE RUN THIS SQL IN SUPABASE SQL EDITOR:");
            console.log("════════════════════════════════════════════\n");
            console.log(fs.readFileSync(__dirname + "/extend_schema.sql", "utf8"));
            process.exit(1);
        } else if (error) {
            console.log(`Unexpected error: ${error.message}`);
            process.exit(1);
        } else {
            console.log("✅ All new columns exist! Migration already applied.");
            console.log(`   Sample row: ${JSON.stringify(data[0] || {})}`);

            // Now test PITCH_DECK constraint
            console.log("\nChecking PITCH_DECK type constraint...");
            const { error: typeErr } = await supabase
                .from("lead_activities")
                .insert([{
                    lead_id: "00000000-0000-0000-0000-000000000000",
                    user_id: "00000000-0000-0000-0000-000000000000",
                    type: "PITCH_DECK",
                    description: "constraint_test"
                }]);

            // Even if it fails due to FK, if it doesn't fail due to CHECK constraint, we're good
            if (typeErr && typeErr.message.includes("lead_activities_type_check")) {
                console.log("❌ PITCH_DECK type not yet allowed — constraint needs updating");
                console.log("   Please run the ALTER TABLE statements for lead_activities from extend_schema.sql");
                process.exit(1);
            } else {
                console.log("✅ PITCH_DECK type accepted (or FK error expected)");
                // Clean up test row if it was inserted
                await supabase.from("lead_activities").delete().eq("description", "constraint_test");
            }

            console.log("\n✅ Database is ready! You can now run the tests.");
        }
    } catch (err) {
        console.error("Error:", err.message);
        console.log("\n════════════════════════════════════════════");
        console.log("  PLEASE RUN THIS SQL IN SUPABASE SQL EDITOR:");
        console.log("════════════════════════════════════════════\n");
        console.log(fs.readFileSync(__dirname + "/extend_schema.sql", "utf8"));
        process.exit(1);
    }
}

main();
