const mongoose = require("mongoose");

const VendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      default: "Kaduna North",
    },
    category: {
      type: String,
      required: true,
      default: "Food & Drinks",
    },
    orders: {
      type: Number,
      default: 0,
    },
    orderValue: {
      type: String,
      default: "₦0",
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Suspended", "Archived"],
      default: "Active",
    },
    phone: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      default: "",
    },
    rating: {
      type: Number,
      default: 4.8,
    },
    avatar: {
      type: String,
      default: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=120&auto=format&fit=crop",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Vendor", VendorSchema);
