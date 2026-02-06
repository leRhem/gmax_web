import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET: Get a single service
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

        const service = await prisma.service.findUnique({
            where: { id },
            include: { category: true },
        })

        if (!service) {
            return NextResponse.json({ error: "Service not found" }, { status: 404 })
        }

        return NextResponse.json({ service })
    } catch (error) {
        console.error("Get service error:", error)
        return NextResponse.json(
            { error: "Failed to fetch service" },
            { status: 500 }
        )
    }
}

// PATCH: Update a service
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user || !["ADMIN", "MANAGER"].includes(session.user.role || "")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        const body = (await request.json()) as any

        // Check if service exists
        const existing = await prisma.service.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: "Service not found" }, { status: 404 })
        }

        // Build update data
        const updateData: any = {}

        if (body.name !== undefined) {
            updateData.name = body.name
            // Update slug if name changed
            if (body.name !== existing.name) {
                const baseSlug = body.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)/g, "")

                let slug = baseSlug
                let counter = 1
                while (await prisma.service.findFirst({ where: { slug, id: { not: id } } })) {
                    slug = `${baseSlug}-${counter}`
                    counter++
                }
                updateData.slug = slug
            }
        }

        if (body.categoryId !== undefined) updateData.categoryId = body.categoryId
        if (body.price !== undefined) updateData.price = body.price
        if (body.salePrice !== undefined) updateData.salePrice = body.salePrice
        if (body.duration !== undefined) updateData.duration = body.duration
        if (body.serviceType !== undefined) updateData.serviceType = body.serviceType
        if (body.features !== undefined) updateData.features = body.features
        if (body.sessionDuration !== undefined) updateData.sessionDuration = body.sessionDuration
        if (body.includesSessions !== undefined) updateData.includesSessions = body.includesSessions
        if (body.isActive !== undefined) updateData.isActive = body.isActive

        const service = await prisma.service.update({
            where: { id },
            data: updateData,
        })

        return NextResponse.json({ service })
    } catch (error) {
        console.error("Update service error:", error)
        return NextResponse.json(
            { error: "Failed to update service" },
            { status: 500 }
        )
    }
}

// DELETE: Delete a service
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user || !["ADMIN", "MANAGER"].includes(session.user.role || "")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        // Check if service exists
        const existing = await prisma.service.findUnique({
            where: { id },
            include: { bookingItems: true },
        })

        if (!existing) {
            return NextResponse.json({ error: "Service not found" }, { status: 404 })
        }

        // Check if service has bookings
        if (existing.bookingItems.length > 0) {
            return NextResponse.json(
                { error: `Cannot delete service with ${existing.bookingItems.length} bookings. Disable it instead.` },
                { status: 400 }
            )
        }

        await prisma.service.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Delete service error:", error)
        return NextResponse.json(
            { error: "Failed to delete service" },
            { status: 500 }
        )
    }
}
