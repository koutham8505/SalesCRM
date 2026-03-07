// D:\SalesCRM\backend\routes\announcements.routes.js
const router = require("express").Router();
const auth = require("../middleware/auth");
const c = require("../controllers/announcements.controller");

router.get("/", auth, c.getAnnouncements);
router.post("/", auth, c.createAnnouncement);
router.delete("/:id", auth, c.deleteAnnouncement);

module.exports = router;
