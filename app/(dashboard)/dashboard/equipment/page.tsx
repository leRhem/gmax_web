// app/(dashboard)/dashboard/equipment/page.tsx
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { EquipmentDashboard } from "./equipment-dashboard"

export default async function EquipmentPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <EquipmentDashboard
        userRole={session.user.role as string}
        userStudioId={session.user.studioId as string | undefined}
      />
    </div>
  )
}
