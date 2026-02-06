"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { IconCalendar, IconList, IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookingCalendar } from "@/components/calendar/booking-calendar"
import { BookingsTable } from "@/components/bookings/bookings-table"
import { BookingDialog } from "@/components/bookings/booking-dialog"
import { toast } from "sonner"

interface BookingsViewProps {
  searchParams: {
    view?: string
    page?: string
    clientId?: string
    photographerId?: string
    status?: string
    startDate?: string
    endDate?: string
  }
}

interface Booking {
  id: string
  clientId: string
  client: {
    id: string
    name: string
    phone: string
    email: string | null
  }
  bookingDate: string
  bookingStatus: "CONFIRMED" | "COMPLETED" | "CANCELLED"
  paymentStatus: "PENDING" | "PARTIAL" | "COMPLETED" | "FAILED" | "REFUNDED"
  photographer: {
    id: string
    name: string | null
    image: string | null
  } | null
  items: Array<{
    id: string
    service: {
      name: string
      price: number
    }
    priceSnapshot: number
    quantity: number
  }>
  totalAmount: number
  _count: {
    payments: number
    photos: number
  }
}

export function BookingsView({ searchParams }: BookingsViewProps) {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const view = searchParams.view || "calendar"

  useEffect(() => {
    fetchBookings()
  }, [searchParams])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      // For calendar view, get all bookings for current month
      if (view === "calendar") {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        params.set("startDate", startOfMonth.toISOString())
        params.set("endDate", endOfMonth.toISOString())
        params.set("limit", "1000") // Get all bookings for the month
      } else {
        // For list view, use pagination and filters
        params.set("page", searchParams.page || "1")
        params.set("limit", "20")
        if (searchParams.clientId) params.set("clientId", searchParams.clientId)
        if (searchParams.photographerId) params.set("photographerId", searchParams.photographerId)
        if (searchParams.status) params.set("bookingStatus", searchParams.status)
        if (searchParams.startDate) params.set("startDate", searchParams.startDate)
        if (searchParams.endDate) params.set("endDate", searchParams.endDate)
      }

      const response = await fetch(`/api/bookings?${params}`)
      if (!response.ok) throw new Error("Failed to fetch bookings")

      const data = (await response.json()) as any
      setBookings(data.bookings)
    } catch (error) {
      console.error("Fetch bookings error:", error)
      toast.error("Failed to load bookings")
    } finally {
      setLoading(false)
    }
  }

  const handleBookingDrop = async (booking: any, newDate: Date) => {
    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingDate: newDate.toISOString(),
        }),
      })

      if (!response.ok) throw new Error("Failed to reschedule")

      toast.success("Booking rescheduled successfully")
      fetchBookings() // Refresh data
    } catch (error) {
      toast.error("Failed to reschedule booking")
    }
  }

  const handleViewChange = (newView: string) => {
    const params = new URLSearchParams()
    params.set("view", newView)
    router.push(`/dashboard/bookings?${params.toString()}`)
  }

  const handleDateClick = (date: Date) => {
    // Navigate to the date page using local date (not UTC)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const dateStr = `${year}-${month}-${day}` // Format: YYYY-MM-DD
    router.push(`/dashboard/bookings/date/${dateStr}`)
  }

  const handleBookingClick = (booking: any) => {
    router.push(`/dashboard/bookings/${booking.id}`)
  }

  // Transform bookings for calendar
  const calendarEvents = bookings.map((booking) => ({
    id: booking.id,
    clientName: booking.client.name,
    bookingDate: new Date(booking.bookingDate),
    bookingStatus: booking.bookingStatus,
    paymentStatus: booking.paymentStatus,
    services: booking.items.map((item) => item.service.name),
    photographer: booking.photographer,
    _count: booking._count,
  }))

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <Tabs value={view} onValueChange={handleViewChange}>
          <TabsList>
            <TabsTrigger value="calendar">
              <IconCalendar className="mr-2 h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="list">
              <IconList className="mr-2 h-4 w-4" />
              List
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <IconPlus className="mr-2 h-4 w-4" />
          New Booking
        </Button>
      </div>

      {/* Views */}
      {loading ? (
        <div className="flex h-[600px] items-center justify-center">
          <div className="text-muted-foreground">Loading bookings...</div>
        </div>
      ) : (
        <>
          {view === "calendar" ? (
            <BookingCalendar
              bookings={calendarEvents}
              onDateClick={handleDateClick}
              onBookingClick={handleBookingClick}
              onBookingDrop={handleBookingDrop}
            />
          ) : (
            <BookingsTable
              bookings={bookings}
              searchParams={searchParams}
              onRefresh={fetchBookings}
            />
          )}
        </>
      )}

      {/* Booking Dialog (Create) */}
      <BookingDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={fetchBookings}
        preselectedDate={selectedDate}
      />
    </>
  )
}
