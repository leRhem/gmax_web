import { Client } from "./client"
import { Studio } from "./studio"

// Enums matching database
export type BookingStatus = "CONFIRMED" | "COMPLETED" | "CANCELLED"
export type PaymentStatus = "PENDING" | "PARTIAL" | "COMPLETED" | "FAILED" | "REFUNDED"
export type DeliveryStatus = "PENDING" | "EDITING" | "READY" | "DELIVERED"

// Service item in booking
export interface BookingItem {
  id: string
  serviceId: string
  service: {
    id: string
    name: string
    slug: string
    price: number
  }
  priceSnapshot: number // Price at time of booking
  quantity: number
  createdAt: string
}

// Photographer assignment
export interface BookingPhotographer {
  id: string
  name: string | null
  email: string
  image: string | null
}

// Main Booking interface (matches Prisma exactly)
export interface Booking {
  id: string
  clientId: string
  studioId: string
  bookingDate: string // ISO string
  photoCount: number
  notes: string | null
  tags: string[]
  bookingStatus: BookingStatus
  paymentStatus: PaymentStatus
  deliveryStatus: DeliveryStatus
  photographerId: string | null
  googleEventId: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

// Booking with all relations loaded (for detail views)
export interface BookingWithRelations extends Booking {
  client: Client
  studio: Studio
  photographer: BookingPhotographer | null
  creator: BookingPhotographer
  items: BookingItem[]
  _count?: {
    payments: number
    photos: number
  }
}

// Booking with computed fields for table display
export interface BookingDisplay {
  id: string
  clientId: string
  clientName: string
  clientEmail: string | null
  date: string // ISO string
  status: BookingStatus
  paymentStatus: PaymentStatus
  totalAmount: number
  amountPaid?: number
  items: Array<{
    title: string
    price: number
    quantity: number
  }>
  assignedStaffId: string | null | undefined
  assignedStaffName?: string | null
  downloadStatus: "Downloaded" | "Pending" | "No Assets"
  tags: string[]
}

// Booking calendar event format
export interface BookingCalendarEvent {
  id: string
  title: string // Client name
  start: Date
  end: Date
  backgroundColor: string
  borderColor: string
  extendedProps: {
    bookingId: string
    clientName: string
    clientPhone: string
    status: BookingStatus
    paymentStatus: PaymentStatus
    photographerId: string | null
    photographerName: string | null
    serviceName: string
    totalAmount: number
    notes: string | null
  }
}

// Form data for creating/updating bookings
export interface BookingFormData {
  clientId: string
  studioId: string
  bookingDate: string // ISO string
  photoCount?: number
  notes?: string
  tags?: string[]
  photographerId?: string | null
  items: Array<{
    serviceId: string
    quantity: number
  }>
}

// Helper functions
export function calculateBookingTotal(items: BookingItem[]): number {
  return items.reduce((sum, item) => sum + (item.priceSnapshot * item.quantity), 0)
}

export function getBookingStatusColor(status: BookingStatus): string {
  const colors = {
    CONFIRMED: "bg-green-100 text-green-700 border-green-200",
    COMPLETED: "bg-blue-100 text-blue-700 border-blue-200",
    CANCELLED: "bg-red-100 text-red-700 border-red-200"
  }
  return colors[status] || "bg-gray-100 text-gray-700 border-gray-200"
}

export function getPaymentStatusColor(status: PaymentStatus): string {
  const colors = {
    PENDING: "bg-orange-100 text-orange-700 border-orange-200",
    PARTIAL: "bg-blue-100 text-blue-700 border-blue-200",
    COMPLETED: "bg-green-100 text-green-700 border-green-200",
    FAILED: "bg-red-100 text-red-700 border-red-200",
    REFUNDED: "bg-gray-100 text-gray-700 border-gray-200"
  }
  return colors[status] || "bg-gray-100 text-gray-700 border-gray-200"
}

// Convert DB booking to display format
export function toBookingDisplay(booking: BookingWithRelations, payments?: number): BookingDisplay {
  const totalAmount = calculateBookingTotal(booking.items)
  
  return {
    id: booking.id,
    clientId: booking.clientId,
    clientName: booking.client.name,
    clientEmail: booking.client.email,
    date: booking.bookingDate,
    status: booking.bookingStatus,
    paymentStatus: booking.paymentStatus,
    totalAmount,
    amountPaid: payments || 0,
    items: booking.items.map(item => ({
      title: item.service.name,
      price: item.priceSnapshot,
      quantity: item.quantity
    })),
    assignedStaffId: booking.photographerId,
    assignedStaffName: booking.photographer?.name,
    downloadStatus: booking.deliveryStatus === "DELIVERED" ? "Downloaded" : 
                    booking._count?.photos ? "Pending" : "No Assets",
    tags: booking.tags
  }
}

// Type guards
export function isBooking(obj: unknown): obj is Booking {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "clientId" in obj &&
    "bookingDate" in obj
  )
}