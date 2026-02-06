// app/api/receipt/[paymentId]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

import { auth } from "@/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await params

    // 1. Validate paymentId format (CUID regex)
    if (!paymentId || !/^c[a-z0-9]+$/i.test(paymentId)) {
        return NextResponse.json({ error: "Invalid payment ID format" }, { status: 400 })
    }

    // 2. Authentication check
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: userId, role, studioId } = session.user

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
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
                city: true,
                address: true,
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
          },
        },
        recordedBy: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    // 3. Authorization check
    const isAdmin = role === "ADMIN"
    const booking = payment.booking
    
    // Safety check: ensure booking exists and IDs are non-null
    if (!booking) {
        return NextResponse.json({ error: "Forbidden: Booking data missing" }, { status: 403 })
    }

    const isStaffAtStudio = !!(studioId && booking.studioId && studioId === booking.studioId)
    const isOwner = !!(userId && booking.createdBy && userId === booking.createdBy)

    if (!isAdmin && !isStaffAtStudio && !isOwner) {
        return NextResponse.json({ error: "Forbidden: You do not have permission to view this receipt" }, { status: 403 })
    }

    return NextResponse.json(payment)
  } catch (error) {
    console.error("Error fetching receipt:", error)
    return NextResponse.json(
      { error: "Failed to fetch receipt" },
      { status: 500 }
    )
  }
}
