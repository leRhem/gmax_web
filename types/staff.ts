import { Studio } from "./studio"

export type StaffRole = 
  | "ADMIN" 
  | "MANAGER" 
  | "RECEPTIONIST" 
  | "VIDEO_EDITOR" 
  | "PHOTO_EDITOR" 
  | "VIDEOGRAPHER" 
  | "PHOTOGRAPHER" 
  | "STAFF"

export interface Staff {
  id: string
  name: string | null
  email: string
  role: StaffRole
  studioId: string | null
  studio?: Studio
  isActive: boolean
  image: string | null
  acceptedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface StaffInvitation {
  id: string
  email: string
  name: string
  role: StaffRole
  studioId: string | null
  token: string
  expiresAt: string
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED"
  invitedById: string
  createdAt: string
}
  
  export interface StaffMember {
    id: string
    name: string
    avatar?: string
  }