const mongoose = require("mongoose");

const systemSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "default_config",
    },
    appName: {
      type: String,
      default: "Aika Logistics Control",
    },
    currency: {
      type: String,
      default: "NGN (₦)",
    },
    supportEmail: {
      type: String,
      default: "support@aika.ng",
    },
    dispatchFee: {
      type: Number,
      default: 1500,
    },
    maxRadiusKm: {
      type: Number,
      default: 5,
    },
    jobTimeoutMins: {
      type: Number,
      default: 10,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SystemSetting", systemSettingSchema);
