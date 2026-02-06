// app/api/public/delivery/[token]/route.ts
// Public API for clients to view their photo delivery
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET: Fetch delivery details using token
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Find delivery token
    const deliveryToken = await prisma.deliveryToken.findUnique({
      where: { token },
      include: {
        booking: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
            studio: {
              select: {
                id: true,
                name: true,
                city: true,
                phone: true,
              },
            },
            items: {
              include: {
                service: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            payments: {
              where: { status: "COMPLETED" },
              select: { amount: true },
            },
            photos: {
              where: {
                status: { in: ["READY", "DELIVERED"] },
              },
              orderBy: { uploadedAt: "asc" },
              select: {
                id: true,
                fileName: true,
                thumbnailKey: true,
                previewKey: true,
                status: true,
                downloadCount: true,
                clientDownloaded: true,
              },
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
    const isExpired = deliveryToken.expiresAt < new Date()
    if (isExpired) {
      return NextResponse.json(
        { 
          error: "Delivery link expired",
          expired: true,
          studioPhone: deliveryToken.booking.studio.phone,
          studioName: deliveryToken.booking.studio.name,
        },
        { status: 410 }
      )
    }

    // Increment download/view count
    await prisma.deliveryToken.update({
      where: { id: deliveryToken.id },
      data: { downloads: { increment: 1 } },
    })

    const booking = deliveryToken.booking

    // Calculate payment status
    const totalAmount = booking.items.reduce(
      (sum: number, item: any) => sum + Number(item.priceSnapshot) * item.quantity,
      0
    )
    const paidAmount = booking.payments.reduce(
      (sum: number, p: any) => sum + Number(p.amount),
      0
    )
    const isPaidInFull = paidAmount >= totalAmount
    const balance = totalAmount - paidAmount

    // Generate thumbnail URLs (these would be presigned R2 URLs in production)
    const baseUrl = process.env.R2_PUBLIC_URL || ""
    const photos = booking.photos.map((photo: any) => ({
      id: photo.id,
      fileName: photo.fileName,
      thumbnailUrl: photo.thumbnailKey ? `${baseUrl}/${photo.thumbnailKey}` : null,
      previewUrl: photo.previewKey ? `${baseUrl}/${photo.previewKey}` : null,
      isDownloaded: photo.clientDownloaded,
    }))

    return NextResponse.json({
      booking: {
        id: booking.id,
        clientName: booking.client.name,
        bookingDate: booking.bookingDate,
        service: booking.items[0]?.service?.name || "Photo Session",
        studio: {
          name: booking.studio.name,
          city: booking.studio.city,
          phone: booking.studio.phone,
        },
        photoCount: booking.photos.length,
        deliveryStatus: booking.deliveryStatus,
      },
      payment: {
        isPaid: isPaidInFull,
        totalAmount,
        paidAmount,
        balance,
      },
      photos,
      expiresAt: deliveryToken.expiresAt,
      viewCount: deliveryToken.downloads + 1,
    })
  } catch (error) {
    console.error("Get delivery error:", error)
    return NextResponse.json(
      { error: "Failed to fetch delivery data" },
      { status: 500 }
    )
  }
}
