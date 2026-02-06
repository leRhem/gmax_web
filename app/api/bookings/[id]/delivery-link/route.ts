// app/api/bookings/[id]/delivery-link/route.ts
// Generate delivery link for a booking (staff use)
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const generateSchema = z.object({
  expiryDays: z.number().int().min(1).max(90).optional().default(30),
  regenerate: z.boolean().optional().default(false),
})

/**
 * POST: Generate or regenerate delivery link
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: bookingId } = await params
    const body = (await request.json().catch(() => ({}))) as any
    
    const validation = generateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      )
    }

    const { expiryDays, regenerate } = validation.data

    // Find booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: { select: { name: true, phone: true } },
        deliveryToken: true,
        photos: {
          where: { status: { in: ["READY", "DELIVERED"] } },
        },
      },
    }) as any

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      )
    }

    // Check if photos are ready
    if (booking.photos.length === 0) {
      return NextResponse.json(
        { error: "No photos ready for delivery. Upload and mark photos as ready first." },
        { status: 400 }
      )
    }

    // Check for existing non-expired token
    if (booking.deliveryToken && !regenerate) {
      const isExpired = booking.deliveryToken.expiresAt < new Date()
      if (!isExpired) {
        // Return existing token
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        return NextResponse.json({
          token: booking.deliveryToken.token,
          deliveryLink: `${appUrl}/delivery/${booking.deliveryToken.token}`,
          expiresAt: booking.deliveryToken.expiresAt,
          photoCount: booking.photos.length,
          isNew: false,
        })
      }
    }

    // Calculate expiry date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiryDays)

    // Create or update delivery token
    const deliveryToken = await prisma.deliveryToken.upsert({
      where: { bookingId },
      create: {
        bookingId,
        expiresAt,
      },
      update: {
        token: undefined, // Let Prisma generate new token
        expiresAt,
        downloads: 0,
      },
    })

    // If regenerating, create new token
    let finalToken = deliveryToken.token
    if (regenerate && booking.deliveryToken) {
      const newToken = await prisma.deliveryToken.update({
        where: { id: deliveryToken.id },
        data: {
          token: crypto.randomUUID(),
          downloads: 0,
        },
      })
      finalToken = newToken.token
    }

    // Update booking delivery status
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        deliveryStatus: "READY",
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const deliveryLink = `${appUrl}/delivery/${finalToken}`

    return NextResponse.json({
      token: finalToken,
      deliveryLink,
      expiresAt,
      photoCount: booking.photos.length,
      isNew: true,
      client: {
        name: booking.client.name,
        phone: booking.client.phone,
      },
    })
  } catch (error) {
    console.error("Generate delivery link error:", error)
    return NextResponse.json(
      { error: "Failed to generate delivery link" },
      { status: 500 }
    )
  }
}

/**
 * GET: Get current delivery link status
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: bookingId } = await params

    const deliveryToken = await prisma.deliveryToken.findUnique({
      where: { bookingId },
      include: {
        booking: {
          include: {
            photos: {
              where: { status: { in: ["READY", "DELIVERED"] } },
              select: { id: true, clientDownloaded: true },
            },
          },
        },
      },
    }) as any

    if (!deliveryToken) {
      return NextResponse.json({
        hasDeliveryLink: false,
      })
    }

    const isExpired = deliveryToken.expiresAt < new Date()
    const downloadedCount = deliveryToken.booking.photos.filter((p: any) => p.clientDownloaded).length
    const totalPhotos = deliveryToken.booking.photos.length

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    return NextResponse.json({
      hasDeliveryLink: true,
      token: deliveryToken.token,
      deliveryLink: `${appUrl}/delivery/${deliveryToken.token}`,
      expiresAt: deliveryToken.expiresAt,
      isExpired,
      viewCount: deliveryToken.downloads,
      photoCount: totalPhotos,
      downloadedByClient: downloadedCount,
      createdAt: deliveryToken.createdAt,
    })
  } catch (error) {
    console.error("Get delivery link error:", error)
    return NextResponse.json(
      { error: "Failed to get delivery link" },
      { status: 500 }
    )
  }
}
