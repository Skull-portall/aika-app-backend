const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: String,
  role: { type: String, enum: ["agent", "user", "system"], default: "user" },
  text: String,
  timestamp: { type: Date, default: Date.now },
});

const noteSchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: { type: String, default: "Jane Admin" },
  createdAt: { type: Date, default: Date.now },
});

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
    riderName: {
      type: String,
      default: "",
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
    orderId: {
      type: String,
      default: "",
    },
    assignedTo: {
      name: { type: String, default: "Unassigned" },
      email: { type: String, default: "" },
      avatar: { type: String, default: "/aika-logo-avatar.svg" },
      assignedAt: { type: Date },
    },
    messages: [messageSchema],
    internalNotes: [noteSchema],
    date: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Ticket", TicketSchema);
