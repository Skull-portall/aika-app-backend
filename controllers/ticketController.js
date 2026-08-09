const Ticket = require("../models/Ticket");

// @desc    Create a new support ticket
// @route   POST /api/tickets
// @access  Public
const createTicket = async (req, res, next) => {
  try {
    const { user, userType, subject, category, priority, message, orderId, riderName, riderPhone } = req.body;

    if (!user || !subject) {
      res.status(400);
      throw new Error("user and subject are required");
    }

    const ticketId = "TKT-" + Math.floor(100000 + Math.random() * 900000);

    const ticket = await Ticket.create({
      ticketId,
      user: user || "Unknown Rider",
      userType: userType || "Rider",
      subject,
      category: category || "Delivery Issue",
      priority: priority || "Medium",
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      messages: message
        ? [{
            sender: riderName || user || "Rider",
            role: "user",
            text: `${message}${orderId ? `\n\nOrder Reference: ${orderId}` : ""}`,
            timestamp: new Date(),
          }]
        : [],
    });

    res.status(201).json({ success: true, ticket });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all support tickets
// @route   GET /api/tickets
// @access  Public
const getTickets = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    let query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { ticketId: { $regex: search, $options: "i" } },
        { user: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    const tickets = await Ticket.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get ticket by ID
// @route   GET /api/tickets/:id
// @access  Public
const getTicketById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      res.status(404);
      throw new Error("Ticket not found");
    }
    res.status(200).json({ success: true, ticket });
  } catch (error) {
    next(error);
  }
};

// @desc    Add reply message to ticket
// @route   POST /api/tickets/:id/reply
// @access  Public
const replyToTicket = async (req, res, next) => {
  try {
    const { text, sender, role } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      res.status(404);
      throw new Error("Ticket not found");
    }

    ticket.messages.push({
      sender: sender || "Support Agent",
      role: role || "agent",
      text,
      timestamp: new Date(),
    });

    if (ticket.status === "Open") {
      ticket.status = "In Progress";
    }

    await ticket.save();

    res.status(200).json({ success: true, ticket });
  } catch (error) {
    next(error);
  }
};

// @desc    Update ticket status
// @route   PUT /api/tickets/:id/status
// @access  Public
const updateTicketStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!ticket) {
      res.status(404);
      throw new Error("Ticket not found");
    }
    res.status(200).json({ success: true, ticket });
  } catch (error) {
    next(error);
  }
};

// @desc    Permanently delete a support ticket
// @route   DELETE /api/tickets/:id
// @access  Public
const deleteTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      res.status(404);
      throw new Error("Ticket not found");
    }
    res.status(200).json({ success: true, message: "Ticket permanently deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  replyToTicket,
  updateTicketStatus,
  deleteTicket,
};
