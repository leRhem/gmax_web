// app/api/services/route.ts (ENHANCED VERSION)
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET: List all services with session configuration
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("categoryId")
    const includeInactive = searchParams.get("includeInactive") === "true"

    // Get all categories with their services (INCLUDING SESSION CONFIG)
    const categories = await prisma.serviceCategory.findMany({
      include: {
        services: {
          where: {
            ...(categoryId && { categoryId }),
            ...(includeInactive ? {} : { isActive: true }),
          },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            salePrice: true,
            duration: true,
            serviceType: true,
            features: true,
            isActive: true,

            // ✅ SESSION CONFIGURATION
            sessionDuration: true,
            includesSessions: true,
            allowExtraOutfits: true,
            extraOutfitPrice: true,
            extraOutfitDuration: true,
            allowExtraPics: true,
            extraPicPrice: true,
          },
          orderBy: { price: "asc" },
        },
      },
      orderBy: { name: "asc" },
    })

    // Filter out categories with no services (but keep all for admin view)
    const filteredCategories = includeInactive
      ? categories
      : categories.filter((cat: any) => cat.services.length > 0)

    return NextResponse.json({ categories: filteredCategories })
  } catch (error) {
    console.error("Get services error:", error)
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    )
  }
}

// POST: Create a new service
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || !["ADMIN", "MANAGER"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as any
    const {
      name,
      categoryId,
      price,
      salePrice,
      duration,
      serviceType,
      features,
      sessionDuration,
      includesSessions,
      isActive,
    } = body

    if (!name || !categoryId || price === undefined) {
      return NextResponse.json({ error: "Name, category, and price are required" }, { status: 400 })
    }

    // Generate slug from name
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

    // Check for slug collision and make unique if needed
    let slug = baseSlug
    let counter = 1
    while (await prisma.service.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    const service = await prisma.service.create({
      data: {
        name,
        slug,
        category: { connect: { id: categoryId } },
        price,
        salePrice: salePrice || null,
        duration: duration || null,
        serviceType: serviceType || "STUDIO",
        features: features || [],
        sessionDuration: sessionDuration || 45,
        includesSessions: includesSessions || 1,
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    return NextResponse.json({ service }, { status: 201 })
  } catch (error: any) {
    console.error("Create service error:", error?.message || error)
    console.error("Full error:", JSON.stringify(error, null, 2))
    return NextResponse.json(
      { error: "Failed to create service", details: error?.message },
      { status: 500 }
    )
  }
}
