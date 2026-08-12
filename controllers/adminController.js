const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "aika_rider_app", {
    expiresIn: "30d",
  });
};

// @desc    Admin Login
// @route   POST /api/admin/login
// @access  Public
const loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error("Please provide email and password");
    }

    const cleanEmail = email.trim().toLowerCase();

    // Support login shorthand aliases
    const queryEmail =
      cleanEmail === "admin"
        ? "support@aika.ng"
        : cleanEmail === "admin@aika.com"
        ? "support@aika.ng"
        : cleanEmail;

    let admin = await Admin.findOne({ email: queryEmail });

    // Auto-seed Aika Support account if not found
    if (!admin && queryEmail === "support@aika.ng") {
      admin = await Admin.create({
        name: "Aika Support",
        email: "support@aika.ng",
        password: "aika2024",
        role: "Support Lead",
        avatar: "/aika-logo-avatar.svg",
        isYou: true,
        color: "#5D20D3",
        initials: "AS",
        permissionsCount: 31,
        modulePermissions: {
          dashboard: { view: true, manage: true },
          riders: { view: true, manage: true },
          vendors: { view: true, manage: true },
          deliveries: { view: true, manage: true },
          earnings: { view: true, manage: true, export: true },
          verification: { view: true, manage: true },
          support: { view: true, manage: true },
          settings: { view: true, manage: true },
        },
        activeSessions: [
          {
            browser: "Chrome on Windows",
            location: "Kaduna, Nigeria · Now",
            deviceType: "desktop",
            isCurrent: true,
          },
        ],
      });
      console.log("✅ Aika Support Account Seeded: support@aika.ng / aika2024");
    }

    if (admin && (await admin.matchPassword(password))) {
      res.status(200).json({
        success: true,
        message: "Admin login successful",
        user: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          avatar: admin.avatar,
          initials: admin.initials || admin.name.split(" ").map((n) => n[0]).join(""),
          color: admin.color || "#5D20D3",
          token: generateToken(admin._id),
        },
      });
    } else {
      res.status(401);
      throw new Error("Invalid email or password");
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get Admin Profile
// @route   GET /api/admin/profile
// @access  Private (Admin)
const getAdminProfile = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin._id).select("-password");
    if (!admin) {
      res.status(404);
      throw new Error("Admin user not found");
    }
    res.status(200).json({
      success: true,
      user: admin,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all admin team members (for assign dropdowns)
// @route   GET /api/admin/team
// @access  Public
const getTeamMembers = async (req, res, next) => {
  try {
    const members = await Admin.find({ active: true })
      .select("name email role avatar color initials")
      .sort({ createdAt: 1 });
    res.status(200).json({ success: true, members });
  } catch (error) {
    next(error);
  }
};

// @desc    Auto-seed default Aika Support account if empty & purge old non-support accounts
const seedAdminUser = async () => {
  try {
    // Delete non-support test accounts (Mark, Amaka, Tunde, Chisom)
    await Admin.deleteMany({ email: { $nin: ["support@aika.ng", "jane@aika.ng", "admin@aika.com"] } });

    // Migrate old admin@aika.com or jane@aika.ng to support@aika.ng
    const legacyAdmin = await Admin.findOne({ email: { $in: ["admin@aika.com", "jane@aika.ng"] } });
    if (legacyAdmin) {
      legacyAdmin.name = "Aika Support";
      legacyAdmin.email = "support@aika.ng";
      legacyAdmin.role = "Support Lead";
      legacyAdmin.initials = "AS";
      legacyAdmin.color = "#5D20D3";
      legacyAdmin.avatar = "/aika-logo-avatar.svg";
      await legacyAdmin.save();
    }

    // Ensure strictly only support@aika.ng exists by default
    await Admin.deleteMany({ email: { $ne: "support@aika.ng" } });

    const exists = await Admin.findOne({ email: "support@aika.ng" });
    if (!exists) {
      await Admin.create({
        name: "Aika Support",
        email: "support@aika.ng",
        password: "aika2024",
        role: "Support Lead",
        avatar: "/aika-logo-avatar.svg",
        isYou: true,
        color: "#5D20D3",
        initials: "AS",
        permissionsCount: 31,
      });
      console.log("✅ Primary Aika Support Account Seeded");
      console.log("   Email:    support@aika.ng");
      console.log("   Password: aika2024");
    }
  } catch (error) {
    console.error("❌ Failed to seed Aika Support account:", error.message);
  }
};

// @desc    Perform a complete Factory Reset of the Admin Accounts
// @route   POST /api/admin/factory-reset
// @access  Public
const factoryResetDatabase = async (req, res, next) => {
  try {
    await Admin.deleteMany({});
    const mainAdmin = await Admin.create({
      name: "Aika Support",
      email: "support@aika.ng",
      password: "aika2024",
      phone: "+234 800 AIKA 000",
      role: "Support Lead",
      avatar: "/aika-logo-avatar.svg",
      isYou: true,
      permissionsCount: 31,
      color: "#5D20D3",
      initials: "AS",
      modulePermissions: {
        dashboard: { view: true, manage: true },
        riders: { view: true, manage: true },
        vendors: { view: true, manage: true },
        deliveries: { view: true, manage: true },
        earnings: { view: true, manage: true, export: true },
        verification: { view: true, manage: true },
        support: { view: true, manage: true },
        settings: { view: true, manage: true },
      },
      activeSessions: [
        { browser: "Chrome on Windows", location: "Kaduna, Nigeria · Now", deviceType: "desktop", isCurrent: true },
      ],
    });

    res.status(200).json({
      success: true,
      message: "Database factory reset completed successfully. Only Aika Support default account remains.",
      account: {
        name: mainAdmin.name,
        email: mainAdmin.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loginAdmin,
  getAdminProfile,
  getTeamMembers,
  seedAdminUser,
  factoryResetDatabase,
};
