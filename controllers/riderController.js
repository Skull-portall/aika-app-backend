const Rider = require("../models/Rider");

// @desc    Get Rider Profile
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
    await rider.save();

    res.status(200).json({
      success: true,
      message: rider.isOnline ? "Rider is now online" : "Rider is now offline",
      isOnline: rider.isOnline,
      rider: {
        id: rider._id,
        isOnline: rider.isOnline,
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

module.exports = {
  getRiderProfile,
  toggleOnlineStatus,
  updateRiderSettings,
  updateRiderProfile,
};
