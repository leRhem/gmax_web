import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
    try {
        const categories = await prisma.serviceCategory.findMany({
            orderBy: { name: "asc" },
        })

        return NextResponse.json({ categories })
    } catch (error) {
        console.error("Error fetching service categories:", error)
        return NextResponse.json(
            { error: "Failed to fetch categories" },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user || !["ADMIN", "MANAGER"].includes(session.user.role || "")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = (await request.json()) as any
        const { name, description, type } = body

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 })
        }

        // Generate slug from name
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")

        // Check for existing slug
        const existing = await prisma.serviceCategory.findUnique({
            where: { slug },
        })

        if (existing) {
            return NextResponse.json({ error: "Category with this name already exists" }, { status: 400 })
        }

        const category = await prisma.serviceCategory.create({
            data: {
                name,
                slug,
                description: description || null,
                type: type || "SERVICE",
            },
        })

        return NextResponse.json({ category }, { status: 201 })
    } catch (error) {
        console.error("Error creating category:", error)
        return NextResponse.json(
            { error: "Failed to create category" },
            { status: 500 }
        )
    }
}
