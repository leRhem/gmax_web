// lib/activity-logger.ts
import { prisma } from "@/lib/prisma"

type ActionType = "CREATE" | "UPDATE" | "DELETE" | "REVERT"
type EntityType = "booking" | "client" | "service" | "payment" | "staff" | "studio" | "category"

interface LogActivityParams {
    action: ActionType
    entity: EntityType
    entityId: string
    previousData?: Record<string, any> | null
    newData?: Record<string, any> | null
    staffId: string
    canRevert?: boolean
}

/**
 * Log an activity to the activity log
 */
export async function logActivity({
    action,
    entity,
    entityId,
    previousData = null,
    newData = null,
    staffId,
    canRevert = true,
}: LogActivityParams) {
    try {
        await prisma.activityLog.create({
            data: {
                action,
                entity,
                entityId,
                previousData: previousData ? previousData : undefined,
                newData: newData ? newData : undefined,
                staffId,
                canRevert,
            },
        })
    } catch (error) {
        // Don't throw - logging failures shouldn't break the main operation
        console.error("Activity log error:", error)
    }
}

/**
 * Log a CREATE action
 */
export async function logCreate(
    entity: EntityType,
    entityId: string,
    data: Record<string, any>,
    staffId: string
) {
    return logActivity({
        action: "CREATE",
        entity,
        entityId,
        newData: data,
        staffId,
    })
}

/**
 * Log an UPDATE action
 */
export async function logUpdate(
    entity: EntityType,
    entityId: string,
    previousData: Record<string, any>,
    newData: Record<string, any>,
    staffId: string
) {
    return logActivity({
        action: "UPDATE",
        entity,
        entityId,
        previousData,
        newData,
        staffId,
    })
}

/**
 * Log a DELETE action
 */
export async function logDelete(
    entity: EntityType,
    entityId: string,
    previousData: Record<string, any>,
    staffId: string
) {
    return logActivity({
        action: "DELETE",
        entity,
        entityId,
        previousData,
        staffId,
    })
}

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
