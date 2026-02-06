// app/api/academy/students/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const ALLOWED_STATUSES = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]

/**
 * GET: List students (filterable by course, status)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    const isAdmin = session.user.role === "ADMIN"
    const userStudioId = session.user.studioId

    const where: any = {}

    // Filter by course
    if (courseId) {
      where.courseId = courseId
    }

    // Filter by status
    if (status && status !== "all") {
      where.status = status
    }

    // Search by name or phone
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ]
    }

    // Filter by studio for non-admins
    if (!isAdmin) {
      if (!userStudioId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      where.course = { studioId: userStudioId }
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        course: { select: { id: true, name: true, price: true, studio: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    })

    // Calculate totals
    const totalRevenue = students.reduce((sum, s) => sum + Number(s.amountPaid), 0)

    return NextResponse.json({
      students,
      total: students.length,
      totalRevenue,
    })
  } catch (error) {
    console.error("GET /api/academy/students error:", error)
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 })
  }
}

/**
 * POST: Register new student
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as any
    const { name, phone, email, address, courseId, amountPaid, notes, status } = body

    if (!name || !phone || !courseId) {
      return NextResponse.json({ error: "Name, phone, and course are required" }, { status: 400 })
    }

    // Validate amountPaid if provided
    let parsedAmountPaid = 0
    if (amountPaid !== undefined && amountPaid !== null && amountPaid !== "") {
      parsedAmountPaid = parseFloat(amountPaid)
      if (!Number.isFinite(parsedAmountPaid) || parsedAmountPaid < 0) {
        return NextResponse.json({ error: "Amount paid must be a valid non-negative number" }, { status: 400 })
      }
    }

    // Validate status if provided
    const effectiveStatus = status || "PENDING"
    if (!ALLOWED_STATUSES.includes(effectiveStatus)) {
      return NextResponse.json({ error: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(", ")}` }, { status: 400 })
    }

    const isAdmin = session.user.role === "ADMIN"

    // Use transaction for atomic capacity check + create
    const student = await prisma.$transaction(async (tx) => {
      // Verify course exists and is active with current count
      const course = await tx.course.findUnique({
        where: { id: courseId },
        include: { _count: { select: { students: true } } },
      })

      if (!course || !course.isActive) {
        throw new Error("COURSE_NOT_FOUND")
      }

      // Check access for non-admin
      if (!isAdmin && course.studioId !== session.user.studioId) {
        throw new Error("FORBIDDEN")
      }

      // Check capacity (inside transaction for atomicity)
      if (course._count.students >= course.maxStudents) {
        throw new Error("COURSE_FULL")
      }

      // Create the student
      return await tx.student.create({
        data: {
          name,
          phone,
          email: email || null,
          address: address || null,
          courseId,
          amountPaid: parsedAmountPaid,
          notes: notes || null,
          status: effectiveStatus,
        },
        include: {
          course: { select: { id: true, name: true, price: true } },
        },
      })
    })

    return NextResponse.json({ student }, { status: 201 })
  } catch (error: any) {
    if (error.message === "COURSE_NOT_FOUND") {
      return NextResponse.json({ error: "Course not found or inactive" }, { status: 404 })
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (error.message === "COURSE_FULL") {
      return NextResponse.json({ error: "Course is full" }, { status: 400 })
    }

    console.error("POST /api/academy/students error:", error)
    return NextResponse.json({ error: "Failed to register student" }, { status: 500 })
  }
}
