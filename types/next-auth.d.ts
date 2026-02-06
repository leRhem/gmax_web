import { DefaultSession } from "next-auth"
import { StaffRole } from "@/types/staff"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: StaffRole
      studioId: string | null
    } & DefaultSession["user"]
  }

  interface User {
    role: StaffRole
    studioId: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: StaffRole
    studioId: string | null
  }
}