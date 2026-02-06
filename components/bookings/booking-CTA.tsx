"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  IconEdit,
  IconCash,
  IconDotsVertical,
  IconCloudUpload,
} from "@tabler/icons-react"
import { EditBookingDialog } from "@/components/bookings/edit-booking-dialog"
import { RecordPaymentDialog } from "@/components/bookings/record-payment-dialog"
import { AssetUploadDialog } from "@/components/bookings/asset-upload-dialog"

interface BookingItem {
  id: string
  serviceId: string
  quantity: number
  priceSnapshot: number
}

interface Booking {
  id: string
  clientId: string
  bookingDate: string
  photoCount: number
  notes: string | null
  photographerId: string | null
  items: BookingItem[]
  // Payment-related
  totalAmount?: number
  amountPaid?: number
  balance?: number
  paymentStatus?: string
  // Client info for payment link
  client?: {
    name: string
    phone: string
    email: string | null
  }
}

interface BookingDetailPageActionsProps {
  booking: Booking
}

export function BookingDetailPageActions({ booking }: BookingDetailPageActionsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const router = useRouter()

  const handleSuccess = () => {
    setEditOpen(false)
    router.refresh()
  }

  const handlePaymentSuccess = () => {
    setPaymentOpen(false)
    router.refresh()
  }

  const handleUploadSuccess = () => {
    setUploadOpen(false)
    router.refresh()
  }

  const totalAmount = booking.totalAmount || 0
  const paidAmount = booking.amountPaid || 0
  const balance = booking.balance || totalAmount - paidAmount
  const isFullyPaid = balance <= 0

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Record Payment Button - always visible if not fully paid */}
        {!isFullyPaid && (
          <Button variant="outline" onClick={() => setPaymentOpen(true)}>
            <IconCash className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        )}

        {/* Main Edit Button */}
        <Button onClick={() => setEditOpen(true)}>
          <IconEdit className="mr-2 h-4 w-4" />
          Edit Booking
        </Button>

        {/* More Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <IconDotsVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setUploadOpen(true)}>
              <IconCloudUpload className="mr-2 h-4 w-4" />
              Upload Assets
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edit Dialog */}
      <EditBookingDialog
        booking={booking}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={handleSuccess}
      />

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        bookingId={booking.id}
        totalAmount={totalAmount}
        paidAmount={paidAmount}
        clientName={booking.client?.name || "Client"}
        onSuccess={handlePaymentSuccess}
      />

      {/* Asset Upload Dialog */}
      <AssetUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        bookingId={booking.id}
        onSuccess={handleUploadSuccess}
      />
    </>
  )
}
