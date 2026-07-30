const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: String,
      required: true,
    },
    userType: {
      type: String,
      enum: ["Rider", "Vendor", "Customer"],
      default: "Rider",
    },
    subject: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: "General",
    },
    priority: {
      type: String,
      enum: ["Urgent", "High", "Medium", "Low"],
      default: "Medium",
    },

    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Closed"],
      default: "Open",
    },
    date: {
      type: String,
      default: "",
    },
    messages: [
      {
        sender: String,
        role: String, // 'agent' | 'user'
        text: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Ticket", TicketSchema);
