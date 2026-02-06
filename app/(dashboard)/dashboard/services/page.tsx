import { Suspense } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { ServicesTable } from "@/components/services/services-table"
import { Skeleton } from "@/components/ui/skeleton"

export default async function ServicesPage() {
  const session = await auth()

  if (!session?.user || !["ADMIN", "MANAGER"].includes(session.user.role || "")) {
    redirect("/dashboard")
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">

      {/* Services Table */}
      <Suspense fallback={<ServicesTableSkeleton />}>
        <ServicesTable />
      </Suspense>
    </div>
  )
}

function ServicesTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-[200px]" />
          <Skeleton className="h-10 w-[160px]" />
        </div>
        <Skeleton className="h-10 w-[120px]" />
      </div>
      <Skeleton className="h-[400px] rounded-lg" />
    </div>
  )
}