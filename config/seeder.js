const Rider = require("../models/Rider");
const Vendor = require("../models/Vendor");
const Job = require("../models/Job");
const Ticket = require("../models/Ticket");
const Transaction = require("../models/Transaction");

// Seed Database - Pure empty seeder (Zero mock/sample data)
const seedDatabase = async () => {
  try {
    console.log("ℹ️ Pure database mode active. No sample mock data will be auto-created.");
  } catch (error) {
    console.error("Error in seeder:", error.message);
  }
};

// Force clear all sample database records for a 100% clean production environment
const forceResetDatabase = async () => {
  try {
    console.log("🧹 Clearing all database records...");
    await Rider.deleteMany({});
    await Vendor.deleteMany({});
    await Job.deleteMany({});
    await Ticket.deleteMany({});
    await Transaction.deleteMany({});
    console.log("✨ Database completely cleared! 0 sample records remain.");
    return { success: true, message: "Database completely cleared! 0 sample records remain." };
  } catch (error) {
    console.error("Error clearing database:", error.message);
    throw error;
  }
};

const resetRiderDeliveryDates = async () => {
  try {
    const now = new Date();
    await Job.updateMany({}, { $set: { createdAt: now, updatedAt: now } });
    await Rider.updateMany({}, { $set: { updatedAt: now } });
    return { success: true, message: "Rider delivery dates reset to current live timestamps" };
  } catch (error) {
    console.error("Error resetting rider delivery dates:", error.message);
    throw error;
  }
};

module.exports = seedDatabase;
module.exports.seedDatabase = seedDatabase;
module.exports.forceResetDatabase = forceResetDatabase;
module.exports.resetRiderDeliveryDates = resetRiderDeliveryDates;
