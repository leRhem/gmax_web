// app/api/equipment/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

type RouteParams = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["CAMERA", "LENS", "LIGHTING", "BACKDROP", "TRIPOD", "AUDIO", "COMPUTER", "STORAGE", "ACCESSORY", "OTHER"]).optional(),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  serialNo: z.string().optional().nullable(),
  status: z.enum(["AVAILABLE", "IN_USE", "MAINTENANCE", "DAMAGED", "RETIRED"]).optional(),
  condition: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR"]).optional(),
  purchaseDate: z.string().optional().nullable(),
  purchasePrice: z.number().optional().nullable(),
  warrantyExpiry: z.string().optional().nullable(),
  lastMaintenanceDate: z.string().optional().nullable(),
  nextMaintenanceDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// GET: Get single equipment
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        studio: { select: { id: true, name: true, city: true } },
      },
    })

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 })
    }

    // Check access
    const userRole = session.user.role
    if (userRole !== "ADMIN" && equipment.studioId !== session.user.studioId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ equipment })
  } catch (error) {
    console.error("Get equipment error:", error)
    return NextResponse.json(
      { error: "Failed to fetch equipment" },
      { status: 500 }
    )
  }
}

// PUT: Update equipment
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userRole = session.user.role

    if (userRole !== "ADMIN" && userRole !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      select: { id: true, studioId: true },
    })

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 })
    }

    // Manager can only edit their studio's equipment
    if (userRole === "MANAGER" && equipment.studioId !== session.user.studioId) {
      return NextResponse.json({ error: "Cannot edit equipment from another studio" }, { status: 403 })
    }

    const body = (await request.json()) as any
    const validation = updateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data
    const updateData: any = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.type !== undefined) updateData.type = data.type
    if (data.brand !== undefined) updateData.brand = data.brand
    if (data.model !== undefined) updateData.model = data.model
    if (data.serialNo !== undefined) updateData.serialNo = data.serialNo
    if (data.status !== undefined) updateData.status = data.status
    if (data.condition !== undefined) updateData.condition = data.condition
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.purchasePrice !== undefined) updateData.purchasePrice = data.purchasePrice

    if (data.purchaseDate !== undefined) {
      updateData.purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : null
    }
    if (data.warrantyExpiry !== undefined) {
      updateData.warrantyExpiry = data.warrantyExpiry ? new Date(data.warrantyExpiry) : null
    }
    if (data.lastMaintenanceDate !== undefined) {
      updateData.lastMaintenanceDate = data.lastMaintenanceDate ? new Date(data.lastMaintenanceDate) : null
    }
    if (data.nextMaintenanceDate !== undefined) {
      updateData.nextMaintenanceDate = data.nextMaintenanceDate ? new Date(data.nextMaintenanceDate) : null
    }

    const updated = await prisma.equipment.update({
      where: { id },
      data: updateData,
      include: {
        studio: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      equipment: updated,
    })
  } catch (error) {
    console.error("Update equipment error:", error)
    return NextResponse.json(
      { error: "Failed to update equipment" },
      { status: 500 }
    )
  }
}

// DELETE: Soft delete equipment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userRole = session.user.role

    if (userRole !== "ADMIN" && userRole !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      select: { id: true, studioId: true },
    })

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 })
    }

    // Manager can only delete their studio's equipment
    if (userRole === "MANAGER" && equipment.studioId !== session.user.studioId) {
      return NextResponse.json({ error: "Cannot delete equipment from another studio" }, { status: 403 })
    }

    // Soft delete
    await prisma.equipment.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete equipment error:", error)
    return NextResponse.json(
      { error: "Failed to delete equipment" },
      { status: 500 }
    )
  }
}
