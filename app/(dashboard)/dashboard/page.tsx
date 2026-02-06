import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { RecentBookings } from "@/components/dashboard/recent-bookings"
import { SectionCards } from "@/components/section-cards"
import { prisma } from "@/lib/prisma"
import { StaffOverview } from "./staff-overview"
import { startOfMonth, subMonths, format, subDays } from "date-fns"

import { Prisma } from "@/lib/generated/prisma"

// Define the type with includes
type RecentBookingRaw = Prisma.BookingGetPayload<{
  include: {
    client: true,
    items: { include: { service: true } },
    payments: true
  }
}>

async function getDashboardData() {
  const now = new Date()
  const firstDayChoosing = subDays(now, 90) // Last 90 days for chart

  // 1. Fetch Metrics Data
  const startOfCurrentMonth = startOfMonth(now)
  const startOfLastMonth = startOfMonth(subMonths(now, 1))

  const [
    currentMonthRevenue,
    lastMonthRevenue,
    newCustomers,
    lastMonthCustomers,
    activeBookings,
    bookingsCount,
    lastMonthBookingsCount,
    completedBookings,
    allPayments,
    allBookings
  ] = await Promise.all([
    // Revenue
    prisma.payment.aggregate({
      where: {
        status: "COMPLETED",
        createdAt: { gte: startOfCurrentMonth },
      },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        status: "COMPLETED",
        createdAt: { gte: startOfLastMonth, lt: startOfCurrentMonth },
      },
      _sum: { amount: true },
    }),

    // Customers
    prisma.client.count({
      where: { createdAt: { gte: startOfCurrentMonth } },
    }),
    prisma.client.count({
      where: {
        createdAt: { gte: startOfLastMonth, lt: startOfCurrentMonth },
      },
    }),

    // Active Bookings
    prisma.booking.count({
      where: {
        bookingStatus: { in: ["CONFIRMED", "PENDING_CONFIRMATION"] },
        bookingDate: { gte: now },
      },
    }),

    // Bookings Growth
    prisma.booking.count({
      where: { createdAt: { gte: startOfCurrentMonth } },
    }),
    prisma.booking.count({
      where: {
        createdAt: { gte: startOfLastMonth, lt: startOfCurrentMonth },
      },
    }),
    
    // Completion Rate
    prisma.booking.count({ where: { bookingStatus: "COMPLETED" } }),

    // Chart Data Sources (Fetch last 90 days once)
    prisma.payment.findMany({
        where: { status: "COMPLETED", createdAt: { gte: firstDayChoosing } },
        select: { createdAt: true, amount: true }
    }),
    prisma.booking.findMany({
        where: { createdAt: { gte: firstDayChoosing } },
        select: { createdAt: true }
    })
  ])

  // 2. Calculations
  const totalRevenue = Number(currentMonthRevenue._sum.amount ?? 0)
  const lastMonthRev = Number(lastMonthRevenue._sum.amount ?? 0)

  // Revenue Growth Fix: Handle 0/0 and 0/X cases
  let revenueGrowth = 0
  if (lastMonthRev === 0 && totalRevenue === 0) {
      revenueGrowth = 0
  } else if (lastMonthRev === 0 && totalRevenue > 0) {
      revenueGrowth = 100 // Treat as 100% (or infinite) growth
  } else {
      revenueGrowth = ((totalRevenue - lastMonthRev) / lastMonthRev) * 100
  }

  const customerGrowth = lastMonthCustomers === 0 
    ? newCustomers > 0 ? 100 : 0 
    : ((newCustomers - lastMonthCustomers) / lastMonthCustomers) * 100

  const bookingsGrowth = lastMonthBookingsCount === 0
    ? bookingsCount > 0 ? 100 : 0
    : ((bookingsCount - lastMonthBookingsCount) / lastMonthBookingsCount) * 100
    
  const totalBookingsAllTime = await prisma.booking.count()
  const completionRate = totalBookingsAllTime === 0 ? 0 : Math.round((completedBookings / totalBookingsAllTime) * 100)

  // 3. Generat Chart Data
  const chartMap = new Map<string, { revenue: number; bookings: number }>()

  allPayments.forEach(p => {
      const key = format(p.createdAt, "yyyy-MM-dd")
      const curr = chartMap.get(key) || { revenue: 0, bookings: 0 }
      curr.revenue += Number(p.amount)
      chartMap.set(key, curr)
  })

  allBookings.forEach(b => {
      const key = format(b.createdAt, "yyyy-MM-dd")
      const curr = chartMap.get(key) || { revenue: 0, bookings: 0 }
      curr.bookings += 1
      chartMap.set(key, curr)
  })

  const chartData = []
  // Loop 90 days: i < 90 creates exactly 90 points
  for (let i = 0; i < 90; i++) {
    const date = subDays(now, 89 - i) // 0 to 89 days ago
    const dateStr = format(date, "MMM d")
    const key = format(date, "yyyy-MM-dd")
    const data = chartMap.get(key) || { revenue: 0, bookings: 0 }

    chartData.push({
      date: dateStr,
      revenue: data.revenue,
      bookings: data.bookings,
    })
  }
  
  // 3. Recent Bookings needs explicit typing
  const recentBookingsRaw = await prisma.booking.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
        client: true,
        items: { include: { service: true } },
        payments: true
    }
  }) as RecentBookingRaw[]
  
  const recentBookings = recentBookingsRaw.map((b) => {
      const totalPaid = (b.payments || []).filter((p) => p.status === "COMPLETED").reduce((sum, p) => sum + Number(p.amount), 0)
      const totalAmount = (b.items || []).reduce((sum, item) => sum + Number(item.priceSnapshot) * item.quantity, 0)
      const isPaid = totalPaid >= totalAmount
      
      return {
          id: b.id,
          clientName: b.client.name,
          clientEmail: b.client.email,
          serviceName: b.items.length === 0 
              ? "No Services" 
              : b.items.length > 1 
                  ? "Multiple Services" 
                  : b.items[0]?.service?.name ?? "Unknown Service",
          date: b.bookingDate,
          status: b.bookingStatus,
          amount: totalAmount,
          isPaid
      }
  })

  return {
    metrics: {
        totalRevenue: totalRevenue,
        revenueGrowth: Math.round(revenueGrowth),
        newCustomers: newCustomers,
        customerGrowth: Math.round(customerGrowth),
        activeBookings: activeBookings,
        bookingsGrowth: Math.round(bookingsGrowth),
        completionRate: completionRate,
        completionGrowth: 0
    },
    chartData,
    recentBookings
  }
}

export default async function Page() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Admin sees full dashboard, others see staff overview
  if (session.user.role !== "ADMIN") {
    return <StaffOverview />
  }

  const { metrics, chartData, recentBookings } = await getDashboardData()

  // Admin dashboard
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <SectionCards metrics={metrics} />
          <div className="px-4 lg:px-6">
            <ChartAreaInteractive data={chartData} />
          </div>
          <div className="px-4 lg:px-6">
             <RecentBookings bookings={recentBookings} />
          </div>
        </div>
      </div>
    </div>
  )
}
