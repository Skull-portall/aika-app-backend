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
      throw new Error("Please provide email/username and password");
    }

    const cleanEmail = email.trim().toLowerCase();
    
    // Support login with 'admin' shorthand or 'admin@aika.com'
    const queryEmail = (cleanEmail === "admin") ? "admin@aika.com" : cleanEmail;

    let admin = await Admin.findOne({ email: queryEmail });

    // Auto-seed default admin if not found
    if (!admin && queryEmail === "admin@aika.com") {
      admin = await Admin.create({
        name: "Abbas Modibbo",
        email: "admin@aika.com",
        password: "admin123",
        role: "Developer",
      });
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
          token: generateToken(admin._id),
        },
      });
    } else {
      res.status(401);
      throw new Error("Invalid admin email or password");
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

// @desc    Auto-seed default Admin user if empty
const seedAdminUser = async () => {
  try {
    const count = await Admin.countDocuments();
    if (count === 0) {
      await Admin.create({
        name: "Abbas Modibbo",
        email: "admin@aika.com",
        password: "admin123",
        role: "Developer",
      });
      console.log("✅ Default Admin Account Seeded: admin@aika.com / admin123 (Abbas Modibbo - Developer)");
    } else {
      // Update existing admin user name & role to Abbas Modibbo / Developer if needed
      await Admin.updateMany(
        { email: "admin@aika.com" },
        { name: "Abbas Modibbo", role: "Developer" }
      );
    }
  } catch (error) {
    console.error("❌ Failed to seed default admin user:", error.message);
  }
};

module.exports = {
  loginAdmin,
  getAdminProfile,
  seedAdminUser,
};
