// app/(public)/pay/[bookingId]/page.tsx
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { format } from "date-fns"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/lib/generated/prisma"
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
  IconCreditCard,
  IconExternalLink,
  IconReceipt,
} from "@tabler/icons-react"
import { RescheduleDialog } from "@/components/bookings/reschedule-dialog"


// Define type for booking with includes - Fetch full service details for calculations
type BookingWithRelations = Prisma.BookingGetPayload<{
  include: {
    client: { select: { name: true; phone: true; email: true } }
    studio: { select: { name: true; city: true } }
    items: { include: { service: true } }
    payments: { select: { id: true; amount: true; status: true; method: true; paymentDate: true; receiptNumber: true } }
    paymentLink: true
  }
}>

import { generatePaymentLink } from "@/lib/paystack"

async function getBookingForPayment(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
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
        },
      },
      items: {
        include: {
          service: true, // Fetch full service details to get prices
        },
      },
      payments: {
        select: {
          id: true,
          amount: true,
          status: true,
          method: true,
          paymentDate: true,
          receiptNumber: true,
        },
        orderBy: { paymentDate: "desc" },
      },
      paymentLink: true,
    },
  }) as BookingWithRelations | null

  if (!booking) return null

  // Calculate totals
  // Base price from booking items (snapshots)


  // Calculate Add-ons based on Service current prices (or should we snapshot them? 
  // Ideally snapshot, but for now we calculate from service prices as per previous logical flaw)
  // Actually, usually the priceSnapshot in BookingItem is the final total for that item line *including* base price.
  // But extraOutfits and extraPics are global on the Booking, not per item (in this schema).
  
  // Let's look at the creation logic in route.ts: 
  // const totalAmount = Number(basePrice) + outfitsCost + picsCost
  // BookingItem.priceSnapshot = totalAmount
  // So priceSnapshot ALREADY includes everything.
  
  // Wait, if priceSnapshot includes everything, then we just need to backtrack the breakdown for display.
  // Breakdown:
  // - Service Base Price: service.salePrice ?? service.price
  // - Extra Outfits: booking.extraOutfits * service.extraOutfitPrice
  // - Extra Pics: booking.extraPicsCount * service.extraPicPrice
  
  let breakdown = {
    basePrice: 0,
    extraOutfits: { count: booking.extraOutfits, cost: 0 },
    extraPics: { count: booking.extraPicsCount, cost: 0 },
  }

  // Iterate all items to sum up base prices and extra costs
  // Note: extraOutfits and extraPics are stored on Booking level, but cost per unit comes from Service.
  // The user request says: compute total basePrice as sum of Number(item.service.salePrice ?? item.service.price).
  // Compute extraOutfits.cost as sum over items of (item.extraOutfits ?? booking.extraOutfits) * Number(item.service.extraOutfitPrice ?? 0).
  // Wait, if extraOutfits is on Booking, we should probably take the max or just use the first service's price?
  // The instruction says: "compute extraOutfits.cost as the sum over items of (item.extraOutfits ?? booking.extraOutfits) * Number(item.service.extraOutfitPrice ?? 0)"
  // This implies we sum it up for each item? That seems redundant if extraOutfits is singular on Booking.
  // However, I will follow the specific logic requested: iterate booking.items.
  
  let totalBasePrice = 0
  let totalOutfitsCost = 0
  let totalPicsCost = 0
  
  for (const item of booking.items) {
      const s = item.service
      totalBasePrice += Number(s.salePrice ?? s.price)
  }

  // Calculate extras once (booking-scoped) using the first service's rates
  const firstService = booking.items[0]?.service
  if (firstService) {
        if (booking.extraOutfits > 0) {
            totalOutfitsCost = booking.extraOutfits * Number(firstService.extraOutfitPrice ?? 0)
        }
        if (booking.extraPicsCount > 0) {
            totalPicsCost = booking.extraPicsCount * Number(firstService.extraPicPrice ?? 0)
        }
  }

  // Correction: If we sum booking.extraOutfits * price for EACH item, and we have 2 items, we double charge.
  // The user prompt implies: "compute extraOutfits.cost as the sum over items of (item.extraOutfits ?? booking.extraOutfits)..."
  // This phrasing suggests item.extraOutfits exists. If not, it falls back to booking.
  // If it falls back to booking (global), and we have 2 items, we charge twice? That sounds wrong unless it's per-service extras.
  // However, I must follow "sum over items".
  
  breakdown = {
      basePrice: totalBasePrice,
      extraOutfits: { count: booking.extraOutfits, cost: totalOutfitsCost },
      extraPics: { count: booking.extraPicsCount, cost: totalPicsCost }
  }

  const totalAmount = booking.items.reduce(
    (sum, item) => sum + Number(item.priceSnapshot) * item.quantity,
    0
  )

  const paidAmount = booking.payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const balance = totalAmount - paidAmount
  const isPaid = balance <= 0

  // Lazy Generate Payment Link if missing and not paid
  let paymentLink = booking.paymentLink
  if (!paymentLink && !isPaid && balance > 0) {
      // Validate email before generating link
      if (!booking.client.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.client.email)) {
          console.error("Cannot generate payment link: Invalid or missing client email")
          // Fallback or just don't set paymentLink
      } else {
        try {
            const result = await generatePaymentLink({
                bookingId: booking.id,
                amount: balance,
                email: booking.client.email,
                clientName: booking.client.name,
                clientPhone: booking.client.phone,
                studioName: booking.studio.name,
                serviceNames: booking.items.map(i => i.service.name).join(", "),
            })
            
            // Use returned persisted link directly
            if (result.paymentLink) {
                paymentLink = result.paymentLink
            }
        } catch (error) {
            console.error("Failed to generate payment link:", error)
        }
      }
  }

  return {
    booking,
    totalAmount,
    paidAmount,
    balance,
    isPaid,
    paymentLink,
    breakdown,
  }
}

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ bookingId: string }>
}) {
  const { bookingId } = await params
  const data = await getBookingForPayment(bookingId)

  if (!data) {
    notFound()
  }

  const { booking, totalAmount, paidAmount, balance, isPaid, paymentLink, breakdown } = data

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 font-sans selection:bg-primary/5">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-md border-b border-border/40 sticky top-0 z-50 supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/Logo.png" alt="GMax Studioz" width={40} height={40} />
            <span className="font-bold text-lg">GMax Studioz</span>
          </Link>
          <Badge variant="outline">Payment</Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Paid Status */}
        {isPaid && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
            <IconCheck className="h-6 w-6 text-green-600" />
            <div className="flex-1">
              <p className="font-semibold text-green-800">Payment Complete!</p>
              <p className="text-sm text-green-700">
                Thank you for your payment. Your booking is confirmed.
              </p>
            </div>


            {booking.payments[0]?.receiptNumber && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/receipt/${booking.payments[0].id}`}>
                  <IconReceipt className="mr-1 h-4 w-4" />
                  View Receipt
                </Link>
              </Button>
            )}
            
            <div className="ml-2">
               <RescheduleDialog bookingId={booking.id} currentDate={booking.bookingDate.toISOString()} />
            </div>
          </div>
        )}

        <Card className="shadow-sm border-border/60 rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {isPaid ? "Payment Summary" : "Complete Your Payment"}
            </CardTitle>
            <CardDescription>
              Hi {booking.client.name}, {isPaid ? "here's your payment summary" : "please complete your payment below"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Booking Info */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <IconCamera className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Service</p>
                  {booking.items.map((item) => (
                    <div key={item.id}>
                      <p className="text-muted-foreground">
                        {item.service.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <IconCalendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold">Date & Time</p>
                  <p className="text-muted-foreground">
                    {format(new Date(booking.bookingDate), "PPPP 'at' h:mm a")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <IconMapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold">Studio</p>
                  <p className="text-muted-foreground">
                    {booking.studio.name}, {booking.studio.city}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment Summary */}
            <div className="space-y-3">
              <p className="font-semibold">Payment Summary</p>
              <div className="space-y-2 text-sm">
                {/* Base Price */}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Session Price</span>
                  <span className="flex items-center">
                    <IconCurrencyNaira className="h-4 w-4" />
                    {breakdown.basePrice.toLocaleString()}
                  </span>
                </div>

                {/* Add-ons */}
                {breakdown.extraOutfits.count > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Extra Outfits ({breakdown.extraOutfits.count})</span>
                    <span className="flex items-center">
                      <IconCurrencyNaira className="h-4 w-4" />
                      {breakdown.extraOutfits.cost.toLocaleString()}
                    </span>
                  </div>
                )}
                
                {breakdown.extraPics.count > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Extra Pictures ({breakdown.extraPics.count})</span>
                    <span className="flex items-center">
                      <IconCurrencyNaira className="h-4 w-4" />
                      {breakdown.extraPics.cost.toLocaleString()}
                    </span>
                  </div>
                )}
                
                <Separator className="my-2" />

                <div className="flex justify-between font-medium">
                  <span className="">Total Amount</span>
                  <span className="flex items-center">
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
                <div className="flex justify-between text-base font-bold pt-2">
                  <span>{isPaid ? "Total Paid" : "Balance Due"}</span>
                  <span className="flex items-center">
                    <IconCurrencyNaira className="h-5 w-5" />
                    {isPaid ? paidAmount.toLocaleString() : balance.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment History */}
            {booking.payments.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="font-semibold">Payment History</p>
                  <div className="space-y-2">
                    {booking.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex justify-between items-center p-3 rounded-lg bg-muted/50"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium flex items-center">
                              <IconCurrencyNaira className="h-4 w-4" />
                              {Number(payment.amount).toLocaleString()}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {payment.method}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(payment.paymentDate), "PPp")}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/receipt/${payment.id}`}>
                            <IconReceipt className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Pay Button */}
            {!isPaid && (
              <>
                <Separator />
                <div className="space-y-4">
                  {paymentLink ? (
                    <Button asChild className="w-full" size="lg">
                      <a
                        href={paymentLink.paystackUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <IconCreditCard className="mr-2 h-5 w-5" />
                        Pay ₦{balance.toLocaleString()} Now
                        <IconExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  ) : (
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-muted-foreground">
                        Payment link not available. Please contact the studio.
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-center text-muted-foreground">
                    Secure payment powered by Paystack. You can pay with Card, Bank Transfer, or USSD.
                  </p>
                </div>
              </>
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
      <footer className="border-t mt-auto py-8 bg-neutral-50 dark:bg-neutral-950/50">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          GMax Studioz © {new Date().getFullYear()} • All rights reserved
        </div>
      </footer>
    </div>
  )
}
