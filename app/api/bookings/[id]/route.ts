// app/api/bookings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendNotification } from "@/lib/notifications"
import { NotificationChannel } from "@/lib/generated/prisma"

const updateBookingSchema = z.object({
  clientId: z.string().cuid().optional(),
  bookingDate: z.string().datetime().optional(),
  photoCount: z.number().int().min(0).optional(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  photographerId: z.string().cuid().optional().nullable(),
  bookingStatus: z.enum(["CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
  paymentStatus: z
    .enum(["PENDING", "PARTIAL", "COMPLETED", "FAILED", "REFUNDED"])
    .optional(),
  deliveryStatus: z
    .enum(["PENDING", "EDITING", "READY", "DELIVERED"])
    .optional(),
  items: z.array(
    z.object({
      serviceId: z.string().cuid(),
      quantity: z.number().int().min(1).default(1),
    })
  ).optional(),
})

// GET: Get single booking by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const userRole = session.user.role as string
    const userStudioId = session.user.studioId

    // Enforce studio isolation unless SUPER_ADMIN
    if (userRole !== "SUPER_ADMIN" && !userStudioId) {
       return NextResponse.json({ error: "Forbidden: No studio assigned" }, { status: 403 })
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id,
        ...(userRole !== "SUPER_ADMIN" ? { studioId: userStudioId! } : {}),
      },
      include: {
        client: true,
        studio: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
        photographer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            service: {
              include: {
                category: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        payments: {
          include: {
            recordedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { paymentDate: "desc" },
        },
        photos: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            uploadedAt: true,
            expiresAt: true,
            downloaded: true,
            downloadCount: true,
          },
          orderBy: { uploadedAt: "desc" },
        },
        _count: {
          select: {
            payments: true,
            photos: true,
          },
        },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Calculate amounts
    // Calculate amounts
    const totalAmount = (booking as any).items.reduce(
      (sum: number, item: any) => sum + Number(item.priceSnapshot) * item.quantity,
      0
    )

    const amountPaid = (booking as any).payments.reduce(
      (sum: number, payment: any) =>
        payment.status === "COMPLETED" ? sum + Number(payment.amount) : sum,
      0
    )

    return NextResponse.json({
      ...booking,
      totalAmount,
      amountPaid,
      balance: totalAmount - amountPaid,
    })
  } catch (error) {
    console.error("Get booking error:", error)
    return NextResponse.json(
      { error: "Failed to fetch booking" },
      { status: 500 }
    )
  }
}

// PATCH: Update booking
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const allowedRoles = ["ADMIN", "MANAGER", "RECEPTIONIST"]
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = (await request.json()) as any
    const data = updateBookingSchema.parse(body)
    const userRole = session.user.role as string
    const userStudioId = session.user.studioId

    // Enforce studio isolation unless SUPER_ADMIN
    if (userRole !== "SUPER_ADMIN" && !userStudioId) {
      return NextResponse.json({ error: "Forbidden: No studio assigned" }, { status: 403 })
    }

    // Check booking exists and belongs to user's studio
    const existingBooking = await prisma.booking.findFirst({
      where: {
        id,
        ...(userRole !== "SUPER_ADMIN" ? { studioId: userStudioId! } : {}),
      },
      include: {
        items: true,
      },
    })

    if (!existingBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // If updating booking date, check for conflicts
    if (data.bookingDate) {
      const newDate = new Date(data.bookingDate)
      const twoHoursBefore = new Date(newDate.getTime() - 2 * 60 * 60 * 1000)
      const twoHoursAfter = new Date(newDate.getTime() + 2 * 60 * 60 * 1000)

      const conflictingBooking = await prisma.booking.findFirst({
        where: {
          id: { not: id },
          ...(session.user.studioId && { studioId: session.user.studioId }),
          bookingDate: {
            gte: twoHoursBefore,
            lte: twoHoursAfter,
          },
          bookingStatus: { not: "CANCELLED" },
        },
        include: {
          client: { select: { name: true } },
        },
      })

      if (conflictingBooking) {
        return NextResponse.json(
          {
            error: "Time slot conflict",
            message: `New date conflicts with ${(conflictingBooking as any).client.name}'s booking`,
          },
          { status: 409 }
        )
      }
    }

    // Update booking with transaction (for items update)
    const updatedBooking = await prisma.$transaction(async (tx) => {
      // Update booking basic fields
      const booking = await tx.booking.update({
        where: { id },
        data: {
          ...(data.clientId && { clientId: data.clientId }),
          ...(data.bookingDate && { bookingDate: new Date(data.bookingDate) }),
          ...(data.photoCount !== undefined && { photoCount: data.photoCount }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.tags && { tags: data.tags }),
          ...(data.photographerId !== undefined && {
            photographerId: data.photographerId,
          }),
          ...(data.bookingStatus && { bookingStatus: data.bookingStatus }),
          ...(data.paymentStatus && { paymentStatus: data.paymentStatus }),
          ...(data.deliveryStatus && { deliveryStatus: data.deliveryStatus }),
        },
      })

      // If items are being updated, replace them
      if (data.items) {
        // Delete existing items
        await tx.bookingItem.deleteMany({
          where: { bookingId: id },
        })

        // Get services to capture price snapshots
        const services = await tx.service.findMany({
          where: {
            id: { in: data.items.map((item) => item.serviceId) },
          },
        })

        // Create new items
        await Promise.all(
          data.items.map((item) => {
            const service = services.find((s) => s.id === item.serviceId)
            if (!service) {
              throw new Error(`Service ${item.serviceId} not found`)
            }
            return tx.bookingItem.create({
              data: {
                bookingId: id,
                serviceId: item.serviceId,
                priceSnapshot: service.salePrice ?? service.price,
                quantity: item.quantity,
              },
            })
          })
        )
      }

      return booking
    })

    // Fetch complete booking with relations
    const completeBooking = await prisma.booking.findFirst({
      where: { id },
      include: {
        client: true,
        items: {
          include: {
            service: true,
          },
        },
      },
    }) as any // Cast to ANY to avoid complex type issues for now

    // NOTIFICATIONS
    // Trigger "Work Ready" notification if status changed to READY or COMPLETED
    if (completeBooking && (
      (data.deliveryStatus === "READY" && existingBooking.deliveryStatus !== "READY") ||
      (data.bookingStatus === "COMPLETED" && existingBooking.bookingStatus !== "COMPLETED")
    )) {
        const clientName = completeBooking.client?.name ?? "Client"
        const clientPhone = completeBooking.client?.phone
        const clientEmail = completeBooking.client?.email
        
        const serviceNamesArray = completeBooking.items?.map((i: any) => i.service?.name).filter(Boolean) || []
        const serviceNames = serviceNamesArray.length > 0 ? serviceNamesArray.join(", ") : null
        const serviceFragment = serviceNames ? ` for ${serviceNames}` : ""

        const channels: NotificationChannel[] = []
        if (clientEmail) channels.push("EMAIL")
        if (clientPhone) {
            channels.push("SMS")
            channels.push("WHATSAPP")
        }

        if (channels.length > 0) {
            // Fire-and-forget or wrap in try-catch to not fail the booking update
            // Fire-and-forget or wrap in try-catch to not fail the booking update
            sendNotification({
                    clientName,
                    clientEmail: clientEmail || undefined,
                    clientPhone: clientPhone || undefined,
                    type: "PHOTOS_READY",
                    message: `Hello ${clientName}, your work${serviceFragment} is ready! Please check your dashboard to view/download.`,
                    channels,
                    bookingId: completeBooking.id
            }).catch(e => console.error("Failed to send notification (async):", e))

        }
    }


    return NextResponse.json(completeBooking)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Update booking error:", error)
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    )
  }
}

// DELETE: Cancel booking (soft delete via status)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN and MANAGER can cancel bookings
    if (!["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const userRole = session.user.role as string
    const userStudioId = session.user.studioId

    // Enforce studio isolation unless SUPER_ADMIN
    if (userRole !== "SUPER_ADMIN" && !userStudioId) {
       return NextResponse.json({ error: "Forbidden: No studio assigned" }, { status: 403 })
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id,
         ...(userRole !== "SUPER_ADMIN" ? { studioId: userStudioId! } : {}),
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Update to cancelled instead of hard delete
    await prisma.booking.update({
      where: { id },
      data: { bookingStatus: "CANCELLED" },
    })

    return NextResponse.json({
      message: "Booking cancelled successfully",
    })
  } catch (error) {
    console.error("Cancel booking error:", error)
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 }
    )
  }
}