const express = require("express");
const router = express.Router();
const {
  getTickets,
  getTicketById,
  replyToTicket,
  updateTicketStatus,
  deleteTicket,
} = require("../controllers/ticketController");

router.route("/").get(getTickets);
router.route("/:id").get(getTicketById).delete(deleteTicket);
router.route("/:id/reply").post(replyToTicket);
router.route("/:id/status").put(updateTicketStatus);

module.exports = router;
