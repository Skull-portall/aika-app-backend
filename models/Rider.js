const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const RiderSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: false,
    },
    inviteCode: {
      type: String,
      default: "",
    },
    step: {
      type: String,
      default: "otp",
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Online", "Offline", "Busy", "Archived"],
      default: "Offline",
    },
    rating: {
      type: Number,
      default: 4.9,
    },
    completedJobsCount: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    location: {
      latitude: { type: Number, default: 10.5105 },
      longitude: { type: Number, default: 7.4165 },
      city: { type: String, default: "Kaduna" },
    },
    settings: {
      pushEnabled: { type: Boolean, default: true },
      smsEnabled: { type: Boolean, default: true },
    },
    personalDetails: {
      fullName: { type: String, default: "" },
      dob: { type: String, default: "" },
      email: { type: String, default: "" },
      profilePhotoUrl: { type: String, default: "" },
    },
    identityVerification: {
      nin: { type: String, default: "" },
      selfieUrl: { type: String, default: "" },
    },
    vehicleDetails: {
      vehicleType: { type: String, default: "Motorcycle" },
      plateNumber: { type: String, default: "" },
      permitNumber: { type: String, default: "" },
      permitPhotoUrl: { type: String, default: "" },
    },
    payoutAccount: {
      bankName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      verifiedName: { type: String, default: "" },
    },
    agreement: {
      agreed: { type: Boolean, default: false },
      agreedAt: { type: Date },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    verificationReason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
RiderSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
RiderSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Rider", RiderSchema);
