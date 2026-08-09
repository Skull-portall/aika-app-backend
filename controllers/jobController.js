const Job = require("../models/Job");
const Rider = require("../models/Rider");
const Transaction = require("../models/Transaction");

const http = require("http");
const https = require("https");

// Use Render-hosted bot URL in production, 127.0.0.1 in dev
const BOT_URL = process.env.BOT_URL || "https://aika-bot.onrender.com";

const sendBotNotification = (urlStr, payload) => {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const postData = JSON.stringify(payload);
      const transport = url.protocol === "https:" ? https : http;
      const defaultPort = url.protocol === "https:" ? 443 : 80;

      const req = transport.request({
        hostname: url.hostname,
        port: url.port || defaultPort,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
        timeout: 10000,
      }, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try { resolve(JSON.parse(body)); } catch (e) { resolve({ raw: body }); }
        });
      });

      req.on("error", (err) => reject(err));
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Connection timeout to bot server"));
      });

      req.write(postData);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
};

const notifyBotStatus = async (job, status, reason = "") => {
  try {
    let vendorPhone = job.vendorPhone || job.vendor?.phone || job.customer?.phone || "";
    if (!vendorPhone && job.vendor?.name) {
      try {
        const Vendor = require("../models/Vendor");
        const vDoc = await Vendor.findOne({ name: job.vendor.name }).lean();
        if (vDoc && vDoc.phone) vendorPhone = vDoc.phone;
      } catch (e) { /* ignore */ }
    }

    if (!vendorPhone) {
      vendorPhone = "08000000000";
    }

    const payload = {
      orderNumber: job.orderNumber || job.trackingCode,
      status: status || job.status,
      riderName: job.riderName || "Assigned Rider",
      riderPhone: job.riderPhone || "",
      vendorPhone: vendorPhone,
      reason: reason || job.issueReason || "",
    };

    console.log(`[Bot Notify] Sending status "${status}" for order "${job.orderNumber || job.trackingCode}" to vendor phone ${vendorPhone}...`);
    try {
      const data = await sendBotNotification(`${BOT_URL}/bot/notify-status`, payload);
      console.log(`[Bot Notify Success] Response for "${job.orderNumber || job.trackingCode}":`, data);
    } catch (httpErr) {
      console.warn(`[Bot Notify Note] Bot server on port 3000 is not reachable (${httpErr.message}). Start aika-bot to dispatch live WhatsApp alerts.`);
    }
  } catch (err) {
    console.warn("Bot notification error:", err.message);
  }
};

// @desc    Get Available Dispatches Nearby (Rider App)
// @route   GET /api/jobs/available
// @access  Private
const getAvailableJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({
      $or: [{ riderId: null }, { riderId: { $exists: false } }],
      status: { $in: ["available", "searching"] },
    }).sort({ createdAt: -1 });

    // For each job that belongs to a batch, attach all sibling delivery stops
    // so the rider can see every drop-off address for the order.
    const enrichedJobs = await Promise.all(
      jobs.map(async (job) => {
        const jobObj = job.toObject();
        if (jobObj.batchId) {
          const siblings = await Job.find({ batchId: jobObj.batchId })
            .select("orderNumber trackingCode customer vendor deliveryFee codAmount amountFormatted batchId status")
            .lean();
          jobObj.batchDeliveries = siblings.map((s, idx) => ({
            stopNumber: idx + 1,
            jobId: s._id,
            orderNumber: s.orderNumber,
            trackingCode: s.trackingCode,
            customerName: s.customer?.name || "Customer",
            customerPhone: s.customer?.phone || "",
            dropoffAddress: s.customer?.address || "Kaduna",
            deliveryFee: s.deliveryFee,
            codAmount: s.codAmount || 0,
            status: s.status,
          }));
        } else {
          // Single delivery — wrap it in the same shape for UI consistency
          jobObj.batchDeliveries = [{
            stopNumber: 1,
            jobId: jobObj._id,
            orderNumber: jobObj.orderNumber,
            trackingCode: jobObj.trackingCode,
            customerName: jobObj.customer?.name || "Customer",
            customerPhone: jobObj.customer?.phone || "",
            dropoffAddress: jobObj.customer?.address || "Kaduna",
            deliveryFee: jobObj.deliveryFee,
            codAmount: jobObj.codAmount || 0,
            status: jobObj.status,
          }];
        }
        return jobObj;
      })
    );

    res.status(200).json({
      success: true,
      count: enrichedJobs.length,
      jobs: enrichedJobs,
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Get Current Active Job for Rider (Rider App)
// @route   GET /api/jobs/active
// @access  Private
const getActiveJob = async (req, res, next) => {
  try {
    const activeJob = await Job.findOne({
      riderId: req.rider._id,
      status: { $nin: ["completed", "cancelled", "Failed"] },
    });

    res.status(200).json({
      success: true,
      activeJob: activeJob || null,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept a Job Dispatch
// @route   POST /api/jobs/:id/accept
// @access  Private
const acceptJob = async (req, res, next) => {
  try {
    const mongoose = require("mongoose");
    const idOrCode = req.params.id;
    let job = null;

    if (mongoose.Types.ObjectId.isValid(idOrCode)) {
      job = await Job.findById(idOrCode);
    }
    if (!job) {
      job = await Job.findOne({
        $or: [{ orderNumber: idOrCode }, { trackingCode: idOrCode }]
      });
    }
    if (!job) {
      job = await Job.findOne({ status: { $in: ["available", "searching", "Active"] } });
    }

    if (!job) {
      res.status(404);
      throw new Error("Job not found or no longer available");
    }

    const riderName = req.rider?.personalDetails?.fullName || req.rider?.name || req.rider?.phone || "Assigned Rider";
    const riderPhone = req.rider?.phone || req.rider?.personalDetails?.phone || "";

    // Resolve vendor phone if missing
    if (!job.vendorPhone) {
      if (job.vendor?.phone) job.vendorPhone = job.vendor.phone;
      else if (job.customer?.phone) job.vendorPhone = job.customer.phone;
      else if (job.vendor?.name) {
        try {
          const Vendor = require("../models/Vendor");
          const vDoc = await Vendor.findOne({ name: job.vendor.name }).lean();
          if (vDoc && vDoc.phone) job.vendorPhone = vDoc.phone;
        } catch (e) { /* ignore */ }
      }
    }

    job.riderId = req.rider._id;
    job.riderName = riderName;
    job.riderPhone = riderPhone;
    job.status = "heading_to_pickup";
    job.acceptedAt = new Date();
    await job.save();

    // Notify WhatsApp bot that rider has been assigned!
    await notifyBotStatus(job, "heading_to_pickup");

    res.status(200).json({
      success: true,
      message: "Job accepted successfully",
      job,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Job Status Workflow
// @route   PUT /api/jobs/:id/status
// @access  Private
const updateJobStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    let job = await Job.findById(req.params.id);

    if (!job) {
      job = await Job.findOne({ riderId: req.rider._id, status: { $ne: "completed" } });
    }

    if (!job) {
      res.status(404);
      throw new Error("Active job not found");
    }

    job.status = status || job.status;

    if (status === "completed") {
      job.completedAt = new Date();

      const now = new Date();
      const timeStr = `Today, ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

      await Transaction.create({
        riderId: req.rider._id,
        jobId: job._id,
        orderNumber: job.orderNumber,
        amount: job.deliveryFee,
        type: "earning",
        description: `Completed delivery (${job.orderNumber})`,
        formattedTime: timeStr,
      });

      const rider = await Rider.findById(req.rider._id);
      if (rider) {
        rider.completedJobsCount = (rider.completedJobsCount || 0) + 1;
        rider.totalEarnings = (rider.totalEarnings || 0) + job.deliveryFee;
        await rider.save();
      }
    }

    await job.save();

    // Notify WhatsApp bot of status update!
    await notifyBotStatus(job, status, req.body.reason);

    res.status(200).json({
      success: true,
      message: `Job status updated to ${job.status}`,
      job,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit Proof of Delivery Photo
// @route   POST /api/jobs/:id/pod
// @access  Private
const submitProofOfDelivery = async (req, res, next) => {
  try {
    const { proofPhotoUrl } = req.body;
    let job = await Job.findById(req.params.id);

    if (!job) {
      job = await Job.findOne({ riderId: req.rider._id });
    }

    if (!job) {
      res.status(404);
      throw new Error("Job not found");
    }

    job.proofPhotoUrl = proofPhotoUrl || "mock-proof-photo-url";
    job.status = "confirm_collection";
    await job.save();

    res.status(200).json({
      success: true,
      message: "Proof of delivery saved",
      job,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Report Job Issue / Exception
// @route   POST /api/jobs/:id/issue
// @access  Private
const reportJobIssue = async (req, res, next) => {
  try {
    const { issueReason } = req.body;
    let job = await Job.findById(req.params.id);

    if (!job) {
      job = await Job.findOne({ riderId: req.rider._id });
    }

    if (!job) {
      res.status(404);
      throw new Error("Job not found");
    }

    job.status = "issue";
    job.issueReason = issueReason || "Unspecified rider issue";
    await job.save();

    res.status(200).json({
      success: true,
      message: "Issue reported to dispatch support",
      job,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Completed Job History (Rider App)
// @route   GET /api/jobs/history
// @access  Private
const getJobHistory = async (req, res, next) => {
  try {
    const jobs = await Job.find({
      riderId: req.rider._id,
      status: "completed",
    }).sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: jobs.length,
      history: jobs,
    });
  } catch (error) {
    next(error);
  }
};

// ── Admin Web Dashboard Endpoints ─────────────────────────────────────────────

// @desc    Get All Deliveries for Web Dashboard (Deliveries.jsx)
// @route   GET /api/jobs/all
// @access  Public
const getAllJobsAdmin = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "customer.name": { $regex: search, $options: "i" } },
        { "vendor.name": { $regex: search, $options: "i" } },
        { riderName: { $regex: search, $options: "i" } },
      ];
    }

    const rawJobs = await Job.find(query).sort({ createdAt: -1 });

    const deliveries = rawJobs.map((j) => {
      let webStatus = "Active";
      if (j.status === "completed") webStatus = "Completed";
      else if (j.status === "issue" || j.status === "cancelled" || j.status === "Failed") webStatus = "Failed";
      else if (j.status === "Active" || j.status === "Completed" || j.status === "Failed") webStatus = j.status;

      const rawId = j._id ? j._id.toString() : Math.floor(1000 + Math.random() * 9000).toString();
      const fee = Number(j.deliveryFee) || 1500;

      return {
        _id: rawId,
        id: j.orderNumber || j.trackingCode || `#DEL-${rawId.slice(-4)}`,
        orderNumber: j.orderNumber || j.trackingCode || `#DEL-${rawId.slice(-4)}`,
        trackingCode: j.trackingCode || j.orderNumber || "",
        customer: j.customer?.name || "WhatsApp Customer",
        customerName: j.customer?.name || "WhatsApp Customer",
        phone: j.customer?.phone || j.vendorPhone || "",
        customerPhone: j.customer?.phone || j.vendorPhone || "",
        vendor: j.vendor?.name || "WhatsApp Vendor",
        vendorName: j.vendor?.name || "WhatsApp Vendor",
        rider: j.riderName || (j.status === "available" ? "Searching for Rider..." : "Unassigned Rider"),
        riderName: j.riderName || (j.status === "available" ? "Searching for Rider..." : "Unassigned Rider"),
        vehicle: "Delivery Motorcycle",
        deliveryFee: fee,
        amount: j.amountFormatted || `₦${fee.toLocaleString()}`,
        status: webStatus,
        rawStatus: j.status || "available",
        date: j.createdAt ? new Date(j.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Today",
        pickupAddress: j.vendor?.address || "Kaduna",
        dropoffAddress: j.customer?.address || "Kaduna",
      };
    });

    // Apply status filter if provided
    const filteredDeliveries = status && status !== "All"
      ? deliveries.filter((d) => d.status === status)
      : deliveries;

    res.status(200).json({
      success: true,
      count: filteredDeliveries.length,
      deliveries: filteredDeliveries,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new Job / Delivery Order (from Bot Webhook or API)
// @route   POST /api/jobs/create or POST /api/jobs
// @access  Public
const createJob = async (req, res, next) => {
  try {
    const {
      orderNumber,
      vendorName,
      vendorAddress,
      vendorPhone,
      customerName,
      customerAddress,
      customerPhone,
      itemsDescription,
      category,
      deliveryFee,
      codAmount,
      amountFormatted,
      status,
      trackingCode,
      batchId,
    } = req.body;

    const generatedOrderNo = orderNumber || trackingCode || `#DEL-${Math.floor(1000 + Math.random() * 9000)}`;

    const newJob = await Job.create({
      orderNumber: generatedOrderNo,
      trackingCode: trackingCode || generatedOrderNo.replace('#', ''),
      vendorPhone: vendorPhone || "",
      vendor: {
        name: vendorName || "WhatsApp Vendor",
        address: vendorAddress || "Kaduna",
        itemsDescription: itemsDescription || category || "General Items",
      },

      customer: {
        name: customerName || "Customer",
        address: customerAddress || "Kaduna",
        phone: customerPhone || vendorPhone || "",
      },
      category: category || "General",
      deliveryFee: deliveryFee || 1500,
      codAmount: codAmount || 0,
      amountFormatted: amountFormatted || `₦${((codAmount || 0) + (deliveryFee || 1500)).toLocaleString()}`,
      status: status || "available",
      batchId: batchId || "",
    });


    res.status(201).json({
      success: true,
      message: "Delivery job created successfully",
      job: newJob,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset all Rider delivery dates to current timestamp
// @route   POST /api/jobs/reset-dates
// @access  Public
const resetJobDates = async (req, res, next) => {
  try {
    const now = new Date();
    await Job.updateMany({}, { $set: { createdAt: now, updatedAt: now } });
    const Rider = require("../models/Rider");
    await Rider.updateMany({}, { $set: { updatedAt: now } });

    res.status(200).json({
      success: true,
      message: "All rider delivery dates have been reset to 100% current accurate timestamps",
      timestamp: now,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Delivery Job from Admin Web Dashboard
// @route   PUT /api/jobs/:id/admin
// @access  Public
const updateJobAdmin = async (req, res, next) => {
  try {
    const { status, riderName, customer, vendor } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) {
      res.status(404);
      throw new Error("Job not found");
    }

    if (status) job.status = status;
    if (riderName) job.riderName = riderName;
    if (customer?.name) job.customer.name = customer.name;
    if (customer?.phone) job.customer.phone = customer.phone;
    if (customer?.address) job.customer.address = customer.address;
    if (vendor?.name) job.vendor.name = vendor.name;
    if (vendor?.address) job.vendor.address = vendor.address;

    await job.save();
    res.status(200).json({ success: true, message: "Job updated", job });
  } catch (error) {
    next(error);
  }
};

// @desc    Permanently delete Delivery Job from database
// @route   DELETE /api/jobs/:id
// @access  Public
const deleteJobAdmin = async (req, res, next) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) {
      res.status(404);
      throw new Error("Job not found");
    }
    res.status(200).json({ success: true, message: "Delivery permanently deleted from database" });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Rider GPS Location
// @route   PUT /api/jobs/:id/location
// @access  Private (Rider)
const updateJobLocation = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude === undefined || longitude === undefined) {
      res.status(400);
      throw new Error("Latitude and longitude are required");
    }

    const mongoose = require("mongoose");
    const idOrCode = req.params.id;
    let job = null;

    if (mongoose.Types.ObjectId.isValid(idOrCode)) {
      job = await Job.findById(idOrCode);
    }
    if (!job) {
      job = await Job.findOne({
        $or: [{ orderNumber: idOrCode }, { trackingCode: idOrCode }]
      });
    }
    if (!job) {
      job = await Job.findOne({ riderId: req.rider._id, status: { $nin: ["completed", "cancelled", "Failed"] } });
    }

    if (job) {
      job.riderLat = Number(latitude);
      job.riderLng = Number(longitude);
      job.riderUpdatedAt = new Date();
      await job.save();
    }

    res.status(200).json({
      success: true,
      message: "Rider location updated",
      riderLat: Number(latitude),
      riderLng: Number(longitude),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Public Order Live Tracking Data
// @route   GET /api/jobs/track/:trackingCode
// @access  Public
const getPublicTrackJob = async (req, res, next) => {
  try {
    const code = req.params.trackingCode;
    const job = await Job.findOne({
      $or: [{ trackingCode: code }, { orderNumber: code }]
    }).lean();

    if (!job) {
      return res.status(404).json({ success: false, message: "Tracking reference not found" });
    }

    res.status(200).json({
      success: true,
      job: {
        orderNumber: job.orderNumber || job.trackingCode,
        trackingCode: job.trackingCode || job.orderNumber,
        status: job.status,
        vendor: job.vendor,
        customer: job.customer,
        riderName: job.riderName || "Assigned Rider",
        riderPhone: job.riderPhone || "",
        riderLat: job.riderLat || null,
        riderLng: job.riderLng || null,
        riderUpdatedAt: job.riderUpdatedAt || null,
        deliveryFee: job.deliveryFee,
        codAmount: job.codAmount,
        updatedAt: job.updatedAt,
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all Jobs in a Batch
// @route   GET /api/jobs/batch/:batchId
// @access  Public
const getJobsByBatch = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    if (!batchId) {
      res.status(400);
      throw new Error("batchId is required");
    }

    const jobs = await Job.find({ batchId }).sort({ createdAt: 1 }).lean();

    const stops = jobs.map((j, idx) => ({
      stopNumber: idx + 1,
      jobId: j._id,
      orderNumber: j.orderNumber,
      trackingCode: j.trackingCode,
      customerName: j.customer?.name || "Customer",
      customerPhone: j.customer?.phone || "",
      dropoffAddress: j.customer?.address || "Kaduna",
      pickupAddress: j.vendor?.address || "Kaduna",
      vendorName: j.vendor?.name || "Vendor",
      deliveryFee: j.deliveryFee,
      codAmount: j.codAmount || 0,
      amountFormatted: j.amountFormatted,
      status: j.status,
      riderName: j.riderName || "",
      createdAt: j.createdAt,
    }));

    res.status(200).json({
      success: true,
      batchId,
      count: stops.length,
      stops,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAvailableJobs,
  getActiveJob,
  acceptJob,
  updateJobStatus,
  submitProofOfDelivery,
  reportJobIssue,
  getJobHistory,
  getAllJobsAdmin,
  createJob,
  updateJobAdmin,
  deleteJobAdmin,
  resetJobDates,
  updateJobLocation,
  getPublicTrackJob,
  getJobsByBatch,
};

