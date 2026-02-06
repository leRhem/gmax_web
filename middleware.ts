// middleware.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { PAGE_PERMISSIONS } from "@/lib/permissions"
import type { StaffRole } from "@/lib/generated/prisma"

/**
 * Get the subdomain from a hostname
 * @example getSubdomain("dash.gmaxstudioz.com") => "dash"
 * @example getSubdomain("www.gmaxstudioz.com") => "www"
 * @example getSubdomain("gmaxstudioz.com") => null
 * @example getSubdomain("localhost:3000") => null
 */
function getSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(":")[0]
  
  // For localhost development, check for subdomain simulation via query param or header
  if (host === "localhost" || host === "127.0.0.1") {
    return null // Handle in dev with query params if needed
  }
  
  const parts = host.split(".")
  
  // Check for subdomain (e.g., dash.gmaxstudioz.com has 3 parts)
  if (parts.length >= 3) {
    const subdomain = parts[0]
    // Don't treat www as a special subdomain for routing
    if (subdomain === "www") {
      return null
    }
    return subdomain
  }
  
  return null
}

/**
 * Subdomain to path prefix mapping
 */
const SUBDOMAIN_PATHS: Record<string, string> = {
  dash: "/dashboard",
  api: "/api",
  auth: "/login", // auth subdomain redirects to login
}

/**
 * Check if the user has access to the given path based on their role
 */
function hasAccess(userRole: StaffRole, pathname: string): boolean {
  // Find the most specific matching route
  const matchingRoutes = Object.keys(PAGE_PERMISSIONS)
    .filter((route) => pathname === route || pathname.startsWith(route + "/"))
    .sort((a, b) => b.length - a.length) // Sort by specificity (longest first)

  if (matchingRoutes.length === 0) {
    // No specific permission defined - allow access
    return true
  }

  const allowedRoles = PAGE_PERMISSIONS[matchingRoutes[0]]
  return allowedRoles.includes(userRole)
}

export default auth((req) => {
  const hostname = req.headers.get("host") || ""
  const subdomain = getSubdomain(hostname)
  let { pathname } = req.nextUrl
  
  // Track if we need to rewrite the URL at the end
  let rewritePath: string | null = null
  
  // Handle subdomain-based routing by calculating the rewrite path
  if (subdomain && SUBDOMAIN_PATHS[subdomain]) {
    // For 'dash' subdomain: map to /dashboard routes
    if (subdomain === "dash") {
      if (pathname === "/" || pathname === "") {
        rewritePath = "/dashboard"
        pathname = "/dashboard" // Update pathname for auth checks
      } else if (!pathname.startsWith("/dashboard")) {
        rewritePath = `/dashboard${pathname}`
        pathname = rewritePath // Update pathname for auth checks
      }
    }
    
    // For 'api' subdomain: map to /api routes
    if (subdomain === "api") {
      // Root of api subdomain returns API info
      if (pathname === "/" || pathname === "") {
        return NextResponse.json({
          name: "GMax Studioz API",
          version: "1.0.0",
          status: "healthy",
        })
      }
      if (!pathname.startsWith("/api")) {
        rewritePath = `/api${pathname}`
        pathname = rewritePath // Update pathname for auth checks
      }
    }
    
    // For 'auth' subdomain: map to /login
    if (subdomain === "auth") {
      if (pathname === "/" || pathname === "") {
        rewritePath = "/login"
        pathname = "/login" // Update pathname for auth checks
      }
    }
  }
  
  const isLoggedIn = !!req.auth

  // Public routes that don't require authentication
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/public") || // Public APIs for booking (includes rescheduling)
    pathname.startsWith("/api/receipt") || // Public API for receipt
    pathname.startsWith("/book") || // Public booking page
    pathname.startsWith("/confirm") || // Booking confirmation page
    pathname.startsWith("/delivery") || // Photo delivery portal
    pathname.startsWith("/pay") || // Public payment page
    pathname.startsWith("/receipt") || // Public receipt page
    pathname.startsWith("/academy") || // Public academy page
    pathname.startsWith("/works") || // Public portfolio
    pathname.startsWith("/store") // Public store

  // Check if this is an API route (protected API routes handle their own auth)
  const isApiRoute = pathname.startsWith("/api/")

  // If not logged in and trying to access protected route
  if (!isLoggedIn && !isPublicRoute) {
    // For API routes, return 401 JSON response instead of redirect
    if (isApiRoute) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    // For page routes, redirect to login
    // Use the main domain for login to avoid subdomain issues with cookies
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If logged in and trying to access login page
  if (isLoggedIn && pathname === "/login") {
    // Redirect to dashboard
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Role-based access control (only if logged in and on dashboard routes)
  if (isLoggedIn && req.auth?.user && pathname.startsWith("/dashboard")) {
    const userRole = req.auth.user.role as StaffRole

    if (!hasAccess(userRole, pathname)) {
      // Redirect to dashboard with unauthorized flag for toast
      const dashboardUrl = new URL("/dashboard", req.url)
      dashboardUrl.searchParams.set("unauthorized", "true")
      dashboardUrl.searchParams.set("attempted", pathname)
      return NextResponse.redirect(dashboardUrl)
    }
  }

  // If we have a rewrite path (from subdomain routing), apply it now
  if (rewritePath) {
    const url = req.nextUrl.clone()
    url.pathname = rewritePath
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, logo.png (public files)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
