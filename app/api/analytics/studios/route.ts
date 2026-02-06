// app/api/analytics/studios/route.ts
// Studios comparison API (Admin only) - returns metrics for all studios
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET: Fetch studio comparison data (Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only Admin can see all studios comparison
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())

    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31, 23, 59, 59)

    // Get all studios
    const studios = await prisma.studio.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
      },
      orderBy: { name: "asc" },
    })

    // Get metrics for each studio
    const studioMetrics = await Promise.all(
      studios.map(async (studio) => {
        // Bookings count
        const totalBookings = await prisma.booking.count({
          where: {
            studioId: studio.id,
            bookingDate: { gte: yearStart, lte: yearEnd },
            bookingStatus: { not: "CANCELLED" },
          },
        })

        const completedBookings = await prisma.booking.count({
          where: {
            studioId: studio.id,
            bookingDate: { gte: yearStart, lte: yearEnd },
            bookingStatus: "COMPLETED",
          },
        })

        // Get revenue
        const payments = await prisma.payment.aggregate({
          where: {
            booking: {
              studioId: studio.id,
              bookingDate: { gte: yearStart, lte: yearEnd },
            },
            status: "COMPLETED",
          },
          _sum: { amount: true },
        })

        const revenue = Number(payments._sum.amount) || 0

        // Client count (unique clients who booked at this studio during the year)
        const clientBookings = await prisma.booking.findMany({
          where: {
            studioId: studio.id,
            bookingDate: { gte: yearStart, lte: yearEnd },
          },
          select: { clientId: true },
          distinct: ["clientId"],
        })

        const uniqueClients = clientBookings.length

        // Staff count
        const staffCount = await prisma.staff.count({
          where: { studioId: studio.id, isActive: true },
        })

        return {
          ...studio,
          metrics: {
            totalBookings,
            completedBookings,
            completionRate: totalBookings > 0
              ? Math.round((completedBookings / totalBookings) * 100)
              : 0,
            revenue,
            avgBookingValue: totalBookings > 0
              ? Math.round(revenue / totalBookings)
              : 0,
            uniqueClients,
            staffCount,
          },
        }
      })
    )

    // Overall totals
    const overallTotalBookings = studioMetrics.reduce(
      (sum, s) => sum + s.metrics.totalBookings,
      0
    )
    const overallRevenue = studioMetrics.reduce(
      (sum, s) => sum + s.metrics.revenue,
      0
    )
    const overallClients = studioMetrics.reduce(
      (sum, s) => sum + s.metrics.uniqueClients,
      0
    )

    // Sort by revenue (top performer first)
    const sortedStudios = [...studioMetrics].sort(
      (a, b) => b.metrics.revenue - a.metrics.revenue
    )

    return NextResponse.json({
      year,
      studios: studioMetrics,
      topPerformers: sortedStudios.slice(0, 3),
      overall: {
        totalBookings: overallTotalBookings,
        totalRevenue: overallRevenue,
        totalClients: overallClients,
        studioCount: studios.length,
      },
    })
  } catch (error) {
    console.error("Studios analytics error:", error)
    return NextResponse.json(
      { error: "Failed to fetch studio analytics" },
      { status: 500 }
    )
  }
}
