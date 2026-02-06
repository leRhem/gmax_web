// app/(dashboard)/dashboard/staff-overview.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, isToday, isTomorrow } from "date-fns"
import {
  IconCalendarEvent,
  IconClock,
  IconUser,
  IconPhone,
  IconCheck,
  IconCamera,
  IconTruck,
  IconCalendarStats,
  IconArrowRight,
} from "@tabler/icons-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

interface StaffInfo {
  id: string
  name: string | null
  email: string
  role: string
  image: string | null
  studio: { id: string; name: string; city: string } | null
}

interface BookingItem {
  id: string
  bookingDate: string
  clientName: string
  clientPhone?: string
  services: string
  status: string
}

interface OverviewData {
  staff: StaffInfo
  todaysBookings: BookingItem[]
  upcomingBookings: BookingItem[]
  stats: {
    myAssignedToday: number
    myAssignedThisWeek: number
    myCompletedThisWeek: number
    myCompletedThisMonth: number
    myPendingDelivery: number
  }
  studioStats: { todayBookings: number; weekBookings: number } | null
}

export function StaffOverview() {
  const router = useRouter()
  const [data, setData] = useState<OverviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchOverview()
  }, [])

  const fetchOverview = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/staff/overview")
      if (response.ok) {
        const result = (await response.json()) as any
        setData(result)
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      CONFIRMED: "bg-blue-500",
      PENDING_CONFIRMATION: "bg-yellow-500",
      COMPLETED: "bg-green-500",
      CANCELLED: "bg-red-500",
    }
    return (
      <Badge className={styles[status] || "bg-gray-500"}>
        {status.replace(/_/g, " ")}
      </Badge>
    )
  }

  const formatBookingDate = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isToday(date)) return `Today at ${format(date, "h:mm a")}`
    if (isTomorrow(date)) return `Tomorrow at ${format(date, "h:mm a")}`
    return format(date, "EEE, MMM d 'at' h:mm a")
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 lg:p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  const { staff, todaysBookings, upcomingBookings, stats, studioStats } = data

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={staff.image || undefined} />
            <AvatarFallback className="text-xl">
              {(staff.name || staff.email)?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, {staff.name || staff.email.split("@")[0]}!
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {staff.role.replace(/_/g, " ").toLowerCase()}
              </Badge>
              {staff.studio && (
                <span className="text-sm">• {staff.studio.name}, {staff.studio.city}</span>
              )}
            </p>
          </div>
        </div>
        <Button onClick={() => router.push("/dashboard/tasks")}>
          <IconCalendarStats className="h-4 w-4 mr-2" />
          View All Tasks
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sessions</CardTitle>
            <IconCalendarEvent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.myAssignedToday}</div>
            <p className="text-xs text-muted-foreground">
              {studioStats && `${studioStats.todayBookings} total in studio`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <IconCamera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.myAssignedThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              {stats.myCompletedThisWeek} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed This Month</CardTitle>
            <IconCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.myCompletedThisMonth}</div>
            <p className="text-xs text-muted-foreground">Sessions done</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Delivery</CardTitle>
            <IconTruck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.myPendingDelivery}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconClock className="h-5 w-5" />
            Today's Schedule
          </CardTitle>
          <CardDescription>
            {todaysBookings.length === 0
              ? "No sessions scheduled for today"
              : `${todaysBookings.length} session${todaysBookings.length > 1 ? "s" : ""} today`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todaysBookings.length > 0 ? (
            <div className="space-y-4">
              {todaysBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/bookings/${booking.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <IconUser className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{booking.clientName}</p>
                      <p className="text-sm text-muted-foreground">{booking.services}</p>
                      {booking.clientPhone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <IconPhone className="h-3 w-3" />
                          {booking.clientPhone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{format(new Date(booking.bookingDate), "h:mm a")}</p>
                    {getStatusBadge(booking.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <IconCalendarEvent className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No sessions scheduled for today</p>
              <p className="text-sm">Enjoy your free time!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Sessions */}
      {upcomingBookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Sessions</CardTitle>
            <CardDescription>Next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/bookings/${booking.id}`)}
                >
                  <div>
                    <p className="font-medium">{booking.clientName}</p>
                    <p className="text-sm text-muted-foreground">{booking.services}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{formatBookingDate(booking.bookingDate)}</p>
                    {getStatusBadge(booking.status)}
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              className="w-full mt-4"
              onClick={() => router.push("/dashboard/tasks")}
            >
              View all assignments
              <IconArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
