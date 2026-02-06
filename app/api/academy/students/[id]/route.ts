// app/api/academy/students/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET: Single student details
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

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
            studio: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Check access
    const isAdmin = session.user.role === "ADMIN"
    if (!isAdmin && student.course.studio.id !== session.user.studioId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ student })
  } catch (error) {
    console.error("GET /api/academy/students/[id] error:", error)
    return NextResponse.json({ error: "Failed to fetch student" }, { status: 500 })
  }
}

/**
 * PUT: Update student (status, payment)
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

    const existingStudent = await prisma.student.findUnique({
      where: { id },
      include: { course: { select: { studioId: true } } },
    })

    if (!existingStudent) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Check access
    const isAdmin = session.user.role === "ADMIN"
    if (!isAdmin && existingStudent.course.studioId !== session.user.studioId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { name, phone, email, address, status, amountPaid, notes } = body

    // Validate amountPaid if provided
    let parsedAmountPaid: number | undefined
    if (amountPaid !== undefined && amountPaid !== null && amountPaid !== "") {
      parsedAmountPaid = parseFloat(amountPaid)
      if (!Number.isFinite(parsedAmountPaid) || parsedAmountPaid < 0) {
        return NextResponse.json({ error: "Amount paid must be a valid non-negative number" }, { status: 400 })
      }
    }

    const student = await prisma.student.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        phone: phone !== undefined ? phone : undefined,
        email: email !== undefined ? email : undefined,
        address: address !== undefined ? address : undefined,
        status: status !== undefined ? status : undefined,
        amountPaid: parsedAmountPaid,
        notes: notes !== undefined ? notes : undefined,
      },
      include: {
        course: { select: { id: true, name: true, price: true } },
      },
    })

    return NextResponse.json({ student })
  } catch (error) {
    console.error("PUT /api/academy/students/[id] error:", error)
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 })
  }
}

/**
 * DELETE: Remove student
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

    const existingStudent = await prisma.student.findUnique({
      where: { id },
      include: { course: { select: { studioId: true } } },
    })

    if (!existingStudent) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Check access
    const isAdmin = session.user.role === "ADMIN"
    if (!isAdmin && existingStudent.course.studioId !== session.user.studioId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.student.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/academy/students/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete student" }, { status: 500 })
  }
}
