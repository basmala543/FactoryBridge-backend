const Dashboard = require('../models/Dashboard');
const ProductionJob = require('../models/ProductionJob');

class DashboardController {
  // Get complete dashboard overview
  async getOverview(req, res) {
    try {
      // Get or create default dashboard data
      let dashboard = await Dashboard.findOne();
      if (!dashboard) {
        dashboard = await Dashboard.create({});
      }
      
      // Get recent production jobs
      const recentJobs = await ProductionJob.find()
        .sort({ createdAt: -1 })
        .limit(5);
      
      res.status(200).json({
        success: true,
        data: {
          revenue: dashboard.revenue,
          rating: dashboard.rating,
          incomingRequests: dashboard.incomingRequests,
          activeProduction: dashboard.activeProduction,
          capacityOverview: dashboard.capacityOverview,
          recentJobs: recentJobs
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get capacity overview only
  async getCapacityOverview(req, res) {
    try {
      let dashboard = await Dashboard.findOne();
      if (!dashboard) {
        dashboard = await Dashboard.create({});
      }
      
      res.status(200).json({
        success: true,
        data: dashboard.capacityOverview
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get all production jobs
  async getProductionJobs(req, res) {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      
      let query = {};
      if (status) query.status = status;
      
      const jobs = await ProductionJob.find(query)
        .populate('assignedFactory', 'name location')
        .sort({ dueDate: 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await ProductionJob.countDocuments(query);
      
      res.status(200).json({
        success: true,
        data: jobs,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total: total
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update job completion status
  async updateJobStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { completionPercent, status } = req.body;
      
      const job = await ProductionJob.findOne({ orderId });
      if (!job) {
        return res.status(404).json({
          success: false,
          message: `Order ${orderId} not found`
        });
      }
      
      if (completionPercent !== undefined) {
        job.completionPercent = completionPercent;
      }
      
      if (status !== undefined) {
        job.status = status;
      }
      
      // Auto-complete logic
      if (job.completionPercent === 100) {
        job.status = 'Completed';
      }
      
      await job.save();
      
      // Emit socket event for real-time updates if io is available
      if (req.app.get('io')) {
        req.app.get('io').to('factory-admins').emit('job_updated', job);
      }
      
      res.status(200).json({
        success: true,
        data: job,
        message: `Order ${orderId} updated successfully`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update dashboard settings (factory admin only)
  async updateDashboardSettings(req, res) {
    try {
      const { revenue, rating, capacityOverview } = req.body;
      
      let dashboard = await Dashboard.findOne();
      if (!dashboard) {
        dashboard = new Dashboard();
      }
      
      if (revenue !== undefined) dashboard.revenue = revenue;
      if (rating !== undefined) dashboard.rating = rating;
      if (capacityOverview) {
        dashboard.capacityOverview = {
          ...dashboard.capacityOverview,
          ...capacityOverview
        };
      }
      
      dashboard.updatedAt = Date.now();
      await dashboard.save();
      
      res.status(200).json({
        success: true,
        data: dashboard,
        message: 'Dashboard settings updated'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get revenue statistics
  async getRevenueStats(req, res) {
    try {
      const dashboard = await Dashboard.findOne();
      
      res.status(200).json({
        success: true,
        data: {
          totalRevenue: dashboard?.revenue || 46000,
          targetRevenue: 100000,
          percentage: dashboard ? (dashboard.revenue / 100000) * 100 : 46,
          monthlyGrowth: 12.5
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new DashboardController();
