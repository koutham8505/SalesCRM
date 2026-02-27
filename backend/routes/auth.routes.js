// D:\SalesCRM\backend\routes\auth.routes.js
const express = require("express");
const router = express.Router();
const { register, forgotPasswordRequest } = require("../controllers/auth.controller");

// POST /api/auth/register  — open (no JWT required)
router.post("/register", register);

// POST /api/auth/forgot-password-request — open (no JWT required)
// Submits a password reset request for admin/manager approval
router.post("/forgot-password-request", forgotPasswordRequest);

module.exports = router;
