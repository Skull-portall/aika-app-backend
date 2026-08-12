const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const sessionSchema = new mongoose.Schema({
  browser: { type: String, required: true },
  location: { type: String, default: "Kaduna, Nigeria" },
  deviceType: { type: String, default: "desktop" },
  isCurrent: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now },
});

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      default: "Jane Admin",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      default: "+234 800 000 0000",
    },
    role: {
      type: String,
      default: "Fleet Manager",
    },
    avatar: {
      type: String,
      default: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    notifications: {
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      dailyReports: { type: Boolean, default: true },
    },
    permissionsCount: {
      type: Number,
      default: 31,
    },
    modulePermissions: {
      type: Object,
      default: {
        dashboard: { view: true, manage: true },
        riders: { view: true, manage: true },
        vendors: { view: true, manage: true },
        deliveries: { view: true, manage: true },
        earnings: { view: true, manage: true, export: true },
        verification: { view: true, manage: true },
        support: { view: true, manage: true },
        settings: { view: false, manage: false },
      },
    },
    activeSessions: [sessionSchema],
    isYou: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: "#5D20D3",
    },
    initials: {
      type: String,
      default: "JA",
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Method to compare entered password with hashed password
adminSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Pre-save hook to hash password if modified
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model("Admin", adminSchema);
