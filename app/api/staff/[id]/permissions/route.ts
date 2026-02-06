// app/api/staff/[id]/permissions/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PAGE_PERMISSIONS } from "@/lib/permissions"
import { StaffRole } from "@/lib/generated/prisma"

interface RouteParams {
    params: Promise<{ id: string }>
}

const ALL_PAGES = [
    { page: "/dashboard", label: "Dashboard" },
    { page: "/dashboard/bookings", label: "Bookings" },
    { page: "/dashboard/clients", label: "Clients" },
    { page: "/dashboard/services", label: "Services" },
    { page: "/dashboard/staffs", label: "Staff" },
    { page: "/dashboard/studios", label: "Studios" },
    { page: "/dashboard/analytics", label: "Analytics" },
    { page: "/dashboard/logs", label: "Activity Logs" },
]

// GET: Get staff permissions
export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Only ADMIN can view permissions
        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params

        // Get staff info
        const staff = await prisma.staff.findUnique({
            where: { id },
            select: { name: true, email: true, role: true },
        })

        if (!staff) {
            return NextResponse.json({ error: "Staff not found" }, { status: 404 })
        }

        // Get custom permissions
        const customPermissions = await prisma.staffPagePermission.findMany({
            where: { staffId: id },
        })

        const customMap = new Map(
            customPermissions.map((p) => [p.page, p.allowed])
        )

        // Build permissions list with role defaults
        const permissions = ALL_PAGES.map((page) => {
            const roleAllowed = PAGE_PERMISSIONS[page.page]?.includes(staff.role as StaffRole) ?? false
            const customAllowed = customMap.get(page.page) ?? null

            return {
                page: page.page,
                label: page.label,
                roleDefault: roleAllowed,
                customAllowed,
            }
        })

        return NextResponse.json({ staff, permissions })
    } catch (error) {
        console.error("Get permissions error:", error)
        return NextResponse.json(
            { error: "Failed to fetch permissions" },
            { status: 500 }
        )
    }
}

// PATCH: Update staff permissions
export async function PATCH(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Only ADMIN can update permissions
        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params
        const body = (await request.json()) as any
        const { permissions } = body as { permissions: { page: string; allowed: boolean | null }[] }

        // Delete existing custom permissions
        await prisma.staffPagePermission.deleteMany({
            where: { staffId: id },
        })

        // Create new custom permissions (only for non-null values)
        const customPermissions = permissions.filter((p) => p.allowed !== null)

        if (customPermissions.length > 0) {
            await prisma.staffPagePermission.createMany({
                data: customPermissions.map((p) => ({
                    staffId: id,
                    page: p.page,
                    allowed: p.allowed!,
                })),
            })
        }

        return NextResponse.json({ message: "Permissions updated" })
    } catch (error) {
        console.error("Update permissions error:", error)
        return NextResponse.json(
            { error: "Failed to update permissions" },
            { status: 500 }
        )
    }
}
