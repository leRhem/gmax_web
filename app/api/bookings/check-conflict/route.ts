// app/api/bookings/check-conflict/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const checkConflictSchema = z.object({
  bookingDate: z.string().datetime(),
  excludeBookingId: z.string().cuid().optional(), // For edit mode
})

// POST: Check for booking conflicts
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as any
    const data = checkConflictSchema.parse(body)

    const bookingDate = new Date(data.bookingDate)
    const twoHoursBefore = new Date(bookingDate.getTime() - 2 * 60 * 60 * 1000)
    const twoHoursAfter = new Date(bookingDate.getTime() + 2 * 60 * 60 * 1000)

    // Find conflicts
    const conflicts = await prisma.booking.findMany({
      where: {
        ...(session.user.studioId && { studioId: session.user.studioId }), // Studio isolation
        bookingDate: {
          gte: twoHoursBefore,
          lte: twoHoursAfter,
        },
        bookingStatus: { not: "CANCELLED" },
        ...(data.excludeBookingId && {
          id: { not: data.excludeBookingId },
        }),
      },
      include: {
        client: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { bookingDate: "asc" },
    })

    const hasConflict = conflicts.length > 0

    // Calculate time differences
    const conflictsWithDiff = conflicts.map((conflict: any) => {
      const diffMs = Math.abs(
        bookingDate.getTime() - new Date(conflict.bookingDate).getTime()
      )
      const diffMinutes = Math.floor(diffMs / 60000)

      return {
        id: conflict.id,
        clientName: conflict.client.name,
        clientPhone: conflict.client.phone,
        bookingDate: conflict.bookingDate,
        timeDifferenceMinutes: diffMinutes,
      }
    })

    return NextResponse.json({
      hasConflict,
      conflicts: conflictsWithDiff,
      message: hasConflict
        ? `Found ${conflicts.length} booking(s) within 2 hours`
        : "No conflicts found",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Check conflict error:", error)
    return NextResponse.json(
      { error: "Failed to check conflicts" },
      { status: 500 }
    )
  }
}