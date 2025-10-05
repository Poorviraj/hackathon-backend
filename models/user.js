const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["user", "agent", "admin"],
        default: "user"
    },
    ticketCount: {
        type: Number,
        default: 0
    },
    assignedTicket: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Ticket"
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);