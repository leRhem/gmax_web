// app/(dashboard)/dashboard/studios/page.tsx
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { StudiosDashboard } from "./studios-dashboard"

export default async function StudiosPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Only Admin can view Studios comparison page
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <StudiosDashboard />
    </div>
  )
}