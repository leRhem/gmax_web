// components/ui/time-picker-popover.tsx
"use client"

import * as React from "react"
import { IconClock } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface TimePickerPopoverProps {
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

function generateTimeSlots(): string[] {
  const slots: string[] = []
  const startHour = 8 // 8 AM
  const endHour = 22 // 10 PM
  
  let currentMinutes = startHour * 60 
  const endMinutes = endHour * 60

  while (currentMinutes <= endMinutes) {
    const hour = Math.floor(currentMinutes / 60)
    const minute = currentMinutes % 60
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    slots.push(timeString)
    currentMinutes += 45
  }
  
  return slots
}

function formatTimeDisplay(time: string): string {
  if (typeof time !== 'string' || !/^\d{1,2}:\d{2}$/.test(time)) return ''
  const [hoursStr, minutesStr] = time.split(':')
  const hours = Number(hoursStr)
  const minutes = Number(minutesStr)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return ''
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

export function TimePickerPopover({
  value,
  onChange,
  disabled = false,
  placeholder = "Select time",
}: TimePickerPopoverProps) {
  const [open, setOpen] = React.useState(false)
  const timeSlots = generateTimeSlots()

  const handleSelect = (time: string) => {
    onChange(time)
    setOpen(false)
  }

  const display = value ? formatTimeDisplay(value) : ''

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <IconClock className="mr-2 h-4 w-4" />
          {display || placeholder}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[200px] p-0" 
        align="start"
      >
        <div 
          className="max-h-[300px] overflow-y-auto p-1 space-y-1"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {timeSlots.map((time) => (
            <Button
              key={time}
              variant={value === time ? "default" : "ghost"}
              className={cn(
                "w-full justify-start font-normal text-sm h-9",
                value === time && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
              onClick={() => handleSelect(time)}
            >
              {formatTimeDisplay(time)}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}