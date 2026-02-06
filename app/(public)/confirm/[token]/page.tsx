// app/(public)/confirm/[token]/page.tsx
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { format } from "date-fns"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  IconCheck,
  IconCalendar,
  IconMapPin,
  IconCamera,
  IconCurrencyNaira,
  IconClock,
  IconAlertTriangle,
} from "@tabler/icons-react"
import { ConfirmBookingButton } from "./confirm-button"

async function getBookingByToken(token: string) {
  const confirmation = await prisma.bookingConfirmation.findUnique({
    where: { token },
    include: {
      booking: {
        include: {
          client: {
            select: {
              name: true,
              phone: true,
              email: true,
            },
          },
          studio: {
            select: {
              name: true,
              city: true,
              address: true,
              phone: true,
            },
          },
          items: {
            include: {
              service: {
                select: {
                  name: true,
                  sessionDuration: true,
                },
              },
            },
          },
          payments: {
            select: {
              amount: true,
              status: true,
            },
          },
        },
      },
    },
  })

  if (!confirmation) return null

  // Check if expired
  const isExpired = confirmation.expiresAt < new Date()

  // Calculate totals
  const totalAmount = confirmation.booking.items.reduce(
    (sum, item) => sum + Number(item.priceSnapshot) * item.quantity,
    0
  )

  const paidAmount = confirmation.booking.payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((sum, p) => sum + Number(p.amount), 0)

  return {
    confirmation,
    booking: confirmation.booking,
    isExpired,
    isConfirmed: confirmation.status === "CONFIRMED",
    isCancelled: confirmation.status === "CANCELLED",
    totalAmount,
    paidAmount,
    balance: totalAmount - paidAmount,
  }
}

export default async function ConfirmBookingPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const data = await getBookingByToken(token)

  if (!data) {
    notFound()
  }

  const { confirmation, booking, isExpired, isConfirmed, isCancelled, totalAmount, paidAmount, balance } = data

  // Update view count
  await prisma.bookingConfirmation.update({
    where: { id: confirmation.id },
    data: {
      viewCount: { increment: 1 },
      viewedAt: confirmation.viewedAt || new Date(),
      status: confirmation.status === "PENDING" ? "VIEWED" : confirmation.status,
    },
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/Logo.png" alt="GMax Studioz" width={40} height={40} />
            <span className="font-bold text-lg">GMax Studioz</span>
          </Link>
          <Badge variant="outline">Booking Confirmation</Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Status Banner */}
        {isConfirmed && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
            <IconCheck className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-800">Booking Confirmed!</p>
              <p className="text-sm text-green-700">
                Confirmed on {format(confirmation.confirmedAt!, "PPP")}
              </p>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3">
            <IconAlertTriangle className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">Booking Cancelled</p>
              <p className="text-sm text-red-700">This booking has been cancelled.</p>
            </div>
          </div>
        )}

        {isExpired && !isConfirmed && !isCancelled && (
          <div className="mb-6 p-4 rounded-lg bg-orange-50 border border-orange-200 flex items-center gap-3">
            <IconClock className="h-6 w-6 text-orange-600" />
            <div>
              <p className="font-semibold text-orange-800">Confirmation Expired</p>
              <p className="text-sm text-orange-700">
                This confirmation link expired on {format(confirmation.expiresAt, "PPP")}.
                Please contact the studio to rebook.
              </p>
            </div>
          </div>
        )}

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Booking Details</CardTitle>
            <CardDescription>
              Hi {booking.client.name}, here are your booking details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Service Info */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <IconCamera className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Service</p>
                  {booking.items.map((item) => (
                    <div key={item.id} className="text-muted-foreground">
                      <p>{item.service.name}</p>
                      {/* Description removed as it does not exist on Service model */}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <IconCalendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-semibold">Date & Time</p>
                <p className="text-muted-foreground">
                  {format(new Date(booking.bookingDate), "PPPP")}
                </p>
                <p className="text-muted-foreground">
                  {format(new Date(booking.bookingDate), "h:mm a")}
                </p>
              </div>
            </div>

            {/* Studio Location */}
            <div className="flex items-start gap-3">
              <IconMapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-semibold">Location</p>
                <p className="text-muted-foreground">{booking.studio.name}</p>
                <p className="text-sm text-muted-foreground">{booking.studio.address}</p>
                <p className="text-sm text-muted-foreground">{booking.studio.city}</p>
                {booking.studio.phone && (
                  <p className="text-sm text-muted-foreground">{booking.studio.phone}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Payment Summary */}
            <div className="space-y-3">
              <p className="font-semibold">Payment Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="flex items-center font-medium">
                    <IconCurrencyNaira className="h-4 w-4" />
                    {totalAmount.toLocaleString()}
                  </span>
                </div>
                {paidAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="flex items-center text-green-600">
                      <IconCurrencyNaira className="h-4 w-4" />
                      {paidAmount.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold">
                  <span>Balance Due</span>
                  <span className="flex items-center">
                    <IconCurrencyNaira className="h-5 w-5" />
                    {balance.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {booking.notes && (
              <>
                <Separator />
                <div>
                  <p className="font-semibold mb-1">Special Notes</p>
                  <p className="text-muted-foreground text-sm">{booking.notes}</p>
                </div>
              </>
            )}

            {!isConfirmed && !isCancelled && !isExpired && (
              <>
                <Separator />
                
                <div className="space-y-4">
                  <p className="text-center text-sm text-muted-foreground">
                    Please confirm your booking before{" "}
                    <span className="font-medium">
                      {format(confirmation.expiresAt, "PPP 'at' h:mm a")}
                    </span>
                  </p>
                  
                  <ConfirmBookingButton
                    confirmationId={confirmation.id}
                    bookingId={booking.id}
                    balance={balance}
                  />
                </div>
              </>
            )}

            {isConfirmed && balance > 0 && (
              <>
                <Separator />
                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Your booking is confirmed. Complete payment to secure your slot.
                  </p>
                  <Button asChild className="w-full">
                    <Link href={`/pay/${booking.id}`}>
                      <IconCurrencyNaira className="mr-2 h-4 w-4" />
                      Pay ₦{balance.toLocaleString()} Now
                    </Link>
                  </Button>
                </div>
              </>
            )}

            {isConfirmed && balance <= 0 && (
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <IconCheck className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="font-semibold text-green-800">All Set!</p>
                <p className="text-sm text-green-700">
                  Your booking is confirmed and fully paid. See you at the studio!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Button variant="ghost" asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto py-6 bg-muted/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          GMax Studioz © {new Date().getFullYear()} • All rights reserved
        </div>
      </footer>
    </div>
  )
}
