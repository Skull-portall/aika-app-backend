const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/adminSettingController");

// System config routes
router.get("/public-config", getPublicSystemConfig);
router.put("/system-config", updateSystemConfig);

// Main Admin settings
router.route("/").get(getAdminSettings);
router.put("/profile", updateAdminProfile);
router.put("/security", updateAdminSecurity);
router.put("/notifications", updateAdminNotifications);

// Team members
router.post("/team/invite", inviteTeamMember);
router.put("/team/:id/permissions", updateMemberPermissions);
router.delete("/team/:id", deleteTeamMember);

// Active sessions
router.delete("/sessions/others/all", revokeOtherSessions);
router.delete("/sessions/:id", revokeSession);

module.exports = router;
