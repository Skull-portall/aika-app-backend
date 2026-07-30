const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/aika_db";

  const attemptConnect = async (retries = 3) => {
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
      console.error(`❌ MongoDB connection error: ${error.message}`);
      if (retries > 0) {
        console.log(`🔄 Retrying MongoDB connection in 3 seconds... (${retries} retries left)`);
        setTimeout(() => attemptConnect(retries - 1), 3000);
      } else {
        console.warn("⚠️ Continuing in offline mode. Make sure your IP is whitelisted on MongoDB Atlas (Network Access -> Allow Access From Anywhere 0.0.0.0/0).");
      }
    }
  };

  await attemptConnect();
};

module.exports = connectDB;

