// app/api/bookings/[id]/payment-link/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generatePaymentLink, getPaymentLink } from "@/lib/paystack"

/**
 * GET: Get payment link for a booking
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: bookingId } = await params

    // 1. Authorization check: non-admins must have a studioId
    if (session.user.role !== "ADMIN" && !session.user.studioId) {
      return NextResponse.json({ error: "Forbidden: No studio assigned" }, { status: 403 })
    }

    // Get booking with payment info
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        ...(session.user.role !== "ADMIN" ? { studioId: session.user.studioId! } : {}),
      },
      include: {
        client: { select: { name: true, email: true, phone: true } },
        studio: { select: { name: true } },
        items: {
          include: { service: { select: { name: true } } },
        },
        payments: { select: { amount: true, status: true } },
        paymentLink: true,
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
    const paidAmount = booking.payments
      .filter((p) => p.status === "COMPLETED")
      .reduce((sum, p) => sum + Number(p.amount), 0)
    const remainingAmount = totalAmount - paidAmount

    // If fully paid, no need for payment link
    if (remainingAmount <= 0) {
      return NextResponse.json({
        paymentLink: null,
        isPaid: true,
        totalAmount,
        paidAmount,
        remainingAmount: 0,
      })
    }

    // Return existing link or indicate none exists
    if (booking.paymentLink) {
      return NextResponse.json({
        paymentLink: booking.paymentLink.paystackUrl,
        reference: booking.paymentLink.paystackRef,
        status: booking.paymentLink.status,
        amount: Number(booking.paymentLink.amount),
        viewCount: booking.paymentLink.viewCount,
        createdAt: booking.paymentLink.createdAt,
        isPaid: false,
        totalAmount,
        paidAmount,
        remainingAmount,
      })
    }

    return NextResponse.json({
      paymentLink: null,
      isPaid: false,
      totalAmount,
      paidAmount,
      remainingAmount,
      message: "No payment link generated yet",
    })
  } catch (error) {
    console.error("Get payment link error:", error)
    return NextResponse.json(
      { error: "Failed to get payment link" },
      { status: 500 }
    )
  }
}

/**
 * POST: Generate or regenerate payment link
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

    // Check role
    const allowedRoles = ["ADMIN", "MANAGER", "RECEPTIONIST"]
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id: bookingId } = await params

    // 1. Authorization check: non-admins must have a studioId
    if (session.user.role !== "ADMIN" && !session.user.studioId) {
      return NextResponse.json({ error: "Forbidden: No studio assigned" }, { status: 403 })
    }

    // Get booking with full details
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        ...(session.user.role !== "ADMIN" ? { studioId: session.user.studioId! } : {}),
      },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
        studio: { select: { name: true } },
        items: {
          include: { service: { select: { name: true } } },
        },
        payments: { select: { amount: true, status: true } },
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
    const paidAmount = booking.payments
      .filter((p) => p.status === "COMPLETED")
      .reduce((sum, p) => sum + Number(p.amount), 0)
    const remainingAmount = totalAmount - paidAmount

    if (remainingAmount <= 0) {
      return NextResponse.json(
        { error: "Booking is already fully paid" },
        { status: 400 }
      )
    }

    // Generate payment link
    const serviceNames = booking.items.map((item) => item.service.name).join(", ")
    
    const result = await generatePaymentLink({
      bookingId: booking.id,
      amount: remainingAmount,
      email: booking.client.email || `${booking.client.phone?.replace(/\D/g, "")}@gmax.studio`,
      clientName: booking.client.name,
      clientPhone: booking.client.phone,
      studioName: booking.studio.name,
      serviceNames,
    })

    return NextResponse.json({
      ...result,
      totalAmount,
      paidAmount,
      remainingAmount,
      clientName: booking.client.name,
      clientPhone: booking.client.phone,
    })
  } catch (error: any) {
    console.error("Generate payment link error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate payment link" },
      { status: 500 }
    )
  }
}
