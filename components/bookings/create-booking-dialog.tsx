// components/bookings/create-booking-dialog.tsx
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Calendar } from "@/components/ui/calendar"
import { TimePickerPopover } from "@/components/ui/time-picker-popover"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  IconLoader2,
  IconAlertCircle,
  IconCurrencyNaira,
  IconTrash,
  IconCalendar,
  IconChevronDown,
  IconChevronUp
} from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { ClientCombobox } from "./client-combobox"
import { CreateClientDialog } from "@/components/clients/create-client-dialog"

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

interface CreateBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  preselectedDate?: Date | null
}

interface Client {
  id: string
  name: string
  phone: string
  email: string | null
}

interface Service {
  id: string
  name: string
  price: number
  salePrice: number | null
}

interface ServiceCategory {
  id: string
  name: string
  type: "INDOOR" | "OUTDOOR" | "ADDON"
  services: Service[]
}

interface Staff {
  id: string
  name: string | null
  role: string
}

function parseAndValidateTime(timeString: string): { hours: number; minutes: number } | null {
  if (typeof timeString !== 'string' || !/^[0-9]{1,2}:[0-9]{2}$/.test(timeString)) return null
  const [hoursStr, minutesStr] = timeString.split(':')
  const hours = Number(hoursStr)
  const minutes = Number(minutesStr)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return { hours, minutes }
}

export function CreateBookingDialog({
  open,
  onOpenChange,
  onSuccess,
  preselectedDate,
}: CreateBookingDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [photographers, setPhotographers] = useState<Staff[]>([])
  const [selectedServices, setSelectedServices] = useState<Array<{ serviceId: string; quantity: number }>>([])
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)
  const [clientSearch, setClientSearch] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      photoCount: 0,
      services: [],
    },
  })

  const clientId = watch("clientId")
  const bookingDate = watch("bookingDate")
  const bookingTime = watch("bookingTime")

  // Fetch data on mount
  useEffect(() => {
    if (open) {
      fetchClients()
      fetchServices()
      fetchPhotographers()

      // Set preselected date if provided
      if (preselectedDate) {
        setValue("bookingDate", preselectedDate)
      }

      // Expand first category by default
      if (categories.length > 0) {
        setExpandedCategories({ [categories[0].id]: true })
      }
    }
  }, [open, preselectedDate])

  // Expand first category when categories load
  useEffect(() => {
    if (categories.length > 0 && Object.keys(expandedCategories).length === 0) {
      setExpandedCategories({ [categories[0].id]: true })
    }
  }, [categories])

  // Check for conflicts when date/time changes
  useEffect(() => {
    if (bookingDate && bookingTime) {
      checkConflicts()
    }
  }, [bookingDate, bookingTime])

  // Update services in form when selectedServices changes
  useEffect(() => {
    setValue("services", selectedServices)
  }, [selectedServices])

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients?limit=1000")
      if (response.ok) {
        const data = (await response.json()) as any
        setClients(data.clients)
        return data.clients as Client[]
      }
    } catch (error) {
      console.error("Fetch clients error:", error)
    }
    return []
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
      const parsed = parseAndValidateTime(String(bookingTime))
      if (!parsed) {
        setConflictWarning("Invalid time format")
        return
      }
      const { hours, minutes } = parsed
      const dateTime = new Date(bookingDate)
      dateTime.setHours(hours, minutes, 0, 0)

      const response = await fetch("/api/bookings/check-conflict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingDate: dateTime.toISOString() }),
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

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
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

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.phone.includes(clientSearch)
  )

  const onSubmit = async (data: BookingFormData) => {
    try {
      setIsLoading(true)

      const parsed = parseAndValidateTime(String(data.bookingTime))
      if (!parsed) {
        toast.error("Invalid time format")
        setIsLoading(false)
        return
      }
      const { hours, minutes } = parsed
      const dateTime = new Date(data.bookingDate)
      dateTime.setHours(hours, minutes, 0, 0)

      const response = await fetch("/api/bookings", {
        method: "POST",
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
        throw new Error(error.message || error.error || "Failed to create booking")
      }

      toast.success("Booking created successfully")
      reset()
      setSelectedServices([])
      setConflictWarning(null)
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || "Failed to create booking")
    } finally {
      setIsLoading(false)
    }
  }

  const total = calculateTotal()

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Booking</DialogTitle>
            <DialogDescription>
              Fill in the booking details. All required fields are marked with *
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
              <div className="rounded-lg border p-4 space-y-2">
                {categories.filter(c => c.type !== "ADDON").map((category) => (
                  <Collapsible
                    key={category.id}
                    open={expandedCategories[category.id]}
                    onOpenChange={() => toggleCategory(category.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-3 h-auto font-semibold hover:bg-accent"
                        type="button"
                      >
                        <span>{category.name}</span>
                        {expandedCategories[category.id] ? (
                          <IconChevronUp className="h-4 w-4" />
                        ) : (
                          <IconChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <div className="grid grid-cols-2 gap-2 px-3">
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
                              className={cn(
                                "p-3 rounded-lg border text-left transition-colors",
                                isSelected
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50"
                              )}
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
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
              {errors.services && (
                <p className="text-sm text-red-500">{errors.services.message}</p>
              )}
            </div>

            {/* Add-ons Selection (Optional) */}
            {categories.filter(c => c.type === "ADDON").length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Add-ons <Badge variant="outline" className="text-xs">Optional</Badge>
                </Label>
                <div className="rounded-lg border border-dashed p-4 space-y-2 bg-muted/30">
                  {categories.filter(c => c.type === "ADDON").map((category) => (
                    <Collapsible
                      key={category.id}
                      open={expandedCategories[category.id]}
                      onOpenChange={() => toggleCategory(category.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between p-3 h-auto font-semibold hover:bg-accent"
                          type="button"
                        >
                          <span className="flex items-center gap-2">
                            {category.name}
                            <Badge variant="secondary" className="text-xs">Add-on</Badge>
                          </span>
                          {expandedCategories[category.id] ? (
                            <IconChevronUp className="h-4 w-4" />
                          ) : (
                            <IconChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2">
                        <div className="grid grid-cols-2 gap-2 px-3">
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
                                className={cn(
                                  "p-3 rounded-lg border text-left transition-colors",
                                  isSelected
                                    ? "border-amber-500 bg-amber-500/10"
                                    : "border-border hover:border-amber-500/50"
                                )}
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
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </div>
            )}

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
                  {...register("photoCount", { 
                    valueAsNumber: true,
                    setValueAs: (v) => v === "" || Number.isNaN(Number(v)) ? undefined : Number(v)
                  })}
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
                    Creating...
                  </>
                ) : (
                  "Create Booking"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <CreateClientDialog
        open={isCreateClientOpen}
        onOpenChange={setIsCreateClientOpen}
        onSuccess={async (newClient) => {
          if (newClient?.id) {
            setClients((prev) => [{ ...newClient, email: newClient.email ?? null }, ...prev])
            setValue("clientId", newClient.id)
          } else {
            const updatedClients = await fetchClients()
            const created = updatedClients.find((c) => !clients.find((curr) => curr.id === c.id))
            if (created) setValue("clientId", created.id)
          }
          setIsCreateClientOpen(false)
        }}
      />
    </>
  )
}