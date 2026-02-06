// app/api/photos/batch/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createBatchSchema = z.object({
  bookingId: z.string().cuid(),
  totalFiles: z.number().int().positive(),
  notes: z.string().optional(),
})

/**
 * POST: Create a new upload batch for a booking
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check role - editors and above can upload
    const allowedRoles = ["ADMIN", "MANAGER", "PHOTO_EDITOR", "VIDEO_EDITOR", "PHOTOGRAPHER"]
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = (await request.json()) as any
    const data = createBatchSchema.parse(body)

    // Verify booking exists and belongs to user's studio
    const booking = await prisma.booking.findFirst({
      where: {
        id: data.bookingId,
        studioId: session.user.studioId!,
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Create upload batch
    const batch = await prisma.assetUploadBatch.create({
      data: {
        bookingId: data.bookingId,
        uploadedById: session.user.id,
        totalFiles: data.totalFiles,
        uploadedFiles: 0,
        failedFiles: 0,
        status: "NOT_YET",
        notes: data.notes,
      },
    })

    // Update booking assets status
    await prisma.booking.update({
      where: { id: data.bookingId },
      data: { assetsStatus: "UPLOADING" },
    })

    return NextResponse.json({ batchId: batch.id }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Create batch error:", error)
    return NextResponse.json(
      { error: "Failed to create upload batch" },
      { status: 500 }
    )
  }
}

/**
 * GET: List upload batches for a booking
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get("bookingId")

    if (!bookingId) {
      return NextResponse.json(
        { error: "bookingId is required" },
        { status: 400 }
      )
    }

    // Verify booking belongs to user's studio
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        studioId: session.user.studioId!,
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const batches = await prisma.assetUploadBatch.findMany({
      where: { bookingId },
      orderBy: { createdAt: "desc" },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: { photos: true },
        },
      },
    })

    return NextResponse.json({ batches })
  } catch (error) {
    console.error("Get batches error:", error)
    return NextResponse.json(
      { error: "Failed to fetch upload batches" },
      { status: 500 }
    )
  }
}
