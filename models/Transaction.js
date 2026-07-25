const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rider",
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },
    orderNumber: {
      type: String,
      default: "",
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ["earning", "payout", "bonus"],
      default: "earning",
    },
    description: {
      type: String,
      default: "Delivery Dispatch Fee",
    },
    formattedTime: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Transaction", TransactionSchema);
