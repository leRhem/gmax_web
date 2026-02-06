// components/bookings/edit-booking-dialog.tsx
"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { TimePickerPopover } from "@/components/ui/time-picker-popover"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CreateClientDialog } from "@/components/clients/create-client-dialog"
import { ClientCombobox } from "@/components/bookings/client-combobox"
import { IconLoader2, IconAlertCircle, IconCurrencyNaira, IconTrash, IconCalendar, IconPlus } from "@tabler/icons-react"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const bookingSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  bookingDate: z.date(),
  bookingTime: z.string().min(1, "Time is required"),
  photoCount: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  photographerId: z.string().optional(),
  services: z.array(z.object({
    serviceId: z.string(),
    quantity: z.number().int().min(1),
  })).min(1, "At least one service is required"),
})

type BookingFormData = z.infer<typeof bookingSchema>

interface Service {
  id: string
  name: string
  price: number
  salePrice: number | null
}

interface ServiceCategory {
  id: string
  name: string
  services: Service[]
}

interface Client {
  id: string
  name: string
  phone: string
  email: string | null
}

interface Staff {
  id: string
  name: string | null
}

interface BookingItem {
  id: string
  serviceId: string
  quantity: number
  priceSnapshot: number
}

interface Booking {
  id: string
  clientId: string
  bookingDate: string
  photoCount: number
  notes: string | null
  photographerId: string | null
  items: BookingItem[]
}

interface EditBookingDialogProps {
  booking: Booking
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditBookingDialog({
  booking,
  open,
  onOpenChange,
  onSuccess,
}: EditBookingDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [photographers, setPhotographers] = useState<Staff[]>([])
  const [selectedServices, setSelectedServices] = useState<Array<{ serviceId: string; quantity: number }>>([])
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
  })

  const clientId = watch("clientId")
  const bookingDate = watch("bookingDate")
  const bookingTime = watch("bookingTime")

  // Initialize form with booking data
  useEffect(() => {
    if (open && booking) {
      const date = new Date(booking.bookingDate)
      setValue("clientId", booking.clientId)
      setValue("bookingDate", date)
      setValue("bookingTime", format(date, "HH:mm"))
      setValue("photoCount", booking.photoCount)
      setValue("notes", booking.notes || "")
      setValue("photographerId", booking.photographerId || undefined)
      
      // Set selected services from booking items
      const services = booking.items.map(item => ({
        serviceId: item.serviceId,
        quantity: item.quantity
      }))
      setSelectedServices(services)
      setValue("services", services)
    }
  }, [open, booking, setValue])

  // Fetch data on mount
  useEffect(() => {
    if (open) {
      fetchClients()
      fetchServices()
      fetchPhotographers()
    }
  }, [open])

  // Check for conflicts when date/time changes
  useEffect(() => {
    if (bookingDate && bookingTime) {
      checkConflicts()
    }
  }, [bookingDate, bookingTime])

  // Update services in form when selectedServices changes
  useEffect(() => {
    setValue("services", selectedServices)
  }, [selectedServices, setValue])

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients?limit=1000")
      if (response.ok) {
        const data = (await response.json()) as any
        setClients(data.clients)
      }
    } catch (error) {
      console.error("Fetch clients error:", error)
    }
  }

  const fetchServices = async () => {
    try {
      const response = await fetch("/api/services")
      if (response.ok) {
        const data = (await response.json()) as any
        setCategories(data.categories)
      }
    } catch (error) {
      console.error("Fetch services error:", error)
    }
  }

  const fetchPhotographers = async () => {
    try {
      const response = await fetch("/api/staff?roles=PHOTOGRAPHER,VIDEOGRAPHER")
      if (response.ok) {
        const data = (await response.json()) as any
        setPhotographers(data.staff)
      }
    } catch (error) {
      console.error("Fetch photographers error:", error)
    }
  }

  const checkConflicts = async () => {
    try {
      if (!/^[0-9]{1,2}:[0-9]{2}$/.test(String(bookingTime))) {
        setConflictWarning("Invalid time format")
        return
      }
      const [hoursStr, minutesStr] = String(bookingTime).split(':')
      const hours = Number(hoursStr)
      const minutes = Number(minutesStr)
      if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        setConflictWarning("Invalid time")
        return
      }
      const dateTime = new Date(bookingDate)
      dateTime.setHours(hours, minutes, 0, 0)
      
      const response = await fetch("/api/bookings/check-conflict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          bookingDate: dateTime.toISOString(),
          excludeBookingId: booking.id
        }),
      })

      if (response.ok) {
        const data = (await response.json()) as any
        if (data.hasConflict) {
          setConflictWarning(data.message)
        } else {
          setConflictWarning(null)
        }
      }
    } catch (error) {
      console.error("Conflict check error:", error)
    }
  }

  const addService = (serviceId: string) => {
    if (!selectedServices.find((s) => s.serviceId === serviceId)) {
      setSelectedServices([...selectedServices, { serviceId, quantity: 1 }])
    }
  }

  const removeService = (serviceId: string) => {
    setSelectedServices(selectedServices.filter((s) => s.serviceId !== serviceId))
  }

  const updateQuantity = (serviceId: string, quantity: number) => {
    setSelectedServices(
      selectedServices.map((s) =>
        s.serviceId === serviceId ? { ...s, quantity } : s
      )
    )
  }

  const calculateTotal = () => {
    return selectedServices.reduce((total, item) => {
      const service = categories
        .flatMap((c) => c.services)
        .find((s) => s.id === item.serviceId)
      if (service) {
        const price = service.salePrice ?? service.price
        return total + Number(price) * item.quantity
      }
      return total
    }, 0)
  }

  const getServiceDetails = (serviceId: string) => {
    return categories.flatMap((c) => c.services).find((s) => s.id === serviceId)
  }

  const onSubmit = async (data: BookingFormData) => {
    try {
      setIsLoading(true)

      if (!/^[0-9]{1,2}:[0-9]{2}$/.test(String(data.bookingTime))) {
        toast.error("Invalid time format")
        setIsLoading(false)
        return
      }
      const [hoursStr, minutesStr] = String(data.bookingTime).split(':')
      const hours = Number(hoursStr)
      const minutes = Number(minutesStr)
      if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        toast.error("Invalid time")
        setIsLoading(false)
        return
      }
      const dateTime = new Date(data.bookingDate)
      dateTime.setHours(hours, minutes, 0, 0)

      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: data.clientId,
          bookingDate: dateTime.toISOString(),
          photoCount: data.photoCount,
          notes: data.notes || null,
          photographerId: data.photographerId || null,
          tags: [],
          items: data.services,
        }),
      })

      if (!response.ok) {
        const error = (await response.json()) as any
        throw new Error(error.message || error.error || "Failed to update booking")
      }

      toast.success("Booking updated successfully")
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || "Failed to update booking")
    } finally {
      setIsLoading(false)
    }
  }

  const total = calculateTotal()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
          <DialogDescription>
            Update the booking details. All required fields are marked with *
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="clientId">
              Client <span className="text-red-500">*</span>
            </Label>
            <ClientCombobox
              clients={clients}
              value={clientId}
              onValueChange={(value) => setValue("clientId", value)}
              onCreateNew={() => setIsCreateClientOpen(true)}
              disabled={isLoading}
            />
            {errors.clientId && (
              <p className="text-sm text-red-500">{errors.clientId.message}</p>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bookingDate">
                Date <span className="text-red-500">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !bookingDate && "text-muted-foreground"
                    )}
                    disabled={isLoading}
                  >
                    <IconCalendar className="mr-2 h-4 w-4" />
                    {bookingDate ? format(bookingDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={bookingDate}
                    onSelect={(date) => date && setValue("bookingDate", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.bookingDate && (
                <p className="text-sm text-red-500">{errors.bookingDate.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bookingTime">
                Time <span className="text-red-500">*</span>
              </Label>
              <TimePickerPopover
                value={bookingTime}
                onChange={(value) => setValue("bookingTime", value)}
                disabled={isLoading}
                placeholder="Select time"
              />
              {errors.bookingTime && (
                <p className="text-sm text-red-500">{errors.bookingTime.message}</p>
              )}
            </div>
          </div>

          {/* Conflict Warning */}
          {conflictWarning && (
            <Alert variant="destructive">
              <IconAlertCircle className="h-4 w-4" />
              <AlertDescription>{conflictWarning}</AlertDescription>
            </Alert>
          )}

          {/* Services Selection */}
          <div className="space-y-2">
            <Label>
              Services <span className="text-red-500">*</span>
            </Label>
            <div className="rounded-lg border p-4 space-y-4">
              {categories.map((category) => (
                <div key={category.id}>
                  <h4 className="font-medium mb-2">{category.name}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {category.services.map((service) => {
                      const isSelected = selectedServices.find(
                        (s) => s.serviceId === service.id
                      )
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() =>
                            isSelected
                              ? removeService(service.id)
                              : addService(service.id)
                          }
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="font-medium text-sm">{service.name}</div>
                          <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <IconCurrencyNaira className="h-3 w-3" />
                            {(service.salePrice ?? service.price).toLocaleString()}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            {errors.services && (
              <p className="text-sm text-red-500">{errors.services.message}</p>
            )}
          </div>

          {/* Selected Services with Quantity */}
          {selectedServices.length > 0 && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="font-medium">Selected Services</div>
              {selectedServices.map((item) => {
                const service = getServiceDetails(item.serviceId)
                if (!service) return null
                const price = service.salePrice ?? service.price
                return (
                  <div
                    key={item.serviceId}
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{service.name}</div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <IconCurrencyNaira className="h-3 w-3" />
                        {Number(price).toLocaleString()} × {item.quantity}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(item.serviceId, parseInt(e.target.value) || 1)
                        }
                        className="w-20"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeService(item.serviceId)}
                      >
                        <IconTrash className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                    <div className="flex items-center font-medium min-w-[100px] justify-end">
                      <IconCurrencyNaira className="h-4 w-4" />
                      {(Number(price) * item.quantity).toLocaleString()}
                    </div>
                  </div>
                )
              })}
              <Separator />
              <div className="flex items-center justify-between font-bold">
                <span>Total</span>
                <div className="flex items-center text-lg">
                  <IconCurrencyNaira className="h-5 w-5" />
                  {total.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Additional Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="photographerId">Photographer (Optional)</Label>
              <Select
                value={watch("photographerId") || "unassigned"}
                onValueChange={(value) => setValue("photographerId", value === "unassigned" ? undefined : value)}
                disabled={isLoading}
              >
                <SelectTrigger id="photographerId">
                  <SelectValue placeholder="Assign photographer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {photographers.map((photographer) => (
                    <SelectItem key={photographer.id} value={photographer.id}>
                      {photographer.name || photographer.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="photoCount">Photo Count (Optional)</Label>
              <Input
                id="photoCount"
                type="number"
                min="0"
                disabled={isLoading}
                {...register("photoCount", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any special requirements or notes..."
              disabled={isLoading}
              {...register("notes")}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || selectedServices.length === 0}>
              {isLoading ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Booking"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Nested Create Client Dialog */}
      <CreateClientDialog
        open={isCreateClientOpen}
        onOpenChange={setIsCreateClientOpen}
        onSuccess={async (newClient) => {
          // Refresh clients list
          await fetchClients()
          // Auto-select the newly created client
          if (newClient?.id) {
            setValue("clientId", newClient.id)
          }
          setIsCreateClientOpen(false)
        }}
      />
    </Dialog>
  )
}