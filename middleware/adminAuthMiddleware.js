const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const protectAdmin = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "aika_rider_app");

      req.admin = await Admin.findById(decoded.id).select("-password");

      if (!req.admin) {
        res.status(401);
        throw new Error("Not authorized as admin, user not found");
      }

      return next();
    } catch (error) {
      console.error("Admin Auth Error:", error.message);
      res.status(401);
      return next(new Error("Not authorized as admin, token failed"));
    }
  }

  if (!token) {
    res.status(401);
    return next(new Error("Not authorized as admin, no token provided"));
  }
};

module.exports = { protectAdmin };
