const Rider = require("../models/Rider");
const Job = require("../models/Job");
const Transaction = require("../models/Transaction");

// @desc    Get Rider Profile (Mobile App)
// @route   GET /api/rider/profile
// @access  Private
const getRiderProfile = async (req, res, next) => {
  try {
    const rider = await Rider.findById(req.rider._id).select("-password");
    if (!rider) {
      res.status(404);
      throw new Error("Rider not found");
    }

    res.status(200).json({
      success: true,
      rider,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle Online / Offline status
// @route   PUT /api/rider/online
// @access  Private
const toggleOnlineStatus = async (req, res, next) => {
  try {
    const { isOnline } = req.body;
    const rider = await Rider.findById(req.rider._id);

    if (!rider) {
      res.status(404);
      throw new Error("Rider not found");
    }

    rider.isOnline = typeof isOnline === "boolean" ? isOnline : !rider.isOnline;
    rider.status = rider.isOnline ? "Online" : "Offline";
    await rider.save();

    res.status(200).json({
      success: true,
      message: rider.isOnline ? "Rider is now online" : "Rider is now offline",
      isOnline: rider.isOnline,
      rider: {
        id: rider._id,
        isOnline: rider.isOnline,
        status: rider.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Rider Settings (push notifications, SMS alerts)
// @route   PUT /api/rider/settings
// @access  Private
const updateRiderSettings = async (req, res, next) => {
  try {
    const { pushEnabled, smsEnabled } = req.body;
    const rider = await Rider.findById(req.rider._id);

    if (!rider) {
      res.status(404);
      throw new Error("Rider not found");
    }

    if (pushEnabled !== undefined) rider.settings.pushEnabled = pushEnabled;
    if (smsEnabled !== undefined) rider.settings.smsEnabled = smsEnabled;

    await rider.save();

    res.status(200).json({
      success: true,
      message: "Settings updated",
      settings: rider.settings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Rider Profile info
// @route   PUT /api/rider/profile
// @access  Private
const updateRiderProfile = async (req, res, next) => {
  try {
    const { fullName, email, phone, profilePhotoUrl } = req.body;
    const rider = await Rider.findById(req.rider._id);

    if (!rider) {
      res.status(404);
      throw new Error("Rider not found");
    }

    if (fullName) rider.personalDetails.fullName = fullName;
    if (email) rider.personalDetails.email = email;
    if (phone) rider.phone = phone.replace(/\D/g, "");
    if (profilePhotoUrl) rider.personalDetails.profilePhotoUrl = profilePhotoUrl;

    await rider.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      rider,
    });
  } catch (error) {
    next(error);
  }
};

// ── Admin Web Endpoints ───────────────────────────────────────────────────────

// @desc    Get all riders for admin table
// @route   GET /api/rider/all
// @access  Public
const getAllRiders = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    let query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { "personalDetails.fullName": { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { "location.city": { $regex: search, $options: "i" } },
        { "vehicleDetails.vehicleType": { $regex: search, $options: "i" } },
      ];
    }

    const rawRiders = await Rider.find(query).sort({ createdAt: -1 });

    const riders = rawRiders.map((r) => {
      const name = r.personalDetails?.fullName || r.phone || "Rider";
      const photo = r.personalDetails?.profilePhotoUrl || r.identityVerification?.selfieUrl;
      const avatar = (photo && photo.trim().length > 5)
        ? photo
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6D28D9&color=fff&bold=true`;
      const locationStr = typeof r.location === "string" ? r.location : (r.location?.city || r.location?.address || "Kaduna");

      return {
        id: r._id,
        _id: r._id,
        name,
        location: locationStr,
        avatar,
        status: r.status || (r.isOnline ? "Online" : "Offline"),
        rating: (r.rating || 5.0).toFixed(1),
        vehicle: r.vehicleDetails?.vehicleType ? `${r.vehicleDetails.vehicleType} (${r.vehicleDetails.plateNumber || ""})` : (r.vehicle || "Motorcycle"),
        earnings: `₦${(r.totalEarnings || 0).toLocaleString()}`,
        phone: r.phone || r.personalDetails?.phone || "",
        email: r.personalDetails?.email || "",
        isVerified: r.isVerified,
        completedJobsCount: r.completedJobsCount || 0,
        failedJobsCount: r.failedJobsCount || 0,
        cancelledJobsCount: r.cancelledJobsCount || 0,
        personalDetails: r.personalDetails,
        identityVerification: r.identityVerification,
        vehicleDetails: r.vehicleDetails,
        payoutAccount: r.payoutAccount,
      };
    });



    res.status(200).json({
      success: true,
      count: riders.length,
      riders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending verification applicants
// @route   GET /api/rider/pending
// @access  Public
const getPendingVerifications = async (req, res, next) => {
  try {
    // Fetch all non-archived riders who have started registration or submitted verification steps
    const rawRiders = await Rider.find({
      status: { $ne: "Archived" },
      $or: [
        { step: { $in: ["identity-verification", "vehicle-details", "payout-account", "contractor-agreement", "under-review", "approved", "rejected"] } },
        { "personalDetails.fullName": { $exists: true, $ne: "" } },
        { "identityVerification.nin": { $exists: true, $ne: "" } },
        { "vehicleDetails.plateNumber": { $exists: true, $ne: "" } },
        { verificationStatus: { $exists: true } }
      ]
    }).sort({ createdAt: -1 });

    const applicants = rawRiders.map((r) => {
      let currentStatus = "Pending";
      if (r.verificationStatus === "Approved" || r.isVerified) {
        currentStatus = "Approved";
      } else if (r.verificationStatus === "Rejected" || r.step === "rejected") {
        currentStatus = "Rejected";
      } else {
        currentStatus = "Pending";
      }

      return {
        id: r._id,
        _id: r._id,
        name: r.personalDetails?.fullName || r.phone || "Applicant",
        email: r.personalDetails?.email || r.email || "Not provided",
        avatar: r.personalDetails?.profilePhotoUrl || r.identityVerification?.selfieUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.personalDetails?.fullName || r.phone || 'Rider')}&background=6D28D9&color=fff&bold=true`,
        vehicle: r.vehicleDetails?.vehicleType
          ? `${r.vehicleDetails.vehicleType} (${r.vehicleDetails.plateNumber || ""})`
          : (r.vehicle || "Motorcycle"),
        licenseNo: r.vehicleDetails?.permitNumber || r.vehicleDetails?.plateNumber || "Not provided",
        applied: r.createdAt
          ? new Date(r.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "Recently",
        status: currentStatus,
        phone: r.phone || r.personalDetails?.phone || "Not provided",
        dob: r.personalDetails?.dob || "Not provided",
        location: typeof r.location === "string" ? r.location : (r.location?.city || "Kaduna"),
        nin: r.identityVerification?.nin || "Not provided",
        selfieUrl: r.identityVerification?.selfieUrl || r.personalDetails?.profilePhotoUrl || "",
        permitPhotoUrl: r.vehicleDetails?.permitPhotoUrl || "",
        bankName: r.payoutAccount?.bankName || "Not provided",
        accountNumber: r.payoutAccount?.accountNumber || "Not provided",
        verifiedName: r.payoutAccount?.verifiedName || r.personalDetails?.fullName || "Not provided",
        reason: r.verificationReason || "",
      };
    });


    res.status(200).json({
      success: true,
      count: applicants.length,
      applicants,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Rider from Admin Edit Drawer
// @route   PUT /api/rider/:id
// @access  Public
const updateRiderAdmin = async (req, res, next) => {
  try {
    const { name, phone, email, vehicle, status, location } = req.body;
    const rider = await Rider.findById(req.params.id);

    if (!rider) {
      res.status(404);
      throw new Error("Rider not found");
    }

    if (name) rider.personalDetails.fullName = name;
    if (email) rider.personalDetails.email = email;
    if (phone) rider.phone = phone;
    if (status) {
      rider.status = status;
      if (status === "Online") rider.isOnline = true;
      if (status === "Offline") rider.isOnline = false;
    }
    if (location) rider.location.city = location;
    if (vehicle) rider.vehicleDetails.vehicleType = vehicle;

    await rider.save();

    res.status(200).json({
      success: true,
      message: "Rider updated",
      rider: {
        id: rider._id,
        name: rider.personalDetails.fullName,
        location: rider.location.city,
        avatar: rider.personalDetails.profilePhotoUrl,
        status: rider.status,
        rating: (rider.rating || 5.0).toFixed(1),
        vehicle: `${rider.vehicleDetails.vehicleType} (${rider.vehicleDetails.plateNumber || ""})`,
        earnings: `₦${(rider.totalEarnings || 0).toLocaleString()}`,
        phone: rider.phone,
        email: rider.personalDetails.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve/Reject Rider Verification
// @route   PUT /api/rider/:id/verify
// @access  Public
const verifyRider = async (req, res, next) => {
  try {
    const { approve, reason } = req.body;
    const rider = await Rider.findById(req.params.id);

    if (!rider) {
      res.status(404);
      throw new Error("Rider not found");
    }

    rider.isVerified = approve === true;
    if (approve) {
      rider.verificationStatus = "Approved";
      rider.status = "Offline";
      rider.step = "approved";
      rider.verificationReason = "";
    } else {
      rider.verificationStatus = "Rejected";
      rider.status = "Offline";
      rider.step = "rejected";
      rider.verificationReason = reason || "Application documents rejected by administrator.";
    }

    await rider.save();

    res.status(200).json({
      success: true,
      message: approve ? "Rider verified successfully" : "Rider verification rejected",
      rider,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Archive Rider (soft delete - sets status to Archived)
// @route   DELETE /api/rider/:id
// @access  Public
const archiveRider = async (req, res, next) => {
  try {
    const rider = await Rider.findByIdAndUpdate(
      req.params.id,
      { status: "Archived", isOnline: false },
      { new: true }
    );
    if (!rider) {
      res.status(404);
      throw new Error("Rider not found");
    }

    res.status(200).json({ success: true, message: "Rider archived", rider });
  } catch (error) {
    next(error);
  }
};

// @desc    Permanently delete Rider from database (cascades: deletes Jobs & Transactions too)
// @route   DELETE /api/rider/:id/permanent
// @access  Public
const deleteRiderPermanent = async (req, res, next) => {
  try {
    const rider = await Rider.findById(req.params.id);
    if (!rider) {
      res.status(404);
      throw new Error("Rider not found");
    }

    const riderName = rider.personalDetails?.fullName || rider.phone || "Unknown Rider";

    // Cascade delete: remove all Jobs assigned to this rider
    const jobDeleteResult = await Job.deleteMany({
      $or: [
        { riderId: rider._id },
        { riderName: riderName },
      ],
    });

    // Cascade delete: remove all Transactions for this rider
    const txDeleteResult = await Transaction.deleteMany({ riderId: rider._id });

    // Delete the rider account itself
    await Rider.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `Rider "${riderName}" permanently deleted. ${jobDeleteResult.deletedCount} job(s) and ${txDeleteResult.deletedCount} transaction(s) also removed.`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Database (Development)
// @route   POST /api/rider/reset-db
// @access  Public
const resetDatabaseController = async (req, res, next) => {

  try {
    const { forceResetDatabase } = require("../config/seeder");
    const result = await forceResetDatabase();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};


