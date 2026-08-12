const dotenv = require("dotenv");
const connectDB = require("../config/db");
const Rider = require("../models/Rider");
const Vendor = require("../models/Vendor");
const Job = require("../models/Job");
const Ticket = require("../models/Ticket");
const Transaction = require("../models/Transaction");
const SystemSetting = require("../models/SystemSetting");
const Admin = require("../models/Admin");

dotenv.config();

const runFactoryReset = async () => {
  try {
    console.log("🚀 Starting Complete Database Factory Reset...");
    await connectDB();

    console.log("🧹 Wiping Riders...");
    await Rider.deleteMany({});

    console.log("🧹 Wiping Vendors...");
    await Vendor.deleteMany({});

    console.log("🧹 Wiping Jobs / Deliveries...");
    await Job.deleteMany({});

    console.log("🧹 Wiping Support Tickets...");
    await Ticket.deleteMany({});

    console.log("🧹 Wiping Transactions / Earnings...");
    await Transaction.deleteMany({});

    console.log("🧹 Wiping System Settings...");
    await SystemSetting.deleteMany({});

    console.log("🧹 Wiping Admin Accounts...");
    await Admin.deleteMany({});

    console.log("👤 Creating single primary default account: Aika Support...");
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

    console.log("✨ FACTORY RESET COMPLETE ✨");
    console.log("------------------------------------------");
    console.log(`Default Account: ${mainAdmin.name}`);
    console.log(`Email:           ${mainAdmin.email}`);
    console.log(`Password:        aika2024`);
    console.log("------------------------------------------");
    process.exit(0);
  } catch (error) {
    console.error("❌ Factory reset failed:", error.message);
    process.exit(1);
  }
};

runFactoryReset();
