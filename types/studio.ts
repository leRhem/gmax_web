export interface Studio {
    id: string
    name: string
    slug: string
    city: string
    state: string
    country: string
    address: string
    phone: string | null
    email: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
  }