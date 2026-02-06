// ==========================================
// app/api/bookings/capacity/route.ts
// ==========================================

import { NextRequest as NR, NextResponse as NRes } from "next/server"
import { auth as authFn } from "@/auth"
import { prisma as db } from "@/lib/prisma"

// GET: Check daily capacity for a specific date
export async function GET(request: NR) {
  try {
    const session = await authFn()
    if (!session?.user) {
      return NRes.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get("date")

    if (!dateParam) {
      return NRes.json(
        { error: "Date parameter required" },
        { status: 400 }
      )
    }

    const date = new Date(dateParam)
    date.setHours(0, 0, 0, 0) // Normalize to start of day

    // Get or create daily capacity record
    let capacity = await db.dailyCapacity.findUnique({
      where: {
        studioId_date: {
          studioId: session.user.studioId!,
          date: date,
        },
      },
    })

    // If doesn't exist, get studio settings and create
    if (!capacity) {
      const settings = await db.studioSettings.findUnique({
        where: { studioId: session.user.studioId! },
      })

      const maxSessions = settings?.maxSessionsPerDay || 15

      capacity = await db.dailyCapacity.create({
        data: {
          studioId: session.user.studioId!,
          date: date,
          maxSessions,
          bookedSessions: 0,
          availableSessions: maxSessions,
        },
      })
    }

    // Calculate current bookings for this date
    const bookings = await db.booking.findMany({
      where: {
        studioId: session.user.studioId!,
        bookingDate: {
          gte: date,
          lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
        },
        bookingStatus: {
          not: "CANCELLED",
        },
      },
      select: {
        totalSessions: true,
      },
    })

    const bookedSessions = bookings.reduce(
      (sum, b) => sum + b.totalSessions,
      0
    )

    const availableSessions = capacity.maxSessions - bookedSessions

    // Update capacity record
    await db.dailyCapacity.update({
      where: { id: capacity.id },
      data: {
        bookedSessions,
        availableSessions,
      },
    })

    return NRes.json({
      date: date.toISOString(),
      maxSessions: capacity.maxSessions,
      bookedSessions,
      availableSessions,
    })
  } catch (error) {
    console.error("Check capacity error:", error)
    return NRes.json(
      { error: "Failed to check capacity" },
      { status: 500 }
    )
  }
}