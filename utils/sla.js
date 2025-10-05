exports.slaSecondsForPriority = function (priority) {
    switch ((priority || "low").toLowerCase()) {
        case "urgent": return 2 * 60 * 60;        // 2h
        case "high": return 24 * 60 * 60;       // 1 day
        case "medium": return 3 * 24 * 60 * 60;   // 3 days
        default: return 7 * 24 * 60 * 60;   // 7 days
    }
};