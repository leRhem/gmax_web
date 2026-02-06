// app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const assignee = searchParams.get("assignee") // "me", "unassigned", or staff ID
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const studioFilter = searchParams.get("studioId")

    const userRole = session.user.role
    const userId = session.user.id
    const userStudioId = session.user.studioId

    // Build where clause based on role
    const where: any = {}

    // Role-based filtering
    if (userRole === "ADMIN") {
      // Admin can see all, optionally filter by studio
      if (studioFilter) {
        where.studioId = studioFilter
      }
    } else if (userRole === "MANAGER") {
      // Manager can only see their studio's bookings
      if (!userStudioId) {
        return NextResponse.json({ error: "No studio assigned" }, { status: 400 })
      }
      where.studioId = userStudioId
    } else {
      // Regular staff can only see their own assigned bookings
      where.photographerId = userId
    }

    // Status filter
    if (status && status !== "all") {
      where.bookingStatus = status
    }

    // Assignee filter (for admin/manager)
    if (assignee && (userRole === "ADMIN" || userRole === "MANAGER")) {
      if (assignee === "me") {
        where.photographerId = userId
      } else if (assignee === "unassigned") {
        where.photographerId = null
      } else {
        where.photographerId = assignee
      }
    }

    // Date range filter
    if (dateFrom) {
      where.bookingDate = { ...where.bookingDate, gte: new Date(dateFrom) }
    }
    if (dateTo) {
      where.bookingDate = { ...where.bookingDate, lte: new Date(dateTo) }
    }

    // Fetch bookings
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        client: {
          select: { name: true, phone: true, email: true },
        },
        studio: {
          select: { id: true, name: true, city: true },
        },
        photographer: {
          select: { id: true, name: true, email: true, image: true },
        },
        items: {
          include: { service: { select: { name: true, price: true } } },
        },
      },
      orderBy: { bookingDate: "asc" },
      take: 100,
    })

    // Get staff list for reassignment (admin/manager only)
    let availableStaff: any[] = []
    if (userRole === "ADMIN" || userRole === "MANAGER") {
      const staffWhere: any = { isActive: true }
      if (userRole === "MANAGER" && userStudioId) {
        staffWhere.studioId = userStudioId
      }

      availableStaff = await prisma.staff.findMany({
        where: staffWhere,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
        },
        orderBy: { name: "asc" },
      })
    }

    // Format response
    const tasks = bookings.map((b: any) => ({
      id: b.id,
      bookingDate: b.bookingDate,
      client: {
        name: b.client.name,
        phone: b.client.phone,
        email: b.client.email,
      },
      studio: b.studio,
      photographer: b.photographer,
      services: b.items.map((i: any) => i.service.name).join(", "),
      totalAmount: b.items.reduce((sum: number, i: any) => sum + (i.unitPrice * i.quantity), 0),
      status: b.bookingStatus,
      paymentStatus: b.paymentStatus,
      deliveryStatus: b.deliveryStatus,
      notes: b.notes,
    }))

    return NextResponse.json({
      tasks,
      availableStaff,
      canReassign: userRole === "ADMIN" || userRole === "MANAGER",
      userRole,
    })
  } catch (error) {
    console.error("Tasks error:", error)
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    )
  }
}

// PUT: Reassign booking
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userRole = session.user.role
    const userStudioId = session.user.studioId

    // Only Admin and Manager can reassign
    if (userRole !== "ADMIN" && userRole !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = (await request.json()) as any
    const { bookingId, photographerId } = body

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID required" }, { status: 400 })
    }

    // Check booking exists and user has access
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, studioId: true },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Manager can only reassign within their studio
    if (userRole === "MANAGER" && booking.studioId !== userStudioId) {
      return NextResponse.json({ error: "Cannot reassign booking from another studio" }, { status: 403 })
    }

    // If assigning to someone, verify they exist and belong to the studio (for manager)
    if (photographerId) {
      const photographer = await prisma.staff.findUnique({
        where: { id: photographerId },
        select: { id: true, studioId: true },
      })

      if (!photographer) {
        return NextResponse.json({ error: "Staff member not found" }, { status: 404 })
      }

      if (userRole === "MANAGER" && photographer.studioId !== userStudioId) {
        return NextResponse.json({ error: "Cannot assign to staff from another studio" }, { status: 403 })
      }
    }

    // Update booking
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { photographerId: photographerId || null },
      include: {
        photographer: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      booking: {
        id: updated.id,
        photographer: updated.photographer,
      },
    })
  } catch (error) {
    console.error("Reassign error:", error)
    return NextResponse.json(
      { error: "Failed to reassign booking" },
      { status: 500 }
    )
  }
}
