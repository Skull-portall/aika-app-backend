const express = require("express");
const router = express.Router();
const {
  createTicket,
  getTickets,
  getTicketById,
  replyToTicket,
  updateTicketStatus,
  deleteTicket,
} = require("../controllers/ticketController");

router.route("/").post(createTicket).get(getTickets);
router.route("/:id").get(getTicketById).delete(deleteTicket);
router.route("/:id/reply").post(replyToTicket);
router.route("/:id/status").put(updateTicketStatus);

module.exports = router;
