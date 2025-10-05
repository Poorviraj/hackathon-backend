// cron/checkSlaDirect.js
const cron = require("node-cron");
const Ticket = require("../models/ticket");

// Run every 5 minutes
cron.schedule("*/5 * * * *", async () => {
    try {
        console.log("Running direct SLA check...");

        const now = new Date();
        const toBreach = await Ticket.updateMany(
            {
                "sla.deadlineAt": { $lte: now },
                "sla.breached": false,
                status: { $nin: ["Resolved", "Closed"] }
            },
            { $set: { "sla.breached": true } }
        );

        console.log(`SLA check completed. Tickets breached: ${toBreach.modifiedCount}`);
    } catch (err) {
        console.error("Error in direct SLA cron:", err.message);
    }
});
