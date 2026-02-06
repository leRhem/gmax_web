// app/api/analytics/route.ts
// Analytics dashboard API - returns KPIs and chart data
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET: Fetch analytics dashboard data
 * Query params: studioId, year, month
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studioIdParam = searchParams.get("studioId")
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null

    // Role-based studio filtering
    const isAdmin = session.user.role === "ADMIN"
    const studioId = isAdmin
      ? (studioIdParam || null) // Admin: optional filter (null = all studios)
      : session.user.studioId // Others: locked to their studio

    // Date range for the year
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31, 23, 59, 59)

    // Month-specific dates if month is provided
    const periodStart = month !== null ? new Date(year, month - 1, 1) : yearStart
    const periodEnd = month !== null 
      ? new Date(year, month, 0, 23, 59, 59) // Last day of month
      : yearEnd

    // Build where clause
    const bookingWhere: any = {
      bookingDate: {
        gte: periodStart,
        lte: periodEnd,
      },
      bookingStatus: { not: "CANCELLED" },
      ...(studioId && { studioId }),
    }

    // ==========================================
    // KPI METRICS
    // ==========================================

    // Total bookings in period
    const totalBookings = await prisma.booking.count({ where: bookingWhere })

    // Completed bookings
    const completedBookings = await prisma.booking.count({
      where: { ...bookingWhere, bookingStatus: "COMPLETED" },
    })

    // Pending bookings
    const pendingBookings = await prisma.booking.count({
      where: { ...bookingWhere, bookingStatus: "PENDING_CONFIRMATION" },
    })

    // Get bookings with items for revenue calculation
    const bookingsWithItems = await prisma.booking.findMany({
      where: bookingWhere,
      select: {
        id: true,
        items: {
          select: {
            priceSnapshot: true,
            quantity: true,
          },
        },
        payments: {
          where: { status: "COMPLETED" },
          select: { amount: true },
        },
      },
    })

    // Calculate total value and collected revenue
    let totalValue = 0
    let collectedRevenue = 0
    for (const booking of bookingsWithItems) {
      const b = booking as any
      const bookingTotal = b.items.reduce(
        (sum: number, item: any) => sum + Number(item.priceSnapshot) * item.quantity,
        0
      )
      totalValue += bookingTotal
      collectedRevenue += b.payments.reduce(
        (sum: number, p: any) => sum + Number(p.amount),
        0
      )
    }

    // New clients in period
    const newClients = await prisma.client.count({
      where: {
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    })

    // Average booking value
    const avgBookingValue = totalBookings > 0 ? totalValue / totalBookings : 0

    // ==========================================
    // MONTHLY REVENUE TREND (for charts)
    // ==========================================
    const monthlyData = []
    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(year, m, 1)
      const monthEnd = new Date(year, m + 1, 0, 23, 59, 59)

      const monthBookings = await prisma.booking.findMany({
        where: {
          bookingDate: { gte: monthStart, lte: monthEnd },
          bookingStatus: { not: "CANCELLED" },
          ...(studioId && { studioId }),
        },
        select: {
          id: true,
          payments: {
            where: { status: "COMPLETED" },
            select: { amount: true },
          },
        },
      })

      const monthRevenue = monthBookings.reduce(
        (sum: number, b: any) => sum + b.payments.reduce((ps: number, p: any) => ps + Number(p.amount), 0),
        0
      )

      const monthBookingCount = monthBookings.length

      monthlyData.push({
        month: new Date(year, m, 1).toLocaleString("default", { month: "short" }),
        monthIndex: m + 1,
        bookings: monthBookingCount,
        revenue: monthRevenue,
      })
    }

    // ==========================================
    // BOOKING STATUS BREAKDOWN
    // ==========================================
    const statusBreakdown = await prisma.booking.groupBy({
      by: ["bookingStatus"],
      where: {
        bookingDate: { gte: yearStart, lte: yearEnd },
        ...(studioId && { studioId }),
      },
      _count: true,
    })

    // ==========================================
    // TOP SERVICES
    // ==========================================
    const topServices = await prisma.bookingItem.groupBy({
      by: ["serviceId"],
      where: {
        booking: {
          bookingDate: { gte: periodStart, lte: periodEnd },
          bookingStatus: { not: "CANCELLED" },
          ...(studioId && { studioId }),
        },
      },
      _count: true,
      _sum: {
        priceSnapshot: true,
        quantity: true,
      },
      orderBy: {
        _count: {
          serviceId: "desc",
        },
      },
      take: 5,
    })

    // Get service names
    const serviceIds = topServices.map((s: any) => s.serviceId)
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true },
    })

    const topServicesWithNames = topServices.map((item: any) => ({
      serviceId: item.serviceId,
      serviceName: services.find((s) => s.id === item.serviceId)?.name || "Unknown",
      bookingCount: item._count,
      totalQuantity: item._sum.quantity || 0,
      totalRevenue: Number(item._sum.priceSnapshot) || 0,
    }))

    // ==========================================
    // PAYMENT STATUS
    // ==========================================
    const paymentBreakdown = await prisma.booking.groupBy({
      by: ["paymentStatus"],
      where: bookingWhere,
      _count: true,
    })

    return NextResponse.json({
      period: {
        year,
        month,
        startDate: periodStart.toISOString(),
        endDate: periodEnd.toISOString(),
      },
      kpis: {
        totalBookings,
        completedBookings,
        pendingBookings,
        totalValue,
        collectedRevenue,
        outstandingBalance: totalValue - collectedRevenue,
        newClients,
        avgBookingValue: Math.round(avgBookingValue),
        completionRate: totalBookings > 0 
          ? Math.round((completedBookings / totalBookings) * 100) 
          : 0,
      },
      charts: {
        monthlyTrend: monthlyData,
        statusBreakdown: statusBreakdown.map((s: any) => ({
          status: s.bookingStatus,
          count: s._count,
        })),
        paymentBreakdown: paymentBreakdown.map((p: any) => ({
          status: p.paymentStatus,
          count: p._count,
        })),
      },
      topServices: topServicesWithNames,
      studioId: studioId || "all",
    })
  } catch (error) {
    console.error("Analytics error:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}
