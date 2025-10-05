const express = require("express");
const router = express.Router();

const {
    createTicket,
    getTickets,
    getTicketById,
    updateStatus,
    addComment,
    checkSlaBreaches,
    patchTicket
} = require('../controllers/ticketController');

const { auth } = require("../middleware/auth"); // Protect routes

// ----------------------
// Create a new ticket
// ----------------------
router.post("/", auth, createTicket);

// ----------------------
// Get tickets (Admin = all, Agent = assigned, User = own)
// Supports search, pagination, breached filter
// ----------------------
router.get("/", auth, getTickets);

// ----------------------
// Get a ticket by ID
// Role-based access inside controller
// ----------------------
router.get("/:id", auth, getTicketById);

// ----------------------
// Update ticket status
// Admin can update any ticket
// Agent can update assigned ticket
// User can update their own ticket
// ----------------------
router.put("/:id/status", auth, updateStatus);

// ----------------------
// Add comment to a ticket
// ----------------------
router.post("/:id/comment", auth, addComment);

// ----------------------
// Patch ticket (Optimistic Lock + SLA + Role-based)
// ----------------------
router.patch("/:id", auth, patchTicket);

// ----------------------
// Internal SLA check (could be used in cron job)
// Admin-only recommended
// ----------------------
router.post("/internal/check-sla", auth, checkSlaBreaches);

module.exports = router;
