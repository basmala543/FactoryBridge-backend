const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Dashboard overview
router.get('/overview', dashboardController.getOverview);

// Capacity overview
router.get('/capacity', dashboardController.getCapacityOverview);

// Production jobs
router.get('/jobs', dashboardController.getProductionJobs);

// Update job status
router.put('/jobs/:orderId/status', dashboardController.updateJobStatus);

// Update dashboard settings (factory admin only)
router.put('/settings', dashboardController.updateDashboardSettings);

// Get revenue stats
router.get('/revenue', dashboardController.getRevenueStats);

module.exports = router;
