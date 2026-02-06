// app/api/staff/[id]/bookings/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET: Get recent bookings for a staff member
export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Only ADMIN can view staff bookings
        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params

        // Get search params for pagination
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get("limit") || "10")

        // Fetch recent bookings assigned to this staff member
        const bookings = await prisma.booking.findMany({
            where: {
                photographerId: id,
            },
            select: {
                id: true,
                bookingDate: true,
                bookingStatus: true,
                paymentStatus: true,
                client: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                    },
                },
                items: {
                    select: {
                        id: true,
                        priceSnapshot: true,
                        quantity: true,
                        service: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
                studio: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { bookingDate: "desc" },
            take: limit,
        })

        // Calculate total for each booking
        const bookingsWithTotal = bookings.map((booking: any) => {
            const total = booking.items.reduce((sum: number, item: any) => {
                return sum + Number(item.priceSnapshot) * item.quantity
            }, 0)
            return {
                ...booking,
                total,
                services: booking.items.map((item: any) => item.service.name).join(", "),
            }
        })

        return NextResponse.json({ bookings: bookingsWithTotal })
    } catch (error) {
        console.error("Get staff bookings error:", error)
        return NextResponse.json(
            { error: "Failed to fetch staff bookings" },
            { status: 500 }
        )
    }
}
