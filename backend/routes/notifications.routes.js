// D:\SalesCRM\backend\routes\notifications.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const c = require("../controllers/notifications.controller");

router.use(auth);
router.get("/", c.getNotifications);
router.get("/unread-count", c.getUnreadCount);
router.put("/mark-read", c.markAllRead);
router.put("/:id/read", c.markOneRead);
router.post("/mention", c.createMention);

module.exports = router;
