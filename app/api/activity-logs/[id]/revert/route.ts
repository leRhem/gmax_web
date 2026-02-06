// app/api/activity-logs/[id]/revert/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { canRevertLog, logActivity } from "@/lib/activity-logger"

interface RouteParams {
    params: Promise<{ id: string }>
}

// POST: Revert an activity log entry
export async function POST(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Only ADMIN can revert
        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params

        // Get the log entry
        const log = await prisma.activityLog.findUnique({
            where: { id },
        })

        if (!log) {
            return NextResponse.json({ error: "Log not found" }, { status: 404 })
        }

        // Check if can be reverted
        if (!log.canRevert || !canRevertLog(log.createdAt, !!log.revertedAt)) {
            return NextResponse.json(
                { error: "This action cannot be reverted" },
                { status: 400 }
            )
        }

        // Perform revert based on action type
        let reverted = false
        let message = ""

        switch (log.action) {
            case "CREATE":
                // Revert a create = delete the created entity
                if (log.entity === "booking" && log.entityId) {
                    await prisma.booking.delete({ where: { id: log.entityId } })
                    reverted = true
                    message = "Booking deleted"
                } else if (log.entity === "client" && log.entityId) {
                    await prisma.client.delete({ where: { id: log.entityId } })
                    reverted = true
                    message = "Client deleted"
                }
                break

            case "UPDATE":
                // Revert an update = restore previous data
                if (log.previousData && log.entity === "booking") {
                    await prisma.booking.update({
                        where: { id: log.entityId },
                        data: log.previousData as any,
                    })
                    reverted = true
                    message = "Booking restored to previous state"
                } else if (log.previousData && log.entity === "client") {
                    await prisma.client.update({
                        where: { id: log.entityId },
                        data: log.previousData as any,
                    })
                    reverted = true
                    message = "Client restored to previous state"
                }
                break

            case "DELETE":
                // Revert a delete = recreate the entity
                if (log.previousData && log.entity === "booking") {
                    await prisma.booking.create({
                        data: { ...(log.previousData as any), id: log.entityId } as any,
                    })
                    reverted = true
                    message = "Booking restored"
                } else if (log.previousData && log.entity === "client") {
                    await prisma.client.create({
                        data: { ...(log.previousData as any), id: log.entityId } as any,
                    })
                    reverted = true
                    message = "Client restored"
                }
                break
        }

        if (!reverted) {
            return NextResponse.json(
                { error: "Revert not supported for this action" },
                { status: 400 }
            )
        }

        // Mark as reverted
        await prisma.activityLog.update({
            where: { id },
            data: {
                revertedAt: new Date(),
                revertedBy: session.user.id,
            },
        })

        // Log the revert action
        await logActivity({
            action: "REVERT",
            entity: log.entity as any,
            entityId: log.entityId,
            previousData: log.newData as any,
            newData: log.previousData as any,
            staffId: session.user.id,
            canRevert: false,
        })

        return NextResponse.json({ message, reverted: true })
    } catch (error) {
        console.error("Revert activity error:", error)
        return NextResponse.json(
            { error: "Failed to revert action" },
            { status: 500 }
        )
    }
}
