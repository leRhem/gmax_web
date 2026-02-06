"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { IconCheck, IconLoader2 } from "@tabler/icons-react"

interface ConfirmBookingButtonProps {
  confirmationId: string
  bookingId: string
  balance: number
}

export function ConfirmBookingButton({
  confirmationId,
  bookingId,
  balance,
}: ConfirmBookingButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/public/bookings/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationId }),
      })

      const result = (await response.json()) as any

      if (!response.ok) {
        throw new Error(result.error || "Failed to confirm booking")
      }

      toast.success("Booking confirmed successfully!")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to confirm booking")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleConfirm}
        disabled={isLoading}
        size="lg"
        className="w-full"
      >
        {isLoading ? (
          <>
            <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
            Confirming...
          </>
        ) : (
          <>
            <IconCheck className="mr-2 h-4 w-4" />
            Confirm My Booking
          </>
        )}
      </Button>
      
      <p className="text-xs text-center text-muted-foreground">
        {balance > 0
          ? "You can pay later at the studio or online after confirmation"
          : "Click to confirm your reservation"}
      </p>
    </div>
  )
}
