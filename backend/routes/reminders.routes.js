// D:\SalesCRM\backend\routes\reminders.routes.js
const router = require("express").Router();
const auth = require("../middleware/auth");
const c = require("../controllers/reminders.controller");

router.get("/due-today", auth, c.getDueToday);
router.post("/trigger", auth, c.triggerReminders);

module.exports = router;
