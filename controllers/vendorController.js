const Vendor = require("../models/Vendor");
const Job = require("../models/Job");

// @desc    Get all vendors with filtering
// @route   GET /api/vendors
// @access  Public
const getVendors = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    let query = {};

    if (status && status !== "All") {
      query.status = status;
    }


    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    const vendors = await Vendor.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: vendors.length,
      vendors,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single vendor by ID
// @route   GET /api/vendors/:id
// @access  Public
const getVendorById = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      res.status(404);
      throw new Error("Vendor not found");
    }
    res.status(200).json({ success: true, vendor });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single vendor by Phone Number
// @route   GET /api/vendors/by-phone/:phone
// @access  Public
const getVendorByPhone = async (req, res, next) => {
  try {
    const cleanPhone = req.params.phone.trim();
    const vendor = await Vendor.findOne({
      $or: [
        { phone: cleanPhone },
        { phone: { $regex: cleanPhone.slice(-10), $options: "i" } }
      ]
    });
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }
    res.status(200).json({ success: true, vendor });
  } catch (error) {
    next(error);
  }
};

// @desc    Create or update vendor by phone
// @route   POST /api/vendors
// @access  Public
const createVendor = async (req, res, next) => {
  try {
    const { phone, name } = req.body;
    let vendor = null;

    if (phone) {
      vendor = await Vendor.findOneAndUpdate(
        { $or: [{ phone: phone.trim() }, { phone: { $regex: phone.trim().slice(-10), $options: "i" } }] },
        req.body,
        { new: true, upsert: true, runValidators: false }
      );
    } else {
      vendor = await Vendor.create(req.body);
    }

    res.status(201).json({ success: true, vendor });
  } catch (error) {
    next(error);
  }
};


// @desc    Update vendor
// @route   PUT /api/vendors/:id
// @access  Public
const updateVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!vendor) {
      res.status(404);
      throw new Error("Vendor not found");
    }
    res.status(200).json({ success: true, vendor });
  } catch (error) {
    next(error);
  }
};

// @desc    Archive vendor (soft delete)
// @route   DELETE /api/vendors/:id
// @access  Public
const archiveVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { status: "Archived" },
      { new: true }
    );
    if (!vendor) {
      res.status(404);
      throw new Error("Vendor not found");
    }
    res.status(200).json({ success: true, message: "Vendor archived", vendor });
  } catch (error) {
    next(error);
  }
};

// @desc    Permanently delete vendor from database (cascades: deletes all related Jobs/orders too)
// @route   DELETE /api/vendors/:id/permanent
// @access  Public
const deleteVendorPermanent = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      res.status(404);
      throw new Error("Vendor not found");
    }

    // Cascade delete: remove all Jobs/deliveries that belong to this vendor
    const jobDeleteResult = await Job.deleteMany({
      $or: [
        { vendorId: vendor._id },
        { "vendor.name": vendor.name },
      ],
    });

    // Delete the vendor itself
    await Vendor.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `Vendor "${vendor.name}" permanently deleted. ${jobDeleteResult.deletedCount} related delivery job(s) also removed.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVendors,
  getVendorById,
  getVendorByPhone,
  createVendor,
  updateVendor,
  archiveVendor,
  deleteVendorPermanent,
};

