// lib/activity-logger-utils.ts
// Client-safe utility functions for activity logs (no Prisma)

/**
 * Check if a log entry can be reverted (within 3-day window)
 */
export function canRevertLog(createdAt: Date, isReverted: boolean): boolean {
    if (isReverted) return false

    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    return createdAt > threeDaysAgo
}

/**
 * Get the display name for an action
 */
export function getActionLabel(action: string): string {
    switch (action) {
        case "CREATE":
            return "Created"
        case "UPDATE":
            return "Updated"
        case "DELETE":
            return "Deleted"
        case "REVERT":
            return "Reverted"
        default:
            return action
    }
}

/**
 * Get the color class for an action
 */
export function getActionColor(action: string): string {
    switch (action) {
        case "CREATE":
            return "text-green-500 bg-green-500/10"
        case "UPDATE":
            return "text-blue-500 bg-blue-500/10"
        case "DELETE":
            return "text-red-500 bg-red-500/10"
        case "REVERT":
            return "text-amber-500 bg-amber-500/10"
        default:
            return "text-gray-500 bg-gray-500/10"
    }
}
