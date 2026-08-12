const Admin = require("../models/Admin");
const SystemSetting = require("../models/SystemSetting");

// Helper to seed initial team members if DB is fresh
const ensureDefaultAdmins = async () => {
  // Delete any legacy/test admin accounts that are not support@aika.ng
  await Admin.deleteMany({ email: { $ne: "support@aika.ng", $nin: ["jane@aika.ng", "admin@aika.com"] } });

  // Look for the primary Aika Support account
  let mainAdmin = await Admin.findOne({ email: "support@aika.ng" });

  // Migrate old jane@aika.ng or admin@aika.com → support@aika.ng if it exists
  if (!mainAdmin) {
    mainAdmin = await Admin.findOne({ email: { $in: ["jane@aika.ng", "admin@aika.com"] } });
    if (mainAdmin) {
      mainAdmin.name = "Aika Support";
      mainAdmin.email = "support@aika.ng";
      mainAdmin.role = "Support Lead";
      mainAdmin.initials = "AS";
      mainAdmin.color = "#5D20D3";
      mainAdmin.avatar = "/aika-logo-avatar.svg";
      await mainAdmin.save();
    }
  }

  // Delete any remaining legacy accounts
  await Admin.deleteMany({ email: { $ne: "support@aika.ng" } });

  if (!mainAdmin) {
    mainAdmin = await Admin.create({
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
    console.log("✅ Primary Aika Support account created: support@aika.ng / aika2024");
  }

  let sysConfig = await SystemSetting.findOne({ key: "default_config" });
  if (!sysConfig) {
    sysConfig = await SystemSetting.create({ key: "default_config" });
  }

  return { mainAdmin, sysConfig };
};

// @desc    Get complete admin settings (profile, team, sessions, system config)
// @route   GET /api/admin/settings
// @access  Public / Admin
const getAdminSettings = async (req, res, next) => {
  try {
    const { mainAdmin, sysConfig } = await ensureDefaultAdmins();
    const teamMembers = await Admin.find().sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      profile: {
        id: mainAdmin._id,
        fullName: mainAdmin.name,
        email: mainAdmin.email,
        phone: mainAdmin.phone,
        role: mainAdmin.role,
        avatarUrl: mainAdmin.avatar,
      },
      security: {
        twoFactorEnabled: mainAdmin.twoFactorEnabled,
      },
      notifications: mainAdmin.notifications,
      activeSessions: mainAdmin.activeSessions,
      teamMembers: teamMembers.map((m) => ({
        id: m._id,
        name: m.name,
        email: m.email,
        role: m.role,
        isYou: m.isYou || m.email === mainAdmin.email,
        permissionsCount: m.permissionsCount || 8,
        modulePermissions: m.modulePermissions,
        color: m.color || "#5D20D3",
        initials: m.initials || m.name.slice(0, 2).toUpperCase(),
        active: m.active !== false,
      })),
      systemConfig: sysConfig,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update admin profile settings
// @route   PUT /api/admin/settings/profile
// @access  Public / Admin
const updateAdminProfile = async (req, res, next) => {
  try {
    const { fullName, email, phone, avatarUrl } = req.body;
    let admin = await Admin.findOne({ isYou: true }) || await Admin.findOne({ email: "jane@aika.ng" }) || await Admin.findOne();

    if (!admin) {
      res.status(404);
      throw new Error("Admin user not found");
    }

    if (fullName) admin.name = fullName;
    if (email) admin.email = email;
    if (phone) admin.phone = phone;
    if (avatarUrl !== undefined) admin.avatar = avatarUrl;

    await admin.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile: {
        id: admin._id,
        fullName: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        avatarUrl: admin.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update security & password
// @route   PUT /api/admin/settings/security
// @access  Public / Admin
const updateAdminSecurity = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, twoFactorEnabled } = req.body;
    let admin = await Admin.findOne({ isYou: true }) || await Admin.findOne({ email: "jane@aika.ng" }) || await Admin.findOne();

    if (!admin) {
      res.status(404);
      throw new Error("Admin user not found");
    }

    if (twoFactorEnabled !== undefined) {
      admin.twoFactorEnabled = twoFactorEnabled;
    }

    if (newPassword) {
      if (currentPassword) {
        const isMatch = await admin.matchPassword(currentPassword);
        if (!isMatch) {
          res.status(400);
          throw new Error("Current password is incorrect");
        }
      }
      admin.password = newPassword;
    }

    await admin.save();

    res.status(200).json({
      success: true,
      message: "Security settings updated successfully",
      twoFactorEnabled: admin.twoFactorEnabled,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update notification preferences
// @route   PUT /api/admin/settings/notifications
// @access  Public / Admin
const updateAdminNotifications = async (req, res, next) => {
  try {
    const { emailNotifications, pushNotifications, dailyReports } = req.body;
    let admin = await Admin.findOne({ isYou: true }) || await Admin.findOne({ email: "jane@aika.ng" }) || await Admin.findOne();

    if (!admin) {
      res.status(404);
      throw new Error("Admin user not found");
    }

    admin.notifications = {
      emailNotifications: emailNotifications !== undefined ? emailNotifications : admin.notifications.emailNotifications,
      pushNotifications: pushNotifications !== undefined ? pushNotifications : admin.notifications.pushNotifications,
      dailyReports: dailyReports !== undefined ? dailyReports : admin.notifications.dailyReports,
    };

    await admin.save();

    res.status(200).json({
      success: true,
      message: "Notification preferences updated",
      notifications: admin.notifications,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Invite new team member
// @route   POST /api/admin/settings/team/invite
// @access  Public / Admin
const inviteTeamMember = async (req, res, next) => {
  try {
    const { name, email, role } = req.body;

    if (!name || !email) {
      res.status(400);
      throw new Error("Name and email are required");
    }

    const existing = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      res.status(400);
      throw new Error("A team member with this email already exists");
    }

    const colors = ["#0284C7", "#D97706", "#059669", "#E11D48", "#7C3AED"];
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    const created = await Admin.create({
      name,
      email: email.toLowerCase().trim(),
      password: "password123",
      role: role || "Support Agent",
      isYou: false,
      permissionsCount: role === "Operations" ? 12 : 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      initials: initials || "TM",
    });

    res.status(201).json({
      success: true,
      message: "Team member invited successfully",
      member: {
        id: created._id,
        name: created.name,
        email: created.email,
        role: created.role,
        isYou: false,
        permissionsCount: created.permissionsCount,
        modulePermissions: created.modulePermissions,
        color: created.color,
        initials: created.initials,
        active: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update permissions for a team member
// @route   PUT /api/admin/settings/team/:id/permissions
// @access  Public / Admin
const updateMemberPermissions = async (req, res, next) => {
  try {
    const { permissionsCount, modulePermissions } = req.body;
    const member = await Admin.findById(req.params.id);

    if (!member) {
      res.status(404);
      throw new Error("Team member not found");
    }

    if (permissionsCount !== undefined) member.permissionsCount = permissionsCount;
    if (modulePermissions) member.modulePermissions = modulePermissions;

    await member.save();

    res.status(200).json({
      success: true,
      message: `Permissions updated for ${member.name}`,
      member: {
        id: member._id,
        name: member.name,
        permissionsCount: member.permissionsCount,
        modulePermissions: member.modulePermissions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove team member
// @route   DELETE /api/admin/settings/team/:id
// @access  Public / Admin
const deleteTeamMember = async (req, res, next) => {
  try {
    const member = await Admin.findByIdAndDelete(req.params.id);
    if (!member) {
      res.status(404);
      throw new Error("Team member not found");
    }

    res.status(200).json({
      success: true,
      message: `${member.name} removed from team`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke session
// @route   DELETE /api/admin/settings/sessions/:id
// @access  Public / Admin
const revokeSession = async (req, res, next) => {
  try {
    let admin = await Admin.findOne({ isYou: true }) || await Admin.findOne({ email: "jane@aika.ng" }) || await Admin.findOne();
    if (!admin) {
      res.status(404);
      throw new Error("Admin not found");
    }

    admin.activeSessions = admin.activeSessions.filter(
      (s) => String(s._id) !== String(req.params.id)
    );
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Session revoked",
      activeSessions: admin.activeSessions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke all other sessions
// @route   DELETE /api/admin/settings/sessions/others/all
// @access  Public / Admin
const revokeOtherSessions = async (req, res, next) => {
  try {
    let admin = await Admin.findOne({ isYou: true }) || await Admin.findOne({ email: "jane@aika.ng" }) || await Admin.findOne();
    if (!admin) {
      res.status(404);
      throw new Error("Admin not found");
    }

    admin.activeSessions = admin.activeSessions.filter((s) => s.isCurrent);
    await admin.save();

    res.status(200).json({
      success: true,
      message: "All other sessions signed out",
      activeSessions: admin.activeSessions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Public System Config (read by Mobile App & Web Frontend)
// @route   GET /api/admin/settings/public-config
// @access  Public
const getPublicSystemConfig = async (req, res, next) => {
  try {
    let sysConfig = await SystemSetting.findOne({ key: "default_config" });
    if (!sysConfig) {
      sysConfig = await SystemSetting.create({ key: "default_config" });
    }

    res.status(200).json({
      success: true,
      config: {
        appName: sysConfig.appName,
        currency: sysConfig.currency,
        supportEmail: sysConfig.supportEmail,
        dispatchFee: sysConfig.dispatchFee,
        maxRadiusKm: sysConfig.maxRadiusKm,
        jobTimeoutMins: sysConfig.jobTimeoutMins,
        maintenanceMode: sysConfig.maintenanceMode,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update System Config
// @route   PUT /api/admin/settings/system-config
// @access  Public / Admin
const updateSystemConfig = async (req, res, next) => {
  try {
    let sysConfig = await SystemSetting.findOne({ key: "default_config" });
    if (!sysConfig) {
      sysConfig = await SystemSetting.create({ key: "default_config" });
    }

    const { appName, currency, supportEmail, dispatchFee, maxRadiusKm, jobTimeoutMins, maintenanceMode } = req.body;

    if (appName) sysConfig.appName = appName;
    if (currency) sysConfig.currency = currency;
    if (supportEmail) sysConfig.supportEmail = supportEmail;
    if (dispatchFee !== undefined) sysConfig.dispatchFee = Number(dispatchFee);
    if (maxRadiusKm !== undefined) sysConfig.maxRadiusKm = Number(maxRadiusKm);
    if (jobTimeoutMins !== undefined) sysConfig.jobTimeoutMins = Number(jobTimeoutMins);
    if (maintenanceMode !== undefined) sysConfig.maintenanceMode = Boolean(maintenanceMode);

    await sysConfig.save();

    res.status(200).json({
      success: true,
      message: "System configuration updated",
      config: sysConfig,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminSettings,
  updateAdminProfile,
  updateAdminSecurity,
  updateAdminNotifications,
  inviteTeamMember,
  updateMemberPermissions,
  deleteTeamMember,
  revokeSession,
  revokeOtherSessions,
  getPublicSystemConfig,
  updateSystemConfig,
};
