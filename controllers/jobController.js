const Job = require("../models/Job");
const Rider = require("../models/Rider");
const Transaction = require("../models/Transaction");

// Seed initial dispatches if database is empty
const seedInitialJobs = async () => {
  const count = await Job.countDocuments();
  if (count === 0) {
    await Job.create([
      {
        orderNumber: "AIKA-9823",
        deliveryFee: 350,
        codAmount: 4500,
        status: "available",
        vendor: {
          name: "Hajiya's Kitchen",
          address: "Unguwan Rimi, Kaduna",
          itemsDescription: "1x Large Family Platter + 2 Drinks",
          fragile: true,
        },
        customer: {
          name: "Fatima Yusuf",
          address: "No 12, Gwamma Road, Barnawa, Kaduna",
          phone: "+2348031234567",
        },
      },
      {
        orderNumber: "AIKA-9812",
        deliveryFee: 450,
        codAmount: 3200,
        status: "available",
        vendor: {
          name: "Mama Cass Restaurant",
          address: "Ahmadu Bello Way, Kaduna",
          itemsDescription: "2x Jollof Rice & Chicken Special",
          fragile: false,
        },
        customer: {
          name: "Ibrahim Danjuma",
          address: "Kawo New Extension, Kaduna",
          phone: "+2348029876543",
        },
      },
      {
        orderNumber: "AIKA-9799",
        deliveryFee: 350,
        codAmount: 1800,
        status: "available",
        vendor: {
          name: "Arewa Fresh Bakes",
          address: "Sabon Gari, Kaduna",
          itemsDescription: "1x Box Assorted Meat Pies",
          fragile: true,
        },
        customer: {
          name: "Aisha Bello",
          address: "Tudun Wada, Kaduna",
          phone: "+2348051122334",
        },
      },
    ]);
  }
};

// @desc    Get Available Dispatches Nearby
// @route   GET /api/jobs/available
// @access  Private
const getAvailableJobs = async (req, res, next) => {
  try {
    await seedInitialJobs();

    const jobs = await Job.find({ status: "available" }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Current Active Job for Rider
// @route   GET /api/jobs/active
// @access  Private
const getActiveJob = async (req, res, next) => {
  try {
    const activeJob = await Job.findOne({
      riderId: req.rider._id,
      status: { $nin: ["completed", "cancelled"] },
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
    let job = await Job.findById(req.params.id);

    if (!job) {
      // If job ID is mock or not found by Mongo ID, find by orderNumber or first available
      job = await Job.findOne({ status: "available" });
    }

    if (!job) {
      res.status(404);
      throw new Error("Job not found or no longer available");
    }

    job.riderId = req.rider._id;
    job.status = "heading_to_pickup";
    job.acceptedAt = new Date();
    await job.save();

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

      // Create transaction log
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

      // Update rider total earnings and stats
      const rider = await Rider.findById(req.rider._id);
      if (rider) {
        rider.completedJobsCount = (rider.completedJobsCount || 0) + 1;
        rider.totalEarnings = (rider.totalEarnings || 0) + job.deliveryFee;
        await rider.save();
      }
    }

    await job.save();

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

// @desc    Get Completed Job History
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

module.exports = {
  getAvailableJobs,
  getActiveJob,
  acceptJob,
  updateJobStatus,
  submitProofOfDelivery,
  reportJobIssue,
  getJobHistory,
};
