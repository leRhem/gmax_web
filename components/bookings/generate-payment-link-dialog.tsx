// components/bookings/generate-payment-link-dialog.tsx
"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  IconLoader2,
  IconLink,
  IconCopy,
  IconCheck,
  IconExternalLink,
  IconCreditCard,
  IconBrandWhatsapp,
  IconMail,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface GeneratePaymentLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  clientName: string
  clientPhone?: string
  clientEmail?: string | null
  totalAmount: number
  paidAmount: number
}

export function GeneratePaymentLinkDialog({
  open,
  onOpenChange,
  bookingId,
  clientName,
  clientPhone,
  clientEmail,
  totalAmount,
  paidAmount,
}: GeneratePaymentLinkDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [paymentLink, setPaymentLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const remainingAmount = totalAmount - paidAmount

  const generateLink = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/payments/generate-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      })

      if (!response.ok) {
        const error = (await response.json()) as any
        throw new Error(error.error || "Failed to generate payment link")
      }

      const result = (await response.json()) as any
      setPaymentLink(result.paymentLink)
      toast.success("Payment link generated!")
    } catch (error: any) {
      toast.error(error.message || "Failed to generate payment link")
    } finally {
      setIsGenerating(false)
    }
  }

  const copyLink = async () => {
    if (!paymentLink) return
    
    try {
      await navigator.clipboard.writeText(paymentLink)
      setCopied(true)
      toast.success("Link copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy link")
    }
  }

  const sendViaWhatsApp = () => {
    if (!paymentLink || !clientPhone) return
    
    const message = encodeURIComponent(
      `Hello ${clientName}! Here is your payment link for your booking at GMAX Studios:\n\nAmount: ₦${remainingAmount.toLocaleString()}\n\n${paymentLink}\n\nPlease complete the payment to proceed with your booking. Thank you!`
    )
    
    // Clean phone number and format for WhatsApp
    const cleanPhone = clientPhone.replace(/\D/g, "").replace(/^0/, "234")
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank")
  }

  const sendViaEmail = () => {
    if (!paymentLink || !clientEmail) return
    
    const subject = encodeURIComponent("Payment Link - GMAX Studios")
    const body = encodeURIComponent(
      `Hello ${clientName},\n\nHere is your payment link for your booking at GMAX Studios:\n\nAmount Due: ₦${remainingAmount.toLocaleString()}\n\nPayment Link: ${paymentLink}\n\nPlease complete the payment to proceed with your booking.\n\nThank you for choosing GMAX Studios!`
    )
    
    window.open(`mailto:${clientEmail}?subject=${subject}&body=${body}`, "_blank")
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset state after dialog closes
    setTimeout(() => {
      setPaymentLink(null)
      setCopied(false)
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconLink className="h-5 w-5" />
            Generate Payment Link
          </DialogTitle>
          <DialogDescription>
            Create a Paystack payment link for {clientName}
          </DialogDescription>
        </DialogHeader>

        {/* Amount Card */}
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Amount to Pay</p>
                <p className="text-2xl font-bold">₦{remainingAmount.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <IconCreditCard className="h-6 w-6 text-primary" />
              </div>
            </div>
            {paidAmount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Already paid: ₦{paidAmount.toLocaleString()} of ₦{totalAmount.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Link Generation / Display */}
        {!paymentLink ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription className="text-sm">
                This will create a one-time payment link using Paystack. 
                The client will receive payment options via Card, Bank Transfer, or USSD.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={generateLink} 
              className="w-full" 
              disabled={isGenerating || remainingAmount <= 0}
            >
              {isGenerating ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Link...
                </>
              ) : (
                <>
                  <IconLink className="mr-2 h-4 w-4" />
                  Generate Payment Link
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Generated Link */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Link</label>
              <div className="flex gap-2">
                <Input 
                  value={paymentLink} 
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
            </div>

            {/* Share Options */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Send to Client</label>
              <div className="grid grid-cols-3 gap-2">
                {/* WhatsApp */}
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-1 h-auto py-3"
                  onClick={sendViaWhatsApp}
                  disabled={!clientPhone}
                >
                  <IconBrandWhatsapp className="h-5 w-5 text-green-600" />
                  <span className="text-xs">WhatsApp</span>
                </Button>

                {/* Email */}
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-1 h-auto py-3"
                  onClick={sendViaEmail}
                  disabled={!clientEmail}
                >
                  <IconMail className="h-5 w-5 text-blue-600" />
                  <span className="text-xs">Email</span>
                </Button>

                {/* Open Link */}
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-1 h-auto py-3"
                  onClick={() => window.open(paymentLink, "_blank")}
                >
                  <IconExternalLink className="h-5 w-5 text-purple-600" />
                  <span className="text-xs">Open</span>
                </Button>
              </div>
            </div>

            <Alert className="bg-green-50 border-green-200">
              <IconCheck className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Link generated successfully! Share it with the client to complete payment.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {paymentLink ? "Done" : "Cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
