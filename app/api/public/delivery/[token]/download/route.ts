// app/api/public/delivery/[token]/download/route.ts
// Download individual photo from delivery portal
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const downloadSchema = z.object({
  photoId: z.string().min(1, "Photo ID is required"),
})

/**
 * POST: Generate download URL for a specific photo
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = (await request.json()) as any
    
    const validation = downloadSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      )
    }

    const { photoId } = validation.data

    // Find delivery token
    const deliveryToken = await prisma.deliveryToken.findUnique({
      where: { token },
      include: {
        booking: {
          include: {
            items: true,
            payments: {
              where: { status: "COMPLETED" },
              select: { amount: true },
            },
          },
        },
      },
    }) as any

    if (!deliveryToken) {
      return NextResponse.json(
        { error: "Delivery link not found" },
        { status: 404 }
      )
    }

    // Check if expired
    if (deliveryToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Delivery link expired", expired: true },
        { status: 410 }
      )
    }

    // Check payment status
    const totalAmount = deliveryToken.booking.items.reduce(
      (sum: number, item: any) => sum + Number(item.priceSnapshot) * item.quantity,
      0
    )
    const paidAmount = deliveryToken.booking.payments.reduce(
      (sum: number, p: any) => sum + Number(p.amount),
      0
    )
    const isPaidInFull = paidAmount >= totalAmount

    if (!isPaidInFull) {
      return NextResponse.json(
        { 
          error: "Payment required to download photos",
          balance: totalAmount - paidAmount,
        },
        { status: 402 }
      )
    }

    // Find the photo
    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        bookingId: deliveryToken.bookingId,
        status: { in: ["READY", "DELIVERED"] },
      },
    })

    if (!photo) {
      return NextResponse.json(
        { error: "Photo not found" },
        { status: 404 }
      )
    }

    // Update photo download tracking
    await prisma.photo.update({
      where: { id: photo.id },
      data: {
        clientDownloaded: true,
        clientDownloadedAt: new Date(),
        downloadCount: { increment: 1 },
      },
    })

    // Generate download URL
    // In production, this would be a presigned R2 URL
    const baseUrl = process.env.R2_PUBLIC_URL || ""
    const downloadKey = photo.editedKey || photo.r2Key
    const downloadUrl = `${baseUrl}/${downloadKey}`

    return NextResponse.json({
      downloadUrl,
      fileName: photo.fileName,
    })
  } catch (error) {
    console.error("Download photo error:", error)
    return NextResponse.json(
      { error: "Failed to generate download link" },
      { status: 500 }
    )
  }
}
