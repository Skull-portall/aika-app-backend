const jwt = require("jsonwebtoken");
const Rider = require("../models/Rider");

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "your_jwt_secret_key_here", {
    expiresIn: "30d",
  });
};

// @desc    Check if a phone number is already registered
// @route   POST /api/auth/check-phone
// @access  Public
const checkPhone = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      res.status(400);
      throw new Error("Please enter a phone number");
    }

    const cleanPhone = phone.replace(/\D/g, "");
    const riderExists = await Rider.findOne({ phone: cleanPhone });

    // Archived accounts: block login AND new registration
    // Only permanently deleted phones (not in DB at all) can register fresh
    if (riderExists && riderExists.status === "Archived") {
      return res.status(200).json({
        phone: cleanPhone,
        registered: false,
        step: "otp",
        blocked: true,
        message: "This account has been deactivated by an administrator. Please contact support.",
      });
    }

    res.status(200).json({
      phone: cleanPhone,
      registered: !!riderExists && !!riderExists.password,
      step: riderExists ? riderExists.step : "otp",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP (mock simulation)
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res, next) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      res.status(400);
      throw new Error("Please provide phone and code");
    }

    const cleanPhone = phone.replace(/\D/g, "");

    // Mock OTP verification (123456 or 111111 works, or any 6 digits for testing)
    const isMockValid = code === "123456" || code === "111111" || code.length === 6;

    if (!isMockValid) {
      res.status(400);
      throw new Error("Invalid OTP verification code");
    }

    let rider = await Rider.findOne({ phone: cleanPhone });
    let isNew = false;

    // Archived accounts are completely blocked — cannot login or re-register
    // Only permanently deleted phones (not in DB) can create a new account
    if (rider && rider.status === "Archived") {
      res.status(403);
      throw new Error("This account has been deactivated by an administrator. You cannot sign up with this number. Please contact support.");
    }

    if (!rider) {
      // Phone not in DB at all (was permanently deleted or brand new) — create fresh account
      rider = await Rider.create({
        phone: cleanPhone,
        step: "personal-details",
      });
      isNew = true;
    }

    res.status(200).json({
      message: "OTP verified successfully",
      token: generateToken(rider._id),
      rider: {
        id: rider._id,
        phone: rider.phone,
        step: rider.step,
        personalDetails: rider.personalDetails,
      },
      isNew,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login a rider with phone and password
// @route   POST /api/auth/login
// @access  Public
const loginRider = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      res.status(400);
      throw new Error("Please enter phone and password");
    }

    const cleanPhone = phone.replace(/\D/g, "");
    const rider = await Rider.findOne({ phone: cleanPhone });

    if (!rider || !rider.password) {
      res.status(401);
      throw new Error("Invalid phone or password");
    }

    // Block archived (soft-deleted) or deactivated riders
    if (rider.status === "Archived") {
      res.status(403);
      throw new Error("Your account has been deactivated by an administrator. Please contact support.");
    }

    const isMatch = await rider.matchPassword(password);
    if (!isMatch) {
      res.status(401);
      throw new Error("Invalid phone or password");
    }

    res.status(200).json({
      message: "Login successful",
      token: generateToken(rider._id),
      rider: {
        id: rider._id,
        phone: rider.phone,
        step: rider.step,
        isVerified: rider.isVerified,
        personalDetails: rider.personalDetails,
        identityVerification: rider.identityVerification,
        vehicleDetails: rider.vehicleDetails,
        payoutAccount: rider.payoutAccount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set password (for registration or reset)
// @route   POST /api/auth/register-password
// @access  Private (Requires token from verify-otp)
const registerPassword = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      res.status(400);
      throw new Error("Please enter password");
    }

    const rider = await Rider.findById(req.rider._id);
    if (!rider) {
      res.status(404);
      throw new Error("Rider profile not found");
    }

    rider.password = password;
    if (rider.step === "otp") {
      rider.step = "personal-details";
    }
    await rider.save();

    res.status(200).json({
      message: "Password registered successfully",
      step: rider.step,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save Step 1: Personal Details
// @route   PUT /api/auth/personal-details
// @access  Private
const savePersonalDetails = async (req, res, next) => {
  try {
    const { fullName, dob, email, profilePhotoUrl } = req.body;

    if (!fullName || !dob) {
      res.status(400);
      throw new Error("Full name and Date of Birth are required");
    }

    const rider = await Rider.findById(req.rider._id);
    if (!rider) {
      res.status(404);
      throw new Error("Rider not found");
    }

    rider.personalDetails = {
      fullName,
      dob,
      email: email || "",
      profilePhotoUrl: profilePhotoUrl || "",
    };

    if (rider.step === "personal-details" || rider.step === "otp") {
      rider.step = "identity-verification";
    }
    await rider.save();

    res.status(200).json({
      message: "Personal details saved",
      rider: {
        id: rider._id,
        phone: rider.phone,
        step: rider.step,
        personalDetails: rider.personalDetails,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save Step 2: Identity Verification
// @route   PUT /api/auth/identity-verification
// @access  Private
const saveIdentityVerification = async (req, res, next) => {
  try {
    const { nin, selfieUrl } = req.body;

    if (!nin || nin.length < 11) {
      res.status(400);
      throw new Error("NIN must be at least 11 digits");
    }

    const rider = await Rider.findById(req.rider._id);
    if (!rider) {
      res.status(404);
      throw new Error("Rider not found");
    }

    rider.identityVerification = {
      nin,
      selfieUrl: selfieUrl || "",
    };

    if (rider.step === "identity-verification") {
      rider.step = "vehicle-details";
    }
    await rider.save();

    res.status(200).json({
      message: "Identity verification saved",
      rider: {
        id: rider._id,
        phone: rider.phone,
        step: rider.step,
        identityVerification: rider.identityVerification,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save Step 3: Vehicle Details
// @route   PUT /api/auth/vehicle-details
// @access  Private
const saveVehicleDetails = async (req, res, next) => {
  try {
    const { vehicleType, plateNumber, permitNumber, permitPhotoUrl } = req.body;

    if (!plateNumber || !permitNumber) {
      res.status(400);
      throw new Error("Plate number and VIO permit number are required");
    }

    const rider = await Rider.findById(req.rider._id);
    if (!rider) {
      res.status(404);
      throw new Error("Rider not found");
    }

    rider.vehicleDetails = {
      vehicleType: vehicleType || "Motorcycle",
      plateNumber,
      permitNumber,
      permitPhotoUrl: permitPhotoUrl || "",
    };

    if (rider.step === "vehicle-details") {
      rider.step = "payout-account";
    }
    await rider.save();

    res.status(200).json({
      message: "Vehicle details saved",
      rider: {
        id: rider._id,
        phone: rider.phone,
        step: rider.step,
        vehicleDetails: rider.vehicleDetails,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save Step 4: Payout Account
// @route   PUT /api/auth/payout-account
// @access  Private
const savePayoutAccount = async (req, res, next) => {
  try {
    const { bankName, accountNumber, verifiedName } = req.body;

    if (!bankName || !accountNumber || !verifiedName) {
      res.status(400);
      throw new Error("Bank name, account number, and verified name are required");
    }

    const rider = await Rider.findById(req.rider._id);
    if (!rider) {
      res.status(404);
      throw new Error("Rider not found");
    }

    rider.payoutAccount = {
      bankName,
      accountNumber,
      verifiedName,
    };

    if (rider.step === "payout-account") {
      rider.step = "contractor-agreement";
    }
    await rider.save();

    res.status(200).json({
      message: "Payout account saved",
      rider: {
        id: rider._id,
        phone: rider.phone,
        step: rider.step,
        payoutAccount: rider.payoutAccount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Step 5: Agree to Contractor Agreement
// @route   PUT /api/auth/contractor-agreement
// @access  Private
const saveContractorAgreement = async (req, res, next) => {
  try {
    const { agreed } = req.body;

    if (agreed === undefined) {
      res.status(400);
      throw new Error("agreed parameter is required");
    }

    const rider = await Rider.findById(req.rider._id);
    if (!rider) {
      res.status(404);
      throw new Error("Rider not found");
    }

    rider.agreement = {
      agreed,
      agreedAt: agreed ? new Date() : null,
    };

    if (rider.step === "contractor-agreement" && agreed) {
      rider.step = "under-review";
    }
    await rider.save();

    res.status(200).json({
      message: "Contractor agreement status updated",
      rider: {
        id: rider._id,
        phone: rider.phone,
        step: rider.step,
        agreement: rider.agreement,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Rider Status Details
// @route   GET /api/auth/status
// @access  Private
const getRiderStatus = async (req, res, next) => {
  try {
    const rider = await Rider.findById(req.rider._id);
    if (!rider) {
      res.status(404);
      throw new Error("Rider not found");
    }

    res.status(200).json({
      step: rider.step,
      isVerified: rider.isVerified,
      verificationStatus: rider.verificationStatus || (rider.isVerified ? "Approved" : rider.step === "rejected" ? "Rejected" : "Pending"),
      verificationReason: rider.verificationReason || "",
      personalDetails: rider.personalDetails,
      identityVerification: rider.identityVerification,
      vehicleDetails: rider.vehicleDetails,
      payoutAccount: rider.payoutAccount,
      agreement: rider.agreement,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
