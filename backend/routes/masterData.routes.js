// D:\SalesCRM\backend\routes\masterData.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const c = require("../controllers/masterData.controller");

router.use(auth);

router.get("/", c.getMasterData);
router.get("/all", c.getAllMasterData);
router.post("/", c.createMasterData);
router.put("/:id", c.updateMasterData);
router.delete("/:id", c.deleteMasterData);

module.exports = router;
