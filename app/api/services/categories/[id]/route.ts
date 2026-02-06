import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET single category
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const category = await prisma.serviceCategory.findUnique({
            where: { id },
            include: {
                services: true,
            },
        })

        if (!category) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 })
        }

        return NextResponse.json({ category })
    } catch (error) {
        console.error("Error fetching category:", error)
        return NextResponse.json(
            { error: "Failed to fetch category" },
            { status: 500 }
        )
    }
}

// PATCH - Update category
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
        const { name, description, type } = body

        // Check if category exists
        const existing = await prisma.serviceCategory.findUnique({
            where: { id },
        })

        if (!existing) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 })
        }

        // Generate new slug if name changed
        let slug = existing.slug
        if (name && name !== existing.name) {
            slug = name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "")

            // Check for slug collision
            const slugExists = await prisma.serviceCategory.findFirst({
                where: { slug, id: { not: id } },
            })

            if (slugExists) {
                return NextResponse.json({ error: "Category with this name already exists" }, { status: 400 })
            }
        }

        const category = await prisma.serviceCategory.update({
            where: { id },
            data: {
                ...(name && { name, slug }),
                ...(description !== undefined && { description: description || null }),
                ...(type !== undefined && { type }),
            },
        })

        return NextResponse.json({ category })
    } catch (error) {
        console.error("Error updating category:", error)
        return NextResponse.json(
            { error: "Failed to update category" },
            { status: 500 }
        )
    }
}

// DELETE - Delete category
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

        // Check if category has services
        const category = await prisma.serviceCategory.findUnique({
            where: { id },
            include: { services: true },
        })

        if (!category) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 })
        }

        if (category.services.length > 0) {
            return NextResponse.json(
                { error: `Cannot delete category with ${category.services.length} services. Delete or move services first.` },
                { status: 400 }
            )
        }

        await prisma.serviceCategory.delete({
            where: { id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting category:", error)
        return NextResponse.json(
            { error: "Failed to delete category" },
            { status: 500 }
        )
    }
}
