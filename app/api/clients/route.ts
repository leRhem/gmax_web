// app/api/clients/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { ClientType } from "@/types/client"

// Validation schema
const createClientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(/^(\+234|0)[789]\d{9}$/, "Invalid Nigerian phone number"),
  email: z.string().email("Invalid email").optional().nullable(),
  address: z.string().optional().nullable(),
  type: z.enum(["STANDARD", "VIP", "VVIP", "CORPORATE"]).default("STANDARD"),
  notes: z.string().optional().nullable(),
})

// GET: List all clients with pagination and search
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const type = searchParams.get("type") as ClientType | null

    const skip = (page - 1) * limit

    // Build where clause
    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(type && { type }),
    }

    // Get total count
    const total = await prisma.client.count({ where })

    // Get clients
    const clients = await prisma.client.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    })

    return NextResponse.json({
      clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get clients error:", error)
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    )
  }
}

// POST: Create new client
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check role - only ADMIN, MANAGER, RECEPTIONIST can create clients
    const allowedRoles = ["ADMIN", "MANAGER", "RECEPTIONIST"]
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = (await request.json()) as any
    const data = createClientSchema.parse(body)

    // Check if phone already exists
    const existingClient = await prisma.client.findUnique({
      where: { phone: data.phone },
    })

    if (existingClient) {
      return NextResponse.json(
        { error: "Client with this phone number already exists" },
        { status: 400 }
      )
    }

    // Check if email exists (if provided)
    if (data.email) {
      const existingEmail = await prisma.client.findUnique({
        where: { email: data.email },
      })

      if (existingEmail) {
        return NextResponse.json(
          { error: "Client with this email already exists" },
          { status: 400 }
        )
      }
    }

    // Create client
    const client = await prisma.client.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        type: data.type,
        notes: data.notes,
      },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Create client error:", error)
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    )
  }
}