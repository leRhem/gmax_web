// app/api/equipment/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const equipmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["CAMERA", "LENS", "LIGHTING", "BACKDROP", "TRIPOD", "AUDIO", "COMPUTER", "STORAGE", "ACCESSORY", "OTHER"]),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNo: z.string().optional(),
  studioId: z.string().min(1, "Studio is required"),
  status: z.enum(["AVAILABLE", "IN_USE", "MAINTENANCE", "DAMAGED", "RETIRED"]).optional(),
  condition: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR"]).optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().optional(),
  warrantyExpiry: z.string().optional(),
  notes: z.string().optional(),
})

// GET: List equipment
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studioFilter = searchParams.get("studioId")
    const typeFilter = searchParams.get("type")
    const statusFilter = searchParams.get("status")

    const userRole = session.user.role
    const userStudioId = session.user.studioId

    const where: any = { isActive: true }

    // Role-based filtering
    if (userRole === "ADMIN") {
      if (studioFilter) where.studioId = studioFilter
    } else if (userRole === "MANAGER") {
      if (!userStudioId) {
        return NextResponse.json({ error: "No studio assigned" }, { status: 400 })
      }
      where.studioId = userStudioId
    } else {
      // Other staff can only view equipment from their studio
      if (!userStudioId) {
        return NextResponse.json({ error: "No studio assigned" }, { status: 400 })
      }
      where.studioId = userStudioId
    }

    if (typeFilter) where.type = typeFilter
    if (statusFilter) where.status = statusFilter

    const equipment = await prisma.equipment.findMany({
      where,
      include: {
        studio: { select: { id: true, name: true, city: true } },
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    })

    // Get stats
    const stats = {
      total: equipment.length,
      available: equipment.filter((e) => e.status === "AVAILABLE").length,
      inUse: equipment.filter((e) => e.status === "IN_USE").length,
      maintenance: equipment.filter((e) => e.status === "MAINTENANCE").length,
      damaged: equipment.filter((e) => e.status === "DAMAGED").length,
    }

    // Get studios for filter (admin only)
    let studios: any[] = []
    if (userRole === "ADMIN") {
      studios = await prisma.studio.findMany({
        where: { isActive: true },
        select: { id: true, name: true, city: true },
        orderBy: { name: "asc" },
      })
    }

    return NextResponse.json({
      equipment: equipment.map((e: any) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        brand: e.brand,
        model: e.model,
        serialNo: e.serialNo,
        studio: e.studio,
        status: e.status,
        condition: e.condition,
        purchaseDate: e.purchaseDate,
        purchasePrice: e.purchasePrice ? Number(e.purchasePrice) : null,
        warrantyExpiry: e.warrantyExpiry,
        lastMaintenanceDate: e.lastMaintenanceDate,
        nextMaintenanceDate: e.nextMaintenanceDate,
        notes: e.notes,
      })),
      stats,
      studios,
      canManage: userRole === "ADMIN" || userRole === "MANAGER",
    })
  } catch (error) {
    console.error("Get equipment error:", error)
    return NextResponse.json(
      { error: "Failed to fetch equipment" },
      { status: 500 }
    )
  }
}

// POST: Create equipment
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userRole = session.user.role

    // Only Admin and Manager can create
    if (userRole !== "ADMIN" && userRole !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = (await request.json()) as any
    const validation = equipmentSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    // Manager can only add to their studio
    if (userRole === "MANAGER" && data.studioId !== session.user.studioId) {
      return NextResponse.json({ error: "Cannot add equipment to another studio" }, { status: 403 })
    }

    const equipment = await prisma.equipment.create({
      data: {
        name: data.name,
        type: data.type,
        brand: data.brand,
        model: data.model,
        serialNo: data.serialNo,
        studioId: data.studioId,
        status: data.status || "AVAILABLE",
        condition: data.condition || "GOOD",
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        purchasePrice: data.purchasePrice,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
        notes: data.notes,
      },
      include: {
        studio: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      equipment,
    })
  } catch (error) {
    console.error("Create equipment error:", error)
    return NextResponse.json(
      { error: "Failed to create equipment" },
      { status: 500 }
    )
  }
}
