"use client"

import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { IconEdit, IconTrash, IconCurrencyNaira, IconEye } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { IconDotsVertical } from "@tabler/icons-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"

interface Booking {
  id: string
  client: {
    name: string
    phone: string
  }
  bookingDate: string
  bookingStatus: "CONFIRMED" | "COMPLETED" | "CANCELLED"
  paymentStatus: "PENDING" | "PARTIAL" | "COMPLETED" | "FAILED" | "REFUNDED"
  photographer: {
    name: string | null
    image: string | null
  } | null
  items: Array<{
    service: {
      name: string
    }
  }>
  totalAmount: number
  _count: {
    photos: number
  }
}

interface BookingsTableProps {
  bookings: Booking[]
  searchParams: any
  onRefresh: () => void
}

export function BookingsTable({
  bookings,
  searchParams,
  onRefresh,
}: BookingsTableProps) {
  const router = useRouter()

  const handleRowClick = (bookingId: string) => {
    router.push(`/dashboard/bookings/${bookingId}`)
  }

  const handleDelete = async (e: React.MouseEvent, bookingId: string) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to cancel this booking?")) return

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = (await response.json()) as any
        throw new Error(error.error || "Failed to cancel booking")
      }

      toast.success("Booking cancelled successfully")
      onRefresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel booking")
    }
  }

  const getBookingStatusBadge = (status: Booking["bookingStatus"]) => {
    const variants: Record<string, { label: string; className: string }> = {
      PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-700" },
      CONFIRMED: { label: "Confirmed", className: "bg-blue-100 text-blue-700" },
      COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700" },
      CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700" },
    }
    const variant = variants[status] || { label: status, className: "bg-gray-100 text-gray-700" }
    return <Badge className={variant.className}>{variant.label}</Badge>
  }

  const getPaymentStatusBadge = (status: Booking["paymentStatus"]) => {
    const variants = {
      PENDING: { label: "Pending", className: "bg-orange-100 text-orange-700" },
      PARTIAL: { label: "Partial", className: "bg-yellow-100 text-yellow-700" },
      COMPLETED: { label: "Paid", className: "bg-green-100 text-green-700" },
      FAILED: { label: "Failed", className: "bg-red-100 text-red-700" },
      REFUNDED: { label: "Refunded", className: "bg-gray-100 text-gray-700" },
    }
    const variant = variants[status]
    return <Badge className={variant.className}>{variant.label}</Badge>
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Services</TableHead>
              <TableHead>Photographer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No bookings found.
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => (
                <TableRow
                  key={booking.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(booking.id)}
                >
                  <TableCell className="font-medium">
                    <div>
                      <div>{booking.client.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {booking.client.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {format(new Date(booking.bookingDate), "MMM d, yyyy")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(booking.bookingDate), "h:mm a")}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px]">
                      <div className="truncate">
                        {booking.items[0]?.service.name}
                      </div>
                      {booking.items.length > 1 && (
                        <div className="text-xs text-muted-foreground">
                          +{booking.items.length - 1} more
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {booking.photographer ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={booking.photographer.image || undefined} />
                          <AvatarFallback>
                            {booking.photographer.name?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{booking.photographer.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>{getBookingStatusBadge(booking.bookingStatus)}</TableCell>
                  <TableCell>{getPaymentStatusBadge(booking.paymentStatus)}</TableCell>
                  <TableCell>
                    <div className="flex items-center font-medium">
                      <IconCurrencyNaira className="h-4 w-4" />
                      {booking.totalAmount.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <IconDotsVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/dashboard/bookings/${booking.id}`)
                          }}
                        >
                          <IconEye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleDelete(e, booking.id)}
                          className="text-red-600"
                        >
                          <IconTrash className="mr-2 h-4 w-4" />
                          Cancel Booking
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}