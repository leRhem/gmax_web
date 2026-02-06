// app/api/photos/batch/[id]/complete/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const completeSchema = z.object({
  uploadedFiles: z.number().int().min(0),
  failedFiles: z.number().int().min(0),
})

/**
 * POST: Mark a batch as complete
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: batchId } = await params
    const body = (await request.json()) as any
    const data = completeSchema.parse(body)

    // Verify batch exists and user has access
    const batch = await prisma.assetUploadBatch.findFirst({
      where: {
        id: batchId,
        booking: {
          studioId: session.user.studioId!,
        },
      },
      include: {
        booking: true,
      },
    })

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    }

    // Determine status based on results
    let status: "COMPLETED" | "FAILED" | "IN_REVIEW" = "COMPLETED"
    if (data.uploadedFiles === 0) {
      status = "FAILED"
    } else if (data.failedFiles > 0) {
      status = "IN_REVIEW" // Some files failed
    }

    // Update batch
    const updatedBatch = await prisma.assetUploadBatch.update({
      where: { id: batchId },
      data: {
        uploadedFiles: data.uploadedFiles,
        failedFiles: data.failedFiles,
        status,
        processingCompletedAt: new Date(),
      },
    })

    // Update booking assets status
    let assetsStatus: "UPLOADED" | "UPLOADING" | "NOT_UPLOADED" = "UPLOADED"
    if (status === "FAILED") {
      assetsStatus = "NOT_UPLOADED"
    }

    await prisma.booking.update({
      where: { id: batch.bookingId },
      data: {
        assetsStatus,
        assetsUploadedAt: status === "COMPLETED" ? new Date() : undefined,
      },
    })

    return NextResponse.json({
      batch: updatedBatch,
      message: `Batch completed with ${data.uploadedFiles} files uploaded`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Complete batch error:", error)
    return NextResponse.json(
      { error: "Failed to complete batch" },
      { status: 500 }
    )
  }
}
