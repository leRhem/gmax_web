import { Suspense } from "react"
import { BookingsView } from "@/components/bookings/bookings-view"
import { Skeleton } from "@/components/ui/skeleton"

export const dynamic = "force-dynamic"

type Props = {
  searchParams: Promise<{
    view?: string
    page?: string
    clientId?: string
    photographerId?: string
    status?: string
    startDate?: string
    endDate?: string
  }>
}

export default async function BookingsPage({ searchParams }: Props) {
  // Await the searchParams (Next.js 15 requirement)
  const params = await searchParams

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground text-sm">
            Manage your photography bookings and schedule
          </p>
        </div>
      </div>

      <Suspense fallback={<BookingsViewSkeleton />}>
        <BookingsView searchParams={params} />
      </Suspense>
    </div>
  )
}

function BookingsViewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[120px]" />
        <Skeleton className="ml-auto h-10 w-[140px]" />
      </div>
      <Skeleton className="h-[600px] w-full" />
    </div>
  )
}