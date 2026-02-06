import { Client, ClientType } from "./client"
import { Staff, StaffRole } from "./staff"
import { Booking } from "./booking"
import { Studio } from "./studio"
import { ServiceCategory, ServicePackage } from "./service"

// ==========================================
// GENERIC API RESPONSE WRAPPER
// ==========================================
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ==========================================
// CLIENT API RESPONSES
// ==========================================
export interface ClientsListResponse {
  clients: Client[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ClientDetailResponse extends Client {
  _count?: {
    bookings: number
  }
}

export interface CreateClientRequest {
  name: string
  phone: string
  email?: string | null
  address?: string | null
  type?: ClientType
  notes?: string | null
}

export interface UpdateClientRequest extends Partial<CreateClientRequest> {}

// ==========================================
// STAFF API RESPONSES
// ==========================================
export interface StaffListResponse {
  id: string
  name: string | null
  email: string
  role: StaffRole
  phone: string | null
  status: "Active" | "Inactive"
  studio?: string | null
  avatarUrl?: string | null
  createdAt: string
}

export interface InviteStaffRequest {
  name: string
  email: string
  phone?: string
  role: StaffRole
  studioId?: string
}

export interface InviteStaffResponse {
  success: boolean
  invitationId: string
  inviteLink: string
}

// ==========================================
// BOOKING API RESPONSES
// ==========================================
export interface BookingListResponse {
  bookings: BookingWithDetails[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface BookingWithDetails extends Booking {
  totalAmount: number
  _count?: {
    payments: number
    photos: number
  }
}

export interface CreateBookingRequest {
  clientId: string
  studioId: string
  bookingDate: string // ISO string
  photoCount?: number
  notes?: string | null
  tags?: string[]
  photographerId?: string | null
  items: {
    serviceId: string
    quantity: number
  }[]
}

export interface BookingConflictCheckRequest {
  bookingDate: string
  studioId: string
  excludeBookingId?: string
}

export interface BookingConflictCheckResponse {
  hasConflict: boolean
  conflicts: Array<{
    id: string
    clientName: string
    bookingDate: string
    timeDifferenceMinutes: number
  }>
}

// ==========================================
// SERVICE API RESPONSES
// ==========================================
export interface ServiceCategoryResponse {
  id: string
  name: string
  slug: string
  description: string | null
  services: ServiceResponse[]
}

export interface ServiceResponse {
  id: string
  name: string
  slug: string
  price: number
  salePrice: number | null
  duration: string | null
  location: "STUDIO" | "OUTDOOR" | "ON_LOCATION"
  features: string[]
  description?: string | null
  isActive: boolean
}

export interface CreateServiceCategoryRequest {
  title: string
  description?: string
}

export interface CreateServicePackageRequest {
  categoryId: string
  title: string
  price: number
  description?: string
  features: string[]
}

// ==========================================
// STUDIO API RESPONSES
// ==========================================
export interface StudioWithCounts extends Studio {
  _count?: {
    staff: number
    bookings: number
  }
}

export interface CreateStudioRequest {
  name: string
  city: string
  state: string
  address: string
  phone?: string
  email?: string
}

// ==========================================
// PAYMENT API RESPONSES
// ==========================================
export interface PaymentResponse {
  id: string
  bookingId: string
  amount: number
  method: "CASH" | "TRANSFER" | "POS" | "ONLINE"
  status: "PENDING" | "COMPLETED" | "FAILED"
  receiptNumber: string
  receiptUrl: string | null
  paymentDate: string
  recordedBy: {
    id: string
    name: string | null
  }
}

export interface CreatePaymentRequest {
  bookingId: string
  amount: number
  method: "CASH" | "TRANSFER" | "POS" | "ONLINE"
  notes?: string
}

export interface GeneratePaymentLinkRequest {
  bookingId: string
  amount: number
  description: string
}

export interface GeneratePaymentLinkResponse {
  success: boolean
  paymentLink: string
  reference: string
}

// ==========================================
// DASHBOARD API RESPONSES
// ==========================================
export interface DashboardStatsResponse {
  totalRevenue: number
  newClients: number
  totalBookings: number
  pendingBookings: number
  revenueGrowth: number // percentage
  clientGrowth: number
  bookingGrowth: number
}

// ==========================================
// ERROR RESPONSES (Standardized)
// ==========================================
export interface ApiError {
  error: string
  details?: unknown
  statusCode?: number
}

// ==========================================
// UTILITY TYPES
// ==========================================
export type ApiResult<T> = Promise<T | ApiError>

// Type guard for checking if response is error
export function isApiError(response: unknown): response is ApiError {
  return (
    typeof response === "object" &&
    response !== null &&
    "error" in response
  )
}