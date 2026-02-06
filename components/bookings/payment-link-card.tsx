// components/bookings/payment-link-card.tsx
"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  IconLink,
  IconCopy,
  IconCheck,
  IconRefresh,
  IconBrandWhatsapp,
  IconMail,
  IconExternalLink,
  IconLoader2,
  IconCurrencyNaira,
} from "@tabler/icons-react"

interface PaymentLinkCardProps {
  bookingId: string
  clientName: string
  clientPhone?: string
  clientEmail?: string | null
}

interface PaymentLinkData {
  paymentLink: string | null
  reference?: string
  status?: string
  amount?: number
  viewCount?: number
  createdAt?: string
  isPaid: boolean
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  isExisting?: boolean
}

export function PaymentLinkCard({
  bookingId,
  clientName,
  clientPhone,
  clientEmail,
}: PaymentLinkCardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [linkData, setLinkData] = useState<PaymentLinkData | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchPaymentLink()
  }, [bookingId])

  const fetchPaymentLink = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/bookings/${bookingId}/payment-link`)
      if (response.ok) {
        const data = (await response.json()) as any
        setLinkData(data)
      }
    } catch (error) {
      console.error("Fetch payment link error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateLink = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch(`/api/bookings/${bookingId}/payment-link`, {
        method: "POST",
      })

      if (!response.ok) {
        const error = (await response.json()) as any
        throw new Error(error.error || "Failed to generate payment link")
      }

      const result = (await response.json()) as any
      setLinkData({
        paymentLink: result.paymentLink,
        reference: result.reference,
        status: "ACTIVE",
        amount: result.remainingAmount,
        isPaid: false,
        totalAmount: result.totalAmount,
        paidAmount: result.paidAmount,
        remainingAmount: result.remainingAmount,
        isExisting: result.isExisting,
      })

      toast.success(
        result.isExisting ? "Payment link retrieved!" : "Payment link generated!"
      )
    } catch (error: any) {
      toast.error(error.message || "Failed to generate payment link")
    } finally {
      setIsGenerating(false)
    }
  }

  const copyLink = async () => {
    if (!linkData?.paymentLink) return

    try {
      await navigator.clipboard.writeText(linkData.paymentLink)
      setCopied(true)
      toast.success("Link copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy link")
    }
  }

  const sendViaWhatsApp = () => {
    if (!linkData?.paymentLink || !clientPhone) return

    const message = encodeURIComponent(
      `Hello ${clientName}! Here is your payment link for your booking at GMAX Studios:\n\nAmount: ₦${linkData.remainingAmount.toLocaleString()}\n\n${linkData.paymentLink}\n\nPlease complete the payment to proceed with your booking. Thank you!`
    )

    const cleanPhone = clientPhone.replace(/\D/g, "").replace(/^0/, "234")
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank")
  }

  const sendViaEmail = () => {
    if (!linkData?.paymentLink || !clientEmail) return

    const subject = encodeURIComponent("Payment Link - GMAX Studios")
    const body = encodeURIComponent(
      `Hello ${clientName},\n\nHere is your payment link for your booking at GMAX Studios:\n\nAmount Due: ₦${linkData.remainingAmount.toLocaleString()}\n\nPayment Link: ${linkData.paymentLink}\n\nPlease complete the payment to proceed with your booking.\n\nThank you for choosing GMAX Studios!`
    )

    window.open(`mailto:${clientEmail}?subject=${subject}&body=${body}`, "_blank")
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  // Fully paid - show success badge
  if (linkData?.isPaid) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <IconCheck className="h-5 w-5" />
            Fully Paid
          </CardTitle>
          <CardDescription className="text-green-600">
            This booking has been paid in full
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconLink className="h-5 w-5" />
          Payment Link
        </CardTitle>
        <CardDescription>
          {linkData?.paymentLink
            ? "Share this link with the client to collect payment"
            : "Generate a payment link for the client"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount Summary */}
        {linkData && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="text-sm">
              <span className="text-muted-foreground">Amount Due: </span>
              <span className="font-semibold flex items-center inline-flex">
                <IconCurrencyNaira className="h-4 w-4" />
                {linkData.remainingAmount.toLocaleString()}
              </span>
            </div>
            {linkData.status && (
              <Badge
                variant={linkData.status === "ACTIVE" ? "default" : "secondary"}
              >
                {linkData.status}
              </Badge>
            )}
          </div>
        )}

        {/* Link Display or Generate Button */}
        {linkData?.paymentLink ? (
          <div className="space-y-3">
            {/* Link Input with Copy */}
            <div className="flex gap-2">
              <Input
                value={linkData.paymentLink}
                readOnly
                className="text-xs font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyLink}
                className="shrink-0"
              >
                {copied ? (
                  <IconCheck className="h-4 w-4 text-green-600" />
                ) : (
                  <IconCopy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Share Options */}
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={sendViaWhatsApp}
                disabled={!clientPhone}
                className="flex flex-col items-center gap-1 h-auto py-2"
              >
                <IconBrandWhatsapp className="h-4 w-4 text-green-600" />
                <span className="text-xs">WhatsApp</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={sendViaEmail}
                disabled={!clientEmail}
                className="flex flex-col items-center gap-1 h-auto py-2"
              >
                <IconMail className="h-4 w-4 text-blue-600" />
                <span className="text-xs">Email</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(linkData.paymentLink!, "_blank")}
                className="flex flex-col items-center gap-1 h-auto py-2"
              >
                <IconExternalLink className="h-4 w-4 text-purple-600" />
                <span className="text-xs">Open</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={generateLink}
                disabled={isGenerating}
                className="flex flex-col items-center gap-1 h-auto py-2"
              >
                {isGenerating ? (
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <IconRefresh className="h-4 w-4 text-orange-600" />
                )}
                <span className="text-xs">Refresh</span>
              </Button>
            </div>

            {/* View Count */}
            {linkData.viewCount !== undefined && linkData.viewCount > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Viewed {linkData.viewCount} time{linkData.viewCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        ) : (
          <Button
            onClick={generateLink}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <IconLink className="mr-2 h-4 w-4" />
                Generate Payment Link
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
