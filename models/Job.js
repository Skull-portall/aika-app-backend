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
    vendor: {
      name: { type: String, required: true, default: "Hajiya's Kitchen" },
      address: { type: String, required: true, default: "Unguwan Rimi, Kaduna" },
      itemsDescription: { type: String, default: "1x Large Family Platter + 2 Drinks" },
      fragile: { type: Boolean, default: true },
    },
    customer: {
      name: { type: String, required: true, default: "Fatima Yusuf" },
      address: { type: String, required: true, default: "No 12, Gwamma Road, Barnawa, Kaduna" },
      phone: { type: String, default: "+2348031234567" },
    },
    deliveryFee: {
      type: Number,
      required: true,
      default: 350,
    },
    codAmount: {
      type: Number,
      default: 4500,
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
      ],
      default: "available",
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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Job", JobSchema);
