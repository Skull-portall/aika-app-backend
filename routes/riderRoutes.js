const express = require("express");
const router = express.Router();
const {
  getRiderProfile,
  toggleOnlineStatus,
  updateRiderSettings,
  updateRiderProfile,
} = require("../controllers/riderController");
const { protect } = require("../middleware/authMiddleware");

router.get("/profile", protect, getRiderProfile);
router.put("/online", protect, toggleOnlineStatus);
router.put("/settings", protect, updateRiderSettings);
router.put("/profile", protect, updateRiderProfile);

module.exports = router;
