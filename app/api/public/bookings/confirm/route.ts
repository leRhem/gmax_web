// app/api/public/bookings/confirm/route.ts
// Public API for clients to confirm their bookings
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const confirmSchema = z.object({
  confirmationId: z.string().min(1),
})

/**
 * POST: Confirm a booking
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as any
    const validation = confirmSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid confirmation ID" },
        { status: 400 }
      )
    }
    
    const { confirmationId } = validation.data

    // Find the confirmation
    const confirmation = await prisma.bookingConfirmation.findUnique({
      where: { id: confirmationId },
      include: {
        booking: true,
      },
    })

    if (!confirmation) {
      return NextResponse.json(
        { error: "Confirmation not found" },
        { status: 404 }
      )
    }

    // Check if already confirmed
    if (confirmation.status === "CONFIRMED") {
      return NextResponse.json({
        message: "Booking already confirmed",
        isAlreadyConfirmed: true,
      })
    }

    // Check if cancelled
    if (confirmation.status === "CANCELLED") {
      return NextResponse.json(
        { error: "This booking has been cancelled" },
        { status: 400 }
      )
    }

    // Check if expired
    if (confirmation.expiresAt < new Date()) {
      // Mark as expired
      await prisma.bookingConfirmation.update({
        where: { id: confirmationId },
        data: { status: "EXPIRED" },
      })
      
      return NextResponse.json(
        { error: "Confirmation has expired. Please contact the studio to rebook." },
        { status: 400 }
      )
    }

    // Confirm the booking using a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update confirmation status
      const updatedConfirmation = await tx.bookingConfirmation.update({
        where: { id: confirmationId },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
        },
      })

      // Update booking status
      const updatedBooking = await tx.booking.update({
        where: { id: confirmation.booking.id },
        data: {
          bookingStatus: "CONFIRMED",
          confirmedAt: new Date(),
        },
        include: {
          client: {
            select: {
              name: true,
              phone: true,
              email: true,
            },
          },
          studio: {
            select: {
              name: true,
              phone: true,
            },
          },
        },
      })

      return { confirmation: updatedConfirmation, booking: updatedBooking }
    })

    // TODO: Send confirmation message via WhatsApp/SMS
    // This would integrate with a messaging service like Twilio, Africa's Talking, etc.

    return NextResponse.json({
      success: true,
      message: "Booking confirmed successfully!",
      booking: {
        id: result.booking.id,
        clientName: result.booking.client.name,
        studio: result.booking.studio.name,
        bookingDate: result.booking.bookingDate,
      },
    })
  } catch (error) {
    console.error("Confirm booking error:", error)
    return NextResponse.json(
      { error: "Failed to confirm booking" },
      { status: 500 }
    )
  }
}
