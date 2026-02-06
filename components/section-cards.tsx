import { IconCurrencyNaira, IconTrendingDown, IconTrendingUp, IconUsers, IconCalendarEvent, IconActivity } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface DashboardMetrics {
  totalRevenue: number
  revenueGrowth: number
  newCustomers: number
  customerGrowth: number
  activeBookings: number
  bookingsGrowth: number
  completionRate: number
  completionGrowth: number
}

export function SectionCards({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Revenue</CardDescription>
          <CardTitle className="flex text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            <IconCurrencyNaira size={32} className="mt-1" />
            {metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={metrics.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}>
              {metrics.revenueGrowth >= 0 ? <IconTrendingUp className="mr-1 size-3" /> : <IconTrendingDown className="mr-1 size-3" />}
              {Math.abs(metrics.revenueGrowth)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {metrics.revenueGrowth >= 0 ? "Trending up" : "Trending down"} this month
          </div>
          <div className="text-muted-foreground">
            Total revenue from all studios
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>New Clients</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {metrics.newCustomers.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={metrics.customerGrowth >= 0 ? "text-green-600" : "text-red-600"}>
              {metrics.customerGrowth >= 0 ? <IconTrendingUp className="mr-1 size-3" /> : <IconTrendingDown className="mr-1 size-3" />}
              {Math.abs(metrics.customerGrowth)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <IconUsers className="size-4" /> New signups
          </div>
          <div className="text-muted-foreground">
            New clients this month
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Bookings</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {metrics.activeBookings.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={metrics.bookingsGrowth >= 0 ? "text-green-600" : "text-red-600"}>
               {metrics.bookingsGrowth >= 0 ? <IconTrendingUp className="mr-1 size-3" /> : <IconTrendingDown className="mr-1 size-3" />}
              {Math.abs(metrics.bookingsGrowth)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
             <IconCalendarEvent className="size-4" /> Current sessions
          </div>
          <div className="text-muted-foreground">Bookings in progress or confirmed</div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Completion Rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {metrics.completionRate}%
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconActivity className="mr-1 size-3" />
              Stable
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Successful sessions
          </div>
          <div className="text-muted-foreground">Ratio of completed bookings</div>
        </CardFooter>
      </Card>
    </div>
  )
}
