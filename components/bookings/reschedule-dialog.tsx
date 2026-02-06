"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IconCalendar, IconClock, IconLoader2 } from "@tabler/icons-react"
import { useRouter } from "next/navigation"

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00",
]

interface RescheduleDialogProps {
  bookingId: string
  currentDate: Date | string
}

export function RescheduleDialog({ bookingId, currentDate }: RescheduleDialogProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // Logic to snap initial time to nearest available slot
  const getInitialTime = (initialDate: Date | string) => {
    const d = new Date(initialDate)
    const formatted = format(d, "HH:mm")
    if (TIME_SLOTS.includes(formatted)) return formatted
    
    const currentMinutes = d.getHours() * 60 + d.getMinutes()
    let nearest = TIME_SLOTS[0]
    let minDiff = Infinity
    
    TIME_SLOTS.forEach(slot => {
        const [h, m] = slot.split(":").map(Number)
        const slotMinutes = h * 60 + m
        const diff = Math.abs(currentMinutes - slotMinutes)
        if (diff < minDiff) {
            minDiff = diff
            nearest = slot
        }
    })
    return nearest
  }

  const [date, setDate] = useState<Date | undefined>(new Date(currentDate))
  const [time, setTime] = useState<string>(getInitialTime(currentDate))

  // Filter time slots to prevent selecting past times if the date is today
  const filteredSlots = TIME_SLOTS.filter(slot => {
    if (!date) return true
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    if (!isToday) return true
    
    const [h, m] = slot.split(":").map(Number)
    const slotTime = new Date(date)
    slotTime.setHours(h, m, 0, 0)
    return slotTime > now
  })

  // Ensure selected time is still valid when date changes
  useEffect(() => {
     if (date && time && !filteredSlots.includes(time)) {
        if (filteredSlots.length > 0) setTime(filteredSlots[0])
     }
  }, [date, filteredSlots, time])

  const handleReschedule = async () => {
    if (!date || !time) {
      toast.error("Please select a date and time")
      return
    }

    setIsLoading(true)
    try {
      // Combine date and time
      const [hours, minutes] = time.split(":").map(Number)
      const newDate = new Date(date)
      newDate.setHours(hours, minutes, 0, 0)

      const response = await fetch(`/api/public/bookings/${bookingId}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newDate: newDate.toISOString(),
        }),
      })

      // Safe JSON parsing
      let result
      const text = await response.text()
      try {
        result = JSON.parse(text)
      } catch (e) {
        result = { error: text || "An unexpected error occurred" }
      }

      if (!response.ok) {
        throw new Error(result.error || "Failed to reschedule")
      }

      toast.success("Booking rescheduled successfully!")
      setOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to reschedule booking")
    } finally {
      setIsLoading(false)
    }
  }

  // Disable past dates
  const isDateDisabled = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <IconCalendar className="mr-2 h-4 w-4" />
          Reschedule Booking
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reschedule Booking</DialogTitle>
          <DialogDescription>
            Choose a new date and time for your session. Subject to availability.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Select Date</Label>
            <div className="rounded-md border flex justify-center p-2">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(val) => {
                  if (val && time) {
                    const d = new Date(val)
                    const [h, m] = time.split(":").map(Number)
                    d.setHours(h, m, 0, 0)
                    setDate(d)
                  } else {
                    setDate(val)
                  }
                }}
                disabled={isDateDisabled}
                initialFocus
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Select Time</Label>
            <Select value={time} onValueChange={(val) => {
              setTime(val)
              if (date) {
                const d = new Date(date)
                const [h, m] = val.split(":").map(Number)
                d.setHours(h, m, 0, 0)
                setDate(d)
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {filteredSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
                {filteredSlots.length === 0 && (
                  <div role="status" aria-live="polite" className="p-2 text-sm text-muted-foreground text-center">
                    No slots available
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleReschedule} 
            disabled={isLoading || !date || !time || filteredSlots.length === 0}
          >
            {isLoading ? (
              <>
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Confirm Reschedule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
