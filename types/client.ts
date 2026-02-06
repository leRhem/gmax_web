export type ClientType = "STANDARD" | "VIP" | "VVIP" | "CORPORATE"

export interface Client {
  id: string
  name: string
  phone: string
  email: string | null
  address: string | null
  notes: string | null
  type: ClientType // ✅ Now matches DB (single value, not array)
  createdAt: string
  updatedAt: string
}

// Extended client with bookings (for detail views)
export interface ClientWithBookings extends Client {
  bookings: Array<{
    id: string
    bookingDate: string
    bookingStatus: string
    paymentStatus: string
    totalAmount: number
  }>
  _count?: {
    bookings: number
  }
}

// UI Display type (for tables that need extra computed fields)
export interface ClientDisplay extends Client {
  // Add any computed fields here
  displayType: string // e.g., "VIP ⭐" for UI badges
  totalSpent?: number
  lastBookingDate?: string | null
}

// Form data type (for create/update operations)
export interface ClientFormData {
  name: string
  phone: string
  email?: string
  address?: string
  type: ClientType
  notes?: string
}

// Helper function to convert DB client to display format
export function toClientDisplay(client: Client): ClientDisplay {
  return {
    ...client,
    displayType: getDisplayType(client.type),
  }
}

function getDisplayType(type: ClientType): string {
  const icons = {
    STANDARD: "Standard",
    VIP: "VIP ⭐",
    VVIP: "VVIP 👑",
    CORPORATE: "Corporate 🏢"
  }
  return icons[type] || type
}

// Type guard
export function isClient(obj: unknown): obj is Client {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "name" in obj &&
    "phone" in obj &&
    "type" in obj
  )
}