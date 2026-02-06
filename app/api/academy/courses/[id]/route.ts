// app/api/academy/courses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET: Single course with students
 */
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

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        studio: { select: { id: true, name: true, city: true } },
        students: {
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Check access for non-admin
    const isAdmin = session.user.role === "ADMIN"
    if (!isAdmin && course.studioId !== session.user.studioId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Calculate stats
    // Calculate stats
    const c = course as any
    const stats = {
      total: c.students.length,
      pending: c.students.filter((s: any) => s.status === "PENDING").length,
      confirmed: c.students.filter((s: any) => s.status === "CONFIRMED").length,
      inProgress: c.students.filter((s: any) => s.status === "IN_PROGRESS").length,
      completed: c.students.filter((s: any) => s.status === "COMPLETED").length,
      cancelled: c.students.filter((s: any) => s.status === "CANCELLED").length,
    }

    return NextResponse.json({ course, stats })
  } catch (error) {
    console.error("GET /api/academy/courses/[id] error:", error)
    return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 })
  }
}

/**
 * PUT: Update course
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const allowedRoles = ["ADMIN", "MANAGER"]
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = (await request.json()) as any

    const existingCourse = await prisma.course.findUnique({ where: { id } })
    if (!existingCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Check access
    const isAdmin = session.user.role === "ADMIN"
    if (!isAdmin && existingCourse.studioId !== session.user.studioId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { name, description, level, duration, price, salePrice, curriculum, features, maxStudents, image, isActive } = body

    // Update slug if name changed
    let slug = existingCourse.slug
    if (name && name !== existingCourse.name) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
      const slugExists = await prisma.course.findFirst({
        where: { slug, id: { not: id } },
      })
      if (slugExists) {
        return NextResponse.json({ error: "Course with this name already exists" }, { status: 400 })
      }
    }

    // Validate numeric fields if provided
    let parsedPrice: number | undefined
    if (price !== undefined) {
      parsedPrice = Number(price)
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json({ error: "Price must be a valid positive number" }, { status: 400 })
      }
    }

    let parsedSalePrice: number | null | undefined
    if (salePrice !== undefined) {
      if (salePrice === null || salePrice === "") {
        parsedSalePrice = null
      } else {
        parsedSalePrice = Number(salePrice)
        if (!Number.isFinite(parsedSalePrice) || parsedSalePrice < 0) {
          return NextResponse.json({ error: "Sale price must be a valid positive number" }, { status: 400 })
        }
      }
    }

    let parsedMaxStudents: number | undefined
    if (maxStudents !== undefined) {
      parsedMaxStudents = parseInt(maxStudents.toString(), 10)
      if (!Number.isFinite(parsedMaxStudents) || parsedMaxStudents < 1) {
        return NextResponse.json({ error: "Max students must be a valid positive integer" }, { status: 400 })
      }
    }

    const course = await prisma.course.update({
      where: { id },
      data: {
        name: name || undefined,
        slug,
        description: description !== undefined ? description : undefined,
        level: level || undefined,
        duration: duration || undefined,
        price: parsedPrice,
        salePrice: parsedSalePrice,
        curriculum: curriculum !== undefined ? curriculum : undefined,
        features: features !== undefined ? features : undefined,
        maxStudents: parsedMaxStudents,
        image: image !== undefined ? image : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
      include: {
        studio: { select: { id: true, name: true, city: true } },
      },
    })

    return NextResponse.json({ course })
  } catch (error) {
    console.error("PUT /api/academy/courses/[id] error:", error)
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 })
  }
}

/**
 * DELETE: Soft delete course
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const allowedRoles = ["ADMIN", "MANAGER"]
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    const existingCourse = await prisma.course.findUnique({ where: { id } })
    if (!existingCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Check access
    const isAdmin = session.user.role === "ADMIN"
    if (!isAdmin && existingCourse.studioId !== session.user.studioId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Soft delete by setting isActive = false
    await prisma.course.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/academy/courses/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete course" }, { status: 500 })
  }
}
