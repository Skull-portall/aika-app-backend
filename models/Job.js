const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rider",
      default: null,
    },
    riderName: {
      type: String,
      default: "",
    },
    riderPhone: {
      type: String,
      default: "",
    },
    vendorPhone: {
      type: String,
      default: "",
    },
    vendorId: {

      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },
    vendor: {
      name: { type: String, required: true, default: "Vendor" },
      address: { type: String, required: true, default: "Kaduna" },
      itemsDescription: { type: String, default: "Package Delivery" },
      fragile: { type: Boolean, default: true },
    },
    customer: {
      name: { type: String, required: true, default: "Customer" },
      address: { type: String, required: true, default: "Kaduna" },
      phone: { type: String, default: "" },
    },
    deliveryFee: {
      type: Number,
      required: true,
      default: 1500,
    },
    codAmount: {
      type: Number,
      default: 0,
    },
    amountFormatted: {
      type: String,
      default: "₦1,500",
    },
    status: {
      type: String,
      enum: [
        "available",
        "accepted",
        "heading_to_pickup",
        "at_pickup",
        "heading_to_dropoff",
        "at_dropoff",
        "proof_of_delivery",
        "confirm_collection",
        "completed",
        "cancelled",
        "issue",
        "Active",
        "Completed",
        "Failed",
      ],
      default: "available",
    },
    trackingCode: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "General Delivery",
    },
    packageSize: {
      type: String,
      default: "Small",
    },
    riderLat: {
      type: Number,
      default: null,
    },
    riderLng: {
      type: Number,
      default: null,
    },
    riderUpdatedAt: {
      type: Date,
      default: null,
    },
    proofPhotoUrl: {
      type: String,
      default: "",
    },
    issueReason: {
      type: String,
      default: "",
    },
    acceptedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    batchId: {
      type: String,
      default: "",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Job", JobSchema);
