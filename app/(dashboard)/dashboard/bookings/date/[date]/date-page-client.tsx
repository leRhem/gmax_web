"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format, parseISO, addDays, subDays } from "date-fns"
import {
    IconArrowLeft,
    IconChevronLeft,
    IconChevronRight,
    IconPlus,
    IconCalendarEvent,
    IconUsers,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BookingCard } from "@/components/bookings/booking-card"
import { BookingDialog } from "@/components/bookings/booking-dialog"
import { cn } from "@/lib/utils"

interface Booking {
    id: string
    client: {
        id: string
        name: string
        phone: string
        email: string | null
    }
    bookingDate: string
    bookingStatus: "PENDING_CONFIRMATION" | "CONFIRMED" | "COMPLETED" | "CANCELLED"
    paymentStatus: "PENDING" | "PARTIAL" | "COMPLETED" | "FAILED" | "REFUNDED"
    assetsStatus: "NOT_UPLOADED" | "UPLOADING" | "UPLOADED" | "PROCESSING" | "READY_FOR_DOWNLOAD" | "DOWNLOADED"
    assetsDownloaded: boolean
    totalSessions: number
    photographer?: {
        id: string
        name: string | null
        image: string | null
    } | null
    items: Array<{
        id: string
        service: {
            id: string
            name: string
            price: number
        }
        priceSnapshot: number
        quantity: number
    }>
    _count?: {
        payments: number
        photos: number
    }
}

interface Capacity {
    maxSessions: number
    bookedSessions: number
    availableSessions: number
}

interface DatePageClientProps {
    date: string
    formattedDate: string
    shortDate: string
    bookings: Booking[]
    capacity: Capacity | null
}

export function DatePageClient({
    date,
    formattedDate,
    shortDate,
    bookings,
    capacity,
}: DatePageClientProps) {
    const router = useRouter()
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

    const parsedDate = parseISO(date)
    const prevDate = format(subDays(parsedDate, 1), "yyyy-MM-dd")
    const nextDate = format(addDays(parsedDate, 1), "yyyy-MM-dd")

    const capacityPercentage = capacity
        ? (capacity.bookedSessions / capacity.maxSessions) * 100
        : 0

    const handleBookingCreated = () => {
        router.refresh()
    }

    return (
        <>
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    {/* Back button */}
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/bookings">
                            <IconArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>

                    {/* Date info */}
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{formattedDate}</h1>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <IconCalendarEvent className="h-4 w-4" />
                            <span>{bookings.length} booking(s)</span>
                            {capacity && (
                                <>
                                    <span>•</span>
                                    <IconUsers className="h-4 w-4" />
                                    <span>
                                        {capacity.bookedSessions}/{capacity.maxSessions} sessions
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Date navigation */}
                    <div className="flex items-center border rounded-md">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-r-none"
                            asChild
                        >
                            <Link href={`/dashboard/bookings/date/${prevDate}`}>
                                <IconChevronLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div className="w-[1px] h-4 bg-border" />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-l-none"
                            asChild
                        >
                            <Link href={`/dashboard/bookings/date/${nextDate}`}>
                                <IconChevronRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>

                    {/* Create booking */}
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <IconPlus className="h-4 w-4 mr-2" />
                        New Booking
                    </Button>
                </div>
            </div>

            {/* Capacity indicator */}
            {capacity && (
                <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Session Capacity</span>
                        <Badge
                            variant="outline"
                            className={cn(
                                capacity.availableSessions > 5
                                    ? "border-green-200 bg-green-50 text-green-700"
                                    : capacity.availableSessions > 0
                                        ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                                        : "border-red-200 bg-red-50 text-red-700"
                            )}
                        >
                            {capacity.availableSessions} available
                        </Badge>
                    </div>
                    <Progress value={capacityPercentage} className="h-2" />
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                        <span>{capacity.bookedSessions} booked</span>
                        <span>{capacity.maxSessions} max</span>
                    </div>
                </div>
            )}

            {/* Bookings grid */}
            {bookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <IconCalendarEvent className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold">No bookings for this date</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        This day is free. Create a new booking to get started.
                    </p>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <IconPlus className="h-4 w-4 mr-2" />
                        Create Booking
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {bookings.map((booking) => (
                        <BookingCard
                            key={booking.id}
                            booking={booking}
                        />
                    ))}
                </div>
            )}

            {/* Create booking dialog */}
            <BookingDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onSuccess={handleBookingCreated}
                preselectedDate={parsedDate}
            />
        </>
    )
}
