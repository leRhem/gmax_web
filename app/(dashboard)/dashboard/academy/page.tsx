// app/(dashboard)/dashboard/academy/page.tsx
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { AcademyDashboard } from "./academy-dashboard"

export default async function AcademyPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/auth/login")
  }

  // Only Admin and Manager can access
  const allowedRoles = ["ADMIN", "MANAGER"]
  if (!allowedRoles.includes(session.user.role)) {
    redirect("/dashboard")
  }

  return (
    <AcademyDashboard 
      userRole={session.user.role}
      userStudioId={session.user.studioId}
    />
  )
}
