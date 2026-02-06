// app/api/public/bookings/route.ts
// Public API for clients to create bookings without authentication
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schema for public booking creation
const publicBookingSchema = z.object({
  // Client Info (will create or find client)
  clientName: z.string().min(2, "Name is required"),
  clientPhone: z.string().min(10, "Valid phone number is required"),
  clientEmail: z.string().email().optional().nullable(),
  
  // Booking Details
  studioId: z.string().min(1, "Select a studio"),
  serviceId: z.string().min(1, "Select a service"),
  bookingDate: z.string(),
  notes: z.string().optional(),
  
  // Optional add-ons
  extraOutfits: z.number().int().min(0).default(0),
  extraPics: z.number().int().min(0).default(0),
})

/**
 * GET: List available studios for public selection
 */
export async function GET() {
  try {
    const studios = await prisma.studio.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        address: true,
        phone: true,
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ studios })
  } catch (error) {
    console.error("Get studios error:", error)
    return NextResponse.json(
      { error: "Failed to fetch studios" },
      { status: 500 }
    )
  }
}

/**
 * POST: Create a booking from public page (no auth required)
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as any
    const validation = publicBookingSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation error", details: validation.error.issues },
        { status: 400 }
      )
    }
    
    const data = validation.data

    // Verify studio exists and is active
    const studio = await prisma.studio.findFirst({
      where: {
        id: data.studioId,
        isActive: true,
      },
      include: {
        settings: true,
      },
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
        { error: "Service not found or unavailable" },
        { status: 400 }
      )
    }

    // Validate add-ons
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

    // Check daily capacity
    const bookingDate = new Date(data.bookingDate)
    const dateOnly = new Date(bookingDate)
    dateOnly.setHours(0, 0, 0, 0)

    let capacity = await prisma.dailyCapacity.findUnique({
      where: {
        studioId_date: {
          studioId: data.studioId,
          date: dateOnly,
        },
      },
    })

    if (!capacity) {
      const maxSessions = studio.settings?.maxSessionsPerDay || 15
      capacity = await prisma.dailyCapacity.create({
        data: {
          studioId: data.studioId,
          date: dateOnly,
          maxSessions,
          bookedSessions: 0,
          availableSessions: maxSessions,
        },
      })
    }

    // Calculate sessions and check availability
    const totalSessions = service.includesSessions + data.extraOutfits
    
    const existingBookings = await prisma.booking.findMany({
      where: {
        studioId: data.studioId,
        bookingDate: {
          gte: dateOnly,
          lt: new Date(dateOnly.getTime() + 24 * 60 * 60 * 1000),
        },
        bookingStatus: { not: "CANCELLED" },
      },
      select: { totalSessions: true },
    })

    const bookedSessions = existingBookings.reduce(
      (sum: number, b: { totalSessions: number }) => sum + b.totalSessions,
      0
    )
    const availableSessions = capacity.maxSessions - bookedSessions

    if (totalSessions > availableSessions) {
      return NextResponse.json(
        {
          error: "Date not available",
          message: `This date has limited availability. Please select another date.`,
          availableSessions,
        },
        { status: 409 }
      )
    }

    // Calculate pricing
    const basePrice = service.salePrice ?? service.price
    const outfitsCost = data.extraOutfits * Number(service.extraOutfitPrice ?? 0)
    const picsCost = data.extraPics * Number(service.extraPicPrice ?? 0)
    const totalAmount = Number(basePrice) + outfitsCost + picsCost

    // Find or create client
    let client = await prisma.client.findFirst({
      where: data.clientEmail ? {
        // If email provided, match either phone OR email (strict match?) 
        // User requested: "either (a) match only on data.clientPhone ... or (b) ... require both to match"
        // Let's go with (a) match only on data.clientPhone to be safe if phone is unique identifier, 
        // BUT user often wants to link by email too. 
        // User said: "link bookings to the wrong person when phone and email belong to different clients"
        // So checking OR is bad. 
        // Let's use logic: Match by Phone. If not found, Match by Email? 
        // User suggested: "(b) when data.clientEmail is provided require both to match (use an AND between phone and email)"
        // This seems too strict (what if client changed phone?).
        // Let's use (a) match only on data.clientPhone. Phone is usually more unique/stable for "this person in front of me".
        phone: data.clientPhone
      } : {
        phone: data.clientPhone
      }
    })

    if (!client) {
      client = await prisma.client.create({
        data: {
          name: data.clientName,
          phone: data.clientPhone,
          email: data.clientEmail || null,
          type: "STANDARD",
        },
      })

    }
    // client update moved to transaction below for atomicity

    // Find a default staff member for the studio to set as creator
    const systemStaff = await prisma.staff.findFirst({
      where: {
        studioId: data.studioId,
        role: { in: ["ADMIN", "MANAGER"] },
        isActive: true,
      },
    })

    if (!systemStaff) {
      return NextResponse.json(
        { error: "Studio is not properly configured" },
        { status: 500 }
      )
    }

    // Generate confirmation token
    const confirmationToken = `confirm-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`
    const confirmationExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours

    // Create booking with transaction
    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          clientId: client.id,
          studioId: data.studioId,
          bookingDate: bookingDate,
          notes: data.notes || null,
          tags: ["ONLINE_BOOKING"],
          
          // Session tracking
          totalSessions,
          baseOutfits: service.includesSessions,
          extraOutfits: data.extraOutfits,
          extraPicsCount: data.extraPics,
          photoCount: data.extraPics,
          
          // Status - pending confirmation
          bookingStatus: "PENDING_CONFIRMATION",
          paymentStatus: "PENDING",
          deliveryStatus: "PENDING",
          assetsStatus: "NOT_UPLOADED",
          
          // Confirmation
          confirmationToken,
          confirmationExpiresAt,
          
          // Created by system staff
          createdBy: systemStaff.id,
        },
      })

      // Update client email if needed (Atomic update)
      // Update client email if needed (Atomic update)
      if (data.clientEmail) {
            // Check if email is taken by ANOTHER client
            const existingEmailClient = await tx.client.findUnique({
                where: { email: data.clientEmail }
            })
            if (existingEmailClient && existingEmailClient.id !== client.id) {
                // Email belongs to someone else. We cannot assign it to this client.
                // We could throw, or just ignore (and not update email).
                console.warn(`Booking created but could not update client email: ${data.clientEmail} is taken by another client.`)
                // Choosing to ignore update rather than fail booking
            } else {
               // Only update if current email is null (as requested "email: null")
               await tx.client.updateMany({
                   where: { 
                       id: client.id,
                       email: null
                   },
                   data: { email: data.clientEmail }
               })
            }
      }

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
          bookedSessions: bookedSessions + totalSessions,
          availableSessions: availableSessions - totalSessions,
        },
      })

      // Create confirmation record
      await tx.bookingConfirmation.create({
        data: {
          bookingId: newBooking.id,
          token: confirmationToken,
          expiresAt: confirmationExpiresAt,
          originalData: {
            serviceId: data.serviceId,
            serviceName: service.name,
            extraOutfits: data.extraOutfits,
            extraPics: data.extraPics,
            totalSessions,
            totalAmount,
          },
          status: "PENDING",
        },
      })

      return newBooking
    })

    // Generate confirmation link
    const confirmationLink = `${process.env.NEXT_PUBLIC_APP_URL}/confirm/${confirmationToken}`

    return NextResponse.json(
      {
        success: true,
        bookingId: booking.id,
        confirmationToken,
        confirmationLink,
        totalAmount,
        message: "Booking created! Please confirm your booking using the link sent to you.",
        client: {
          name: client.name,
          phone: client.phone,
        },
        service: {
          name: service.name,
        },
        studio: {
          name: studio.name,
          city: studio.city,
        },
        bookingDate: booking.bookingDate,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Create public booking error:", error)
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    )
  }
}
