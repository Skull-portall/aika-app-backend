const express = require("express");
const router = express.Router();
const { loginAdmin, getAdminProfile, getTeamMembers, factoryResetDatabase } = require("../controllers/adminController");
const { protectAdmin } = require("../middleware/adminAuthMiddleware");

router.post("/login", loginAdmin);
router.get("/profile", protectAdmin, getAdminProfile);
router.get("/team", getTeamMembers);
router.post("/factory-reset", factoryResetDatabase);

module.exports = router;
