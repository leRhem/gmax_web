import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  IconArrowLeft,
  IconEdit,
  IconCalendar,
  IconCurrencyNaira,
  IconUser,
  IconCamera,
  IconNotes,
  IconPhone,
  IconMail,
  IconMapPin,
} from "@tabler/icons-react"
import { BookingDetailPageActions } from "@/components/bookings/booking-CTA"
import { BookingPhotos } from "@/components/bookings/booking-photos"
import { PaymentLinkCard } from "@/components/bookings/payment-link-card"

async function getBooking(id: string, studioId: string | null | undefined, role: string) {
  // Non-admins must have a studioId
  if (role !== "ADMIN" && !studioId) {
    return null
  }

  const where: any = { id }
  
  // Only filter by studio if not an admin
  if (role !== "ADMIN" && studioId) {
    where.studioId = studioId
  }

  const booking: any = await prisma.booking.findFirst({
    where,
    include: {
      client: true,
      studio: { select: { name: true, city: true } },
      photographer: { select: { name: true, email: true, image: true } },
      creator: { select: { name: true } },
      items: {
        include: {
          service: {
            include: {
              category: { select: { name: true } },
            },
          },
        },
      },
      payments: {
        include: {
          recordedBy: { select: { name: true } },
        },
        orderBy: { paymentDate: "desc" },
      },
      photos: {
        select: {
          id: true,
          fileName: true,
          uploadedAt: true,
          expiresAt: true,
          uploadedBy: { select: { name: true } },
        },
        orderBy: { uploadedAt: "desc" },
        take: 10,
      },
      _count: {
        select: { payments: true, photos: true },
      },
    },
  })

  if (!booking) return null

  // Calculate amounts
  const totalAmount = booking.items.reduce(
    (sum: number, item: any) => sum + Number(item.priceSnapshot) * item.quantity,
    0
  )

  const amountPaid = booking.payments
    .filter((p: any) => p.status === "COMPLETED")
    .reduce((sum: number, payment: any) => sum + Number(payment.amount), 0)

  return {
    ...booking,
    totalAmount,
    amountPaid,
    balance: totalAmount - amountPaid,
  }
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const userRole = session.user.role
  if (!userRole) {
    redirect("/login")
  }

  const { id } = await params
  const booking: any = await getBooking(id, session.user.studioId, userRole)

  if (!booking) notFound()

  const getBookingStatusBadge = (status: string) => {
    const variants = {
      CONFIRMED: { label: "Confirmed", className: "bg-blue-100 text-blue-700" },
      COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700" },
      CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700" },
    }
    const variant = variants[status as keyof typeof variants] || variants.CONFIRMED
    return <Badge className={variant.className}>{variant.label}</Badge>
  }

  const getPaymentStatusBadge = (status: string) => {
    const variants = {
      PENDING: { label: "Pending", className: "bg-orange-100 text-orange-700" },
      PARTIAL: { label: "Partial", className: "bg-yellow-100 text-yellow-700" },
      COMPLETED: { label: "Paid", className: "bg-green-100 text-green-700" },
    }
    const variant = variants[status as keyof typeof variants] || variants.PENDING
    return <Badge className={variant.className}>{variant.label}</Badge>
  }

  // Prepare booking data for the edit dialog and CTA actions
  const bookingForEdit = {
    id: booking.id,
    clientId: booking.clientId,
    bookingDate: booking.bookingDate.toISOString(),
    photoCount: booking.photoCount,
    notes: booking.notes,
    photographerId: booking.photographerId,
    items: booking.items.map((item: any) => ({
      id: item.id,
      serviceId: item.serviceId,
      quantity: item.quantity,
      priceSnapshot: Number(item.priceSnapshot)
    })),
    // Payment info for CTA component
    totalAmount: booking.totalAmount,
    amountPaid: booking.amountPaid,
    balance: booking.balance,
    paymentStatus: booking.paymentStatus,
    // Client info for payment link generation
    client: {
      name: booking.client.name,
      phone: booking.client.phone,
      email: booking.client.email,
    },
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/bookings">
              <IconArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Booking Details
            </h1>
            <p className="text-muted-foreground text-sm">
              Created by {booking.creator.name || "System"}
            </p>
          </div>
        </div>

        <BookingDetailPageActions booking={bookingForEdit} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getBookingStatusBadge(booking.bookingStatus)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getPaymentStatusBadge(booking.paymentStatus)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-2xl font-bold">
              <IconCurrencyNaira className="h-6 w-6" />
              {booking.totalAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-2xl font-bold">
              <IconCurrencyNaira className="h-6 w-6" />
              {booking.balance.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Booking Information */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <IconCalendar className="text-muted-foreground mt-0.5 h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Date & Time</p>
                <p className="text-muted-foreground text-sm">
                  {format(new Date(booking.bookingDate), "PPPP")}
                </p>
                <p className="text-muted-foreground text-sm">
                  {format(new Date(booking.bookingDate), "h:mm a")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <IconCamera className="text-muted-foreground mt-0.5 h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Photographer</p>
                <p className="text-muted-foreground text-sm">
                  {booking.photographer?.name || "Not assigned"}
                </p>
              </div>
            </div>

            {booking.photoCount > 0 && (
              <div className="flex items-start gap-3">
                <IconCamera className="text-muted-foreground mt-0.5 h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">Photo Count</p>
                  <p className="text-muted-foreground text-sm">
                    {booking.photoCount} photos
                  </p>
                </div>
              </div>
            )}

            {booking.notes && (
              <div className="flex items-start gap-3">
                <IconNotes className="text-muted-foreground mt-0.5 h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">Notes</p>
                  <p className="text-muted-foreground text-sm">{booking.notes}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <IconUser className="text-muted-foreground mt-0.5 h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Name</p>
                <p className="text-muted-foreground text-sm">
                  {booking.client.name}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <IconPhone className="text-muted-foreground mt-0.5 h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-muted-foreground text-sm">
                  {booking.client.phone}
                </p>
              </div>
            </div>

            {booking.client.email && (
              <div className="flex items-start gap-3">
                <IconMail className="text-muted-foreground mt-0.5 h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-muted-foreground text-sm">
                    {booking.client.email}
                  </p>
                </div>
              </div>
            )}

            {booking.client.address && (
              <div className="flex items-start gap-3">
                <IconMapPin className="text-muted-foreground mt-0.5 h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-muted-foreground text-sm">
                    {booking.client.address}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {booking.items.map((item: any) => (
                <div key={item.id} className="flex justify-between">
                  <div>
                    <p className="font-medium">{item.service.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.service.category.name}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-muted-foreground">
                        Quantity: {item.quantity}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center font-medium">
                    <IconCurrencyNaira className="h-4 w-4" />
                    {(Number(item.priceSnapshot) * item.quantity).toLocaleString()}
                  </div>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <div className="flex items-center">
                  <IconCurrencyNaira className="h-5 w-5" />
                  {booking.totalAmount.toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Link */}
        <PaymentLinkCard
          bookingId={booking.id}
          clientName={booking.client.name}
          clientPhone={booking.client.phone}
          clientEmail={booking.client.email}
        />

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>
              Payment History ({booking._count.payments})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {booking.payments.length === 0 ? (
              <p className="text-muted-foreground text-center text-sm">
                No payments yet
              </p>
            ) : (
              <div className="space-y-3">
                {booking.payments.map((payment: any) => (
                  <div key={payment.id} className="border-b pb-3 last:border-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center font-medium">
                          <IconCurrencyNaira className="h-4 w-4" />
                          {Number(payment.amount).toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payment.paymentDate), "PPp")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          by {payment.recordedBy?.name || "System"}
                        </p>
                      </div>
                      <Badge variant="outline">{payment.method}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Photos Section */}
      <BookingPhotos bookingId={booking.id} userRole={session.user.role as string} />
    </div>
  )
}