"use client"

// app/(public)/receipt/[paymentId]/page.tsx
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  IconCheck,
  IconCalendar,
  IconMapPin,
  IconCamera,
  IconCurrencyNaira,
  IconPrinter,
  IconReceipt,
  IconAlertCircle,
  IconDownload,
} from "@tabler/icons-react"
import { useEffect, useState } from "react"
import { jsPDF } from "jspdf"

// Define types for the data
interface PaymentData {
  id: string
  receiptNumber: string
  amount: unknown
  method: string
  paymentDate: string
  paystackReference: string | null
  notes: string | null
  recordedBy: { name: string } | null
  booking: {
    id: string
    bookingDate: string
    client: {
      name: string
      phone: string
      email: string | null
    }
    studio: {
      name: string
      city: string
      address: string | null
      phone: string | null
    }
    items: Array<{
      id: string
      service: { name: string }
    }>
  }
}

export default function ReceiptPage() {
  const params = useParams()
  const paymentId = params.paymentId as string
  const [payment, setPayment] = useState<PaymentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReceipt() {
      try {
        const res = await fetch(`/api/receipt/${paymentId}`)
        if (!res.ok) {
          if (res.status === 404) {
            setError("Receipt not found")
          } else {
            setError("Failed to load receipt")
          }
          return
        }
        const data = (await res.json()) as any
        setPayment(data)
      } catch (err) {
        setError("Failed to load receipt")
      } finally {
        setLoading(false)
      }
    }

    if (paymentId) {
      fetchReceipt()
    }
  }, [paymentId])

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = () => {
    if (!payment) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const booking = payment.booking
    
    // Brand
    doc.setFontSize(22)
    doc.setTextColor(0, 0, 0)
    doc.text("GMax Studioz", pageWidth / 2, 20, { align: "center" })
    
    doc.setFontSize(16)
    doc.text("PAYMENT RECEIPT", pageWidth / 2, 30, { align: "center" })
    
    // Receipt Info
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Receipt #: ${payment.receiptNumber}`, pageWidth / 2, 40, { align: "center" })
    doc.text(format(new Date(payment.paymentDate), "PPP p"), pageWidth / 2, 45, { align: "center" })

    // Success Badge
    doc.setFillColor(240, 253, 244) // light green
    doc.roundedRect(pageWidth / 2 - 40, 55, 80, 12, 3, 3, "F")
    doc.setTextColor(22, 101, 52) // dark green
    doc.setFontSize(12)
    doc.text("Payment Successful", pageWidth / 2, 63, { align: "center" })

    // Billed To
    let y = 85
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.text("BILLED TO", 20, y)
    y += 6
    doc.setFontSize(12)
    doc.text(booking.client.name, 20, y)
    y += 5
    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    doc.text(booking.client.phone, 20, y)
    if (booking.client.email) {
      y += 5
      doc.text(booking.client.email, 20, y)
    }

    // Line
    y += 10
    doc.setDrawColor(220, 220, 220)
    doc.line(20, y, pageWidth - 20, y)
    y += 10

    // Service Info
    doc.setTextColor(0, 0, 0)
    doc.text("BOOKING DETAILS", 20, y)
    y += 8
    
    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    
    // Simple table-like structure
    doc.text("Service:", 20, y)
    doc.setTextColor(0, 0, 0)
    booking.items.forEach((item, index) => {
      doc.text(item.service.name, 60, y)
      if (index < booking.items.length - 1) {
        y += 6
      }
    })
    
    y += 6
    doc.setTextColor(80, 80, 80)
    doc.text("Date:", 20, y)
    doc.setTextColor(0, 0, 0)
    doc.text(format(new Date(booking.bookingDate), "PPP p"), 60, y)
    
    y += 6
    doc.setTextColor(80, 80, 80)
    doc.text("Studio:", 20, y)
    doc.setTextColor(0, 0, 0)
    doc.text(booking.studio.name, 60, y)
    y += 5
    doc.setTextColor(80, 80, 80)
    doc.text(booking.studio.city, 60, y)

    // Payment Info
    y += 15
    doc.setDrawColor(220, 220, 220)
    doc.line(20, y, pageWidth - 20, y)
    y += 10

    doc.setTextColor(0, 0, 0)
    doc.text("PAYMENT SUMMARY", 20, y)
    y += 10
    
    doc.setFontSize(12)
    doc.text("Total Paid", 20, y)
    doc.text(`N ${Number(payment.amount).toLocaleString()}`, pageWidth - 20, y, { align: "right" })
    
    y += 7
    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    doc.text("Method", 20, y)
    doc.text(payment.method, pageWidth - 20, y, { align: "right" })
    
    y += 5
    doc.text("Reference", 20, y)
    doc.text(payment.paystackReference || payment.receiptNumber || "-", pageWidth - 20, y, { align: "right" })

    // Footer
    y = doc.internal.pageSize.getHeight() - 30
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(booking.studio.name, pageWidth / 2, y, { align: "center" })
    y += 4
    if (booking.studio.address) {
        doc.text(`${booking.studio.address}, ${booking.studio.city}`, pageWidth / 2, y, { align: "center" })
        y += 4
    }
    doc.text("Thank you for choosing GMax Studioz", pageWidth / 2, y, { align: "center" })

    doc.save(`Receipt-${payment.receiptNumber}.pdf`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <header className="bg-background/80 backdrop-blur-md border-b border-border/40 sticky top-0 z-50 supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex items-center justify-between h-16 px-4">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/Logo.png" alt="GMax Studioz" width={40} height={40} />
              <span className="font-bold text-lg">GMax Studioz</span>
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardHeader className="text-center">
              <Skeleton className="h-8 w-48 mx-auto mb-2" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
          <div className="container mx-auto flex items-center justify-between h-16 px-4">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/Logo.png" alt="GMax Studioz" width={40} height={40} />
              <span className="font-bold text-lg">GMax Studioz</span>
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardContent className="py-12 text-center">
              <IconAlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">{error || "Receipt Not Found"}</h2>
              <p className="text-muted-foreground mb-4">
                The receipt you&apos;re looking for could not be found.
              </p>
              <Button asChild>
                <Link href="/">Go Home</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const booking = payment.booking

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-md border-b border-border/40 sticky top-0 z-50 print:hidden supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/Logo.png" alt="GMax Studioz" width={40} height={40} />
            <span className="font-bold text-lg">GMax Studioz</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <IconPrinter className="mr-1 h-4 w-4" />
              Print
            </Button>
            <Button size="sm" onClick={handleDownloadPDF}>
              <IconDownload className="mr-1 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="print:shadow-none print:border-none shadow-sm border-border/60 rounded-xl overflow-hidden">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 print:block hidden">
              <Image src="/Logo.png" alt="GMax Studioz" width={60} height={60} />
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <IconReceipt className="h-6 w-6 text-green-600" />
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Payment Receipt
              </Badge>
            </div>
            <CardTitle className="text-2xl">Receipt #{payment.receiptNumber}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {format(new Date(payment.paymentDate), "PPPP 'at' h:mm a")}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Success Banner */}
            <div className="p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
              <IconCheck className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">Payment Successful</p>
                <p className="text-sm text-green-700">
                  Thank you for your payment
                </p>
              </div>
            </div>

            {/* Client Info */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Billed To</p>
              <p className="font-semibold">{booking.client.name}</p>
              <p className="text-sm text-muted-foreground">{booking.client.phone}</p>
              {booking.client.email && (
                <p className="text-sm text-muted-foreground">{booking.client.email}</p>
              )}
            </div>

            <Separator />

            {/* Booking Info */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <IconCamera className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Service</p>
                  {booking.items.map((item) => (
                    <p key={item.id} className="text-muted-foreground">
                      {item.service.name}
                    </p>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <IconCalendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold">Booking Date</p>
                  <p className="text-muted-foreground">
                    {format(new Date(booking.bookingDate), "PPPP 'at' h:mm a")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <IconMapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold">Studio</p>
                  <p className="text-muted-foreground">{booking.studio.name}</p>
                  <p className="text-sm text-muted-foreground">{booking.studio.address}</p>
                  <p className="text-sm text-muted-foreground">{booking.studio.city}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment Details */}
            <div className="space-y-3">
              <p className="font-semibold">Payment Details</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="flex items-center font-bold text-lg">
                    <IconCurrencyNaira className="h-5 w-5" />
                    {Number(payment.amount).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Method</span>
                  <Badge variant="outline">{payment.method}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transaction Reference</span>
                  <span className="font-mono text-xs">
                    {payment.paystackReference || payment.receiptNumber}
                  </span>
                </div>
                {payment.recordedBy && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Processed By</span>
                    <span>{payment.recordedBy.name}</span>
                  </div>
                )}
              </div>
            </div>

            {payment.notes && (
              <>
                <Separator />
                <div>
                  <p className="font-semibold mb-1">Notes</p>
                  <p className="text-sm text-muted-foreground">{payment.notes}</p>
                </div>
              </>
            )}

            {/* Footer */}
            <Separator />
            <div className="text-center text-sm text-muted-foreground space-y-1">
              <p className="font-semibold">{booking.studio.name}</p>
              <p>{booking.studio.address}, {booking.studio.city}</p>
              {booking.studio.phone && <p>Tel: {booking.studio.phone}</p>}
              <p className="pt-2">Thank you for choosing GMax Studioz!</p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center print:hidden">
          <Button variant="ghost" asChild>
            <Link href={`/pay/${booking.id}`}>Back to Booking</Link>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto py-6 bg-muted/30 print:hidden">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          GMax Studioz © {new Date().getFullYear()} • All rights reserved
        </div>
      </footer>
    </div>
  )
}
