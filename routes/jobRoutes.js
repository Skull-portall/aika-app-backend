const express = require("express");
const router = express.Router();
const {
  getAvailableJobs,
  getActiveJob,
  acceptJob,
  updateJobStatus,
  submitProofOfDelivery,
  reportJobIssue,
  getJobHistory,
} = require("../controllers/jobController");
const { protect } = require("../middleware/authMiddleware");

router.get("/available", protect, getAvailableJobs);
router.get("/active", protect, getActiveJob);
router.get("/history", protect, getJobHistory);
router.post("/:id/accept", protect, acceptJob);
router.put("/:id/status", protect, updateJobStatus);
router.post("/:id/pod", protect, submitProofOfDelivery);
router.post("/:id/issue", protect, reportJobIssue);

module.exports = router;
