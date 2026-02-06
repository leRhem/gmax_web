"use client"

import { useState, useMemo } from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek
} from "date-fns"
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from "@dnd-kit/core"
import { IconChevronLeft, IconChevronRight, IconCheck, IconClock, IconAlertCircle } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

interface BookingEvent {
  id: string
  clientName: string
  bookingDate: Date
  bookingStatus: "PENDING_CONFIRMATION" | "CONFIRMED" | "COMPLETED" | "CANCELLED"
  paymentStatus: "PENDING" | "PARTIAL" | "COMPLETED" | "FAILED" | "REFUNDED"

  services: string[]
  photographer?: {
    name: string | null
    image: string | null
  } | null
  _count?: {
    photos: number
  }
}

interface BookingCalendarProps {
  bookings: BookingEvent[]
  onDateClick?: (date: Date) => void
  onBookingClick?: (booking: BookingEvent) => void
  onBookingDrop?: (booking: BookingEvent, newDate: Date) => void
}

const MAX_EVENTS_PER_DAY = 2

// Status color helper
const getStatusColor = (status: string) => {
  const colors = {
    PENDING_CONFIRMATION: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400",
    CONFIRMED: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
    COMPLETED: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
    CANCELLED: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400"
  }
  return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-700"
}

// Draggable event component
function CalendarEvent({
  booking,
  onClick
}: {
  booking: BookingEvent
  onClick?: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: booking.id,
    data: { booking }
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      className={cn(
        "group relative flex flex-col gap-1 p-1.5 rounded-md border text-[10px] shadow-sm cursor-grab active:cursor-grabbing transition-all hover:shadow-md select-none",
        getStatusColor(booking.bookingStatus),
        isDragging && "opacity-50 ring-2 ring-primary"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold truncate flex-1">{booking.clientName}</span>
      </div>

      <div className="opacity-90 truncate hidden sm:block">
        {booking.services[0] || "No service"}
      </div>

      <div className="flex items-center justify-between mt-0.5 pt-0.5 border-t border-black/5">
        <div className="flex items-center gap-1">
          {booking.photographer && (
            <Avatar className="h-3.5 w-3.5 border border-background">
              <AvatarImage src={booking.photographer.image || undefined} />
              <AvatarFallback className="text-[6px]">
                {booking.photographer.name?.slice(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        <div className="flex items-center gap-1">
          {booking.paymentStatus === "COMPLETED" && (
            <IconCheck className="h-2.5 w-2.5 text-green-600" />
          )}
          {booking.paymentStatus === "PENDING" && (
            <IconClock className="h-2.5 w-2.5 text-orange-500" />
          )}
          {booking._count && booking._count.photos > 0 && (
            <IconAlertCircle className="h-2.5 w-2.5 text-blue-500" />
          )}
        </div>
      </div>
    </div>
  )
}

// Day cell with drop zone
function CalendarDay({
  day,
  currentMonth,
  bookings,
  onEventClick,
  onDayExpand
}: {
  day: Date
  currentMonth: Date
  bookings: BookingEvent[]
  onEventClick: (booking: BookingEvent) => void
  onDayExpand: (day: Date) => void
}) {
  const dateId = day.toISOString()
  const { setNodeRef, isOver } = useDroppable({
    id: dateId,
    data: { date: day }
  })

  const dayBookings = bookings.filter(b => isSameDay(b.bookingDate, day))
  const isCurrentMonth = isSameMonth(day, currentMonth)

  const hasOverflow = dayBookings.length > MAX_EVENTS_PER_DAY
  const visibleBookings = hasOverflow
    ? dayBookings.slice(0, MAX_EVENTS_PER_DAY)
    : dayBookings
  const overflowCount = dayBookings.length - visibleBookings.length

  return (
    <div
      ref={setNodeRef}
      onClick={() => onDayExpand(day)}
      className={cn(
        "group h-full p-2 border-r border-b flex flex-col gap-1.5 transition-colors cursor-pointer hover:bg-accent/50",
        !isCurrentMonth && "bg-muted/10 text-muted-foreground",
        isToday(day) && "bg-primary/5",
        isOver && "bg-primary/10 ring-inset ring-2 ring-primary"
      )}
    >
      {/* Day number */}
      <div className="flex items-center justify-between">
        <span className={cn(
          "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full",
          isToday(day) ? "bg-primary text-primary-foreground" : ""
        )}>
          {format(day, "d")}
        </span>

        {dayBookings.length > 0 && (
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium text-muted-foreground bg-muted/50 border rounded-full px-2 py-0.5">
            {dayBookings.length}
          </span>
        )}
      </div>

      {/* Events */}
      <div className="flex flex-col gap-1.5 flex-1 w-full min-h-0">
        {visibleBookings.map(booking => (
          <CalendarEvent
            key={booking.id}
            booking={booking}
            onClick={() => onEventClick(booking)}
          />
        ))}

        {hasOverflow && (
          <div
            className="text-xs font-medium text-muted-foreground bg-muted/30 hover:bg-primary/10 hover:text-primary rounded px-2 py-1 text-center transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              onDayExpand(day)
            }}
          >
            +{overflowCount} more
          </div>
        )}
      </div>
    </div>
  )
}

// Main calendar component
export function BookingCalendar({
  bookings,
  onDateClick,
  onBookingClick,
  onBookingDrop
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeBooking, setActiveBooking] = useState<BookingEvent | null>(null)
  const [expandedDay, setExpandedDay] = useState<Date | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<BookingEvent | null>(null)
  const [newDate, setNewDate] = useState<Date | undefined>(undefined)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor)
  )

  // Calculate calendar days
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  // Dynamic grid rows (5 or 6)
  const gridRowClass = days.length > 35 ? "grid-rows-6" : "grid-rows-5"

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    setActiveBooking(event.active.data.current?.booking)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id && over.id) {
      const newDate = new Date(over.id as string)
      const booking = active.data.current?.booking
      if (booking && !isSameDay(booking.bookingDate, newDate)) {
        setRescheduleTarget(booking)
        setNewDate(newDate)
      }
    }
    setActiveId(null)
    setActiveBooking(null)
  }

  const confirmReschedule = () => {
    if (rescheduleTarget && newDate && onBookingDrop) {
      onBookingDrop(rescheduleTarget, newDate)
      setRescheduleTarget(null)
      setNewDate(undefined)
    }
  }

  const expandedDayBookings = expandedDay
    ? bookings.filter(b => isSameDay(b.bookingDate, expandedDay))
    : []

  return (
    <div className="flex flex-col h-full border rounded-lg bg-background shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold capitalize">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <div className="flex items-center border rounded-md ml-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-r-none"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <IconChevronLeft className="h-4 w-4" />
            </Button>
            <div className="w-[1px] h-4 bg-border" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-l-none"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <IconChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-2 h-8"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </Button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b bg-muted/40">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
          <div
            key={day}
            className="py-2 text-center text-xs font-semibold text-muted-foreground border-r last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid with drag and drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={cn("flex-1 grid grid-cols-7", gridRowClass)}>
          {days.map((day) => (
            <CalendarDay
              key={day.toISOString()}
              day={day}
              currentMonth={currentMonth}
              bookings={bookings}
              onEventClick={onBookingClick || (() => { })}
              onDayExpand={onDateClick || setExpandedDay}
            />
          ))}
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeId && activeBooking && (
            <div className={cn(
              "w-[200px] shadow-2xl rotate-2 p-2 rounded-md border text-xs",
              getStatusColor(activeBooking.bookingStatus)
            )}>
              <div className="font-semibold">{activeBooking.clientName}</div>
              <div className="opacity-90">{activeBooking.services[0]}</div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Day expansion dialog */}
      <Dialog open={!!expandedDay} onOpenChange={(open) => !open && setExpandedDay(null)}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {expandedDay && format(expandedDay, "EEEE, MMMM do, yyyy")}
            </DialogTitle>
            <DialogDescription>
              {expandedDayBookings.length} booking(s) scheduled
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 overflow-y-auto pr-2">
            {expandedDayBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No bookings for this date
              </div>
            ) : (
              expandedDayBookings.map(booking => (
                <div
                  key={booking.id}
                  className={cn(
                    "p-3 rounded-md border cursor-pointer hover:shadow-md transition-all",
                    getStatusColor(booking.bookingStatus)
                  )}
                  onClick={() => {
                    onBookingClick?.(booking)
                    setExpandedDay(null)
                  }}
                >
                  <div className="text-xs opacity-90">
                    {booking.services[0] || "No service"}
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExpandedDay(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule confirmation dialog */}
      <Dialog
        open={!!rescheduleTarget}
        onOpenChange={(open) => !open && setRescheduleTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Booking?</DialogTitle>
            <DialogDescription>
              Are you sure you want to reschedule this booking to a new date?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Booking Info */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">Client</p>
                  <p className="text-muted-foreground">{rescheduleTarget?.clientName}</p>
                </div>
                <Badge variant="outline" className={cn(
                  "capitalize",
                  getStatusColor(rescheduleTarget?.bookingStatus || "")
                )}>
                  {rescheduleTarget?.bookingStatus}
                </Badge>
              </div>

              <div>
                <p className="font-semibold text-sm">Service</p>
                <p className="text-muted-foreground">{rescheduleTarget?.services[0] || "No service"}</p>
              </div>
            </div>

            {/* Date Change */}
            <div className="flex items-center justify-between gap-4 px-4">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">Current Date</p>
                <p className="font-semibold">
                  {rescheduleTarget && format(rescheduleTarget.bookingDate, "MMM d, yyyy")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {rescheduleTarget && format(rescheduleTarget.bookingDate, "EEEE")}
                </p>
              </div>

              <div className="flex items-center justify-center">
                <IconChevronRight className="h-6 w-6 text-muted-foreground" />
              </div>

              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">New Date</p>
                <p className="font-semibold text-primary">
                  {newDate && format(newDate, "MMM d, yyyy")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {newDate && format(newDate, "EEEE")}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRescheduleTarget(null)
                setNewDate(undefined)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmReschedule}
            >
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}