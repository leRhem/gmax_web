import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { generatePaymentLink } from "@/lib/paystack"

// Enhanced validation schema
const createBookingSchema = z.object({
  clientId: z.string().cuid(),
  studioId: z.string().cuid().optional(), // Optional: falls back to session user's studioId
  bookingDate: z.string().datetime(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  photographerId: z.string().cuid().optional().nullable(),
  
  // ✅ NEW: Session-based fields
  serviceId: z.string().cuid(),
  extraOutfits: z.number().int().min(0).default(0),
  extraPics: z.number().int().min(0).default(0),
  totalSessions: z.number().int().min(0),
})

// GET: List all bookings with filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const clientId = searchParams.get("clientId")
    const photographerId = searchParams.get("photographerId")
    const bookingStatus = searchParams.get("bookingStatus")
    const paymentStatus = searchParams.get("paymentStatus")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const studioIdParam = searchParams.get("studioId")

    const skip = (page - 1) * limit

    // Role-based studio filtering
    // Admin can see all studios or filter by specific studio
    // Manager and others can only see their assigned studio
    const role = session.user.role
    const isAdmin = role === "ADMIN"
    const isManager = role === "MANAGER" || role === "RECEPTIONIST"
    
    // Filter by Studio
    const studioFilter = isAdmin
      ? (studioIdParam || undefined) // Admin: optional filter
      : session.user.studioId // Others: locked to their studio

    // Filter by Assignment (for Staff)
    // If not Admin/Manager/Receptionist, user can only see their own assignments
    const assignmentFilter = (!isAdmin && !isManager) ? session.user.id : undefined

    // Build where clause with studio isolation and assignment
    const where: any = {
      ...(studioFilter && { studioId: studioFilter }),
      // If assignment filter applies, override any requested photographerId
      ...(assignmentFilter ? { photographerId: assignmentFilter } : (photographerId && { photographerId })),
      ...(clientId && { clientId }),
      ...(bookingStatus && { bookingStatus }),
      ...(paymentStatus && { paymentStatus }),
      ...(startDate && endDate && {
        bookingDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
    }

    // Get total count
    const total = await prisma.booking.count({ where })

    // Get bookings
    const bookings = await prisma.booking.findMany({
      where,
      skip,
      take: limit,
      orderBy: { bookingDate: "desc" },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        photographer: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        items: {
          include: {
            service: {
              select: {
                name: true,
                price: true,
              },
            },
          },
        },
        _count: {
          select: {
            payments: true,
            photos: true,
          },
        },
      },
    })

    // Calculate total amount for each booking
    const bookingsWithTotal = bookings.map((booking: any) => ({
      ...booking,
      totalAmount: booking.items.reduce(
        (sum: number, item: any) => sum + Number(item.priceSnapshot) * item.quantity,
        0
      ),
    }))

    return NextResponse.json({
      bookings: bookingsWithTotal,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get bookings error:", error)
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    )
  }
}

// POST: Create new booking (SESSION-BASED)
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
    const data = createBookingSchema.parse(body)

    // Validate client exists
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Resolve studioId - use provided value or fall back to session user's studioId
    const studioId = data.studioId || session.user.studioId
    if (!studioId) {
      return NextResponse.json(
        { error: "Studio ID is required. Please provide studioId or ensure user has a studio assigned." },
        { status: 400 }
      )
    }

    // Validate studio exists
    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
    })

    if (!studio) {
      return NextResponse.json({ error: "Studio not found" }, { status: 404 })
    }

    // Get service details
    const service = await prisma.service.findUnique({
      where: { id: data.serviceId },
    })

    if (!service || !service.isActive) {
      return NextResponse.json(
        { error: "Service not found or inactive" },
        { status: 400 }
      )
    }

    // ✅ Validate add-ons are allowed
    if (data.extraOutfits > 0 && !service.allowExtraOutfits) {
      return NextResponse.json(
        { error: "This service does not allow extra outfits" },
        { status: 400 }
      )
    }

    if (data.extraPics > 0 && !service.allowExtraPics) {
      return NextResponse.json(
        { error: "This service does not allow extra pictures" },
        { status: 400 }
      )
    }

    // ✅ Check daily capacity
    const bookingDate = new Date(data.bookingDate)
    const dateOnly = new Date(bookingDate)
    dateOnly.setHours(0, 0, 0, 0)

    // Get current capacity
    let capacity = await prisma.dailyCapacity.findUnique({
      where: {
        studioId_date: {
          studioId: studioId,
          date: dateOnly,
        },
      },
    })

    // If doesn't exist, create it
    if (!capacity) {
      const settings = await prisma.studioSettings.findUnique({
        where: { studioId: studioId },
      })

      const maxSessions = settings?.maxSessionsPerDay || 15

      capacity = await prisma.dailyCapacity.create({
        data: {
          studioId: studioId,
          date: dateOnly,
          maxSessions,
          bookedSessions: 0,
          availableSessions: maxSessions,
        },
      })
    }

    // Calculate current bookings
    const existingBookings = await prisma.booking.findMany({
      where: {
        studioId: data.studioId,
        bookingDate: {
          gte: dateOnly,
          lt: new Date(dateOnly.getTime() + 24 * 60 * 60 * 1000),
        },
        bookingStatus: {
          not: "CANCELLED",
        },
      },
      select: {
        totalSessions: true,
      },
    })

    const bookedSessions = existingBookings.reduce(
      (sum, b) => sum + b.totalSessions,
      0
    )

    const availableSessions = capacity.maxSessions - bookedSessions

    // ✅ Check if enough capacity
    if (data.totalSessions > availableSessions) {
      return NextResponse.json(
        {
          error: "Insufficient capacity",
          message: `This booking requires ${data.totalSessions} sessions but only ${availableSessions} are available.`,
          availableSessions,
          requestedSessions: data.totalSessions,
        },
        { status: 409 }
      )
    }

    // ✅ Calculate pricing
    const basePrice = service.salePrice ?? service.price
    const outfitsCost = data.extraOutfits * Number(service.extraOutfitPrice ?? 0)
    const picsCost = data.extraPics * Number(service.extraPicPrice ?? 0)
    const totalAmount = Number(basePrice) + outfitsCost + picsCost

    // ✅ Create booking with transaction
    const booking = await prisma.$transaction(async (tx) => {
      // Create booking
      const newBooking = await tx.booking.create({
        data: {
          clientId: data.clientId,
          studioId: studioId,
          bookingDate: bookingDate,
          notes: data.notes,
          tags: data.tags,
          photographerId: data.photographerId,
          
          // ✅ Session tracking
          totalSessions: data.totalSessions,
          baseOutfits: service.includesSessions,
          extraOutfits: data.extraOutfits,
          extraPicsCount: data.extraPics,
          photoCount: data.extraPics, // For backwards compatibility
          
          // ✅ Status
          bookingStatus: "PENDING_CONFIRMATION",
          paymentStatus: "PENDING",
          deliveryStatus: "PENDING",
          assetsStatus: "NOT_UPLOADED",
          
          // ✅ Confirmation token
          confirmationToken: undefined, // Will be auto-generated by Prisma
          confirmationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          
          createdBy: session.user.id,
        },
      })

      // Create booking item
      await tx.bookingItem.create({
        data: {
          bookingId: newBooking.id,
          serviceId: data.serviceId,
          priceSnapshot: totalAmount,
          quantity: 1,
        },
      })

      // Update capacity
      await tx.dailyCapacity.update({
        where: { id: capacity.id },
        data: {
          bookedSessions: bookedSessions + data.totalSessions,
          availableSessions: availableSessions - data.totalSessions,
        },
      })

      // ✅ Create confirmation record
      await tx.bookingConfirmation.create({
        data: {
          bookingId: newBooking.id,
          token: newBooking.confirmationToken!,
          expiresAt: newBooking.confirmationExpiresAt!,
          originalData: {
            serviceId: data.serviceId,
            extraOutfits: data.extraOutfits,
            extraPics: data.extraPics,
            totalSessions: data.totalSessions,
            totalAmount,
          },
          status: "PENDING",
        },
      })

      return newBooking
    })

    // ✅ Generate payment link
    let paymentLinkData = null
    const clientEmail = client.email || (client.phone ? `${client.phone.replace(/\D/g, "")}@gmax.studio` : null)

    if (!clientEmail) {
      console.warn("Cannot generate payment link: Client has no email or phone")
    } else {
      try {
        paymentLinkData = await generatePaymentLink({
          bookingId: booking.id,
          amount: totalAmount,
          email: clientEmail,
          clientName: client.name,
          clientPhone: client.phone,
          studioName: studio.name,
          serviceNames: service.name,
        })
      } catch (error) {
        console.error("Failed to auto-generate payment link:", error)
        // Don't fail the request if link generation fails
      }
    }

    // ✅ TODO: Send confirmation SMS/WhatsApp to client
    // Implementation in next phase

    return NextResponse.json(
      {
        ...booking,
        totalAmount,
        confirmationLink: `${process.env.NEXT_PUBLIC_APP_URL}/confirm/${booking.confirmationToken}`,
        paymentLink: paymentLinkData?.paymentLink || null,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Create booking error:", error)
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    )
  }
}