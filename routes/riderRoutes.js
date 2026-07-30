const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getRiderProfile,
  toggleOnlineStatus,
  updateRiderSettings,
  updateRiderProfile,
  getAllRiders,
  getPendingVerifications,
  updateRiderAdmin,
  verifyRider,
  archiveRider,
  deleteRiderPermanent,
  resetDatabaseController,
} = require("../controllers/riderController");

// Rider App endpoints (Protected by JWT)
router.get("/profile", protect, getRiderProfile);
router.put("/profile", protect, updateRiderProfile);
router.put("/online", protect, toggleOnlineStatus);
router.put("/settings", protect, updateRiderSettings);

// Admin Web Dashboard endpoints
router.post("/reset-db", resetDatabaseController);
router.get("/all", getAllRiders);
router.get("/pending", getPendingVerifications);
router.put("/:id/verify", verifyRider);
router.delete("/:id/permanent", deleteRiderPermanent);
router.route("/:id").put(updateRiderAdmin).delete(archiveRider);

module.exports = router;

