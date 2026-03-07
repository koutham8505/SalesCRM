// D:\SalesCRM\backend\server.js
require("dotenv").config();
const app = require("./config/app");

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Sales CRM API running on port ${PORT}`);

  // ── Daily Follow-up Reminder Cron (8:00 AM IST = 02:30 UTC) ──
  try {
    const cron = require("node-cron");
    const { sendFollowUpEmails } = require("./controllers/reminders.controller");

    cron.schedule("30 2 * * *", async () => {
      console.log("⏰ [CRON] Sending daily follow-up reminder emails...");
      try {
        const result = await sendFollowUpEmails(false);
        console.log(`✅ [CRON] Reminders sent to ${result.sent} owner(s) for ${result.leads?.length || 0} lead(s).`);
      } catch (err) {
        console.error("❌ [CRON] Reminder error:", err.message);
      }
    }, { timezone: "UTC" });

    console.log("⏰ Daily reminder cron scheduled — fires at 08:00 AM IST (02:30 UTC)");
  } catch (e) {
    console.warn("⚠️  node-cron not installed — run: npm install node-cron nodemailer");
  }
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌ Port ${PORT} is already in use.`);
    process.exit(1);
  } else { throw err; }
});
