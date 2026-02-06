// app/api/studios/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Validation schema for updating studio
const updateStudioSchema = z.object({
  name: z.string().min(2).optional(),
  city: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  country: z.string().optional(),
  address: z.string().min(5).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  isActive: z.boolean().optional(),
  // Settings
  maxSessionsPerDay: z.number().int().min(1).optional(),
  defaultSessionDuration: z.number().int().min(15).optional(),
  requireConfirmation: z.boolean().optional(),
  confirmationExpiryHours: z.number().int().min(1).optional(),
  allowPartialPayment: z.boolean().optional(),
  minimumDepositPercentage: z.number().int().min(0).max(100).optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

// GET: Get single studio with full details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const studio = await prisma.studio.findUnique({
      where: { id },
      include: {
        settings: true,
        staff: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            role: true,
            email: true,
            phone: true,
            image: true,
          },
          orderBy: { name: "asc" },
        },
        _count: {
          select: {
            bookings: true,
            staff: true,
          },
        },
      },
    })

    if (!studio) {
      return NextResponse.json({ error: "Studio not found" }, { status: 404 })
    }

    // Get additional stats
    const currentYear = new Date().getFullYear()
    const yearStart = new Date(currentYear, 0, 1)
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59)

    // Revenue for this year
    const revenue = await prisma.payment.aggregate({
      where: {
        booking: { studioId: id },
        status: "COMPLETED",
        createdAt: { gte: yearStart, lte: yearEnd },
      },
      _sum: { amount: true },
    })

    // Booking stats
    const bookingStats = await prisma.booking.groupBy({
      by: ["bookingStatus"],
      where: {
        studioId: id,
        bookingDate: { gte: yearStart, lte: yearEnd },
      },
      _count: true,
    })

    return NextResponse.json({
      studio,
      stats: {
        yearlyRevenue: Number(revenue._sum.amount) || 0,
        bookingStats: (bookingStats as any[]).map((s) => ({
          status: s.bookingStatus,
          count: s._count,
        })),
      },
    })
  } catch (error) {
    console.error("Get studio error:", error)
    return NextResponse.json(
      { error: "Failed to fetch studio" },
      { status: 500 }
    )
  }
}

// PUT: Update studio
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only Admin can update studios
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = (await request.json()) as any
    const validationResult = updateStudioSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Check studio exists
    const existingStudio = await prisma.studio.findUnique({
      where: { id },
      include: { settings: true },
    })

    if (!existingStudio) {
      return NextResponse.json({ error: "Studio not found" }, { status: 404 })
    }

    // Separate studio and settings data
    const { 
      maxSessionsPerDay, 
      defaultSessionDuration,
      requireConfirmation,
      confirmationExpiryHours,
      allowPartialPayment,
      minimumDepositPercentage,
      ...studioData 
    } = data

    // Update slug if name changed
    let slug = existingStudio.slug
    if (studioData.name && studioData.name !== existingStudio.name) {
      slug = studioData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")

      // Check if new slug is taken
      const slugTaken = await prisma.studio.findFirst({
        where: { slug, id: { not: id } },
      })

      if (slugTaken) {
        return NextResponse.json(
          { error: "A studio with this name already exists" },
          { status: 409 }
        )
      }
    }

    // Update in transaction
    const studio = await prisma.$transaction(async (tx) => {
      // Update studio
      const updatedStudio = await tx.studio.update({
        where: { id },
        data: {
          ...studioData,
          slug,
        },
      })

      // Update or create settings
      const settingsData = {
        ...(maxSessionsPerDay !== undefined && { maxSessionsPerDay }),
        ...(defaultSessionDuration !== undefined && { defaultSessionDuration }),
        ...(requireConfirmation !== undefined && { requireConfirmation }),
        ...(confirmationExpiryHours !== undefined && { confirmationExpiryHours }),
        ...(allowPartialPayment !== undefined && { allowPartialPayment }),
        ...(minimumDepositPercentage !== undefined && { minimumDepositPercentage }),
      }

      if (Object.keys(settingsData).length > 0) {
        await tx.studioSettings.upsert({
          where: { studioId: id },
          create: {
            studioId: id,
            ...settingsData,
          },
          update: settingsData,
        })
      }

      return updatedStudio
    })

    return NextResponse.json({ studio })
  } catch (error) {
    console.error("Update studio error:", error)
    return NextResponse.json(
      { error: "Failed to update studio" },
      { status: 500 }
    )
  }
}

// DELETE: Delete studio (permanent with ?permanent=true, otherwise error)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await auth()
    const { searchParams } = new URL(request.url)
    const permanent = searchParams.get("permanent") === "true"
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only Admin can delete studios
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const studio = await prisma.studio.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bookings: true, staff: true },
        },
      },
    })

    if (!studio) {
      return NextResponse.json({ error: "Studio not found" }, { status: 404 })
    }

    // Check if studio has active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        studioId: id,
        bookingStatus: { in: ["PENDING_CONFIRMATION", "CONFIRMED"] },
      },
    })

    if (activeBookings > 0) {
      return NextResponse.json(
        { error: `Cannot delete studio with ${activeBookings} active bookings. Complete or cancel them first.` },
        { status: 400 }
      )
    }

    if (permanent) {
      // Check if studio has any bookings or staff before permanent delete
      if (studio._count.bookings > 0) {
        return NextResponse.json(
          { error: `Cannot permanently delete studio with ${studio._count.bookings} historical bookings. Deactivate instead.` },
          { status: 400 }
        )
      }

      if (studio._count.staff > 0) {
        return NextResponse.json(
          { error: `Cannot permanently delete studio with ${studio._count.staff} assigned staff. Remove staff first.` },
          { status: 400 }
        )
      }

      // Permanent delete - this will cascade delete settings
      await prisma.studio.delete({
        where: { id },
      })

      return NextResponse.json({ success: true, deleted: true })
    } else {
      return NextResponse.json(
        { error: "Use ?permanent=true for permanent deletion or use PUT to deactivate" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Delete studio error:", error)
    return NextResponse.json(
      { error: "Failed to delete studio" },
      { status: 500 }
    )
  }
}
