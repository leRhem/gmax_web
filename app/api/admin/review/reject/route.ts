// app/api/admin/review/reject/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sendTermiiMessage } from "@/lib/notifications"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let body;
    try {
        body = (await request.json()) as any
    } catch (e) {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    const { bookingId, photoIds, reason } = body

    if (
        !bookingId || 
        !Array.isArray(photoIds) || 
        photoIds.length === 0 ||
        !photoIds.every(id => typeof id === 'string' && id.trim().length > 0) ||
        (typeof bookingId !== 'string' || bookingId.trim().length === 0)
    ) {
      return NextResponse.json(
        { error: "Booking ID and Photo IDs (non-empty strings) are required" },
        { status: 400 }
      )
    }

    // 1. Update photos to EDITING
    const result = await prisma.photo.updateMany({
      where: {
        id: { in: photoIds },
        bookingId: bookingId,
      },
      data: {
        processingStatus: "EDITING",
        status: "PROCESSING", 
        // rejectionReason: reason, // Field does not exist in schema
      },
    })
    
    if (result.count === 0) {
         return NextResponse.json({ error: "No photos updated. Verification failed or photos not found." }, { status: 404 })
    }

    // 2. Fetch Staff (Photographer) to notify
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        photographer: true,
      },
    })

    if (booking?.photographer) {
      const staffName = booking.photographer.name || "Staff"
      const staffPhone = booking.photographer.phone
      const rejectionCount = photoIds.length

      if (staffPhone) {
        // Send SMS/WhatsApp
        const message = `Hello ${staffName}, ${rejectionCount} photo(s) from booking ${booking.id.slice(-6)} have been rejected/returned for rework. Reason: ${reason || "Quality check"}. Please check your dashboard.`
        
        try {
            await sendTermiiMessage(staffPhone, message, "dnd")
            // Attempt WhatsApp too if desired
            // await sendTermiiMessage(staffPhone, message, "whatsapp") 
        } catch (e) {
            console.error("Failed to notify staff:", e)
        }
      }
    }

    return NextResponse.json({ message: "Photos rejected and returned to editing" })
  } catch (error) {
    console.error("Rejection error:", error)
    return NextResponse.json({ error: "Failed to process rejection" }, { status: 500 })
  }
}
