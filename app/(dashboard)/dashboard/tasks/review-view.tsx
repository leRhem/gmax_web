"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, formatDistanceToNow } from "date-fns"
import {
  IconPhoto,
  IconRefresh,
  IconBuilding,
  IconUser,
  IconClock,
  IconFilter,
  IconEye,
  IconCheck,
} from "@tabler/icons-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BookingPhotos } from "@/components/bookings/booking-photos"

interface Studio {
  id: string
  name: string
  city: string
}

interface ReviewBooking {
  id: string
  bookingDate: string
  client: { name: string; phone: string | null }
  studio: Studio
  photographer: { id: string; name: string | null; email: string } | null
  services: string
  pendingPhotos: number
  totalPhotos: number
  oldestUpload: string | null
}

interface ReviewData {
  bookings: ReviewBooking[]
  stats: { totalBookings: number; totalPendingPhotos: number }
  studios: Studio[]
}

interface ReviewDashboardProps {
  userRole: string
  userStudioId?: string
}

export function ReviewView({ userRole, userStudioId }: ReviewDashboardProps) {
  const router = useRouter()
  const [data, setData] = useState<ReviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [studioFilter, setStudioFilter] = useState("all")
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)

  useEffect(() => {
    fetchReviewQueue()
  }, [studioFilter])

  const fetchReviewQueue = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (studioFilter !== "all") params.set("studioId", studioFilter)

      const response = await fetch(`/api/admin/review?${params.toString()}`)
      if (response.ok) {
        const result = (await response.json()) as any
        setData(result)
      } else {
        const errorData = (await response.json().catch(() => ({}))) as any
        console.error("Review queue error:", errorData)
        setData(null)
      }
    } catch (error) {
      console.error("Error:", error)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <IconPhoto className="h-8 w-8" />
            Asset Review Queue
          </h1>
          <p className="text-muted-foreground mt-1">
            {userRole === "ADMIN"
              ? "Review and approve uploaded photos across all studios"
              : "Review and approve uploaded photos for your studio"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {userRole === "ADMIN" && data?.studios && (
            <Select value={studioFilter} onValueChange={setStudioFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by studio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Studios</SelectItem>
                {data.studios.map((studio) => (
                  <SelectItem key={studio.id} value={studio.id}>
                    {studio.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="icon" onClick={fetchReviewQueue} disabled={isLoading}>
            <IconRefresh className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <IconPhoto className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.totalPendingPhotos || 0}</div>
            <p className="text-xs text-muted-foreground">
              photos awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bookings with Uploads</CardTitle>
            <IconClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.totalBookings || 0}</div>
            <p className="text-xs text-muted-foreground">
              bookings need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Review Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bookings Pending Review</CardTitle>
          <CardDescription>
            Click on a booking to review and approve photos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.bookings && data.bookings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Client</TableHead>
                  {userRole === "ADMIN" && <TableHead>Studio</TableHead>}
                  <TableHead>Pending Photos</TableHead>
                  <TableHead>Waiting Since</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.bookings.map((booking) => (
                  <TableRow
                    key={booking.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedBookingId(booking.id)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setSelectedBookingId(booking.id)
                      }
                    }}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {format(new Date(booking.bookingDate), "MMM d, yyyy")}
                        </p>
                        <p className="text-sm text-muted-foreground">{booking.services}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IconUser className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.client.name}</span>
                      </div>
                    </TableCell>
                    {userRole === "ADMIN" && (
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <IconBuilding className="h-3 w-3" />
                          {booking.studio.name}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
                        {booking.pendingPhotos} / {booking.totalPhotos}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {booking.oldestUpload && (
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(booking.oldestUpload), { addSuffix: true })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        onClick={() => setSelectedBookingId(booking.id)}
                      >
                        <IconEye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <IconCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-sm">No photos pending review</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedBookingId} onOpenChange={(open) => !open && setSelectedBookingId(null)}>
        <DialogContent className="max-w-6xl w-full max-h-[90vh] flex flex-col pointer-events-auto">
          <DialogHeader>
            <DialogTitle>Review Photos</DialogTitle>
            <DialogDescription>
                Review and approve photos for this booking.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2">
            {selectedBookingId && (
                <BookingPhotos 
                    bookingId={selectedBookingId} 
                    userRole={userRole} 
                />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
