const Ticket = require('../models/ticket');
const User = require('../models/user');
const { slaSecondsForPriority } = require('../utils/sla');

// ----------------------
// Create Ticket
// ----------------------
exports.createTicket = async (req, res) => {
    try {
        const { title, description, priority } = req.body;
        if (!title) {
            return res.status(400).json({ success: false, message: "Title is required" });
        }

        // Find agent with lowest ticket count
        const agent = await User.findOne({ role: 'agent' }).sort({ ticketCount: 1 });
        if (!agent) {
            return res.status(400).json({ success: false, message: 'No agent found' });
        }

        const now = new Date();
        const deadlineAt = new Date(now.getTime() + slaSecondsForPriority(priority) * 1000);

        const ticket = await Ticket.create({
            title,
            description,
            priority,
            createdBy: req.user.id,
            assignedTo: agent._id,
            sla: { deadlineAt, breached: false },
        });

        agent.ticketCount += 1;
        agent.assignedTicket.push(ticket._id);
        await agent.save();

        return res.status(201).json({ success: true, message: "Ticket created successfully", ticket });
    } catch (err) {
        console.error("Error in createTicket:", err);
        return res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
};

// ----------------------
// Get Tickets (Admin / Agent / User)
// ----------------------
exports.getTickets = async (req, res) => {
    try {
        const { q, breached, limit = 20, offset = 0 } = req.query;
        const filter = {};

        // Role-based filters
        if (req.user.role === 'user') filter.createdBy = req.user.id;
        if (req.user.role === 'agent') filter.assignedTo = req.user.id;

        if (breached === "true") filter["sla.breached"] = true;

        // Search query
        if (q) {
            const regex = new RegExp(q, "i");
            filter.$or = [{ title: regex }, { description: regex }, { latestComment: regex }];
        }

        const total = await Ticket.countDocuments(filter);
        const tickets = await Ticket.find(filter)
            .skip(parseInt(offset))
            .limit(parseInt(limit))
            .populate("createdBy assignedTo", "name email role");

        return res.json({
            meta: { total, offset: Number(offset), limit: Number(limit) },
            data: tickets
        });
    } catch (err) {
        console.error("Error in getTickets:", err);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
};

// ----------------------
// Get Ticket by ID
// ----------------------
exports.getTicketById = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id)
            .populate("createdBy assignedTo", "name email role");
        if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

        // Role-based access
        if (req.user.role === 'user' && ticket.createdBy.toString() !== req.user.id)
            return res.status(403).json({ success: false, message: "Not authorized to access this ticket" });
        if (req.user.role === 'agent' && ticket.assignedTo.toString() !== req.user.id)
            return res.status(403).json({ success: false, message: "Not authorized to access this ticket" });

        res.json(ticket);
    } catch (err) {
        console.error("Error in getTicketById:", err);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
};

// ----------------------
// Update Ticket Status
// ----------------------
exports.updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

        // Role-based access
        if (req.user.role === 'user' && ticket.createdBy.toString() !== req.user.id)
            return res.status(403).json({ success: false, message: "Not authorized to update this ticket" });
        if (req.user.role === 'agent' && ticket.assignedTo.toString() !== req.user.id)
            return res.status(403).json({ success: false, message: "Not authorized to update this ticket" });

        ticket.status = status;
        await ticket.save();

        // Update agent ticket count and assigned tickets
        if ((status === "Resolved" || status === "Closed") && ticket.assignedTo) {
            const agent = await User.findById(ticket.assignedTo);
            if (agent) {
                agent.ticketCount = Math.max(0, agent.ticketCount - 1);
                agent.assignedTicket = agent.assignedTicket.filter(t => t.toString() !== ticket._id.toString());
                await agent.save();
            }
        }

        res.json({ success: true, message: "Ticket status updated successfully", ticket });
    } catch (err) {
        console.error("Error in updateStatus:", err);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
};

// ----------------------
// Add Comment to Ticket
// ----------------------
exports.addComment = async (req, res) => {
    try {
        const { message } = req.body;
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

        // Role-based access
        if (req.user.role === 'user' && ticket.createdBy.toString() !== req.user.id)
            return res.status(403).json({ success: false, message: "Not authorized to comment on this ticket" });
        if (req.user.role === 'agent' && ticket.assignedTo.toString() !== req.user.id)
            return res.status(403).json({ success: false, message: "Not authorized to comment on this ticket" });

        ticket.comments.push({ user: req.user.id, message, timestamp: new Date() });
        await ticket.save();

        res.json({ success: true, message: "Comment added successfully", ticket });
    } catch (err) {
        console.error("Error in addComment:", err);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
};

// ----------------------
// Check SLA Breaches
// ----------------------
exports.checkSlaBreaches = async (req, res) => {
    try {
        const now = new Date();
        const toBreach = await Ticket.find({
            "sla.deadlineAt": { $lte: now },
            "sla.breached": false,
            status: { $nin: ["Resolved", "Closed"] }
        });

        for (const t of toBreach) {
            t.sla.breached = true;
            await t.save();
        }

        res.json({ success: true, breached: toBreach.length });
    } catch (err) {
        console.error("Error in checkSlaBreaches:", err);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
};

// ----------------------
// Patch Ticket (Optimistic Lock + SLA + Role-based)
// ----------------------
exports.patchTicket = async (req, res) => {
    try {
        const { updates, version } = req.body;
        const ticketId = req.params.id;

        if (typeof version === "undefined") {
            return res.status(400).json({ success: false, message: "Version is required" });
        }

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

        // Role-based access
        if (req.user.role === 'user' && ticket.createdBy.toString() !== req.user.id)
            return res.status(403).json({ success: false, message: "Not authorized to update this ticket" });
        if (req.user.role === 'agent' && ticket.assignedTo.toString() !== req.user.id)
            return res.status(403).json({ success: false, message: "Not authorized to update this ticket" });

        // Build update object
        const updateOps = {};
        if (updates.status) updateOps.status = updates.status;
        if (updates.priority) {
            updateOps.priority = updates.priority;
            const seconds = slaSecondsForPriority(updates.priority);
            updateOps["sla.deadlineAt"] = new Date(Date.now() + seconds * 1000);
            updateOps["sla.breached"] = false;
        }

        // Optimistic lock
        const updated = await Ticket.findOneAndUpdate(
            { _id: ticketId, __v: version },
            { $set: updateOps, $inc: { __v: 1 } },
            { new: true }
        );

        if (!updated) {
            const current = await Ticket.findById(ticketId).select("__v");
            return res.status(409).json({
                success: false,
                message: "Conflict: Ticket was already updated by someone else",
                serverVersion: current.__v
            });
        }

        res.json({ success: true, message: "Ticket updated successfully", ticket: updated });
    } catch (err) {
        console.error("Error in patchTicket:", err);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
};
