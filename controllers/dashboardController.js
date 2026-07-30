const Rider = require("../models/Rider");
const Vendor = require("../models/Vendor");
const Job = require("../models/Job");
const Transaction = require("../models/Transaction");

// @desc   Get dashboard metrics & summary
// @route   GET /api/dashboard/stats
// @access  Public
const getDashboardStats = async (req, res, next) => {
  try {
    const totalRiders = await Rider.countDocuments({ status: { $ne: "Archived" } });
    const onlineRiders = await Rider.countDocuments({ isOnline: true });
    
    // Active vendors: all registered vendors whose status is not Archived
    const activeVendors = await Vendor.countDocuments({ status: { $ne: "Archived" } });
    
    // Active deliveries currently in progress or waiting for rider
    const activeJobs = await Job.countDocuments({ 
      status: { $nin: ["completed", "Completed", "delivered", "Delivered", "cancelled", "Cancelled"] } 
    });
    
    const totalJobs = await Job.countDocuments();
    const completedJobsCount = await Job.countDocuments({ status: { $in: ["completed", "Completed", "delivered", "Delivered"] } });

    // Calculate Total Revenue strictly from completed deliveries marked complete by riders
    const completedJobs = await Job.find({ status: { $in: ["completed", "Completed", "delivered", "Delivered"] } });
    let totalRevenueAmount = 0;
    completedJobs.forEach((j) => {
      totalRevenueAmount += (j.deliveryFee || 0);
    });

    const formattedRevenue = `₦${totalRevenueAmount.toLocaleString()}`;

    // Recent riders matching exact records from Riders page
    const rawRecentRiders = await Rider.find({ status: { $ne: "Archived" } })
      .sort({ createdAt: -1 })
      .limit(6);

    const recentRiders = rawRecentRiders.map((r) => {
      const name = r.personalDetails?.fullName || r.phone || "Rider";
      const photo = r.personalDetails?.profilePhotoUrl || r.identityVerification?.selfieUrl;
      const avatar = (photo && photo.trim().length > 5)
        ? photo
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6D28D9&color=fff&bold=true`;

      return {
        id: r._id,
        _id: r._id,
        name,
        avatar,
        status: r.status || (r.isOnline ? "Online" : "Offline"),
        rating: Number(r.rating) || 5.0,
        earnings: `₦${(r.totalEarnings || 0).toLocaleString()}`,

        phone: r.phone || r.personalDetails?.phone || "Not provided",
        email: r.personalDetails?.email || r.email || "Not provided",
        location: typeof r.location === "string" ? r.location : (r.location?.city || "Kaduna"),
        vehicle: r.vehicleDetails?.vehicleType || r.vehicle || "Motorcycle",
      };
    });

    // Top vendors matching exact records from Vendors page
    const topVendors = await Vendor.find({ status: { $ne: "Archived" } })
      .sort({ orders: -1, createdAt: -1 })
      .limit(5);


    res.status(200).json({
      success: true,
      stats: {
        totalRiders,
        onlineRiders,
        activeVendors,
        totalJobs,
        activeJobs,
        completedJobsCount,
        totalRevenue: formattedRevenue,
        fulfillmentRate: totalJobs > 0 ? `${((completedJobsCount / totalJobs) * 100).toFixed(1)}%` : "100%",
      },
      recentRiders,
      topVendors,
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  getDashboardStats,
};
