// app/(dashboard)/dashboard/analytics/analytics-dashboard.tsx
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import {
  IconChartBar,
  IconChartPie,
  IconCalendarStats,
  IconUsers,
  IconCurrencyNaira,
  IconTrendingUp,
  IconBriefcase,
  IconRefresh,
  IconBuilding,
} from "@tabler/icons-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

interface Analytics {
  period: {
    year: number
    month: number | null
    startDate: string
    endDate: string
  }
  kpis: {
    totalBookings: number
    completedBookings: number
    pendingBookings: number
    totalValue: number
    collectedRevenue: number
    outstandingBalance: number
    newClients: number
    avgBookingValue: number
    completionRate: number
  }
  charts: {
    monthlyTrend: Array<{
      month: string
      monthIndex: number
      bookings: number
      revenue: number
    }>
    statusBreakdown: Array<{
      status: string
      count: number
    }>
    paymentBreakdown: Array<{
      status: string
      count: number
    }>
  }
  topServices: Array<{
    serviceId: string
    serviceName: string
    bookingCount: number
    totalQuantity: number
    totalRevenue: number
  }>
  studioId: string
}

interface Studio {
  id: string
  name: string
  city: string
}

interface AnalyticsDashboardProps {
  userRole: string
  userStudioId: string | null
}

export function AnalyticsDashboard({ userRole, userStudioId }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [studios, setStudios] = useState<Studio[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<string>("all")
  const [selectedStudio, setSelectedStudio] = useState<string>("all")

  const isAdmin = userRole === "ADMIN"
  const abortControllerRef = useRef<AbortController | null>(null)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const months = [
    { value: "all", label: "Full Year" },
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ]

  useEffect(() => {
    if (isAdmin) {
      fetchStudios()
    }
  }, [isAdmin])

  useEffect(() => {
    const controller = new AbortController()
    fetchAnalytics(controller.signal)
    return () => controller.abort()
  }, [selectedYear, selectedMonth, selectedStudio])

  const fetchStudios = async () => {
    try {
      const response = await fetch("/api/studios")
      if (response.ok) {
        const data = (await response.json()) as any
        setStudios(data.studios || [])
      }
    } catch (error) {
      console.error("Fetch studios error:", error)
    }
  }

  const fetchAnalytics = async (signal?: AbortSignal) => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        ...(selectedMonth !== "all" && { month: selectedMonth }),
        ...(selectedStudio !== "all" && { studioId: selectedStudio }),
      })

      const response = await fetch(`/api/analytics?${params}`, { signal })
      if (signal?.aborted) return
      if (response.ok) {
        const data = (await response.json()) as any
        setAnalytics(data)
      } else {
        throw new Error("Failed to fetch analytics")
      }
    } catch (error: any) {
      if (error?.name === "AbortError") return
      console.error("Fetch analytics error:", error)
      toast.error("Failed to load analytics")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller
    fetchAnalytics(controller.signal)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING_CONFIRMATION: "bg-yellow-500",
      CONFIRMED: "bg-blue-500",
      COMPLETED: "bg-green-500",
      CANCELLED: "bg-red-500",
      PENDING: "bg-yellow-500",
      PARTIAL: "bg-orange-500",
      PAID: "bg-green-500",
    }
    return colors[status] || "bg-gray-500"
  }

  const getMaxRevenue = () => {
    if (!analytics) return 0
    return Math.max(...analytics.charts.monthlyTrend.map((m) => m.revenue), 1)
  }

  if (isLoading && !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <IconChartBar className="h-8 w-8" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            {selectedMonth === "all"
              ? `Full year ${selectedYear} performance`
              : `${months.find((m) => m.value === selectedMonth)?.label} ${selectedYear}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && studios.length > 0 && (
            <Select value={selectedStudio} onValueChange={setSelectedStudio}>
              <SelectTrigger className="w-[180px]">
                <IconBuilding className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Studios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Studios</SelectItem>
                {studios.map((studio) => (
                  <SelectItem key={studio.id} value={studio.id}>
                    {studio.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading} aria-label="Refresh analytics">
            <IconRefresh className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {analytics && (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <IconCalendarStats className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.kpis.totalBookings}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">
                    {analytics.kpis.completedBookings} completed
                  </Badge>
                  <Badge variant="outline">{analytics.kpis.completionRate}% rate</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue Collected</CardTitle>
                <IconCurrencyNaira className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics.kpis.collectedRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Outstanding: {formatCurrency(analytics.kpis.outstandingBalance)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Clients</CardTitle>
                <IconUsers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.kpis.newClients}</div>
                <p className="text-xs text-muted-foreground">Registered this period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Booking Value</CardTitle>
                <IconTrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics.kpis.avgBookingValue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total value: {formatCurrency(analytics.kpis.totalValue)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Monthly Revenue Trend */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconChartBar className="h-5 w-5" />
                  Monthly Revenue Trend
                </CardTitle>
                <CardDescription>Revenue collected each month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-end gap-1">
                  {analytics.charts.monthlyTrend.map((month) => {
                    const height = (month.revenue / getMaxRevenue()) * 100
                    const isCurrentMonth = month.monthIndex === new Date().getMonth() + 1 
                      && selectedYear === new Date().getFullYear()
                    return (
                      <div
                        key={month.month}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div className="w-full relative group">
                          <div
                            className={`w-full rounded-t transition-all ${
                              isCurrentMonth ? "bg-primary" : "bg-primary/60"
                            } hover:bg-primary`}
                            style={{ height: `${Math.max(height, 2)}%`, minHeight: "4px" }}
                          />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover border rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {formatCurrency(month.revenue)}
                            <br />
                            {month.bookings} bookings
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{month.month}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconChartPie className="h-5 w-5" />
                  Booking Status
                </CardTitle>
                <CardDescription>Distribution by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.charts.statusBreakdown.length > 0 ? (
                    analytics.charts.statusBreakdown.map((status) => {
                      const total = analytics.charts.statusBreakdown.reduce((s, i) => s + i.count, 0)
                      const percentage = total > 0 ? Math.round((status.count / total) * 100) : 0
                      return (
                        <div key={status.status} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="capitalize">
                              {status.status.replace(/_/g, " ").toLowerCase()}
                            </span>
                            <span className="font-medium">{status.count}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getStatusColor(status.status)}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No data</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconBriefcase className="h-5 w-5" />
                Top Services
              </CardTitle>
              <CardDescription>Most booked services this period</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.topServices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead className="text-right">Bookings</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.topServices.map((service, index) => (
                      <TableRow key={service.serviceId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                              {index + 1}
                            </Badge>
                            {service.serviceName}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{service.bookingCount}</TableCell>
                        <TableCell className="text-right">{service.totalQuantity}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(service.totalRevenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No services data available for this period
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
