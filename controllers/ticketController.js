const Ticket = require("../models/Ticket");

// Seed initial support tickets if DB is empty
const ensureDefaultTickets = async () => {
  const count = await Ticket.countDocuments();
  if (count === 0) {
    await Ticket.create([
      {
        ticketId: "TKT-884201",
        user: "Ibrahim Usman (+234 803 123 4567)",
        riderName: "Ibrahim Usman",
        userType: "Rider",
        subject: "App crashes when tapping Arrived at Dropoff",
        category: "App Bug",
        priority: "High",
        status: "Open",
        date: "11 Aug 2026",
        assignedTo: { name: "Aika Support", email: "support@aika.ng", avatar: "/aika-logo-avatar.svg" },
        messages: [
          { sender: "Ibrahim Usman", role: "user", text: "Every time I tap Arrived at Dropoff on my Samsung phone, the app reloads.", timestamp: new Date() },
          { sender: "Aika Support", role: "agent", text: "Hello Ibrahim, we have updated the app with smooth loading controls. Please update to the latest build.", timestamp: new Date() }
        ],
        internalNotes: [
          { text: "Rider is using Android 13 on Samsung A52. Verified resolved in v1.2.", author: "Aika Support" }
        ]
      },
      {
        ticketId: "TKT-771049",
        user: "Khadijah Stores (Vendor)",
        riderName: "Khadijah Stores",
        userType: "Vendor",
        subject: "Batch delivery 3 stops payout discrepancy",
        category: "Payout Issue",
        priority: "Urgent",
        status: "In Progress",
        date: "10 Aug 2026",
        assignedTo: { name: "Aika Support", email: "support@aika.ng", avatar: "/aika-logo-avatar.svg" },
        messages: [
          { sender: "Khadijah Stores", role: "user", text: "We dispatched 3 deliveries in one batch order but the wallet credited for only 2 stops.", timestamp: new Date() }
        ],
        internalNotes: [
          { text: "Checked transaction log TXN-994. Adjusting ₦1,500 balance for stop 3.", author: "Aika Support" }
        ]
      },
      {
        ticketId: "TKT-650312",
        user: "Musa Danjuma (+234 802 999 8888)",
        riderName: "Musa Danjuma",
        userType: "Rider",
        subject: "Request for new Aika Rider branded helmet",
        category: "Equipment",
        priority: "Low",
        status: "Resolved",
        date: "09 Aug 2026",
        assignedTo: { name: "Aika Support", email: "support@aika.ng", avatar: "/aika-logo-avatar.svg" },
        messages: [
          { sender: "Musa Danjuma", role: "user", text: "My helmet visor was damaged during rain dispatch yesterday.", timestamp: new Date() },
          { sender: "Aika Support", role: "agent", text: "Approved! Please visit the Kaduna hub tomorrow between 9 AM and 4 PM to collect your new gear.", timestamp: new Date() }
        ],
        internalNotes: [
          { text: "Issued voucher #HELM-8812.", author: "Aika Support" }
        ]
      }
    ]);
  }
};

// @desc    Create a new support ticket
// @route   POST /api/tickets
// @access  Public
const createTicket = async (req, res, next) => {
  try {
    const { user, userType, subject, category, priority, message, orderId, riderName } = req.body;

    if (!user || !subject) {
      res.status(400);
      throw new Error("user and subject are required");
    }

    const ticketId = "TKT-" + Math.floor(100000 + Math.random() * 900000);

    const ticket = await Ticket.create({
      ticketId,
      user: user || "Unknown User",
      riderName: riderName || user || "Rider",
      userType: userType || "Rider",
      subject,
      category: category || "Delivery Issue",
      priority: priority || "Medium",
      orderId: orderId || "",
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
    await ensureDefaultTickets();

    const { status, search, user } = req.query;
    let query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (user) {
      const cleanUser = String(user).trim();
      const rawDigits = cleanUser.replace(/\D/g, "");
      const last10 = rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits;

      const userConditions = [{ user: { $regex: cleanUser, $options: "i" } }];
      if (last10.length >= 7) {
        userConditions.push({ user: { $regex: last10 } });
      }

      query.$or = userConditions;
    }

    if (search) {
      const searchOr = [
        { ticketId: { $regex: search, $options: "i" } },
        { user: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
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

// @desc    Assign ticket to team member
// @route   PUT /api/tickets/:id/assign
// @access  Public
const assignTicket = async (req, res, next) => {
  try {
    const { assignedTo } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      res.status(404);
      throw new Error("Ticket not found");
    }

    if (assignedTo) {
      ticket.assignedTo = {
        name: assignedTo.name || "Jane Admin",
        email: assignedTo.email || "jane@aika.ng",
        avatar: assignedTo.avatar || "/aika-logo-avatar.svg",
        assignedAt: new Date(),
      };
    }

    if (ticket.status === "Open") {
      ticket.status = "In Progress";
    }

    await ticket.save();

    res.status(200).json({
      success: true,
      message: `Ticket assigned to ${ticket.assignedTo.name}`,
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add internal note to ticket
// @route   POST /api/tickets/:id/notes
// @access  Public
const addInternalNote = async (req, res, next) => {
  try {
    const { text, author } = req.body;
    if (!text) {
      res.status(400);
      throw new Error("Note text is required");
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      res.status(404);
      throw new Error("Ticket not found");
    }

    ticket.internalNotes.push({
      text,
      author: author || "Jane Admin",
      createdAt: new Date(),
    });

    await ticket.save();

    res.status(201).json({
      success: true,
      message: "Internal note saved to database",
      ticket,
    });
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
  assignTicket,
  addInternalNote,
  updateTicketStatus,
  deleteTicket,
};
