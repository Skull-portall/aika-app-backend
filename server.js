const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const { errorHandler } = require("./middleware/errorMiddleware");

// Load env variables
dotenv.config();

// Connect Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health Check Route
app.get("/", (req, res) => {
  res.status(200).json({ status: "online", message: "Welcome to Aika Rider API Server" });
});

// Mount API Route Modules
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/rider", require("./routes/riderRoutes"));
app.use("/api/jobs", require("./routes/jobRoutes"));
app.use("/api/earnings", require("./routes/earningsRoutes"));

// Global Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Aika Rider API Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
