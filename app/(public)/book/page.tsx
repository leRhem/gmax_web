"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { format } from "date-fns"
import Link from "next/link"
import {
  IconLoader2,
  IconMapPin,
  IconCheck,
  IconCurrencyNaira,
  IconPlus,
  IconMinus,
  IconChevronRight,
  IconArrowLeft,
  IconCamera,
  IconShirt,
  IconPhoto,
  IconChevronDown,
  IconExternalLink,
  IconInfoCircle,
} from "@tabler/icons-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

// --- Types ---
interface Studio {
  id: string
  name: string
  city: string
  state: string
  address: string
  phone: string | null
  email: string | null
}

interface Service {
  id: string
  name: string
  description: string | null
  price: number
  salePrice: number | null
  displayPrice: number
  hasDiscount: boolean
  discountPercent: number
  sessionDuration: number
  includesSessions: number
  allowExtraOutfits: boolean
  extraOutfitPrice: number | null
  allowExtraPics: boolean
  extraPicPrice: number | null
  features: string[]
}

interface ServiceCategory {
  id: string
  name: string
  type: "INDOOR" | "OUTDOOR" | "ADDON"
  services: Service[]
}

// --- Schema ---
const bookingSchema = z.object({
  clientName: z.string().min(2, "Name is required"),
  clientPhone: z.string().min(10, "Valid phone number is required"),
  clientEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  studioId: z.string().min(1, "Please select a studio"),
  serviceId: z.string().min(1, "Please select a service"),
  addonIds: z.array(z.string()).default([]),
  bookingDate: z.date().optional(),
  bookingTime: z.string().min(1, "Please select a time"),
  notes: z.string().optional(),
  extraOutfits: z.number().int().min(0).default(0),
  extraPics: z.number().int().min(0).default(0),
})

type BookingFormData = z.infer<typeof bookingSchema>

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00",
]

// --- Helper Components ---

function CounterInput({ 
  value, 
  onChange, 
  max = 10, 
  label, 
  price 
}: { 
  value: number; 
  onChange: (val: number) => void; 
  max?: number;
  label: string;
  price?: number | null;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-white/50 dark:bg-white/5">
       <div className="flex-1">
          <p className="font-medium text-sm">{label}</p>
          {price && (
             <p className="text-xs text-muted-foreground">+₦{Number(price).toLocaleString()} each</p>
          )}
       </div>
       <div className="flex items-center gap-3">
          <Button 
            type="button" 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 rounded-full"
            onClick={() => onChange(Math.max(0, value - 1))}
            disabled={value <= 0}
          >
             <IconMinus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center font-medium">{value}</span>
          <Button 
            type="button" 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 rounded-full"
            onClick={() => onChange(Math.min(max, value + 1))}
            disabled={value >= max}
          >
             <IconPlus className="h-4 w-4" />
          </Button>
       </div>
    </div>
  )
}

function SummaryPanel({
  studio,
  service,
  addons,
  extraOutfits,
  extraPics,
  date,
  time,
  className
}: {
  studio: Studio | null
  service: Service | null
  addons: Service[]
  extraOutfits: number
  extraPics: number
  date?: Date 
  time?: string
  className?: string
}) {
  const basePrice = service?.displayPrice || 0
  const outfitsInitial = service?.includesSessions || 0
  
  const extrasCost = (extraOutfits * (service?.extraOutfitPrice || 0)) + (extraPics * (service?.extraPicPrice || 0))
  const addonsCost = addons.reduce((sum, a) => sum + Number(a.displayPrice), 0)
  const total = Number(basePrice) + extrasCost + addonsCost

  return (
    <div className={cn("sticky top-24", className)}>
        <Card className="border-border/60 shadow-lg overflow-hidden bg-black text-white border-none rounded-2xl">
            <CardHeader className="pb-4 border-b border-white/10 bg-white/5 py-4">
               <CardTitle className="text-base font-bold tracking-tight mb-1">Booking Summary</CardTitle>
               {date && time && (
                   <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                       <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"/>
                       {format(date, "EEE, dd MMM yyyy")} at {time}
                   </p>
               )}
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
               {/* Studio */}
               {studio ? (
                   <div className="flex items-start gap-3">
                      <IconMapPin className="h-4 w-4 text-neutral-400 shrink-0 mt-1" />
                      <div>
                         <p className="font-bold text-sm">{studio.name}</p>
                         <p className="text-xs text-neutral-400 leading-relaxed">{studio.address}, {studio.city}</p>
                         <a 
                           href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${studio.name} ${studio.address} ${studio.city}`)}`}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="text-[10px] text-primary hover:text-primary/80 transition-colors flex items-center gap-1 mt-1.5 font-medium"
                         >
                           View on Google Maps <IconExternalLink className="h-3 w-3" />
                         </a>
                      </div>
                   </div>
               ) : (
                   <div className="flex items-start gap-3 opacity-50">
                      <IconMapPin className="h-4 w-4 shrink-0 mt-1" />
                      <p className="text-sm italic">Select a studio...</p>
                   </div>
               )}
               
               {/* Service */}
               {service ? (
                   <div className="flex items-start gap-3">
                        <IconCamera className="h-4 w-4 text-neutral-400 shrink-0 mt-1" />
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <p className="font-bold text-sm max-w-[150px] leading-tight">{service.name}</p>
                                <p className="font-bold text-sm">₦{Number(service.displayPrice).toLocaleString()}</p>
                            </div>
                            <p className="text-xs text-neutral-400 mt-1 font-medium">{service.sessionDuration} mins • {service.includesSessions} outfit{service.includesSessions !== 1 ? 's' : ''}</p>
                            {/* Features List */}
                            {service.features && service.features.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                    {service.features.slice(0, 3).map((feature, i) => (
                                        <li key={i} className="text-[10px] text-neutral-500 flex items-center gap-1.5">
                                            <div className="w-0.5 h-0.5 rounded-full bg-neutral-500" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                   </div>
               ) : (
                   <div className="flex items-start gap-3 opacity-50">
                        <IconCamera className="h-4 w-4 shrink-0 mt-1" />
                        <p className="text-sm italic">Select a service...</p>
                   </div>
               )}

               {/* Extras Section - Matches User Screenshot */}
               {(extraOutfits > 0 || extraPics > 0 || addons.length > 0) && (
                   <div className="space-y-3 pt-4 border-t border-white/10">
                       <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">EXTRAS</p>
                       
                       {extraOutfits > 0 && (
                           <div className="flex justify-between text-sm items-center">
                               <span className="text-neutral-300 flex items-center gap-2">
                                  <IconShirt className="h-3.5 w-3.5 text-neutral-500" /> {extraOutfits} Extra Outfit{extraOutfits > 1 ? 's' : ''}
                               </span>
                               <span className="font-medium">+₦{(extraOutfits * (service?.extraOutfitPrice || 0)).toLocaleString()}</span>
                           </div>
                       )}
                       
                       {extraPics > 0 && (
                           <div className="flex justify-between text-sm items-center">
                               <span className="text-neutral-300 flex items-center gap-2">
                                  <IconPhoto className="h-3.5 w-3.5 text-neutral-500" /> {extraPics} Extra Pic{extraPics > 1 ? 's' : ''}
                               </span>
                               <span className="font-medium">+₦{(extraPics * (service?.extraPicPrice || 0)).toLocaleString()}</span>
                           </div>
                       )}

                       {addons.map(addon => (
                           <div key={addon.id} className="flex justify-between text-sm items-center">
                               <span className="text-neutral-300">{addon.name}</span>
                               <span className="font-medium">+₦{Number(addon.displayPrice).toLocaleString()}</span>
                           </div>
                       ))}
                   </div>
               )}

               <div className="pt-6 border-t border-white/10 mt-2">
                   <div className="flex justify-between items-end">
                       <span className="font-bold text-lg tracking-tight">Total</span>
                       <span className="font-extrabold text-2xl tracking-tight">
                           ₦{total.toLocaleString()}
                       </span>
                   </div>
               </div>
            </CardContent>
        </Card>
    </div>
  )
}

// --- Mobile Summary Bar ---
function MobileSummaryBar({
  service,
  total,
  onNext,
  onBack,
  step,
  isSubmitting
}: {
  service: Service | null,
  total: number,
  onNext: () => void,
  onBack: () => void,
  step: number,
  isSubmitting: boolean
}) {
  // if (!service) return null // REMOVED to show button on Step 1

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-border p-4 shadow-lg lg:hidden z-50">
        <div className="flex items-center justify-between max-w-6xl mx-auto gap-4">
            {step > 1 && (
                <Button 
                   variant="outline" 
                   size="icon" 
                   onClick={onBack}
                   className="shrink-0 w-10 h-10 rounded-full"
                >
                   <IconArrowLeft className="h-4 w-4" />
                </Button>
            )}
            <div className="flex-1">
                {service ? (
                    <>
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Total</p>
                        <div className="flex items-baseline gap-1">
                            <IconCurrencyNaira className="h-4 w-4" />
                            <span className="font-bold text-lg">{total.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">{service.name}</p>
                    </>
                ) : (
                    <div className="h-full flex items-center">
                        <span className="text-sm font-medium text-muted-foreground">
                            {step === 1 ? "Select a Studio" : "Select a Service"}
                        </span>
                    </div>
                )}
            </div>
            <Button 
                onClick={onNext} 
                disabled={isSubmitting}
                className="h-10 px-6 rounded-xl font-bold"
            >
                {step === 4 ? (isSubmitting ? "Processing..." : "Complete") : "Next"}
            </Button>
        </div>
    </div>
  )
}

// --- Category Accordion ---
function CategoryAccordion({ 
  category, 
  isOpen, 
  onToggle, 
  selectedServiceId, 
  onSelect,
  onViewDetails
}: { 
  category: ServiceCategory, 
  isOpen: boolean, 
  onToggle: () => void, 
  selectedServiceId: string, 
  onSelect: (id: string) => void,
  onViewDetails: (service: Service) => void
}) {
    return (
        <Collapsible open={isOpen} onOpenChange={onToggle} className="border border-border rounded-xl bg-white dark:bg-neutral-900 overflow-hidden">
            <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                <span className="font-semibold text-lg">{category.name}</span>
                <IconChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="border-t border-border">
                    {category.services.map(service => (
                        <div 
                            key={service.id}
                            className={cn(
                                "flex items-center justify-between p-4 border-b border-border/50 last:border-0 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors",
                                selectedServiceId === service.id && "bg-primary/5 border-l-4 border-l-primary"
                            )}
                            onClick={() => onSelect(service.id)}
                        >
                            <div className="flex-1 pr-4">
                                <div className="flex items-center gap-2">
                                    <h4 className={cn("font-medium", selectedServiceId === service.id && "text-primary")}>{service.name}</h4>
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onViewDetails(service)
                                        }}
                                        className="text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        <IconInfoCircle className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="flex text-xs text-muted-foreground gap-2 mt-1">
                                    <span>{service.sessionDuration}m</span>
                                    <span>• {service.includesSessions} outfits</span>
                                </div>
                            </div>
                            <div className="font-bold">
                                ₦{Number(service.displayPrice).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}

// --- Main Page Component ---

export default function BookPage() {
  const [step, setStep] = useState(1)
  const [studios, setStudios] = useState<Studio[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingResult, setBookingResult] = useState<any>(null)
  
  // Accordion State
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  // Service Details Dialog
  const [viewingService, setViewingService] = useState<Service | null>(null)

  const { control, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema) as any,
    defaultValues: {
      clientName: "",
      clientPhone: "",
      clientEmail: "",
      studioId: "",
      serviceId: "",
      addonIds: [],
      bookingTime: "",
      notes: "",
      extraOutfits: 0,
      extraPics: 0,
    },
  })

  // Watchers
  const selectedStudioId = watch("studioId")
  const selectedServiceId = watch("serviceId")
  const selectedAddonIds = watch("addonIds") || []
  const extraOutfits = watch("extraOutfits")
  const extraPics = watch("extraPics")
  const selectedDate = watch("bookingDate")
  const selectedTime = watch("bookingTime")

  // Derivations
  const selectedStudio = studios.find((s) => s.id === selectedStudioId) || null
  
  const serviceCategories = categories.filter(c => c.type !== "ADDON")
  const addonCategories = categories.filter(c => c.type === "ADDON")
  const allServices = serviceCategories.flatMap((c) => c.services)
  const allAddons = addonCategories.flatMap((c) => c.services)
  
  const selectedService = allServices.find((s) => s.id === selectedServiceId) || null
  const selectedAddons = allAddons.filter((a) => selectedAddonIds.includes(a.id))

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studiosRes, servicesRes] = await Promise.all([
          fetch("/api/public/bookings"),
          fetch("/api/public/services"),
        ])
        if (studiosRes.ok) {
           const data = (await studiosRes.json()) as any
           setStudios(data.studios || [])
        }
        if (servicesRes.ok) {
           const data = (await servicesRes.json()) as any
           setCategories(data.categories || [])
           // Open first category by default
           if (data.categories?.length > 0) {
             setOpenCategory(data.categories[0].id)
           }
        }
      } catch (err) {
        toast.error("Failed to load booking data")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  // Navigation Logic
  const nextStep = async () => {
     let isValid = false
     if (step === 1) {
        isValid = await trigger("studioId")
        if (!selectedStudioId) toast.error("Please select a studio")
     } else if (step === 2) {
        isValid = await trigger("serviceId")
        if (!selectedServiceId) toast.error("Please select a service")
     } else if (step === 3) {
        isValid = true
     } else if (step === 4) {
        isValid = await trigger(["bookingDate", "bookingTime", "clientName", "clientPhone"])
        if (!isValid) toast.error("Please fill in all required details")
     }

     if (isValid) setStep(s => s + 1)
  }

  const prevStep = () => {
      setStep(s => Math.max(1, s - 1))
  }

  const onSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true)
    try {
      if (!data.bookingDate) {
        toast.error("Please select a booking date");
        setIsSubmitting(false);
        return;
      }
      const [hours, minutes] = data.bookingTime.split(":").map(Number)
      const bookingDate = new Date(data.bookingDate)
      bookingDate.setHours(hours, minutes, 0, 0)

      const response = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          bookingDate: bookingDate.toISOString(),
        }),
      })

      const result = (await response.json()) as any
      if (!response.ok) throw new Error(result.error || "Failed")

      setBookingResult(result)
      setStep(5)
      toast.success("Booking created!")
    } catch (error: any) {
      toast.error(error.message || "Failed to create booking")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
             <div className="flex flex-col items-center gap-4">
                 <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
                 <p className="text-muted-foreground font-light">Loading...</p>
             </div>
          </div>
      )
  }

  // --- Success View ---
  if (step === 5 && bookingResult) {
     return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
           <Card className="max-w-md w-full shadow-lg border-border/60">
               <CardHeader className="text-center pb-2">
                   <div className="mx-auto mb-4 bg-green-100 text-green-600 w-16 h-16 rounded-full flex items-center justify-center">
                       <IconCheck className="w-8 h-8" />
                   </div>
                   <CardTitle className="text-2xl">Booking Initiated!</CardTitle>
                   <p className="text-muted-foreground">Almost there!</p>
               </CardHeader>
               <CardContent className="space-y-6">
                   <div className="text-center text-sm text-neutral-600 dark:text-neutral-400">
                       Please click the button below to confirm your booking.
                   </div>
                   <Button 
                       className="w-full text-base h-12" 
                       onClick={() => {
                           if (bookingResult?.confirmationLink) {
                               try {
                                   if (bookingResult.confirmationLink.startsWith('/') || bookingResult.confirmationLink.startsWith('http')) {
                                       window.location.href = bookingResult.confirmationLink;
                                   } else {
                                       console.error("Invalid confirmation link format:", bookingResult.confirmationLink);
                                       toast.error("Invalid confirmation link. Please contact support.");
                                   }
                               } catch (e) {
                                   console.error("Error setting location:", e);
                                   toast.error("Failed to redirect to confirmation page.");
                               }
                           } else {
                               console.error("No confirmation link found in booking result");
                               toast.error("Confirmation link not available. Please contact support.");
                           }
                       }}
                   >
                       Confirm & Pay
                   </Button>
               </CardContent>
           </Card>
        </div>
     )
  }

  const STEPS = ["Studio", "Service", "Customize", "Details"];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 font-sans selection:bg-primary/5">
        <header className="bg-background/80 backdrop-blur-md border-b border-border/40 sticky top-0 z-50">
           <div className="container mx-auto h-20 px-6 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                 <div className="bg-primary/10 p-2 rounded-lg"><IconCamera className="h-5 w-5 text-primary"/></div>
                 <span className="font-bold text-lg tracking-tight">GMAX Booking</span>
              </Link>
              <Button variant="ghost" size="sm" asChild>
                 <Link href="/">Back</Link>
              </Button>
           </div>
        </header>

        <main className="container mx-auto px-4 md:px-6 py-8">
            <div className="max-w-6xl mx-auto">
                {/* Steps Indicator (Top of Page) */}
                {/* Steps Indicator (Top of Page) */}
                
                {/* Mobile Dropdown Stepper */}
                <div className="md:hidden mb-6">
                    <Select 
                        value={step.toString()} 
                        onValueChange={(val) => {
                            const newStep = parseInt(val)
                            // Allow moving back or to Step 1/2 easily. 
                            // Restrict moving forward if not validated.
                            if (newStep < step || (newStep === step + 1 && (step === 3 || step === 1))) {
                                // For stricter validation, we should ideally trigger validation before moving.
                                // But for now, let's allow "Back" via dropdown freely, and "Forward" only via Next button or strictly if completed.
                                if (newStep < step) setStep(newStep)
                            }
                        }}
                    >
                        <SelectTrigger className="w-full text-lg font-bold h-12">
                            <SelectValue placeholder={`Step ${step}: ${STEPS[step-1]}`} />
                        </SelectTrigger>
                        <SelectContent>
                            {STEPS.map((s, i) => (
                                <SelectItem key={s} value={(i+1).toString()} disabled={i + 1 > step}>
                                    <div className="flex items-center gap-2">
                                        <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-neutral-900 text-white dark:bg-white dark:text-black">
                                            {i + 1}
                                        </span>
                                        <span>{s}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Desktop Stepper */}
                <div className="hidden md:flex items-center justify-center gap-4 mb-10 overflow-x-auto pb-4 md:pb-0 scrollbar-hide">
                    {STEPS.map((s, i) => (
                        <div key={s} className="flex items-center">
                            <div className={cn(
                                "flex items-center gap-3 px-6 py-3 rounded-full transition-all whitespace-nowrap border",
                                step === i + 1 
                                    ? "bg-neutral-900 text-white dark:bg-white dark:text-black border-neutral-900 dark:border-white shadow-md" 
                                    : "bg-white text-neutral-500 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-800"
                            )}>
                                <span className={cn("font-semibold text-sm tracking-wide", step === i + 1 ? "opacity-100" : "opacity-80")}>{s}</span>
                                <span className={cn(
                                    "flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold",
                                    step === i + 1 
                                        ? "bg-white text-black dark:bg-black dark:text-white" 
                                        : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                                )}>
                                    {i + 1}
                                </span>
                            </div>
                            {i < STEPS.length - 1 && <div className="w-12 h-[1px] bg-neutral-200 dark:bg-neutral-800 mx-4 hidden md:block" />}
                        </div>
                    ))}
                </div>

                <div className="grid lg:grid-cols-[1fr_400px] gap-12 items-start">
                    {/* Form Area */}
                    <div className="space-y-8">
                        {step === 1 && (
                            <div className="space-y-6 fade-in-up">
                                <div>
                                    <h1 className="text-3xl font-bold mb-2">Select a Studio</h1>
                                    <p className="text-muted-foreground">Choose the location nearest to you</p>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {studios.map(studio => (
                                        <div 
                                            key={studio.id}
                                            className={cn(
                                                "cursor-pointer p-6 rounded-xl border transition-all text-left",
                                                selectedStudioId === studio.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/30 bg-white dark:bg-neutral-900"
                                            )}
                                            onClick={() => setValue("studioId", studio.id)}
                                        >
                                            <h3 className="font-bold text-lg mb-1">{studio.name}</h3>
                                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                               <IconMapPin className="h-4 w-4 shrink-0 mt-0.5" />
                                               <span>{studio.address}, {studio.city}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6 fade-in-up">
                                <div>
                                    <h1 className="text-3xl font-bold mb-2">Select a Service</h1>
                                    <p className="text-muted-foreground">Choose your preferred session</p>
                                </div>
                                <div className="space-y-4">
                                    {serviceCategories.map(category => (
                                        <CategoryAccordion
                                            key={category.id}
                                            category={category}
                                            isOpen={openCategory === category.id}
                                            onToggle={() => setOpenCategory(openCategory === category.id ? null : category.id)}
                                            selectedServiceId={selectedServiceId}
                                            onSelect={(id) => setValue("serviceId", id)}
                                            onViewDetails={(s) => setViewingService(s)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 3 && selectedService && (
                            <div className="space-y-8 fade-in-up">
                                <div>
                                    <h1 className="text-3xl font-bold mb-2">Customize Session</h1>
                                    <p className="text-muted-foreground">Add extras to your booking</p>
                                </div>
                                
                                <div className="grid gap-6">
                                    {/* Extras */}
                                    {(selectedService.allowExtraOutfits || selectedService.allowExtraPics) && (
                                        <Card className="border-border/60 shadow-sm">
                                            <CardHeader className="bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-border/40 py-3">
                                                <CardTitle className="text-base">Extras</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-4 grid gap-4 sm:grid-cols-2">
                                                {selectedService.allowExtraOutfits && (
                                                    <CounterInput 
                                                        label="Extra Outfits"
                                                        price={selectedService.extraOutfitPrice}
                                                        value={extraOutfits}
                                                        onChange={(v) => setValue("extraOutfits", v)}
                                                    />
                                                )}
                                                {selectedService.allowExtraPics && (
                                                    <CounterInput 
                                                        label="Extra Pictures"
                                                        price={selectedService.extraPicPrice}
                                                        value={extraPics}
                                                        onChange={(v) => setValue("extraPics", v)}
                                                    />
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Addons */}
                                    {allAddons.length > 0 && (
                                        <Card className="border-border/60 shadow-sm">
                                            <CardHeader className="bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-border/40 py-3">
                                                <CardTitle className="text-base">Add-ons</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-4 space-y-2">
                                                {allAddons.map(addon => {
                                                    const isSelected = selectedAddonIds.includes(addon.id)
                                                    return (
                                                        <div 
                                                            key={addon.id}
                                                            className={cn(
                                                                "cursor-pointer p-3 rounded-lg border transition-all flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800",
                                                                isSelected ? "border-primary bg-primary/5" : "border-border"
                                                            )}
                                                            onClick={() => {
                                                                const current = selectedAddonIds
                                                                if (current.includes(addon.id)) setValue("addonIds", current.filter(id => id !== addon.id))
                                                                else setValue("addonIds", [...current, addon.id])
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center", isSelected ? "bg-primary border-primary text-white" : "border-muted-foreground")}>
                                                                    {isSelected && <IconCheck className="h-3 w-3" />}
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-sm">{addon.name}</p>
                                                                    <p className="text-xs text-muted-foreground">₦{Number(addon.displayPrice).toLocaleString()}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            </div>

                        )}
                        
                        {step === 3 && selectedService && !selectedService.allowExtraOutfits && !selectedService.allowExtraPics && allAddons.length === 0 && (
                             <div className="flex flex-col items-center justify-center py-12 text-center fade-in-up border border-dashed border-border rounded-xl">
                                  <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                                      <IconCheck className="h-6 w-6 text-neutral-500" />
                                  </div>
                                  <h3 className="font-semibold text-lg">All set!</h3>
                                  <p className="text-muted-foreground max-w-xs mx-auto mb-6">No additional customization required for this service.</p>
                                  <Button onClick={nextStep} variant="outline">Continue to Details</Button>
                             </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-8 fade-in-up">
                                <div>
                                    <h1 className="text-3xl font-bold mb-2">Scheduling & Details</h1>
                                    <p className="text-muted-foreground">Finalize your appointment</p>
                                </div>

                                {/* Date & Time */}
                                <Card className="border-border/60 shadow-sm">
                                    <CardHeader className="bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-border/40 py-3">
                                        <CardTitle className="text-base">Select Date & Time</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="grid lg:grid-cols-2 gap-8">
                                            <div className="flex justify-center border-r border-border/50 pr-4">
                                                <Calendar
                                                    mode="single"
                                                    selected={selectedDate}
                                                    onSelect={(d) => d && setValue("bookingDate", d)}
                                                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                                    className="rounded-md border shadow-sm"
                                                />
                                            </div>
                                            <div>
                                                <Label className="mb-3 block">Available Slots</Label>
                                                <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-2">
                                                    {TIME_SLOTS.map(time => (
                                                        <Button
                                                            key={time}
                                                            type="button"
                                                            variant={selectedTime === time ? "default" : "outline"}
                                                            onClick={() => setValue("bookingTime", time)}
                                                            className={cn("h-9 text-xs", selectedTime === time ? "bg-primary text-white" : "")}
                                                        >
                                                            {time}
                                                        </Button>
                                                    ))}
                                                </div>
                                                {errors.bookingTime && <p className="text-red-500 text-xs mt-2">{errors.bookingTime.message}</p>}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                
                                {/* Info */}
                                <Card className="border-border/60 shadow-sm">
                                    <CardHeader className="bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-border/40 py-3">
                                        <CardTitle className="text-base">Contact Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-4">
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Full Name</Label>
                                                <Input {...control.register("clientName")} placeholder="John Doe" className="bg-neutral-50 dark:bg-neutral-900" />
                                                {errors.clientName && <p className="text-red-500 text-xs">{errors.clientName.message}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Phone</Label>
                                                <Input {...control.register("clientPhone")} placeholder="0801234..." className="bg-neutral-50 dark:bg-neutral-900" />
                                                {errors.clientPhone && <p className="text-red-500 text-xs">{errors.clientPhone.message}</p>}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Email (Optional)</Label>
                                            <Input {...control.register("clientEmail")} placeholder="email@example.com" className="bg-neutral-50 dark:bg-neutral-900" />
                                            {errors.clientEmail && <p className="text-red-500 text-xs">{errors.clientEmail.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Notes</Label>
                                            <Textarea {...control.register("notes")} placeholder="Special requests..." className="bg-neutral-50 dark:bg-neutral-900" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}


                        {/* Navigation Buttons (Desktop Only) */}
                        <div className="hidden lg:flex gap-4 pt-4">
                            {step > 1 && (
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    className="h-12 px-8 rounded-xl"
                                    onClick={prevStep}
                                >
                                    <IconArrowLeft className="mr-2 h-4 w-4" /> Back
                                </Button>
                            )}
                            <Button 
                                type="button" 
                                className="h-12 px-8 rounded-xl ml-auto text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                                onClick={step === 4 ? handleSubmit(onSubmit) : nextStep}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>Processing...</>
                                ) : step === 4 ? (
                                    "Complete Booking"
                                ) : (
                                    <>Next Step <IconChevronRight className="ml-2 h-4 w-4" /></>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Summary Panel - Desktop */}
                    <div className="hidden lg:block relative">
                       <SummaryPanel 
                          studio={selectedStudio} 
                          service={selectedService} 
                          addons={selectedAddons} 
                          extraOutfits={extraOutfits}
                          extraPics={extraPics}
                          date={selectedDate}
                          time={selectedTime}
                       />
                    </div>
                </div>
            </div>

            {/* Mobile Summary & Nav */}
            <div className="lg:hidden pb-20">
               {/* Spacer for fixed bottom bar */}
            </div>
            <MobileSummaryBar 
               service={selectedService}
               total={
                  (selectedService?.displayPrice || 0) + 
                  (extraOutfits * (selectedService?.extraOutfitPrice || 0)) + 
                  (extraPics * (selectedService?.extraPicPrice || 0)) + 
                  selectedAddons.reduce((acc, curr) => acc + Number(curr.displayPrice), 0)
               }
               onNext={step === 4 ? handleSubmit(onSubmit) : nextStep}
               onBack={prevStep}
               step={step}
               isSubmitting={isSubmitting}
            />
            
            {/* Service Details Dialog */}
            <Dialog open={!!viewingService} onOpenChange={(open) => !open && setViewingService(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{viewingService?.name}</DialogTitle>
                        <DialogDescription>{viewingService?.description || "No description available."}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Price</span>
                            <span className="font-bold">₦{Number(viewingService?.displayPrice).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Duration</span>
                            <span className="font-medium">{viewingService?.sessionDuration} mins</span>
                        </div>
                         <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Outfits</span>
                            <span className="font-medium">{viewingService?.includesSessions} included</span>
                        </div>
                        {viewingService?.features && viewingService.features.length > 0 && (
                            <div className="space-y-2 pt-2 border-t text-sm">
                                <span className="font-semibold text-muted-foreground">Features</span>
                                <ul className="space-y-1">
                                    {viewingService.features.map((f, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <IconCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </main>
    </div>
  )
}
