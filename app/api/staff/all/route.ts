// app/api/staff/all/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET: List all staff with stats (Admin only)
export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Only ADMIN can view all staff
        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const now = new Date()

        // Fetch all staff with their assigned bookings for stats calculation
        const staff = await prisma.staff.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                image: true,
                isActive: true,
                studioId: true,
                acceptedAt: true,
                createdAt: true,
                assignedBookings: {
                    select: {
                        id: true,
                        bookingStatus: true,
                        bookingDate: true,
                        items: {
                            select: {
                                priceSnapshot: true,
                                quantity: true,
                            },
                        },
                    },
                },
            },
            orderBy: [{ isActive: "desc" }, { name: "asc" }],
        })

        // Calculate real stats for each staff member
        const staffWithStats = staff.map((s: any) => {
            const bookings = s.assignedBookings

            // Count completed assignments
            const completedAssignments = bookings.filter(
                (b: any) => b.bookingStatus === "COMPLETED"
            ).length

            // Count pending assignments (upcoming, not completed or cancelled)
            const pendingAssignments = bookings.filter(
                (b: any) =>
                    b.bookingDate > now &&
                    !["COMPLETED", "CANCELLED"].includes(b.bookingStatus)
            ).length

            // Calculate total revenue from completed bookings
            const totalRevenue = bookings
                .filter((b: any) => b.bookingStatus === "COMPLETED")
                .flatMap((b: any) => b.items)
                .reduce((sum: number, item: any) => {
                    // Prisma Decimal can be converted to number with Number()
                    const price = Number(item.priceSnapshot)
                    return sum + price * item.quantity
                }, 0)

            return {
                id: s.id,
                name: s.name,
                email: s.email,
                phone: s.phone,
                role: s.role,
                image: s.image,
                isActive: s.isActive,
                studioId: s.studioId,
                acceptedAt: s.acceptedAt,
                createdAt: s.createdAt,
                stats: {
                    totalAssignments: bookings.length,
                    completedAssignments,
                    pendingAssignments,
                    totalRevenue,
                },
            }
        })

        // Fetch all studios
        const studios = await prisma.studio.findMany({
            select: {
                id: true,
                name: true,
            },
            orderBy: { name: "asc" },
        })

        // Fetch pending invitations count
        const pendingInvitations = await prisma.staffInvitation.count({
            where: { status: "PENDING" },
        })

        return NextResponse.json({
            staff: staffWithStats,
            studios,
            pendingInvitations,
        })
    } catch (error) {
        console.error("Get all staff error:", error)
        return NextResponse.json(
            { error: "Failed to fetch staff" },
            { status: 500 }
        )
    }
}

