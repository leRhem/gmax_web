// app/api/academy/courses/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/lib/generated/prisma"

/**
 * GET: List all courses (filterable by studio, level)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studioId = searchParams.get("studioId")
    const level = searchParams.get("level")
    const includeInactive = searchParams.get("includeInactive") === "true"

    const isAdmin = session.user.role === "ADMIN"
    const userStudioId = session.user.studioId

    const where: any = {}

    // Filter by studio - authorize studioId for non-admins
    if (studioId) {
      // Non-admins can only view their own studio's courses
      if (!isAdmin && studioId !== userStudioId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      where.studioId = studioId
    } else if (!isAdmin) {
      // Non-admins must have a studio
      if (!userStudioId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      where.studioId = userStudioId
    }

    // Filter by level
    if (level && level !== "all") {
      where.level = level
    }

    // Filter active courses
    if (!includeInactive) {
      where.isActive = true
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        studio: { select: { id: true, name: true, city: true } },
        _count: { select: { students: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    // Get student stats per course
    const coursesWithStats = courses.map((course) => ({
      ...course,
      enrolledCount: (course as any)._count.students,
      spotsLeft: Math.max(0, course.maxStudents - (course as any)._count.students),
    }))

    return NextResponse.json({
      courses: coursesWithStats,
      total: courses.length,
    })
  } catch (error) {
    console.error("GET /api/academy/courses error:", error)
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 })
  }
}

/**
 * POST: Create new course (Admin/Manager only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only Admin and Manager can create courses
    const allowedRoles = ["ADMIN", "MANAGER"]
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = (await request.json()) as any
    const { name, description, level, duration, price, salePrice, curriculum, features, maxStudents, studioId, image } = body

    if (!name || !price || !duration) {
      return NextResponse.json({ error: "Name, price, and duration are required" }, { status: 400 })
    }

    // Validate price is a valid strictly positive number
    const parsedPrice = Number(price)
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json({ error: "Price must be a valid positive number greater than zero" }, { status: 400 })
    }

    // Validate salePrice if provided
    let parsedSalePrice: number | null = null
    if (salePrice !== undefined && salePrice !== null && salePrice !== "") {
      parsedSalePrice = Number(salePrice)
      if (!Number.isFinite(parsedSalePrice) || parsedSalePrice <= 0) {
        return NextResponse.json({ error: "Sale price must be a valid positive number greater than zero" }, { status: 400 })
      }
      // Business rule: sale price must be less than regular price
      if (parsedSalePrice >= parsedPrice) {
        return NextResponse.json({ error: "Sale price must be less than the regular price" }, { status: 400 })
      }
    }

    // Validate maxStudents if provided
    let parsedMaxStudents = 20
    if (maxStudents !== undefined && maxStudents !== null && maxStudents !== "") {
      parsedMaxStudents = parseInt(maxStudents.toString(), 10)
      if (!Number.isFinite(parsedMaxStudents) || parsedMaxStudents < 1) {
        return NextResponse.json({ error: "Max students must be a valid positive integer" }, { status: 400 })
      }
    }

    // Determine studio
    const isAdmin = session.user.role === "ADMIN"
    const effectiveStudioId = isAdmin ? studioId : session.user.studioId

    if (!effectiveStudioId) {
      return NextResponse.json({ error: "Studio is required" }, { status: 400 })
    }

    // Generate slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

    try {
      const course = await prisma.course.create({
        data: {
          name,
          slug,
          description: description || null,
          level: level || "BEGINNER",
          duration,
          price: parsedPrice,
          salePrice: parsedSalePrice,
          curriculum: curriculum || [],
          features: features || [],
          maxStudents: parsedMaxStudents,
          studioId: effectiveStudioId,
          image: image || null,
        },
        include: {
          studio: { select: { id: true, name: true, city: true } },
        },
      })

      return NextResponse.json({ course }, { status: 201 })
    } catch (createError) {
      // Handle unique constraint violation (slug already exists)
      if (
        createError instanceof Prisma.PrismaClientKnownRequestError &&
        createError.code === "P2002"
      ) {
        return NextResponse.json({ error: "Course with this name already exists" }, { status: 400 })
      }
      throw createError
    }
  } catch (error) {
    console.error("POST /api/academy/courses error:", error)
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 })
  }
}
