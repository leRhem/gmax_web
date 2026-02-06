// app/api/bookings/[id]/photos/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

type RouteParams = { params: Promise<{ id: string }> }

// GET: Fetch photos for a booking
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify booking exists and user has access
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        studioId: true,
        photographerId: true,
        bookingStatus: true,
        deliveryStatus: true,
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Check access based on role
    const userRole = session.user.role
    const userId = session.user.id
    const userStudioId = session.user.studioId

    if (userRole !== "ADMIN") {
      if (userRole === "MANAGER" && booking.studioId !== userStudioId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      // Other staff can only see if they are the photographer
      if (userRole !== "MANAGER" && booking.photographerId !== userId) {
        // Check if they uploaded any photos
        const hasUploads = await prisma.photo.count({
          where: { bookingId: id, uploadedById: userId },
        })
        if (hasUploads === 0) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
      }
    }

    // Fetch photos with uploader info
    const photos = await prisma.photo.findMany({
      where: { bookingId: id },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
        batch: {
          select: { id: true, status: true, createdAt: true },
        },
      },
      orderBy: { uploadedAt: "desc" },
    })

    // Get batches for grouping
    const batches = await prisma.assetUploadBatch.findMany({
      where: { bookingId: id },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
        _count: { select: { photos: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    // Stats
    const stats = {
      total: photos.length,
      pending: photos.filter((p) => p.processingStatus === "EDITING").length,
      edited: photos.filter((p) => p.processingStatus === "EDITED").length,
      approved: photos.filter((p) => p.processingStatus === "APPROVED").length,
    }

    return NextResponse.json({
      photos: photos.map((p: any) => ({
        id: p.id,
        fileName: p.fileName,
        fileSize: p.fileSize,
        mimeType: p.mimeType,
        status: p.status,
        processingStatus: p.processingStatus,
        thumbnailKey: p.thumbnailKey,
        uploadedAt: p.uploadedAt,
        uploadedBy: p.uploadedBy,
        batchId: p.batchId,
      })),
      batches,
      stats,
      canApprove: userRole === "ADMIN" || userRole === "MANAGER",
    })
  } catch (error) {
    console.error("Get photos error:", error)
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    )
  }
}

// PUT: Update photo status (approve/reject)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: bookingId } = await params
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userRole = session.user.role

    // Only Admin and Manager can approve/reject
    if (userRole !== "ADMIN" && userRole !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = (await request.json()) as any
    const { photoIds, action, batchId } = body

    // Validate action
    if (!["approve", "reject", "approve_all"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Verify booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, studioId: true },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Manager can only approve for their studio
    if (userRole === "MANAGER" && booking.studioId !== session.user.studioId) {
      return NextResponse.json({ error: "Cannot approve for another studio" }, { status: 403 })
    }

    let updatedCount = 0

    if (action === "approve_all") {
      // Approve all pending photos for this booking
      const where: any = {
        bookingId,
        processingStatus: { in: ["EDITING", "EDITED"] },
      }
      if (batchId) where.batchId = batchId

      const result = await prisma.photo.updateMany({
        where,
        data: {
          processingStatus: "APPROVED",
          status: "READY",
        },
      })
      updatedCount = result.count
    } else if (photoIds && photoIds.length > 0) {
      // Update specific photos
      const newStatus = action === "approve" ? "APPROVED" : "EDITING"
      const newPhotoStatus = action === "approve" ? "READY" : "PROCESSING"

      const result = await prisma.photo.updateMany({
        where: {
          id: { in: photoIds },
          bookingId,
        },
        data: {
          processingStatus: newStatus,
          status: newPhotoStatus,
        },
      })
      updatedCount = result.count
    }

    // Check if all photos are approved - update batch status
    if (action === "approve" || action === "approve_all") {
      const pendingPhotos = await prisma.photo.count({
        where: {
          bookingId,
          processingStatus: { not: "APPROVED" },
        },
      })

      if (pendingPhotos === 0) {
        // All approved - update booking delivery status
        await prisma.booking.update({
          where: { id: bookingId },
          data: { deliveryStatus: "READY" },
        })

        // Update batch statuses
        await prisma.assetUploadBatch.updateMany({
          where: { bookingId },
          data: { status: "COMPLETED" },
        })
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
    })
  } catch (error) {
    console.error("Update photos error:", error)
    return NextResponse.json(
      { error: "Failed to update photos" },
      { status: 500 }
    )
  }
}
