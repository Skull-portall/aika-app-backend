const express = require("express");
const router = express.Router();
const {
  checkPhone,
  verifyOTP,
  loginRider,
  registerPassword,
  savePersonalDetails,
  saveIdentityVerification,
  saveVehicleDetails,
  savePayoutAccount,
  saveContractorAgreement,
  getRiderStatus,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Public routes
router.post("/check-phone", checkPhone);
router.post("/verify-otp", verifyOTP);
router.post("/login", loginRider);

// Protected routes (requires Bearer token header)
router.post("/register-password", protect, registerPassword);
router.put("/personal-details", protect, savePersonalDetails);
router.put("/identity-verification", protect, saveIdentityVerification);
router.put("/vehicle-details", protect, saveVehicleDetails);
router.put("/payout-account", protect, savePayoutAccount);
router.put("/contractor-agreement", protect, saveContractorAgreement);
router.get("/status", protect, getRiderStatus);

module.exports = router;
