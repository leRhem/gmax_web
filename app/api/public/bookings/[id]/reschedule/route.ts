import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const rescheduleSchema = z.object({
  newDate: z.string().datetime(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params
    const body = (await request.json()) as any
    const { newDate } = rescheduleSchema.parse(body)

    const targetDate = new Date(newDate)
    const dateOnly = new Date(targetDate)
    dateOnly.setHours(0, 0, 0, 0)
    
    // 1. Get current booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        studio: true,
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // 2. Validate status (Must be Paid to use this public endpoint)
    // Accept COMPLETED or PARTIAL
    const allowedStatuses = ["COMPLETED", "PARTIAL"]
    if (!allowedStatuses.includes(booking.paymentStatus)) {
       return NextResponse.json(
        { error: "Rescheduling is only available for paid (Full/Partial) bookings via this portal. Please contact support." }, 
        { status: 403 }
      )
    }

    // Check if rescheduling to the same slot (normalized to minutes)
    const oldDate = new Date(booking.bookingDate)
    const targetDateCopy = new Date(targetDate)
    
    // Normalize both to same granularity (ignore seconds/ms)
    oldDate.setSeconds(0, 0)
    targetDateCopy.setSeconds(0, 0)

    const isSameDate = oldDate.getTime() === targetDateCopy.getTime()

    if (isSameDate) {
        return NextResponse.json({ success: true, message: "Date is the same, no changes needed" })
    }

    // 3. Perform Reschedule in a Transaction
    try {
        await prisma.$transaction(async (tx) => {
            // A. Ensure capacity record exists for target date
            let capacity = await tx.dailyCapacity.findUnique({
                where: {
                    studioId_date: {
                        studioId: booking.studioId,
                        date: dateOnly,
                    },
                },
            })

            if (!capacity) {
                const settings = await tx.studioSettings.findUnique({
                    where: { studioId: booking.studioId },
                })
                const maxSessions = settings?.maxSessionsPerDay || 15

                capacity = await tx.dailyCapacity.upsert({
                    where: {
                        studioId_date: {
                            studioId: booking.studioId,
                            date: dateOnly,
                        },
                    },
                    create: {
                        studioId: booking.studioId,
                        date: dateOnly,
                        maxSessions,
                        bookedSessions: 0,
                        availableSessions: maxSessions,
                    },
                    update: {}, // No change if exists
                })
            }

            // B. Recalculate Availability (Locking or within same TX)
            const bookingsOnTarget = await tx.booking.findMany({
                where: {
                    studioId: booking.studioId,
                    bookingDate: {
                        gte: dateOnly,
                        lt: new Date(dateOnly.getTime() + 24 * 60 * 60 * 1000),
                    },
                    bookingStatus: { not: "CANCELLED" },
                    id: { not: booking.id }, // Exclude current booking if we were already on this date (though we checked that above)
                },
                select: { totalSessions: true },
            })

            const currentBookedCount = bookingsOnTarget.reduce((sum, b) => sum + b.totalSessions, 0)
            const availableAtTarget = capacity.maxSessions - currentBookedCount

            if (booking.totalSessions > availableAtTarget) {
                throw new Error("INSUFFICIENT_CAPACITY")
            }

            // C. Update Booking
            await tx.booking.update({
                where: { id: bookingId },
                data: { bookingDate: targetDate },
            })

            // D. Update Capacities (Atomic)
            // Increments/Decrements handled via separate updates to avoid race conditions on values
            
            // New Date
            await tx.dailyCapacity.update({
                where: { id: capacity.id },
                data: {
                    bookedSessions: { increment: booking.totalSessions },
                    availableSessions: { decrement: booking.totalSessions },
                },
            })

            // Old Date
            const oldDateOnly = new Date(oldDate)
            oldDateOnly.setUTCHours(0, 0, 0, 0) // Normalize to UTC start-of-day
            
            const oldCapacity = await tx.dailyCapacity.findUnique({
                where: {
                    studioId_date: {
                        studioId: booking.studioId,
                        date: oldDateOnly,
                    },
                },
            })

            if (oldCapacity) {
                // Safeguard: compute safe values to avoid negative bookedSessions
                const currentBooked = Number(oldCapacity.bookedSessions)
                const newBooked = Math.max(0, currentBooked - booking.totalSessions)
                const actualDelta = currentBooked - newBooked // How much we actually subtracted

                await tx.dailyCapacity.update({
                    where: { id: oldCapacity.id },
                    data: {
                        bookedSessions: newBooked,
                        availableSessions: Number(oldCapacity.availableSessions) + actualDelta,
                    },
                })
            }
        })
    } catch (error: any) {
        if (error.message === "INSUFFICIENT_CAPACITY") {
            return NextResponse.json(
                { error: "The selected date does not have enough available sessions." },
                { status: 409 }
            )
        }
        throw error // Caught by outer try-catch
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
    }
    console.error("Reschedule error:", error)
    return NextResponse.json({ error: "Failed to reschedule booking" }, { status: 500 })
  }
}
