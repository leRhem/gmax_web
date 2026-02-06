// app/api/payments/generate-link/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const generateLinkSchema = z.object({
  bookingId: z.string().cuid(),
  sendViaWhatsApp: z.boolean().optional().default(false),
  sendViaEmail: z.boolean().optional().default(false),
})

/**
 * POST: Generate a Paystack payment link for a booking
 * This creates a one-time payment link that clients can use
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check role
    const allowedRoles = ["ADMIN", "MANAGER", "RECEPTIONIST"]
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = (await request.json()) as any
    const { bookingId } = generateLinkSchema.parse(body)

    // Verify booking exists and belongs to user's studio
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        studioId: session.user.studioId!,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
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
          select: {
            amount: true,
          },
        },
        studio: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Calculate amounts
    const totalAmount = booking.items.reduce(
      (sum, item) => sum + Number(item.priceSnapshot) * item.quantity,
      0
    )
    const paidAmount = booking.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    )
    const remainingAmount = totalAmount - paidAmount

    if (remainingAmount <= 0) {
      return NextResponse.json(
        { error: "Booking is already fully paid" },
        { status: 400 }
      )
    }

    // Check for Paystack secret key
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecretKey) {
      return NextResponse.json(
        { error: "Payment gateway not configured" },
        { status: 500 }
      )
    }

    // Generate unique reference
    const reference = `GMAX-${bookingId.slice(-8)}-${Date.now().toString(36).toUpperCase()}`

    // Build service names for description
    const serviceNames = booking.items
      .map((item) => item.service.name)
      .join(", ")

    // Initialize Paystack transaction
    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: booking.client.email || `${booking.client.phone}@gmax.studio`,
          amount: Math.round(remainingAmount * 100), // Paystack uses kobo
          reference,
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/verify?ref=${reference}`,
          metadata: {
            bookingId: booking.id,
            clientId: booking.client.id,
            clientName: booking.client.name,
            studioId: booking.studioId,
            studioName: booking.studio.name,
            services: serviceNames,
            generatedBy: session.user.id,
          },
          channels: ["card", "bank", "ussd", "bank_transfer"],
        }),
      }
    )

    if (!paystackResponse.ok) {
      const errorData = (await paystackResponse.json()) as any
      console.error("Paystack error:", errorData)
      return NextResponse.json(
        { error: "Failed to generate payment link", details: errorData.message },
        { status: 500 }
      )
    }

    const paystackData = (await paystackResponse.json()) as any

    if (!paystackData.status) {
      return NextResponse.json(
        { error: paystackData.message || "Failed to generate payment link" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      paymentLink: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      accessCode: paystackData.data.access_code,
      amount: remainingAmount,
      booking: {
        id: booking.id,
        clientName: booking.client.name,
        services: serviceNames,
        totalAmount,
        paidAmount,
        remainingAmount,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Generate payment link error:", error)
    return NextResponse.json(
      { error: "Failed to generate payment link" },
      { status: 500 }
    )
  }
}
