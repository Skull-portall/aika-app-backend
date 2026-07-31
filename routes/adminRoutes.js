const express = require("express");
const router = express.Router();
const { loginAdmin, getAdminProfile } = require("../controllers/adminController");
const { protectAdmin } = require("../middleware/adminAuthMiddleware");

router.post("/login", loginAdmin);
router.get("/profile", protectAdmin, getAdminProfile);

module.exports = router;
