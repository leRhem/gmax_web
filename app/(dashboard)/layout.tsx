import type { Metadata } from "next"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { UnauthorizedHandler } from "@/components/unauthorized-handler"

export const metadata: Metadata = {
  title: "GMAX Studio - Dashboard",
  description: "Photography Studio Management System",
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Get session (middleware already protects this route)
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar
          variant="inset"
          user={{
            name: session.user.name || null,
            email: session.user.email || "",
            image: session.user.image || null,
            role: session.user.role,
          }}
        />
        <SidebarInset>
          <SiteHeader />
          {children}
        </SidebarInset>
      </SidebarProvider>
      <Suspense fallback={null}>
        <UnauthorizedHandler />
      </Suspense>
    </>
  )
}
