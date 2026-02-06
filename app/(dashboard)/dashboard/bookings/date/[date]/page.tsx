import { Suspense } from "react"
import { notFound } from "next/navigation"
import { format, parseISO, isValid } from "date-fns"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { DatePageClient } from "./date-page-client"
import { Skeleton } from "@/components/ui/skeleton"

interface DatePageProps {
    params: Promise<{ date: string }>
}

async function getBookingsForDate(date: string, studioId?: string) {
    // Parse date (format: YYYY-MM-DD)
    const parsedDate = parseISO(date)
    if (!isValid(parsedDate)) {
        return null
    }

    // Get start and end of day
    const startOfDay = new Date(parsedDate)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(parsedDate)
    endOfDay.setHours(23, 59, 59, 999)

    const bookings = await prisma.booking.findMany({
        where: {
            bookingDate: {
                gte: startOfDay,
                lte: endOfDay,
            },
            ...(studioId && { studioId }),
        },
        include: {
            client: true,
            photographer: {
                select: {
                    id: true,
                    name: true,
                    image: true,
                },
            },
            items: {
                include: {
                    service: {
                        select: {
                            id: true,
                            name: true,
                            price: true,
                        },
                    },
                },
            },
            _count: {
                select: {
                    payments: true,
                    photos: true,
                },
            },
        },
        orderBy: {
            bookingDate: "asc",
        },
    })

    return bookings
}

async function getStudioCapacity(date: string, studioId?: string) {
    const parsedDate = parseISO(date)
    if (!isValid(parsedDate)) return null

    // Get studio settings for max sessions
    const studioSettings = studioId
        ? await prisma.studioSettings.findUnique({
            where: { studioId },
        })
        : await prisma.studioSettings.findFirst()

    const maxSessions = studioSettings?.maxSessionsPerDay || 15

    // Calculate booked sessions from bookings
    const startOfDay = new Date(parsedDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(parsedDate)
    endOfDay.setHours(23, 59, 59, 999)

    const bookings = await prisma.booking.findMany({
        where: {
            bookingDate: {
                gte: startOfDay,
                lte: endOfDay,
            },
            bookingStatus: { not: "CANCELLED" },
            ...(studioId && { studioId }),
        },
        select: {
            totalSessions: true,
        },
    })

    const bookedSessions = bookings.reduce((sum, b) => sum + b.totalSessions, 0)

    return {
        maxSessions,
        bookedSessions,
        availableSessions: maxSessions - bookedSessions,
    }
}

export default async function DatePage({ params }: DatePageProps) {
    const { date } = await params
    const session = await auth()

    if (!session?.user) {
        notFound()
    }

    const studioId = session.user.studioId || undefined

    const [bookings, capacity] = await Promise.all([
        getBookingsForDate(date, studioId),
        getStudioCapacity(date, studioId),
    ])

    if (bookings === null) {
        notFound()
    }

    const parsedDate = parseISO(date)
    const formattedDate = format(parsedDate, "EEEE, MMMM d, yyyy")
    const shortDate = format(parsedDate, "MMM d, yyyy")

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <Suspense fallback={<DatePageSkeleton />}>
                <DatePageClient
                    date={date}
                    formattedDate={formattedDate}
                    shortDate={shortDate}
                    bookings={JSON.parse(JSON.stringify(bookings))}
                    capacity={capacity}
                />
            </Suspense>
        </div>
    )
}

function DatePageSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[300px]" />
                    <Skeleton className="h-4 w-[200px]" />
                </div>
                <Skeleton className="h-10 w-[140px]" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-[200px] rounded-lg" />
                ))}
            </div>
        </div>
    )
}
