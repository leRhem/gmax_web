// app/(dashboard)/dashboard/analytics/page.tsx
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { AnalyticsDashboard } from "./analytics-dashboard"

export default async function AnalyticsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Check if user has access (Admin or Manager)
  const allowedRoles = ["ADMIN", "MANAGER"]
  if (!allowedRoles.includes(session.user.role)) {
    redirect("/dashboard")
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <AnalyticsDashboard 
        userRole={session.user.role} 
        userStudioId={session.user.studioId || null}
      />
    </div>
  )
}