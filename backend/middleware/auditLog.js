// D:\SalesCRM\backend\middleware\auditLog.js
const supabase = require("../config/supabase");

async function logAudit(userId, userEmail, actionType, targetId, targetTable, payload) {
    try {
        await supabase.from("audit_log").insert([{
            user_id: userId,
            user_email: userEmail,
            action_type: actionType,
            target_id: targetId ? String(targetId) : null,
            target_table: targetTable || null,
            payload_snapshot: payload || null,
        }]);
    } catch (err) {
        console.error("Audit log failed:", err.message);
    }
}

module.exports = logAudit;
