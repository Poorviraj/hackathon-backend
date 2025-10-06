const express = require("express");
const router = express.Router();

const {
    createTicket,
    getTickets,
    getTicketById,
    updateStatus,
    addCommentToTicket,
    checkSlaBreaches,
    patchTicket,
    getTicketComments
} = require('../controllers/ticketController');

const { auth } = require("../middleware/auth"); // Protect routes


router.post("/", auth, createTicket);


router.get("/", auth, getTickets);


router.get("/:id", auth, getTicketById);


router.put("/:id/status", auth, updateStatus);


router.post("/:id/comments", auth, addCommentToTicket);

router.get("/:id/comments",auth, getTicketComments);

router.patch("/:id", auth, patchTicket);


router.post("/internal/check-sla", auth, checkSlaBreaches);

module.exports = router;
