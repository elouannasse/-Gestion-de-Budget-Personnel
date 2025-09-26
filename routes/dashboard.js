const express = require("express");
const router = express.Router();
const DashboardController = require("../controllers/DashboardController");
const { requireAuth } = require("../middleware/auth");

// All dashboard routes require authentication
router.use(requireAuth);

// Dashboard routes
router.get("/", DashboardController.showDashboard);
router.get("/stats", DashboardController.getStats);

module.exports = router;
