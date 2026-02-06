// app/api/activity-logs/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { canRevertLog } from "@/lib/activity-logger"

// GET: List activity logs with filtering
export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Only ADMIN can view logs
        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const entity = searchParams.get("entity")
        const staffId = searchParams.get("staffId")
        const page = parseInt(searchParams.get("page") || "1")
        const limit = parseInt(searchParams.get("limit") || "20")
        const skip = (page - 1) * limit

        // Build where clause
        const where: any = {}
        if (entity) where.entity = entity
        if (staffId) where.staffId = staffId

        // Get total count
        const total = await prisma.activityLog.count({ where })

        // Get logs
        const logs = await prisma.activityLog.findMany({
            where,
            include: {
                staff: {
                    select: { name: true, email: true, image: true },
                },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
        })

        // Add canRevert flag to each log
        const logsWithRevert = logs.map((log) => ({
            ...log,
            canRevert: log.canRevert && canRevertLog(log.createdAt, !!log.revertedAt),
        }))

        return NextResponse.json({
            logs: logsWithRevert,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        })
    } catch (error) {
        console.error("Get activity logs error:", error)
        return NextResponse.json(
            { error: "Failed to fetch activity logs" },
            { status: 500 }
        )
    }
}
