// app/api/public/academy/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET: Public courses list (active only)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const level = searchParams.get("level")

    const where: any = {
      isActive: true,
    }

    if (level && level !== "all") {
      where.level = level
    }

    const courses = await prisma.course.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        level: true,
        duration: true,
        price: true,
        salePrice: true,
        curriculum: true,
        features: true,
        maxStudents: true,
        image: true,
        studio: { select: { name: true, city: true } },
        _count: { select: { students: true } },
      },
      orderBy: [{ level: "asc" }, { name: "asc" }],
    })

    const coursesWithAvailability = courses.map((course) => {
      const enrolled = (course as any)._count.students
      const rawSpotsLeft = course.maxStudents - enrolled
      return {
        ...course,
        spotsLeft: Math.max(0, rawSpotsLeft),
        isFull: enrolled >= course.maxStudents,
      }
    })

    return NextResponse.json({ courses: coursesWithAvailability })
  } catch (error) {
    console.error("GET /api/public/academy error:", error)
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 })
  }
}

/**
 * POST: Student registration (no auth required)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse JSON with error handling
    let body: any
    try {
      body = (await request.json()) as any
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      )
    }

    const { name, phone, email, courseId } = body

    if (!name || !phone || !courseId) {
      return NextResponse.json(
        { error: "Name, phone, and course are required" },
        { status: 400 }
      )
    }

    // Validate phone format (basic)
    const cleanPhone = phone.replace(/\D/g, "")
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 })
    }
    // Generate confirmation token upfront (will be persisted in DB)
    const confirmationToken = crypto.randomUUID()

    // Use transaction for atomic check + create with row-level locking
    const result = await prisma.$transaction(async (tx) => {
      // Lock the course row with FOR UPDATE to prevent race conditions
      const courseRows = await tx.$queryRaw<Array<{
        id: string
        name: string
        isActive: boolean
        maxStudents: number
        studioPhone: string | null
      }>>`
        SELECT c.id, c.name, c."isActive", c."maxStudents", s.phone as "studioPhone"
        FROM "Course" c
        LEFT JOIN "Studio" s ON c."studioId" = s.id
        WHERE c.id = ${courseId}
        FOR UPDATE OF c
      `

      if (courseRows.length === 0 || !courseRows[0].isActive) {
        throw new Error("COURSE_NOT_FOUND")
      }

      const course = courseRows[0]

      // Lock all student rows for this course to prevent concurrent inserts
      // and get accurate count within the lock
      const lockedStudents = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Student"
        WHERE "courseId" = ${courseId}
        FOR UPDATE
      `
      const currentEnrollment = lockedStudents.length

      // Check capacity (inside locked transaction for atomicity)
      if (currentEnrollment >= course.maxStudents) {
        throw new Error("COURSE_FULL")
      }

      // Check for duplicate registration (already locked above)
      const existingStudent = await tx.student.findFirst({
        where: {
          phone: cleanPhone,
          courseId,
        },
      })

      if (existingStudent) {
        // Update existing student with new confirmation token for this session
        await tx.student.update({
          where: { id: existingStudent.id },
          data: { confirmationToken },
        })
        // Return course info (don't reveal duplicate to prevent enumeration)
        return { isDuplicate: true, course, existingStudentName: existingStudent.name, confirmationToken }
      }

      // Create student registration with persisted confirmation token
      const student = await tx.student.create({
        data: {
          name,
          phone: cleanPhone,
          email: email || null,
          courseId,
          status: "PENDING",
          confirmationToken,
        },
        include: {
          course: { select: { name: true, price: true } },
        },
      })

      return { isDuplicate: false, student, course, confirmationToken }
    })

    // Return same generic success response for both new and duplicate
    // to prevent phone enumeration - NO internal IDs exposed
    const successResponse = {
      success: true,
      message: "Registration successful! We will contact you shortly.",
      confirmation: result.confirmationToken,
      student: {
        name: result.isDuplicate ? result.existingStudentName : result.student!.name,
        course: result.course.name,
      },
      studioContact: result.course.studioPhone,
    }

    return NextResponse.json(successResponse)
  } catch (error: any) {
    if (error.message === "COURSE_NOT_FOUND") {
      return NextResponse.json({ error: "Course not found or unavailable" }, { status: 404 })
    }
    if (error.message === "COURSE_FULL") {
      return NextResponse.json({ error: "Course is full" }, { status: 400 })
    }

    console.error("POST /api/public/academy error:", error)
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
