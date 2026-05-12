const mongoose = require('mongoose');
const Dashboard = require('../models/Dashboard');
const ProductionJob = require('../models/ProductionJob');
require('dotenv').config();

const MONGO_URL = "mongodb://basmala21102004_db_user:bas21102004@ac-obtbhf4-shard-00-00.qtldces.mongodb.net:27017,ac-obtbhf4-shard-00-01.qtldces.mongodb.net:27017,ac-obtbhf4-shard-00-02.qtldces.mongodb.net:27017/factorybridge?ssl=true&replicaSet=atlas-6nucod-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB');
    
    // Create or update dashboard
    let dashboard = await Dashboard.findOne();
    if (!dashboard) {
      dashboard = await Dashboard.create({
        revenue: 46000,
        rating: 4.3,
        incomingRequests: 5,
        activeProduction: 2,
        capacityOverview: {
          currentCapacityPercent: 65,
          totalCapacityUnits: 50000,
          availableUnits: 66,
          unitType: "Units"
        }
      });
      console.log('Dashboard created');
    }
    
    // Create sample production jobs
    const existingJobs = await ProductionJob.countDocuments();
    if (existingJobs === 0) {
      await ProductionJob.create([
        {
          orderId: "123456",
          productName: "Industrial Component A",
          completionPercent: 38,
          dueDate: new Date("2026-05-10"),
          status: "In Progress"
        },
        {
          orderId: "123457",
          productName: "Industrial Component B",
          completionPercent: 72,
          dueDate: new Date("2026-05-15"),
          status: "In Progress"
        }
      ]);
      console.log('Sample jobs created');
    }
    
    console.log('✅ Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedDatabase();
