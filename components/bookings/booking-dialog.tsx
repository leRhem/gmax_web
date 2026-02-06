// components/bookings/enhanced-booking-dialog.tsx
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ClientCombobox } from "@/components/bookings/client-combobox"
import { CreateClientDialog } from "@/components/clients/create-client-dialog"
import {
  IconLoader2,
  IconAlertCircle,
  IconCurrencyNaira,
  IconCalendar,
  IconChevronDown,
  IconChevronUp,
  IconPlus,
  IconMinus,
  IconAlertTriangle,
  IconCheck,
  IconClock,
} from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const bookingSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  bookingDate: z.date(),
  bookingTime: z.string().min(1, "Time is required"),
  notes: z.string().optional(),
  photographerId: z.string().optional(),
  serviceId: z.string().min(1, "Service is required"),
  extraOutfits: z.number().int().min(0),
  extraPics: z.number().int().min(0),
})

type BookingFormData = z.infer<typeof bookingSchema>

interface Service {
  id: string
  name: string
  price: number
  salePrice: number | null
  sessionDuration: number
  includesSessions: number
  allowExtraOutfits: boolean
  extraOutfitPrice: number | null
  extraOutfitDuration: number | null
  allowExtraPics: boolean
  extraPicPrice: number | null
}

interface ServiceCategory {
  id: string
  name: string
  type: "INDOOR" | "OUTDOOR" | "ADDON"
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

interface DailyCapacity {
  date: string
  availableSessions: number
  maxSessions: number
}

interface BookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  preselectedDate?: Date | null
}

export function BookingDialog({
  open,
  onOpenChange,
  onSuccess,
  preselectedDate,
}: BookingDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [photographers, setPhotographers] = useState<Staff[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false)
  const [dailyCapacity, setDailyCapacity] = useState<DailyCapacity | null>(null)
  const [capacityLoading, setCapacityLoading] = useState(false)

  // Form state
  const [extraOutfits, setExtraOutfits] = useState(0)
  const [extraPics, setExtraPics] = useState(0)

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
      extraOutfits: 0,
      extraPics: 0,
    },
  })

  const clientId = watch("clientId")
  const bookingDate = watch("bookingDate")
  const bookingTime = watch("bookingTime")
  const serviceId = watch("serviceId")

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      if (preselectedDate) {
        setValue("bookingDate", preselectedDate)
      }
      fetchClients()
      fetchServices()
      fetchPhotographers()
      setExtraOutfits(0)
      setExtraPics(0)
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

  // Update selected service when serviceId changes
  useEffect(() => {
    if (serviceId && categories.length > 0) {
      const service = categories
        .flatMap((c) => c.services)
        .find((s) => s.id === serviceId)
      setSelectedService(service || null)
      setExtraOutfits(0)
      setExtraPics(0)
      setValue("extraOutfits", 0)
      setValue("extraPics", 0)
    }
  }, [serviceId, categories])

  // Check daily capacity when date changes
  useEffect(() => {
    if (bookingDate) {
      checkDailyCapacity()
    }
  }, [bookingDate])

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

  const checkDailyCapacity = async () => {
    try {
      setCapacityLoading(true)
      const response = await fetch(
        `/api/bookings/capacity?date=${bookingDate.toISOString()}`
      )
      if (response.ok) {
        const data = (await response.json()) as any
        setDailyCapacity(data)
      }
    } catch (error) {
      console.error("Capacity check error:", error)
    } finally {
      setCapacityLoading(false)
    }
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }))
  }

  // Calculate total sessions
  const calculateTotalSessions = () => {
    if (!selectedService) return 0
    const baseSessions = selectedService.includesSessions
    const outfitSessions = extraOutfits // Each outfit = 1 session
    return baseSessions + outfitSessions
  }

  // Calculate total price
  const calculateTotalPrice = () => {
    if (!selectedService) return 0
    const basePrice = selectedService.salePrice ?? selectedService.price
    const outfitsCost = extraOutfits * (selectedService.extraOutfitPrice ?? 0)
    const picsCost = extraPics * (selectedService.extraPicPrice ?? 0)
    return Number(basePrice) + Number(outfitsCost) + Number(picsCost)
  }

  // Calculate total duration
  const calculateTotalDuration = () => {
    if (!selectedService) return 0
    const baseDuration = selectedService.sessionDuration
    const outfitsDuration =
      extraOutfits * (selectedService.extraOutfitDuration ?? 45)
    return baseDuration + outfitsDuration
  }

  const totalSessions = calculateTotalSessions()
  const totalPrice = calculateTotalPrice()
  const totalDuration = calculateTotalDuration()

  // Check if booking exceeds capacity
  const exceedsCapacity =
    (dailyCapacity && totalSessions > dailyCapacity.availableSessions) || false

  const onSubmit = async (data: BookingFormData) => {
    try {
      setIsLoading(true)

      if (exceedsCapacity) {
        toast.error(
          `Insufficient capacity! ${totalSessions} sessions required but only ${dailyCapacity?.availableSessions} available.`
        )
        return
      }

      const parsed = parseAndValidateTime(String(data.bookingTime))
      if (!parsed) {
        toast.error("Invalid time format")
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
          notes: data.notes || null,
          photographerId: data.photographerId || null,
          tags: [],
          serviceId: data.serviceId,
          extraOutfits: data.extraOutfits,
          extraPics: data.extraPics,
          totalSessions,
        }),
      })

      if (!response.ok) {
        const error = (await response.json()) as any
        throw new Error(error.message || error.error || "Failed to create booking")
      }

      toast.success("Booking created successfully")
      reset()
      setExtraOutfits(0)
      setExtraPics(0)
      setSelectedService(null)
      setConflictWarning(null)
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || "Failed to create booking")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Booking</DialogTitle>
            <DialogDescription>
              Session-based booking system. Select service and add outfits/pics as needed.
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

            {/* Daily Capacity Indicator */}
            {bookingDate && dailyCapacity && (
              <Card className={cn(
                "p-4",
                exceedsCapacity ? "border-red-500 bg-red-50 dark:bg-red-950/10" : "border-green-500 bg-green-50 dark:bg-green-950/10"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {exceedsCapacity ? (
                      <IconAlertTriangle className="h-5 w-5 text-red-600" />
                    ) : (
                      <IconCheck className="h-5 w-5 text-green-600" />
                    )}
                    <div>
                      <p className="font-semibold text-sm">
                        {exceedsCapacity ? "Insufficient Capacity!" : "Capacity Available"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dailyCapacity.availableSessions} of {dailyCapacity.maxSessions} sessions available
                        {totalSessions > 0 && ` • This booking needs ${totalSessions} sessions`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {dailyCapacity.availableSessions}/{dailyCapacity.maxSessions}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Conflict Warning */}
            {conflictWarning && (
              <Alert variant="destructive">
                <IconAlertCircle className="h-4 w-4" />
                <AlertDescription>{conflictWarning}</AlertDescription>
              </Alert>
            )}

            {/* Service Selection */}
            <div className="space-y-2">
              <Label>
                Service <span className="text-red-500">*</span>
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
                      <div className="grid grid-cols-1 gap-2 px-3">
                        {category.services.map((service) => {
                          const isSelected = serviceId === service.id
                          return (
                            <button
                              key={service.id}
                              type="button"
                              onClick={() => setValue("serviceId", service.id)}
                              className={cn(
                                "p-3 rounded-lg border text-left transition-colors",
                                isSelected
                                  ? "border-primary bg-primary/5 ring-2 ring-primary"
                                  : "border-border hover:border-primary/50"
                              )}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{service.name}</div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    <div className="flex items-center">
                                      <IconCurrencyNaira className="h-3 w-3" />
                                      {(service.salePrice ?? service.price).toLocaleString()}
                                    </div>
                                    {service.includesSessions > 0 && (
                                      <>
                                        <span>•</span>
                                        <span>{service.includesSessions} session(s)</span>
                                      </>
                                    )}
                                    {service.sessionDuration > 0 && (
                                      <>
                                        <span>•</span>
                                        <span>{service.sessionDuration} mins</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {isSelected && (
                                  <IconCheck className="h-5 w-5 text-primary flex-shrink-0" />
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
              {errors.serviceId && (
                <p className="text-sm text-red-500">{errors.serviceId.message}</p>
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
                        <div className="grid grid-cols-1 gap-2 px-3">
                          {category.services.map((service) => {
                            const isSelected = serviceId === service.id
                            return (
                              <button
                                key={service.id}
                                type="button"
                                onClick={() => setValue("serviceId", service.id)}
                                className={cn(
                                  "p-3 rounded-lg border text-left transition-colors",
                                  isSelected
                                    ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500"
                                    : "border-border hover:border-amber-500/50"
                                )}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{service.name}</div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                      <div className="flex items-center">
                                        <IconCurrencyNaira className="h-3 w-3" />
                                        {(service.salePrice ?? service.price).toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <IconCheck className="h-5 w-5 text-amber-500 flex-shrink-0" />
                                  )}
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

            {/* Extra Outfits & Pics (Only show if service allows) */}
            {selectedService && (
              <Card className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Add-Ons</h3>
                  <Badge variant="outline">
                    {totalSessions} session{totalSessions !== 1 ? "s" : ""}
                  </Badge>
                </div>

                {selectedService.allowExtraOutfits && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Extra Outfits</Label>
                        <p className="text-xs text-muted-foreground">
                          +₦{selectedService.extraOutfitPrice?.toLocaleString()} per outfit
                          ({selectedService.extraOutfitDuration} mins each)
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const newValue = Math.max(0, extraOutfits - 1)
                            setExtraOutfits(newValue)
                            setValue("extraOutfits", newValue)
                          }}
                          disabled={extraOutfits === 0}
                        >
                          <IconMinus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center font-semibold">{extraOutfits}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const newValue = extraOutfits + 1
                            setExtraOutfits(newValue)
                            setValue("extraOutfits", newValue)
                          }}
                        >
                          <IconPlus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedService.allowExtraPics && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Extra Pictures</Label>
                        <p className="text-xs text-muted-foreground">
                          +₦{selectedService.extraPicPrice?.toLocaleString()} per picture
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const newValue = Math.max(0, extraPics - 1)
                            setExtraPics(newValue)
                            setValue("extraPics", newValue)
                          }}
                          disabled={extraPics === 0}
                        >
                          <IconMinus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center font-semibold">{extraPics}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const newValue = extraPics + 1
                            setExtraPics(newValue)
                            setValue("extraPics", newValue)
                          }}
                        >
                          <IconPlus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary */}
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base Price:</span>
                    <div className="flex items-center font-medium">
                      <IconCurrencyNaira className="h-4 w-4" />
                      {(selectedService.salePrice ?? selectedService.price).toLocaleString()}
                    </div>
                  </div>
                  {extraOutfits > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Extra Outfits ({extraOutfits}):
                      </span>
                      <div className="flex items-center font-medium">
                        <IconCurrencyNaira className="h-4 w-4" />
                        {(
                          extraOutfits * Number(selectedService.extraOutfitPrice)
                        ).toLocaleString()}
                      </div>
                    </div>
                  )}
                  {extraPics > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Extra Pictures ({extraPics}):
                      </span>
                      <div className="flex items-center font-medium">
                        <IconCurrencyNaira className="h-4 w-4" />
                        {(
                          extraPics * Number(selectedService.extraPicPrice)
                        ).toLocaleString()}
                      </div>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-lg">Total</p>
                      <p className="text-xs text-muted-foreground">
                        {totalDuration} mins • {totalSessions} session(s)
                      </p>
                    </div>
                    <div className="flex items-center text-2xl font-bold">
                      <IconCurrencyNaira className="h-6 w-6" />
                      {totalPrice.toLocaleString()}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Additional Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="photographerId">Photographer (Optional)</Label>
                <Select
                  value={watch("photographerId") || "unassigned"}
                  onValueChange={(value) =>
                    setValue("photographerId", value === "unassigned" ? undefined : value)
                  }
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
              <Button
                type="submit"
                disabled={isLoading || !selectedService || exceedsCapacity}
              >
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

      {/* Nested Create Client Dialog */}
      <CreateClientDialog
        open={isCreateClientOpen}
        onOpenChange={setIsCreateClientOpen}
        onSuccess={async (newClient) => {
          const updatedClients = await fetchClients()
          if (newClient?.id) {
            setValue("clientId", newClient.id)
          } else {
            const created = updatedClients.find(
              (c) => !clients.find((curr) => curr.id === c.id)
            )
            if (created) setValue("clientId", created.id)
          }
          setIsCreateClientOpen(false)
        }}
      />
    </>
  )
}

// Helper function
function parseAndValidateTime(
  timeString: string
): { hours: number; minutes: number } | null {
  if (
    typeof timeString !== "string" ||
    !/^[0-9]{1,2}:[0-9]{2}$/.test(timeString)
  )
    return null
  const [hoursStr, minutesStr] = timeString.split(":")
  const hours = Number(hoursStr)
  const minutes = Number(minutesStr)
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  )
    return null
  return { hours, minutes }
}