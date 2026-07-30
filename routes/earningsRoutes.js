const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getEarningsSummary, getAdminEarnings } = require("../controllers/earningsController");

router.get("/summary", protect, getEarningsSummary);
router.get("/admin", getAdminEarnings);

module.exports = router;
