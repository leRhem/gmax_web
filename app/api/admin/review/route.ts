// app/api/admin/review/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET: Fetch bookings with assets pending review
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userRole = session.user.role
    const userStudioId = session.user.studioId

    // Only Admin and Manager can access review queue
    if (userRole !== "ADMIN" && userRole !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const studioFilter = searchParams.get("studioId")
    const status = searchParams.get("status") || "pending" // pending, all

    // Build where clause for photos
    const photoWhere: any = {}
    if (status === "pending") {
      photoWhere.processingStatus = { in: ["EDITING", "EDITED"] }
    }

    // Build where clause for bookings
    const bookingWhere: any = {
      photos: { some: photoWhere },
    }

    // Role-based studio filtering
    if (userRole === "MANAGER") {
      if (!userStudioId) {
        return NextResponse.json({ error: "No studio assigned" }, { status: 400 })
      }
      bookingWhere.studioId = userStudioId
    } else if (studioFilter) {
      bookingWhere.studioId = studioFilter
    }

    // Fetch bookings with pending photos
    const bookings = await prisma.booking.findMany({
      where: bookingWhere,
      include: {
        client: {
          select: { name: true, phone: true },
        },
        studio: {
          select: { id: true, name: true, city: true },
        },
        photographer: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: { service: { select: { name: true } } },
        },
        photos: {
          where: photoWhere,
          select: {
            id: true,
            fileName: true,
            processingStatus: true,
            uploadedAt: true,
          },
        },
        _count: {
          select: { photos: true },
        },
      },
      orderBy: { bookingDate: "desc" },
      take: 50,
    })

    // Calculate stats
    const totalPendingPhotos = bookings.reduce(
      (sum: number, b: any) => sum + b.photos.length,
      0
    )

    // Get studios for filter (admin only)
    let studios: any[] = []
    if (userRole === "ADMIN") {
      studios = await prisma.studio.findMany({
        where: { isActive: true },
        select: { id: true, name: true, city: true },
        orderBy: { name: "asc" },
      })
    }

    return NextResponse.json({
      bookings: bookings.map((b: any) => ({
        id: b.id,
        bookingDate: b.bookingDate,
        client: {
          name: b.client.name,
          phone: b.client.phone,
        },
        studio: b.studio,
        photographer: b.photographer,
        services: b.items.map((i: any) => i.service.name).join(", "),
        pendingPhotos: b.photos.length,
        totalPhotos: b._count.photos,
        oldestUpload: b.photos.length > 0
          ? b.photos.reduce((oldest: Date, p: any) =>
              p.uploadedAt < oldest ? p.uploadedAt : oldest,
              b.photos[0].uploadedAt
            )
          : null,
      })),
      stats: {
        totalBookings: bookings.length,
        totalPendingPhotos,
      },
      studios,
    })
  } catch (error) {
    console.error("Review queue error:", error)
    return NextResponse.json(
      { error: "Failed to fetch review queue" },
      { status: 500 }
    )
  }
}
