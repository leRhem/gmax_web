// app/api/staff/overview/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const staffId = session.user.id
    const studioId = session.user.studioId

    // Date ranges
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
    const weekStart = new Date(todayStart.getTime() - todayStart.getDay() * 24 * 60 * 60 * 1000)
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    const next7Days = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Get staff info
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        studio: {
          select: { id: true, name: true, city: true },
        },
      },
    })

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 })
    }

    // Today's assigned bookings
    const todaysBookings = await prisma.booking.findMany({
      where: {
        photographerId: staffId,
        bookingDate: { gte: todayStart, lt: todayEnd },
        bookingStatus: { in: ["CONFIRMED", "PENDING_CONFIRMATION"] },
      },
      include: {
        client: { select: { name: true, phone: true } },
        items: {
          include: { service: { select: { name: true } } },
        },
      },
      orderBy: { bookingDate: "asc" },
    })

    // Upcoming bookings (next 7 days, excluding today)
    const upcomingBookings = await prisma.booking.findMany({
      where: {
        photographerId: staffId,
        bookingDate: { gte: todayEnd, lt: next7Days },
        bookingStatus: { in: ["CONFIRMED", "PENDING_CONFIRMATION"] },
      },
      include: {
        client: { select: { name: true } },
        items: {
          include: { service: { select: { name: true } } },
        },
      },
      orderBy: { bookingDate: "asc" },
      take: 10,
    })

    // Stats - My assignments
    const myAssignedToday = await prisma.booking.count({
      where: {
        photographerId: staffId,
        bookingDate: { gte: todayStart, lt: todayEnd },
      },
    })

    const myAssignedThisWeek = await prisma.booking.count({
      where: {
        photographerId: staffId,
        bookingDate: { gte: weekStart, lt: weekEnd },
      },
    })

    const myCompletedThisWeek = await prisma.booking.count({
      where: {
        photographerId: staffId,
        bookingDate: { gte: weekStart, lt: weekEnd },
        bookingStatus: "COMPLETED",
      },
    })

    const myCompletedThisMonth = await prisma.booking.count({
      where: {
        photographerId: staffId,
        bookingDate: { gte: monthStart, lte: monthEnd },
        bookingStatus: "COMPLETED",
      },
    })

    const myPendingDelivery = await prisma.booking.count({
      where: {
        photographerId: staffId,
        bookingStatus: "COMPLETED",
        deliveryStatus: { in: ["PENDING", "EDITING"] },
      },
    })

    // Studio stats for context (if staff belongs to a studio)
    let studioStats = null
    if (studioId) {
      const studioTodayBookings = await prisma.booking.count({
        where: {
          studioId,
          bookingDate: { gte: todayStart, lt: todayEnd },
        },
      })

      const studioWeekBookings = await prisma.booking.count({
        where: {
          studioId,
          bookingDate: { gte: weekStart, lt: weekEnd },
        },
      })

      studioStats = {
        todayBookings: studioTodayBookings,
        weekBookings: studioWeekBookings,
      }
    }

    return NextResponse.json({
      staff,
      todaysBookings: todaysBookings.map((b: any) => ({
        id: b.id,
        bookingDate: b.bookingDate,
        clientName: b.client.name,
        clientPhone: b.client.phone,
        services: b.items.map((i: any) => i.service.name).join(", "),
        status: b.bookingStatus,
      })),
      upcomingBookings: upcomingBookings.map((b: any) => ({
        id: b.id,
        bookingDate: b.bookingDate,
        clientName: b.client.name,
        services: b.items.map((i: any) => i.service.name).join(", "),
        status: b.bookingStatus,
      })),
      stats: {
        myAssignedToday,
        myAssignedThisWeek,
        myCompletedThisWeek,
        myCompletedThisMonth,
        myPendingDelivery,
      },
      studioStats,
    })
  } catch (error) {
    console.error("Staff overview error:", error)
    return NextResponse.json(
      { error: "Failed to fetch staff overview" },
      { status: 500 }
    )
  }
}
