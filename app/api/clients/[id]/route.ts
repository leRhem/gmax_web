import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Validation schema for update
const updateClientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone: z.string().regex(/^(\+234|0)[789]\d{9}$/, "Invalid Nigerian phone number").optional(),
  email: z.string().email("Invalid email").optional().nullable(),
  address: z.string().optional().nullable(),
  type: z.enum(["STANDARD", "VIP", "VVIP", "CORPORATE"]).optional(),
  notes: z.string().optional().nullable(),
})

// GET: Get single client by ID
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

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        bookings: {
          select: {
            id: true,
            bookingDate: true,
            bookingStatus: true,
            paymentStatus: true,
            items: {
              include: {
                service: true,
              },
            },
          },
          orderBy: { bookingDate: "desc" },
          take: 10,
        },
        _count: {
          select: { bookings: true },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error("Get client error:", error)
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    )
  }
}

// PATCH: Update client
export async function PATCH(
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

    const { id } = await params
    const body = (await request.json()) as any
    const data = updateClientSchema.parse(body)

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id },
    })

    if (!existingClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Check phone uniqueness (if updating phone)
    if (data.phone && data.phone !== existingClient.phone) {
      const phoneExists = await prisma.client.findUnique({
        where: { phone: data.phone },
      })

      if (phoneExists) {
        return NextResponse.json(
          { error: "Client with this phone number already exists" },
          { status: 400 }
        )
      }
    }

    // Check email uniqueness (if updating email)
    if (data.email && data.email !== existingClient.email) {
      const emailExists = await prisma.client.findUnique({
        where: { email: data.email },
      })

      if (emailExists) {
        return NextResponse.json(
          { error: "Client with this email already exists" },
          { status: 400 }
        )
      }
    }

    // Update client
    const updatedClient = await prisma.client.update({
      where: { id },
      data,
    })

    return NextResponse.json(updatedClient)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Update client error:", error)
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    )
  }
}

// DELETE: Delete client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN and MANAGER can delete clients
    if (!["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    // Check if client exists
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Prevent deletion if client has bookings
    if (client._count.bookings > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete client with existing bookings",
          bookingsCount: client._count.bookings,
        },
        { status: 400 }
      )
    }

    // Delete client
    await prisma.client.delete({
      where: { id },
    })

    return NextResponse.json(
      { message: "Client deleted successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Delete client error:", error)
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    )
  }
}