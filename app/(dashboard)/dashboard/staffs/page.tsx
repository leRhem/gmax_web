// app/(dashboard)/dashboard/staffs/page.tsx
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { StaffTable } from "@/components/staff/staff-table"

export default async function StaffsPage() {
  const session = await auth()
  
  if (session?.user?.role !== "ADMIN") {
    redirect("/dashboard")
  }
  
  return <StaffTable />
}