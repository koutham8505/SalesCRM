// D:\SalesCRM\backend\routes\profile.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
    getMyProfile,
    updateMyProfile,
    changePassword,
    submitFeatureRequest,
    getMyFeatureRequests,
} = require("../controllers/profile.controller");

router.use(auth);

router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);
router.post("/change-password", changePassword);
router.post("/feature-request", submitFeatureRequest);
router.get("/feature-requests", getMyFeatureRequests);

module.exports = router;
