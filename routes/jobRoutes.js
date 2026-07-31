const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getAvailableJobs,
  getActiveJob,
  acceptJob,
  updateJobStatus,
  submitProofOfDelivery,
  reportJobIssue,
  getJobHistory,
  getAllJobsAdmin,
  createJob,
  updateJobAdmin,
  deleteJobAdmin,
  resetJobDates,
  updateJobLocation,
  getPublicTrackJob,
} = require("../controllers/jobController");

// Admin Web & Webhook & Public Endpoints
router.get("/all", getAllJobsAdmin);
router.post("/create", createJob);
router.post("/webhook", createJob);
router.post("/reset-dates", resetJobDates);
router.get("/track/:trackingCode", getPublicTrackJob);
router.put("/:id/admin", updateJobAdmin);
router.delete("/:id", deleteJobAdmin);

// Rider App Endpoints (Protected by JWT)
router.get("/available", protect, getAvailableJobs);
router.get("/active", protect, getActiveJob);
router.post("/:id/accept", protect, acceptJob);
router.put("/:id/status", protect, updateJobStatus);
router.put("/:id/location", protect, updateJobLocation);
router.post("/:id/pod", protect, submitProofOfDelivery);
router.post("/:id/issue", protect, reportJobIssue);
router.get("/history", protect, getJobHistory);

module.exports = router;

