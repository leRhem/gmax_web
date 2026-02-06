// app/api/studios/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Validation schema for creating/updating studio
const studioSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  country: z.string().default("Nigeria"),
  address: z.string().min(5, "Address is required"),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  isActive: z.boolean().default(true),
  // Settings
  maxSessionsPerDay: z.number().int().min(1).default(15),
  defaultSessionDuration: z.number().int().min(15).default(45),
})

// GET: List all studios
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get("includeInactive") === "true"

    const studios = await prisma.studio.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        settings: true,
        _count: {
          select: {
            staff: true,
            bookings: true,
          },
        },
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

// POST: Create a new studio
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only Admin can create studios
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = (await request.json()) as any
    const validationResult = studioSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

    // Check if slug already exists
    const existingStudio = await prisma.studio.findUnique({
      where: { slug },
    })

    if (existingStudio) {
      return NextResponse.json(
        { error: "A studio with this name already exists" },
        { status: 409 }
      )
    }

    // Create studio with settings in transaction
    const studio = await prisma.$transaction(async (tx) => {
      const newStudio = await tx.studio.create({
        data: {
          name: data.name,
          slug,
          city: data.city,
          state: data.state,
          country: data.country,
          address: data.address,
          phone: data.phone,
          email: data.email,
          isActive: data.isActive,
        },
      })

      // Create default settings
      await tx.studioSettings.create({
        data: {
          studioId: newStudio.id,
          maxSessionsPerDay: data.maxSessionsPerDay,
          defaultSessionDuration: data.defaultSessionDuration,
        },
      })

      return newStudio
    })

    return NextResponse.json({ studio }, { status: 201 })
  } catch (error) {
    console.error("Create studio error:", error)
    return NextResponse.json(
      { error: "Failed to create studio" },
      { status: 500 }
    )
  }
}
