// auth.config.ts
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import type { StaffRole } from "@/types/staff"

// Validation schema for login
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export default {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          // IMPORTANT: Dynamic imports to avoid Edge Runtime issues
          const bcrypt = await import("bcryptjs")
          const { prisma } = await import("@/lib/prisma")
          
          // Validate input
          const { email, password } = loginSchema.parse(credentials)

          // Find staff member by email
          const staff = await prisma.staff.findUnique({
            where: { email: email.toLowerCase() },
            include: { studio: true },
          })

          // Check if staff exists and is active
          if (!staff || !staff.isActive) {
            return null
          }

          // Check if password is set (account accepted invitation)
          if (!staff.password) {
            throw new Error("Please accept your invitation first")
          }

          // Verify password
          const isValid = await bcrypt.compare(password, staff.password)
          if (!isValid) {
            return null
          }

          // Return user object for session
          return {
            id: staff.id,
            name: staff.name,
            email: staff.email,
            image: staff.image,
            role: staff.role as StaffRole,
            studioId: staff.studioId,
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
      const isOnLogin = nextUrl.pathname === "/login"

      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false // Redirect unauthenticated users to login page
      } else if (isLoggedIn && isOnLogin) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }
      return true
    },
    async jwt({ token, user }) {
      // Add custom fields to JWT token
      if (user) {
        token.id = user.id
        token.role = user.role as StaffRole
        token.studioId = user.studioId
      }
      return token
    },
    async session({ session, token }) {
      // Add custom fields to session
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as StaffRole
        session.user.studioId = token.studioId as string | null
      }
      return session
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-authjs.session-token" 
        : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        // Enable cross-subdomain cookies in production
        domain: process.env.NODE_ENV === "production" 
          ? ".gmaxstudioz.com"  // Note: leading dot allows all subdomains
          : undefined,
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-authjs.callback-url"
        : "authjs.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NODE_ENV === "production"
          ? ".gmaxstudioz.com"
          : undefined,
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Host-authjs.csrf-token"
        : "authjs.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        // CSRF token uses __Host- prefix which doesn't allow domain attribute
      },
    },
  },
  secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig