const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const seedDatabase = require("./config/seeder");
const { errorHandler } = require("./middleware/errorMiddleware");

// Load env variables
dotenv.config();

// Connect Database & Seed initial data after connection safely
const initServer = async () => {
  try {
    await connectDB();
    await seedDatabase();
  } catch (err) {
    console.error("❌ DB Initialization Error:", err.message);
  }
};
initServer();


const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health Check Route
app.get("/", (req, res) => {
  res.status(200).json({ status: "online", message: "Welcome to Aika Unified API Server" });
});

// Mount API Route Modules
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/rider", require("./routes/riderRoutes"));
app.use("/api/vendors", require("./routes/vendorRoutes"));
app.use("/api/jobs", require("./routes/jobRoutes"));
app.use("/api/earnings", require("./routes/earningsRoutes"));
app.use("/api/tickets", require("./routes/ticketRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));

// Global Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Aika Unified API Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
