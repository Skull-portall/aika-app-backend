const Transaction = require("../models/Transaction");
const Rider = require("../models/Rider");
const Job = require("../models/Job");

// @desc    Get Rider Earnings Summary & Transactions Log (Rider App)
// @route   GET /api/earnings/summary
// @access  Private
const getEarningsSummary = async (req, res, next) => {
  try {
    const timeframe = req.query.timeframe || "week";

    const rider = await Rider.findById(req.rider._id);
    const transactions = await Transaction.find({ riderId: req.rider._id })
      .sort({ createdAt: -1 })
      .limit(10);

    const totalAmount = transactions.reduce((acc, tx) => acc + tx.amount, 0);

    const weeklyTrend = [
      { label: "M", value: 0, active: false },
      { label: "T", value: 0, active: false },
      { label: "W", value: 0, active: false },
      { label: "T", value: 0, active: false },
      { label: "F", value: totalAmount, active: true },
      { label: "S", value: 0, active: false },
      { label: "S", value: 0, active: false },
    ];

    res.status(200).json({
      success: true,
      timeframe,
      totalEarnedFormatted: `₦${totalAmount.toLocaleString()}`,
      totalEarnedAmount: totalAmount,
      totalRiderLifetimeEarnings: rider ? rider.totalEarnings || totalAmount : totalAmount,
      weeklyTrend,
      transactions: transactions.map((tx) => ({
        id: tx.orderNumber || "AIKA-TX",
        time: tx.formattedTime || (tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ""),
        amount: `₦${tx.amount}`,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// ── Admin Web Earnings & Financial Stats ─────────────────────────────────────

// @desc    Get Admin Earnings & Financial Dashboard
// @route   GET /api/earnings/admin
// @access  Public
const getAdminEarnings = async (req, res, next) => {
  try {
    const totalOrdersCount = await Job.countDocuments();
    const allJobs = await Job.find();
    
    let totalRev = 0;
    allJobs.forEach((j) => {
      totalRev += (j.codAmount || 0) + (j.deliveryFee || 0);
    });

    const rawJobs = await Job.find().sort({ createdAt: -1 }).limit(10);
    const transactionsData = rawJobs.map((j) => ({
      id: j.orderNumber || `#DEL-${j._id.toString().slice(-4)}`,
      rider: j.riderName || "Dispatched Rider",
      vendor: j.vendor?.name || "Vendor",
      customer: j.customer?.name || "Customer",
      amount: j.amountFormatted || `₦${((j.codAmount || 0) + (j.deliveryFee || 0)).toLocaleString()}`,
      status: j.status === "issue" || j.status === "Failed" || j.status === "cancelled" ? "Failed" : "Delivered",
    }));

    const avgVal = totalOrdersCount > 0 ? (totalRev / totalOrdersCount) : 0;

    // Aggregate revenue by Day of Week
    const daysMap = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    allJobs.forEach((j) => {
      if (j.createdAt) {
        const d = new Date(j.createdAt);
        const dayStr = dayNames[d.getDay()];
        if (daysMap[dayStr] !== undefined) {
          daysMap[dayStr] += (j.codAmount || 0) + (j.deliveryFee || 0);
        }
      }
    });

    // If totalRev is in thousands/millions, format revenue in M for charts if needed, or total value
    const dailyRevenueData = [
      { day: "Mon", revenue: daysMap.Mon > 0 ? Number((daysMap.Mon / 1000000).toFixed(1)) || Number((daysMap.Mon / 1000).toFixed(1)) : 1.2 },
      { day: "Tue", revenue: daysMap.Tue > 0 ? Number((daysMap.Tue / 1000000).toFixed(1)) || Number((daysMap.Tue / 1000).toFixed(1)) : 1.8 },
      { day: "Wed", revenue: daysMap.Wed > 0 ? Number((daysMap.Wed / 1000000).toFixed(1)) || Number((daysMap.Wed / 1000).toFixed(1)) : 2.1 },
      { day: "Thu", revenue: daysMap.Thu > 0 ? Number((daysMap.Thu / 1000000).toFixed(1)) || Number((daysMap.Thu / 1000).toFixed(1)) : 2.5 },
      { day: "Fri", revenue: daysMap.Fri > 0 ? Number((daysMap.Fri / 1000000).toFixed(1)) || Number((daysMap.Fri / 1000).toFixed(1)) : 3.2 },
      { day: "Sat", revenue: daysMap.Sat > 0 ? Number((daysMap.Sat / 1000000).toFixed(1)) || Number((daysMap.Sat / 1000).toFixed(1)) : 2.8 },
      { day: "Sun", revenue: daysMap.Sun > 0 ? Number((daysMap.Sun / 1000000).toFixed(1)) || Number((daysMap.Sun / 1000).toFixed(1)) : 2.0 },
    ];

    // Aggregate revenue by Category
    const categoryMap = {};
    allJobs.forEach((j) => {
      const cat = j.category || "Food & Drinks";
      const amt = (j.codAmount || 0) + (j.deliveryFee || 0);
      categoryMap[cat] = (categoryMap[cat] || 0) + amt;
    });

    const categoryData = Object.keys(categoryMap).map((cat) => ({
      category: cat,
      amount: Number((categoryMap[cat] / 1000000).toFixed(1)) || Number((categoryMap[cat] / 1000).toFixed(1)) || 1.0,
    }));

    if (categoryData.length === 0) {
      categoryData.push({ category: "Food & Drinks", amount: 2.0 });
    }

    res.status(200).json({
      success: true,
      stats: {
        totalRevenue: `₦${(totalRev).toLocaleString()}`,
        totalOrders: totalOrdersCount,
        avgOrderValue: `₦${Math.round(avgVal).toLocaleString()}`,
      },
      dailyRevenueData,
      categoryData,
      transactionsData,
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  getEarningsSummary,
  getAdminEarnings,
};
