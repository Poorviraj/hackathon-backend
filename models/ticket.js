const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema({


    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    status: {
        type: String,
        enum: ["Open", "In Progress", "Resolved", "Closed"],
        default: "Open"
    },
    priority: {
        type: String,
        enum: ["Low", "Medium", "High", "Urgent"],
        default: "Low"
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    comments: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            message: String,
            timestamp: {
                type: Date,
                default: Date.now
            }
        }
    ],
    sla: {
        deadlineAt: Date,
        breached: { type: Boolean, default: false },
    },
    latestComment: { type: String }

}, { timestamps: true });

module.exports = mongoose.model("Ticket", TicketSchema);
