// app/api/payments/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schema for recording a manual payment
const recordPaymentSchema = z.object({
  bookingId: z.string().cuid(),
  amount: z.number().positive("Amount must be positive"),
  method: z.enum(["CASH", "TRANSFER", "POS"]),
  notes: z.string().optional().nullable(),
})

/**
 * GET: List payments for a booking
 * Query params: bookingId (required)
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

    // Verify booking exists and belongs to user's studio
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        studioId: session.user.studioId!,
      },
      select: {
        id: true,
        paymentStatus: true,
        items: {
          select: {
            priceSnapshot: true,
            quantity: true,
          },
        },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Get all payments for this booking
    const payments = await prisma.payment.findMany({
      where: { bookingId },
      orderBy: { paymentDate: "desc" },
      include: {
        recordedBy: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    // Calculate totals
    const totalAmount = booking.items.reduce(
      (sum, item) => sum + Number(item.priceSnapshot) * item.quantity,
      0
    )
    const paidAmount = payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    )
    const remainingAmount = totalAmount - paidAmount

    return NextResponse.json({
      payments,
      summary: {
        totalAmount,
        paidAmount,
        remainingAmount,
        paymentStatus: booking.paymentStatus,
        paymentCount: payments.length,
      },
    })
  } catch (error) {
    console.error("Get payments error:", error)
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    )
  }
}

/**
 * POST: Record a manual payment (Cash, Transfer, POS)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check role - only ADMIN, MANAGER, RECEPTIONIST can record payments
    const allowedRoles = ["ADMIN", "MANAGER", "RECEPTIONIST"]
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = (await request.json()) as any
    const data = recordPaymentSchema.parse(body)

    // Verify booking exists and belongs to user's studio
    const booking = await prisma.booking.findFirst({
      where: {
        id: data.bookingId,
        studioId: session.user.studioId!,
      },
      include: {
        items: {
          select: {
            priceSnapshot: true,
            quantity: true,
          },
        },
        payments: {
          select: {
            amount: true,
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
    const paidSoFar = booking.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    )
    const remainingAmount = totalAmount - paidSoFar

    // Don't allow overpayment
    if (data.amount > remainingAmount) {
      return NextResponse.json(
        {
          error: "Payment exceeds remaining balance",
          remainingAmount,
          attemptedAmount: data.amount,
        },
        { status: 400 }
      )
    }

    // Generate unique receipt number
    const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    // Create payment and update booking status in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.payment.create({
        data: {
          bookingId: data.bookingId,
          amount: data.amount,
          method: data.method,
          status: "COMPLETED",
          receiptNumber,
          notes: data.notes,
          recordedById: session.user.id,
          paymentDate: new Date(),
        },
        include: {
          recordedBy: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      })

      // Calculate new payment status
      const newPaidAmount = paidSoFar + data.amount
      let newPaymentStatus: "PENDING" | "PARTIAL" | "COMPLETED"
      
      if (newPaidAmount >= totalAmount) {
        newPaymentStatus = "COMPLETED"
      } else if (newPaidAmount > 0) {
        newPaymentStatus = "PARTIAL"
      } else {
        newPaymentStatus = "PENDING"
      }

      // Update booking payment status
      await tx.booking.update({
        where: { id: data.bookingId },
        data: { paymentStatus: newPaymentStatus },
      })

      return {
        payment,
        newPaymentStatus,
        totalAmount,
        paidAmount: newPaidAmount,
        remainingAmount: totalAmount - newPaidAmount,
      }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Record payment error:", error)
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    )
  }
}
