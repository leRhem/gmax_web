// app/api/staff/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { StaffRole } from "@/lib/generated/prisma"

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET: Get staff details
export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        const staff = await prisma.staff.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                image: true,
                isActive: true,
                studioId: true,
                studio: {
                    select: { id: true, name: true },
                },
                acceptedAt: true,
                createdAt: true,
            },
        })

        if (!staff) {
            return NextResponse.json({ error: "Staff not found" }, { status: 404 })
        }

        return NextResponse.json({ staff })
    } catch (error) {
        console.error("Get staff error:", error)
        return NextResponse.json(
            { error: "Failed to fetch staff" },
            { status: 500 }
        )
    }
}

// PATCH: Update staff details
export async function PATCH(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Only ADMIN can update staff
        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params
        const body = (await request.json()) as any
        const { name, role, studioId, isActive } = body

        const staff = await prisma.staff.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(role !== undefined && { role: role as StaffRole }),
                ...(studioId !== undefined && { studioId: studioId || null }),
                ...(isActive !== undefined && { isActive }),
            },
        })

        return NextResponse.json({ staff })
    } catch (error) {
        console.error("Update staff error:", error)
        return NextResponse.json(
            { error: "Failed to update staff" },
            { status: 500 }
        )
    }
}

// DELETE: Remove staff (deactivate)
export async function DELETE(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Only ADMIN can remove staff
        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params

        // Prevent self-delete
        if (id === session.user.id) {
            return NextResponse.json(
                { error: "You cannot remove yourself" },
                { status: 400 }
            )
        }

        // Soft delete - just deactivate
        await prisma.staff.update({
            where: { id },
            data: { isActive: false },
        })

        return NextResponse.json({ message: "Staff member removed" })
    } catch (error) {
        console.error("Delete staff error:", error)
        return NextResponse.json(
            { error: "Failed to remove staff" },
            { status: 500 }
        )
    }
}
